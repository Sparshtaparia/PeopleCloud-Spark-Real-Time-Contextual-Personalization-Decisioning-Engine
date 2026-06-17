"use server"

import { PrismaClient } from "@prisma/client"
import { requirePermission } from "@/lib/rbac/require-permission"
import { requireAuth, createAuditLog } from "../server-utils"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

export async function getSettings(organizationId: string) {
  const user = await requireAuth()
  
  const brandVoice = await prisma.brandVoice.findUnique({
    where: { organizationId }
  })
  
  const apiKeys = await prisma.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' }
  })

  return { brandVoice, apiKeys }
}

export async function updateBrandVoice(organizationId: string, workspaceId: string, data: any) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'manage_settings' })

  const bv = await prisma.brandVoice.upsert({
    where: { organizationId },
    update: {
      coreTone: data.coreTone,
      bannedPhrases: data.bannedPhrases,
      approvedClaims: data.approvedClaims,
      strictness: data.strictness
    },
    create: {
      organizationId,
      coreTone: data.coreTone || 'Professional',
      bannedPhrases: data.bannedPhrases || '',
      approvedClaims: data.approvedClaims || '',
      strictness: data.strictness || 90
    }
  })

  await createAuditLog({
    organizationId,
    workspaceId,
    actorId: user.id,
    actorName: user.name || "Unknown",
    actorRole: membership.role,
    action: "Updated Brand Voice",
    resourceType: "BrandVoice",
    resourceId: bv.id,
    severity: "Info"
  })

  revalidatePath("/app/settings")
  return bv
}

export async function rotateApiKey(apiKeyId: string, organizationId: string, workspaceId: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'manage_settings' })

  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { isActive: false }
  })

  // Create a new rotated key
  const old = await prisma.apiKey.findUnique({ where: { id: apiKeyId } })
  if (old) {
    const rawKey = `spark_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`
    const newMasked = `spark_live_...${rawKey.slice(-4)}`
    await prisma.apiKey.create({
      data: {
        organizationId,
        name: old.name + ' (Rotated)',
        maskedKey: newMasked,
        keyHash: rawKey, // In a real app this would be bcrypted
        type: old.type,
        isActive: true,
      }
    })
  }

  await createAuditLog({
    organizationId,
    workspaceId,
    actorId: user.id,
    actorName: user.name || "Unknown",
    actorRole: membership.role,
    action: "Rotated API Key",
    resourceType: "ApiKey",
    resourceId: apiKeyId,
    severity: "High"
  })

  revalidatePath("/app/settings")
  return { success: true }
}

export async function generateApiKey(organizationId: string, workspaceId: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'manage_settings' })

  const rawKey = `spark_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`
  const newMasked = `spark_live_...${rawKey.slice(-4)}`
  await prisma.apiKey.create({
    data: {
      organizationId,
      name: `API Key - ${new Date().toLocaleDateString()}`,
      maskedKey: newMasked,
      keyHash: rawKey, // In a real app this would be bcrypted
      type: 'secret_server',
      isActive: true,
    }
  })

  await createAuditLog({
    organizationId,
    workspaceId,
    actorId: user.id,
    actorName: user.name || "Unknown",
    actorRole: membership.role,
    action: "Generated API Key",
    resourceType: "ApiKey",
    resourceId: "new",
    severity: "Info"
  })

  revalidatePath("/app/settings")
  return { success: true, key: rawKey }
}

