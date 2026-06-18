"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/rbac/require-permission"
import { requireAuth, createAuditLog, incrementUsage } from "../server-utils"
import { revalidatePath } from "next/cache"
import { createNotification } from "./notifications"
import { getCached, setCache, clearCache, cacheKey } from "@/lib/cache"

export async function getCampaigns(workspaceId: string) {
  const user = await requireAuth()
  const cached = getCached(cacheKey("campaigns", workspaceId))
  if (cached) return cached
  const data = await prisma.campaign.findMany({
    where: { workspaceId },
    include: { segment: true },
    orderBy: { createdAt: 'desc' }
  })
  setCache(cacheKey("campaigns", workspaceId), data, 1000 * 30)
  return data
}

export async function createCampaign(formData: FormData) {
  const user = await requireAuth()
  
  const name = formData.get("name") as string
  const objective = formData.get("objective") as string
  const segmentId = formData.get("segmentId") as string
  const workspaceId = formData.get("workspaceId") as string
  const organizationId = formData.get("organizationId") as string
  const channel = formData.get("channel") as string || "Email"

  // Check RBAC
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'edit_campaign' })
  
  // Create Campaign
  const campaign = await prisma.campaign.create({
    data: {
      name,
      objective,
      segmentId,
      workspaceId,
      status: "draft",
      channel
    }
  })

  await createAuditLog({
    organizationId,
    workspaceId,
    actorId: user.id,
    actorName: user.name || "Unknown",
    actorRole: membership.role,
    action: "Created campaign",
    resourceType: "Campaign",
    resourceId: campaign.id,
    severity: "Info"
  })

  clearCache("campaigns")
  revalidatePath("/app/campaigns")
  return { success: true, campaignId: campaign.id }
}

export async function launchCampaign(campaignId: string, organizationId: string, workspaceId: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'edit_campaign' }) // Strict for launch

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId }
  })

  if (!campaign) throw new Error("Campaign not found")
  if (campaign.status !== "approved") throw new Error("BusinessRuleError: Campaign must be approved before launch")

  // Use Transaction
  await prisma.$transaction(async (tx) => {
    // 1. Update status
    await tx.campaign.update({
      where: { id: campaignId },
      data: { status: "live" }
    })

    // 2. Increment usage
    await incrementUsage({
      organizationId,
      metric: "campaigns_launched",
      amount: 1
    })

    // 3. Audit log
    await createAuditLog({
      organizationId,
      workspaceId,
      actorId: user.id,
      actorName: user.name || "Unknown",
      actorRole: membership.role,
      action: "Launched campaign",
      resourceType: "Campaign",
      resourceId: campaign.id,
      severity: "High"
    })
  })

  clearCache("campaigns")
  revalidatePath("/app/campaigns")
  revalidatePath("/app")
  return { success: true }
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['review'],
  review: ['approved', 'draft'],
  approved: ['live'],
  live: ['learning', 'paused'],
  learning: ['completed', 'live'],
  completed: ['archived'],
  paused: ['live'],
}

export async function updateCampaignStatus(campaignId: string, status: string, organizationId: string, workspaceId: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'edit_campaign' })
  
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId }
  })
  
  if (!campaign) throw new Error("Campaign not found")

  const allowed = VALID_TRANSITIONS[campaign.status]
  if (!allowed || !allowed.includes(status)) {
    throw new Error(`BusinessRuleError: Cannot transition from '${campaign.status}' to '${status}'`)
  }
  
  // Handle reject → draft (remove approved variants)
  if (campaign.status === 'review' && status === 'draft') {
    await prisma.creativeVariant.updateMany({
      where: { campaignId, status: 'approved' },
      data: { status: 'generated' }
    })
  }
  
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status }
  })
  
  if (status === 'live') {
    createNotification({
      organizationId, workspaceId,
      title: "Campaign Launched",
      message: `${campaign.name} is now live with AI-powered personalization.`,
      type: "success",
    }).catch(() => {})

    createNotification({
      organizationId, workspaceId,
      title: "Personalization Active",
      message: `AI decisions are being generated for ${campaign.name}. Monitor performance in the Command Center.`,
      type: "info",
    }).catch(() => {})
    const segment = await prisma.segment.findUnique({ where: { id: campaign.segmentId } })
    const audienceSize = segment?.audienceSize || 1000
    const decisionCount = Math.min(audienceSize, 500)
    
    const customers = await prisma.customer.findMany({
      where: { workspaceId },
      take: decisionCount
    })
    
    if (customers.length > 0) {
      const decisionsData = customers.map(c => ({
        organizationId,
        workspaceId,
        customerId: c.id,
        campaignId: campaign.id,
        channel: campaign.channel || 'email',
        offer: 'Launch Default',
        confidence: Math.random() * 0.4 + 0.6,
        reasons: JSON.stringify(["Segment match", "Campaign Launch"]),
      }))
      
      await prisma.personalizationDecision.createMany({ data: decisionsData })
      
      await incrementUsage({ organizationId, metric: 'bandit_decisions', amount: decisionsData.length })
    }
    
    await incrementUsage({ organizationId, metric: 'campaigns_launched', amount: 1 })
  }
  
  await createAuditLog({
    organizationId,
    workspaceId,
    actorId: user.id,
    actorName: user.name || "Unknown",
    actorRole: membership.role,
    action: status === 'live' ? 'Launched campaign' : `Updated campaign status to ${status}`,
    resourceType: "Campaign",
    resourceId: campaign.id,
    severity: ['live', 'completed'].includes(status) ? "High" : "Info"
  })
  
  clearCache("campaigns")
  clearCache("experiments")
  revalidatePath("/app/campaigns")
  revalidatePath("/app/experiments")
  revalidatePath("/app")
  return { success: true }
}

export async function enableAiLearning(campaignId: string, organizationId: string, workspaceId: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'edit_campaign' })

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    include: {
      creativeVariants: { where: { status: 'approved' } },
      segment: true,
    }
  })

  if (!campaign) throw new Error("Campaign not found")
  if (campaign.status !== 'live') throw new Error("BusinessRuleError: Campaign must be live before enabling AI Learning")

  const approvedVariants = campaign.creativeVariants
  if (approvedVariants.length === 0) throw new Error("BusinessRuleError: No approved creative variants to experiment with")

  const experiment = await prisma.$transaction(async (tx) => {
    const exp = await tx.experiment.create({
      data: {
        organizationId,
        workspaceId,
        campaignId,
        type: 'contextual_bandit',
        status: 'running',
        totalLift: 0,
      }
    })

    const variantCount = approvedVariants.length
    const equalAllocation = 1 / variantCount

    for (const v of approvedVariants) {
      await tx.experimentVariant.create({
        data: {
          organizationId,
          workspaceId,
          experimentId: exp.id,
          creativeVariantId: v.id,
          name: v.strategy || `Variant ${v.id.slice(0, 4)}`,
          allocation: equalAllocation,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          lift: 0,
          confidence: 0,
        }
      })
    }

    await tx.campaign.update({
      where: { id: campaignId },
      data: { status: 'learning' }
    })

    return exp
  }, { timeout: 15000 })

  await createAuditLog({
    organizationId,
    workspaceId,
    actorId: user.id,
    actorName: user.name || "Unknown",
    actorRole: membership.role,
    action: "Enabled AI Learning — bandit experiment created",
    resourceType: "Experiment",
    resourceId: experiment.id,
    severity: "High",
    metadata: { variantCount: approvedVariants.length, experimentType: 'contextual_bandit' }
  })

  await incrementUsage({ organizationId, metric: 'experiments_created', amount: 1 })

  createNotification({
    organizationId, workspaceId,
    title: "AI Learning Started",
    message: `Contextual bandit experiment created for ${campaign.name} with ${approvedVariants.length} variants.`,
    type: "info",
  }).catch(() => {})

  clearCache("campaigns")
  clearCache("experiments")
  revalidatePath("/app/campaigns")
  revalidatePath("/app/experiments")
  revalidatePath("/app")
  return { success: true, experimentId: experiment.id }
}
