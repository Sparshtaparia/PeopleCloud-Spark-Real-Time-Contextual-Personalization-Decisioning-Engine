import { CustomerFeatures } from "./feature-engineering"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export interface FatigueResult {
  customerId: string
  fatigueScore: number
  fatigueLevel: "none" | "low" | "medium" | "high" | "critical"
  messagesSent7d: number
  messagesSent30d: number
  channelsExhausted: string[]
  recommendedCooldownDays: number
  lastContactDays: number
}

const CHANNEL_FATIGUE_THRESHOLDS: Record<string, { daily: number; weekly: number; monthly: number }> = {
  email: { daily: 2, weekly: 5, monthly: 15 },
  push: { daily: 3, weekly: 10, monthly: 30 },
  sms: { daily: 1, weekly: 3, monthly: 8 },
  web: { daily: 5, weekly: 20, monthly: 60 },
  ads: { daily: 3, weekly: 8, monthly: 20 },
}

export function computeFatigueScore(features: CustomerFeatures): FatigueResult {
  const totalEvents7d = features.frequency7d
  const totalEvents30d = features.frequency30d

  const channelCounts: Record<string, number> = {}
  for (const [ch, count] of Object.entries(features.channelDistribution)) {
    const ratio = features.frequency30d > 0 ? count / features.frequency30d : 0
    channelCounts[ch] = Math.round(totalEvents7d * ratio)
  }

  const channelsExhausted: string[] = []
  let totalFatigue = 0
  let channelCount = 0

  for (const [ch, count] of Object.entries(channelCounts)) {
    const thresholds = CHANNEL_FATIGUE_THRESHOLDS[ch]
    if (!thresholds) continue

    const weeklyRatio = count / thresholds.weekly
    const monthlyRatio = totalEvents30d > 0 ? (count * (30 / 7)) / thresholds.monthly : 0
    const dailyRatio = count > 0 ? count / 7 / thresholds.daily : 0

    const chFatigue = weeklyRatio * 0.5 + monthlyRatio * 0.3 + dailyRatio * 0.2
    totalFatigue += chFatigue
    channelCount++

    if (chFatigue > 0.8) channelsExhausted.push(ch)
  }

  const recencyPenalty = features.recencyDays < 1 ? 0.15 : 0
  const frequencyPenalty =
    features.frequency7d > 20
      ? (features.frequency7d - 20) * 0.01
      : 0

  const rawScore = channelCount > 0 ? totalFatigue / channelCount : 0
  const fatigueScore = Math.max(0, Math.min(1, rawScore + recencyPenalty + frequencyPenalty))

  const fatigueLevel: FatigueResult["fatigueLevel"] =
    fatigueScore >= 0.8 ? "critical" : fatigueScore >= 0.6 ? "high" : fatigueScore >= 0.35 ? "medium" : fatigueScore >= 0.15 ? "low" : "none"

  const recommendedCooldownDays =
    fatigueLevel === "critical" ? 14 : fatigueLevel === "high" ? 7 : fatigueLevel === "medium" ? 3 : fatigueLevel === "low" ? 1 : 0

  return {
    customerId: features.customerId,
    fatigueScore: Math.round(fatigueScore * 100) / 100,
    fatigueLevel,
    messagesSent7d: totalEvents7d,
    messagesSent30d: totalEvents30d,
    channelsExhausted,
    recommendedCooldownDays,
    lastContactDays: features.recencyDays,
  }
}

export function computeSegmentFatigue(
  featuresList: CustomerFeatures[]
): {
  avgFatigue: number
  fatiguedPercent: number
  criticalPercent: number
  recommendedPause: boolean
} {
  if (featuresList.length === 0) {
    return { avgFatigue: 0, fatiguedPercent: 0, criticalPercent: 0, recommendedPause: false }
  }

  let totalFatigue = 0
  let fatiguedCount = 0
  let criticalCount = 0

  for (const f of featuresList) {
    const result = computeFatigueScore(f)
    totalFatigue += result.fatigueScore
    if (result.fatigueLevel === "high" || result.fatigueLevel === "critical") fatiguedCount++
    if (result.fatigueLevel === "critical") criticalCount++
  }

  const avgFatigue = totalFatigue / featuresList.length

  return {
    avgFatigue: Math.round(avgFatigue * 100) / 100,
    fatiguedPercent: Math.round((fatiguedCount / featuresList.length) * 100),
    criticalPercent: Math.round((criticalCount / featuresList.length) * 100),
    recommendedPause: avgFatigue > 0.5,
  }
}

export async function getWorkspaceFatigueAlerts(
  workspaceId: string
): Promise<{ campaignId: string; campaignName: string; fatigueScore: number; level: string }[]> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      workspaceId,
      status: { in: ["live", "learning"] },
    },
    include: {
      segment: true,
    },
  })

  const alerts: Array<{
    campaignId: string
    campaignName: string
    fatigueScore: number
    level: string
  }> = []

  for (const campaign of campaigns) {
    const customers = await prisma.customer.findMany({
      where: { workspaceId },
      take: 30,
    })

    if (customers.length === 0) continue

    let totalFatigue = 0

    for (const customer of customers) {
      const events = await prisma.customerEvent.findMany({
        where: { customerId: customer.id },
        orderBy: { timestamp: "desc" },
        take: 100,
      })

      const now = Date.now()
      const cutoff7d = new Date(now - 7 * 24 * 60 * 60 * 1000)
      const channelDist: Record<string, number> = {}
      for (const e of events) {
        channelDist[e.channel] = (channelDist[e.channel] || 0) + 1
      }

      const feature: CustomerFeatures = {
        customerId: customer.id,
        recencyDays: events.length > 0 ? (now - events[0].timestamp.getTime()) / (1000 * 60 * 60 * 24) : 999,
        frequency7d: events.filter((e) => e.timestamp >= cutoff7d).length,
        frequency30d: events.filter((e) => e.timestamp >= new Date(now - 30 * 24 * 60 * 60 * 1000)).length,
        monetary7d: 0,
        monetary30d: 0,
        channelDistribution: channelDist,
        eventTypeDistribution: {},
        categoryAffinities: {},
        hourOfDayMode: 0,
        dayOfWeekMode: 0,
        sessionCount: 1,
        avgSessionGapHours: 0,
        bounceRate: 0,
        pageDepthAvg: 0,
        lifecycleStage: customer.lifecycleStage,
        identityConfidence: customer.identityConfidence,
        consentStatus: customer.consentStatus,
      }

      const result = computeFatigueScore(feature)
      totalFatigue += result.fatigueScore
    }

    const avgFatigue = totalFatigue / customers.length
    const level =
      avgFatigue >= 0.8 ? "critical" : avgFatigue >= 0.6 ? "high" : avgFatigue >= 0.35 ? "medium" : "low"

    if (avgFatigue > 0.35) {
      alerts.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        fatigueScore: Math.round(avgFatigue * 100) / 100,
        level,
      })
    }
  }

  return alerts.sort((a, b) => b.fatigueScore - a.fatigueScore)
}
