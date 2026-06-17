import { PrismaClient } from "@prisma/client"
import { CustomerFeatures, computeSegmentFeatures } from "./feature-engineering"

const prisma = new PrismaClient()

export interface SegmentAssignment {
  customerId: string
  segmentId: string
  segmentName: string
  confidence: number
  reasons: string[]
}

export interface SegmentInsight {
  id: string
  name: string
  audienceSize: number
  avgLtv: number
  convProb: number
  topChannels: string[]
  topCategories: string[]
  churnRate: number
  avgRecency: number
  avgFrequency30d: number
}

export type SegmentTier = "vip" | "loyal" | "active" | "at_risk" | "churned" | "new" | "prospect"

const TIER_RULES: Array<{
  tier: SegmentTier
  label: string
  condition: (f: CustomerFeatures) => boolean
}> = [
  {
    tier: "vip",
    label: "VIP",
    condition: (f) =>
      f.monetary30d > 500 && f.frequency30d > 10 && f.recencyDays < 7,
  },
  {
    tier: "loyal",
    label: "Loyal",
    condition: (f) =>
      f.frequency30d > 5 && f.recencyDays < 14 && f.monetary30d > 100,
  },
  {
    tier: "active",
    label: "Active",
    condition: (f) => f.recencyDays < 30 && f.frequency30d >= 2,
  },
  {
    tier: "new",
    label: "New",
    condition: (f) => f.recencyDays < 14 && f.monetary30d === 0,
  },
  {
    tier: "at_risk",
    label: "At Risk",
    condition: (f) =>
      f.recencyDays >= 30 && f.recencyDays < 90 && f.frequency30d < 2,
  },
  {
    tier: "churned",
    label: "Churned",
    condition: (f) => f.recencyDays >= 90,
  },
  {
    tier: "prospect",
    label: "Prospect",
    condition: (f) => f.frequency30d === 0 && f.recencyDays < 30,
  },
]

export function classifyCustomer(features: CustomerFeatures): {
  tier: SegmentTier
  label: string
  confidence: number
} {
  const bannedTiers: Set<string> = new Set()

  for (const rule of TIER_RULES) {
    if (rule.condition(features)) {
      const confidence = Math.min(
        0.95,
        0.5 +
          Math.min(features.identityConfidence, 1.0) * 0.3 +
          (features.frequency30d > 0 ? 0.1 : 0) +
          (features.monetary30d > 0 ? 0.05 : 0)
      )
      if (!bannedTiers.has(rule.tier)) {
        return { tier: rule.tier, label: rule.label, confidence }
      }
    }
  }

  return { tier: "active", label: "Active", confidence: 0.4 }
}

export function kmeansSegmentation(
  features: CustomerFeatures[],
  k: number = 5
): Map<string, number> {
  const assignments = new Map<string, number>()

  if (features.length === 0) return assignments

  const normalized = features.map((f) => ({
    id: f.customerId,
    recency: normalize(f.recencyDays, 0, 365),
    frequency: normalize(f.frequency30d, 0, 100),
    monetary: normalize(f.monetary30d, 0, 2000),
  }))

  const centroids = normalized.slice(0, k).map((p) => ({
    recency: p.recency,
    frequency: p.frequency,
    monetary: p.monetary,
  }))

  for (let iter = 0; iter < 20; iter++) {
    for (const point of normalized) {
      let minDist = Infinity
      let bestCluster = 0
      for (let c = 0; c < centroids.length; c++) {
        const dist = euclideanDist(point, centroids[c])
        if (dist < minDist) {
          minDist = dist
          bestCluster = c
        }
      }
      assignments.set(point.id, bestCluster)
    }

    const sums = centroids.map(() => ({
      recency: 0,
      frequency: 0,
      monetary: 0,
      count: 0,
    }))

    for (const point of normalized) {
      const cluster = assignments.get(point.id)!
      sums[cluster].recency += point.recency
      sums[cluster].frequency += point.frequency
      sums[cluster].monetary += point.monetary
      sums[cluster].count++
    }

    const newCentroids = sums.map((s) =>
      s.count > 0
        ? {
            recency: s.recency / s.count,
            frequency: s.frequency / s.count,
            monetary: s.monetary / s.count,
          }
        : { recency: Math.random(), frequency: Math.random(), monetary: Math.random() }
    )

    if (centroidsEqual(centroids, newCentroids)) break
    centroids.splice(0, centroids.length, ...newCentroids)
  }

  return assignments
}

export function assignToLifecycleStage(features: CustomerFeatures): string {
  const { label } = classifyCustomer(features)
  return label
}

export async function recomputeSegmentInsights(
  workspaceId: string
): Promise<SegmentInsight[]> {
  const segments = await prisma.segment.findMany({
    where: { workspaceId },
  })

  const insights: SegmentInsight[] = []

  for (const segment of segments) {
    const segFeatures = await computeSegmentFeatures(segment.id)
    insights.push({
      id: segment.id,
      name: segment.name,
      audienceSize: segFeatures.customerCount,
      avgLtv: segFeatures.avgLtv,
      convProb: segFeatures.convProb,
      topChannels: segFeatures.topChannels,
      topCategories: segFeatures.topCategories,
      churnRate: segFeatures.churnRate,
      avgRecency: segFeatures.avgRecency,
      avgFrequency30d: segFeatures.avgFrequency30d,
    })
  }

  return insights
}

function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

function euclideanDist(
  a: { recency: number; frequency: number; monetary: number },
  b: { recency: number; frequency: number; monetary: number }
): number {
  return Math.sqrt(
    (a.recency - b.recency) ** 2 +
      (a.frequency - b.frequency) ** 2 +
      (a.monetary - b.monetary) ** 2
  )
}

function centroidsEqual(
  a: { recency: number; frequency: number; monetary: number }[],
  b: { recency: number; frequency: number; monetary: number }[]
): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (
      Math.abs(a[i].recency - b[i].recency) > 0.001 ||
      Math.abs(a[i].frequency - b[i].frequency) > 0.001 ||
      Math.abs(a[i].monetary - b[i].monetary) > 0.001
    )
      return false
  }
  return true
}
