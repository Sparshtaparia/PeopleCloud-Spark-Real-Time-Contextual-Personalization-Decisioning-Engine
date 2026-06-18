"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "../server-utils"
import { createNotification } from "./notifications"
import { getCached, setCache, clearCache, cacheKey } from "@/lib/cache"

const SEGMENT_LIFECYCLE_MAP: Record<string, string[]> = {
  "High Intent Cart Abandoners": ["cart_abandoner"],
  "Browse Abandoners": ["active_browser", "high_intent"],
  "Dormant Premium Users": ["Churned", "At Risk"],
  "Recent Promo Seekers": ["New"],
  "Mobile Power Users": ["active_browser"],
  "High Value Loyalists": ["Loyalist", "premium_value"],
  "Price Sensitive Shoppers": ["Active"],
  "New Subscribers": ["New"],
}

async function computeSegmentStats(workspaceId: string, lifecycleStages: string[]) {
  const customers = await prisma.customer.findMany({
    where: {
      workspaceId,
      lifecycleStage: { in: lifecycleStages },
    },
    select: { predictedLtv: true, identityConfidence: true },
  })

  const audienceSize = customers.length
  const avgLtv = audienceSize > 0
    ? customers.reduce((s, c) => s + (c.predictedLtv || 0), 0) / audienceSize
    : 0
  const convProb = audienceSize > 0
    ? customers.filter(c => (c.identityConfidence || 0) >= 0.5).length / audienceSize
    : 0

  return { audienceSize, avgLtv: Math.round(avgLtv), convProb }
}

export async function getSegments(workspaceId: string) {
  const user = await requireAuth()
  const cached = getCached(cacheKey("segments", workspaceId))
  if (cached) return cached
  const segments = await prisma.segment.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  })

  // Refresh stats from real customer data
  const refreshed = await Promise.all(segments.map(async (seg) => {
    const lifecycleStages = SEGMENT_LIFECYCLE_MAP[seg.name]
    if (lifecycleStages) {
      const stats = await computeSegmentStats(workspaceId, lifecycleStages)
      return { ...seg, ...stats }
    }
    return seg
  }))

  setCache(cacheKey("segments", workspaceId), refreshed, 1000 * 30)
  return refreshed
}

export async function refreshSegmentStats(workspaceId: string) {
  const user = await requireAuth()
  const segments = await prisma.segment.findMany({ where: { workspaceId }, select: { id: true, name: true } })

  for (const seg of segments) {
    const lifecycleStages = SEGMENT_LIFECYCLE_MAP[seg.name]
    if (!lifecycleStages) continue
    const stats = await computeSegmentStats(workspaceId, lifecycleStages)
    await prisma.segment.update({
      where: { id: seg.id },
      data: { audienceSize: stats.audienceSize, avgLtv: stats.avgLtv, convProb: stats.convProb },
    })
  }

  clearCache("segments")
  return { success: true }
}

export async function generateSegment(workspaceId: string, orgId: string) {
  const user = await requireAuth()

  const existing = await prisma.segment.findMany({
    where: { workspaceId },
    select: { name: true }
  })
  const existingNames = new Set(existing.map(s => s.name.toLowerCase()))

  const segmentPool = Object.keys(SEGMENT_LIFECYCLE_MAP)

  let name = segmentPool.find(n => !existingNames.has(n.toLowerCase()))
  if (!name) {
    name = `Segment ${new Date().toLocaleDateString()} ${Math.floor(Math.random() * 100)}`
  }

  const lifecycleStages = SEGMENT_LIFECYCLE_MAP[name]
  const stats = lifecycleStages ? await computeSegmentStats(workspaceId, lifecycleStages) : { audienceSize: 0, avgLtv: 0, convProb: 0 }

  const segment = await prisma.segment.create({
    data: {
      workspaceId,
      name,
      alert: false,
      audienceSize: stats.audienceSize,
      avgLtv: stats.avgLtv,
      convProb: stats.convProb,
    }
  })

  createNotification({
    organizationId: orgId, workspaceId,
    title: "Segment Generated",
    message: `"${name}" created with ${stats.audienceSize} customers at ${(stats.convProb * 100).toFixed(0)}% predicted conversion.`,
    type: "info",
  }).catch(() => {})

  clearCache("segments")
  return segment
}
