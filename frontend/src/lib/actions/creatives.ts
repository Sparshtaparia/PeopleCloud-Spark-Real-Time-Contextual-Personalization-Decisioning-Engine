"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/rbac/require-permission"
import { requireAuth, createAuditLog, incrementUsage } from "../server-utils"
import { revalidatePath } from "next/cache"
import { getGeminiClient } from "@/lib/ai/gemini-client"

import { generateCreativeVariants as aiGenerate } from "@/lib/ai/creative-generator"

export async function getCreativeVariants(campaignId: string, channelFilter?: string) {
  const user = await requireAuth()
  return await prisma.creativeVariant.findMany({
    where: { 
      campaignId,
      ...(channelFilter ? { channel: channelFilter } : {})
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function generateCreativeVariants(campaignId: string, organizationId: string, workspaceId: string, channel: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'generate_creative' })

  // Use the robust AI pipeline
  await aiGenerate({
    campaignId,
    organizationId,
    workspaceId,
    channel
  })

  revalidatePath("/app/creative-studio")
  return { success: true }
}

export async function approveCreative(variantId: string, campaignId: string, organizationId: string, workspaceId: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'approve_creative' })

  // Keep transaction minimal — just the two DB writes
  await prisma.$transaction([
    prisma.creativeVariant.update({
      where: { id: variantId },
      data: { status: "approved" }
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "approved" }
    }),
  ])

  // Audit log outside transaction (SQLite can't handle it inside on large DB)
  await createAuditLog({
    organizationId,
    workspaceId,
    actorId: user.id,
    actorName: user.name || "Unknown",
    actorRole: membership.role,
    action: "Approved creative variant",
    resourceType: "CreativeVariant",
    resourceId: variantId,
    severity: "Info"
  })

  revalidatePath("/app/creative-studio")
  return { success: true }
}

export async function rejectCreative(variantId: string, campaignId: string, organizationId: string, workspaceId: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'approve_creative' })

  await prisma.creativeVariant.update({
    where: { id: variantId },
    data: { status: "rejected" }
  })

  await createAuditLog({
    organizationId,
    workspaceId,
    actorId: user.id,
    actorName: user.name || "Unknown",
    actorRole: membership.role,
    action: "Rejected creative variant",
    resourceType: "CreativeVariant",
    resourceId: variantId,
    severity: "Info"
  })

  revalidatePath("/app/creative-studio")
  return { success: true }
}

export async function editCreative(variantId: string, data: { headline: string, body: string, cta: string, subject?: string, preheader?: string }, organizationId: string, workspaceId: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'generate_creative' })

  await prisma.creativeVariant.update({
    where: { id: variantId },
    data: { 
      headline: data.headline,
      body: data.body,
      cta: data.cta,
      subject: data.subject,
      preheader: data.preheader,
      status: "edited" // Custom status or keep generated
    }
  })

  revalidatePath("/app/creative-studio")
  return { success: true }
}

export async function regenerateCreative(variantId: string, campaignId: string, organizationId: string, workspaceId: string, channel: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'generate_creative' })

  // Since it replaces this variant, we just delete the old one and trigger the generation pipeline
  // But wait, the generation pipeline generates 3 variants. We should probably just delete this variant and let them keep 2, or just rely on generating 3 new ones if they want.
  // The simplest is to delete this variant and call aiGenerate but tell it to generate 1. 
  // Let's just delete the variant for now so they can fetch a new batch, or we mark it rejected.
  await prisma.creativeVariant.update({
    where: { id: variantId },
    data: { status: "rejected" }
  })
  
  // Re-run generation pipeline, it generates 3, so they get new options
  await aiGenerate({
    campaignId,
    organizationId,
    workspaceId,
    channel
  })

  revalidatePath("/app/creative-studio")
  return { success: true }
}
