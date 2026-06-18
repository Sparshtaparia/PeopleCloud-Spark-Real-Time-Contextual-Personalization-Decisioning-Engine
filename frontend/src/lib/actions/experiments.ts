"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/rbac/require-permission"
import { requireAuth, createAuditLog, incrementUsage } from "../server-utils"
import { revalidatePath } from "next/cache"

export async function getExperiments(workspaceId: string) {
  const user = await requireAuth()
  return await prisma.experiment.findMany({
    where: { workspaceId },
    include: { variants: true, campaign: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  })
}

export async function simulateBanditStep(experimentId: string, organizationId: string, workspaceId: string, batchSize: number = 500) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'simulate_experiment' })

  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: { variants: true }
  })

  if (!experiment) throw new Error("Experiment not found")

  // Fetch customers for decision attribution (use many to spread across variants)
  const customers = await prisma.customer.findMany({ where: { workspaceId }, take: batchSize })

  const stepResults = await prisma.$transaction(async (tx) => {
    let totalImp = 0
    let totalClicks = 0
    let totalConv = 0
    let totalRevenue = 0
    const variantResults: Record<string, { impressions: number; clicks: number; conversions: number; revenue: number }> = {}

    const variantCount = experiment.variants.length
    const impressionsPerVariant = Math.floor(batchSize / variantCount)
    const allDecisions: Array<{
      organizationId: string
      workspaceId: string
      customerId: string
      campaignId: string
      experimentId: string
      channel: string
      offer: string
      confidence: number
      reasons: string
    }> = []
    const allEvents: Array<{
      customerId: string
      eventType: string
      channel: string
      campaignId: string | null
      metadata: string
    }> = []

    for (let vi = 0; vi < experiment.variants.length; vi++) {
      const v = experiment.variants[vi]
      
      // Base CTR: higher allocation variants get more traffic, simulated better performance
      const baseCtr = 0.08 + (v.allocation * 0.15) + (Math.random() * 0.05)
      const imp = impressionsPerVariant
      const clk = Math.floor(imp * baseCtr)
      const conv = Math.floor(clk * (0.15 + Math.random() * 0.15))
      const revenue = conv * Math.round(Math.random() * 80 + 20)

      const newImp = v.impressions + imp
      const newClk = v.clicks + clk
      const newConv = v.conversions + conv

      // Thompson Sampling-inspired allocation update
      const alpha = newClk + 1
      const beta = (newImp - newClk) + 1
      const sampledReward = alpha / (alpha + beta)

      await tx.experimentVariant.update({
        where: { id: v.id },
        data: {
          impressions: newImp,
          clicks: newClk,
          conversions: newConv,
          lift: imp > 0 ? clk / imp : 0,
          allocation: sampledReward,
        }
      })

      variantResults[v.id] = { impressions: imp, clicks: clk, conversions: conv, revenue }
      totalImp += imp
      totalClicks += clk
      totalConv += conv
      totalRevenue += revenue

      // Prepare decisions
      for (let i = 0; i < imp; i++) {
        const c = customers[i % customers.length]
        if (!c) continue
        allDecisions.push({
          organizationId,
          workspaceId,
          customerId: c.id,
          campaignId: experiment.campaignId,
          experimentId: experiment.id,
          channel: "web",
          offer: `Offer for ${v.name}`,
          confidence: sampledReward,
          reasons: JSON.stringify(["Bandit exploration", "Thompson sampling allocation"])
        })

        const isClick = i < clk
        const isConv = i < conv
        allEvents.push({
          customerId: c.id,
          eventType: isConv ? "purchase" : isClick ? "click" : "impression",
          channel: "web",
          campaignId: experiment.campaignId,
          metadata: JSON.stringify({ source: "bandit_step", experimentId: experiment.id, value: isConv ? Math.round(Math.random() * 100 + 10) : 0 })
        })
      }
    }

    // Batch insert decisions
    for (let i = 0; i < allDecisions.length; i += 50) {
      await tx.personalizationDecision.createMany({
        data: allDecisions.slice(i, i + 50),
      })
    }

    // Batch insert events
    for (let i = 0; i < allEvents.length; i += 50) {
      await tx.customerEvent.createMany({
        data: allEvents.slice(i, i + 50),
      })
    }

    // Normalize allocations so they sum to 1
    const updatedVariants = await tx.experimentVariant.findMany({ where: { experimentId } })
    const allocSum = updatedVariants.reduce((s, v) => s + v.allocation, 0)
    if (allocSum > 0) {
      for (const v of updatedVariants) {
        await tx.experimentVariant.update({
          where: { id: v.id },
          data: { allocation: v.allocation / allocSum }
        })
      }
    }

    const liftVal = totalImp > 0 ? ((totalClicks / totalImp) * 100).toFixed(1) : "0.0"

    await tx.campaign.update({
      where: { id: experiment.campaignId },
      data: { lift: `+${liftVal}%` }
    })

    await tx.experiment.update({
      where: { id: experimentId },
      data: { totalLift: parseFloat(liftVal) }
    })

    return { totalImp, totalClicks, totalConv, totalRevenue, liftVal, variantResults }
  }, { timeout: 60000 })

  await incrementUsage({ organizationId, metric: "model_inferences", amount: batchSize })

  await createAuditLog({
    organizationId,
    workspaceId,
    actorId: user.id,
    actorName: user.name || "Unknown",
    actorRole: membership.role,
    action: "experiment.simulated",
    resourceType: "Experiment",
    resourceId: experiment.id,
    severity: "Info",
    metadata: { batchSize, ...stepResults }
  })

  revalidatePath("/app/experiments")
  revalidatePath("/app/campaigns")
  revalidatePath("/app")
  return { success: true, ...stepResults }
}

export async function declareWinner(experimentId: string, variantId: string, organizationId: string, workspaceId: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'edit_campaign' })

  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: { campaign: true }
  })

  if (!experiment) throw new Error("Experiment not found")

  await prisma.$transaction(async (tx) => {
    await tx.experiment.update({
      where: { id: experimentId },
      data: { status: 'completed' }
    })

    await tx.campaign.update({
      where: { id: experiment.campaignId },
      data: { status: 'completed' }
    })

    await createAuditLog({
      organizationId,
      workspaceId,
      actorId: user.id,
      actorName: user.name || "Unknown",
      actorRole: membership.role,
      action: "Declared experiment winner",
      resourceType: "Experiment",
      resourceId: experiment.id,
      severity: "High",
      metadata: { winningVariantId: variantId }
    })
  })

  revalidatePath("/app/experiments")
  revalidatePath("/app/campaigns")
  return { success: true }
}

export async function pauseLearning(experimentId: string, organizationId: string, workspaceId: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'edit_campaign' })

  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: { campaign: true }
  })

  if (!experiment) throw new Error("Experiment not found")

  await prisma.$transaction(async (tx) => {
    await tx.experiment.update({
      where: { id: experimentId },
      data: { status: 'paused' }
    })

    await tx.campaign.update({
      where: { id: experiment.campaignId },
      data: { status: 'live' }
    })

    await createAuditLog({
      organizationId,
      workspaceId,
      actorId: user.id,
      actorName: user.name || "Unknown",
      actorRole: membership.role,
      action: "Paused AI Learning — experiment stopped",
      resourceType: "Experiment",
      resourceId: experiment.id,
      severity: "Info"
    })
  })

  revalidatePath("/app/experiments")
  revalidatePath("/app/campaigns")
  return { success: true }
}
