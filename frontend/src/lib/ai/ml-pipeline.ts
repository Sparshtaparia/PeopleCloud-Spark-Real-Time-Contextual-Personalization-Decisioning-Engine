import { PrismaClient } from "@prisma/client"
import { computeCustomerFeatures, featurePipeline, CustomerFeatures } from "./feature-engineering"
import { classifyCustomer, recomputeSegmentInsights, SegmentInsight } from "./segmentation"
import { scoreCustomer, scoreCustomerBatch, CustomerScoringResult } from "./scoring"
import { determineNextBestAction, Action } from "./next-best-action"
import { computeFatigueScore, FatigueResult } from "./fatigue-score"


const prisma = new PrismaClient()

export interface PipelineEvent {
  id?: string
  customerId: string
  eventType: string
  channel: string
  metadata?: Record<string, unknown>
  timestamp?: Date
}

export interface PipelineResult {
  customerId: string
  features: CustomerFeatures
  scoring: CustomerScoringResult
  fatigue: FatigueResult
  segmentTier: string
  nextBestAction: Action
  allActions: Action[]
  timestamp: string
}

export interface CampaignPipelineResult {
  campaignId: string
  campaignName: string
  segmentInsights: SegmentInsight | null
  scoredCustomers: number
  actionsRecommended: number
  fatigueAlerts: number
  avgChurnRisk: number
  avgLtv: number
  topOffer: string
}

export interface BatchPipelineResult {
  processedCount: number
  errors: number
  results: PipelineResult[]
  durationMs: number
}

export async function processSingleCustomer(
  customerId: string
): Promise<PipelineResult> {
  const features = await computeCustomerFeatures(customerId)
  const scoring = scoreCustomer(features)
  const fatigue = computeFatigueScore(features)
  const { tier } = classifyCustomer(features)
  const { actions, topAction } = determineNextBestAction(features)

  await prisma.personalizationDecision.create({
    data: {
      customerId,
      offer: topAction.offer,
      channel: topAction.channel,
      confidence: topAction.confidence,
      reasons: JSON.stringify(topAction.reasons),
    },
  })

  return {
    customerId,
    features,
    scoring,
    fatigue,
    segmentTier: tier,
    nextBestAction: topAction,
    allActions: actions,
    timestamp: new Date().toISOString(),
  }
}

export async function processBatchCustomers(
  customerIds: string[],
  concurrency: number = 10
): Promise<BatchPipelineResult> {
  const start = Date.now()
  const results: PipelineResult[] = []
  let errors = 0

  for (let i = 0; i < customerIds.length; i += concurrency) {
    const batch = customerIds.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map((id) => processSingleCustomer(id))
    )

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value)
      } else {
        errors++
      }
    }
  }

  return {
    processedCount: results.length,
    errors,
    results,
    durationMs: Date.now() - start,
  }
}

export async function processSegmentPipeline(
  workspaceId: string,
  segmentId: string
): Promise<CampaignPipelineResult> {
  const segment = await prisma.segment.findUnique({
    where: { id: segmentId },
  })

  if (!segment) throw new Error(`Segment ${segmentId} not found`)

  const customers = await prisma.customer.findMany({
    where: { workspaceId },
    take: 200,
  })

  if (customers.length === 0) {
    const insights = await recomputeSegmentInsights(workspaceId)
    return {
      campaignId: "",
      campaignName: "",
      segmentInsights: insights.find((i) => i.id === segmentId) || null,
      scoredCustomers: 0,
      actionsRecommended: 0,
      fatigueAlerts: 0,
      avgChurnRisk: 0,
      avgLtv: segment.avgLtv,
      topOffer: "none",
    }
  }

  const customerIds = customers.map((c) => c.id)
  const featureMap = await featurePipeline(customerIds)
  const featuresList = Array.from(featureMap.values())

  if (featuresList.length === 0) {
    return {
      campaignId: "",
      campaignName: "",
      segmentInsights: null,
      scoredCustomers: 0,
      actionsRecommended: 0,
      fatigueAlerts: 0,
      avgChurnRisk: 0,
      avgLtv: segment.avgLtv,
      topOffer: "none",
    }
  }

  const scoringResults = scoreCustomerBatch(featuresList)

  let totalChurnRisk = 0
  let fatigueAlerts = 0
  const offerCounts: Record<string, number> = {}

  for (const f of featuresList) {
    const fatigue = computeFatigueScore(f)
    if (fatigue.fatigueLevel === "high" || fatigue.fatigueLevel === "critical") {
      fatigueAlerts++
    }

    const { topAction } = determineNextBestAction(f)
    offerCounts[topAction.offer] = (offerCounts[topAction.offer] || 0) + 1
  }

  for (const s of scoringResults) {
    totalChurnRisk += s.churn.risk
  }

  const avgChurnRisk = scoringResults.length > 0
    ? totalChurnRisk / scoringResults.length
    : 0

  const avgLtv = scoringResults.length > 0
    ? scoringResults.reduce((s, r) => s + r.ltv.predictedLtv, 0) / scoringResults.length
    : 0

  const topOffer = Object.entries(offerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "none"

  const insights = await recomputeSegmentInsights(workspaceId)

  return {
    campaignId: "",
    campaignName: "",
    segmentInsights: insights.find((i) => i.id === segmentId) || null,
    scoredCustomers: scoringResults.length,
    actionsRecommended: featuresList.length,
    fatigueAlerts,
    avgChurnRisk: Math.round(avgChurnRisk * 100) / 100,
    avgLtv: Math.round(avgLtv * 100) / 100,
    topOffer,
  }
}

export async function processCampaignPipeline(
  campaignId: string,
  workspaceId: string
): Promise<CampaignPipelineResult> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { segment: true },
  })

  if (!campaign) throw new Error(`Campaign ${campaignId} not found`)

  const segmentResult = await processSegmentPipeline(
    workspaceId,
    campaign.segmentId
  )

  return {
    ...segmentResult,
    campaignId: campaign.id,
    campaignName: campaign.name,
  }
}

export async function runIdentityResolution(
  workspaceId: string
): Promise<{ resolved: number; merged: number; confidence: number }> {
  const customers = await prisma.customer.findMany({
    where: { workspaceId },
    include: { events: { take: 50, orderBy: { timestamp: "desc" } } },
  })

  let resolved = 0
  const merged = 0

  for (const customer of customers) {
    const emailEvents = customer.events.filter(
      (e) => e.eventType === "email_identified" || e.eventType === "login"
    )

    if (emailEvents.length > 1) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { identityConfidence: Math.min(1, customer.identityConfidence + 0.1) },
      })
      resolved++
    }
  }

  return {
    resolved,
    merged,
    confidence: customers.length > 0 ? resolved / customers.length : 0,
  }
}

export async function runModelOpsCheck(
  workspaceId: string
): Promise<{
  championModel: { id: string; name: string; driftScore: number; p95Latency: number; featureFreshness: number } | null
  challengerModel: { id: string; name: string; driftScore: number } | null
  needsRetraining: boolean
  driftAlert: boolean
}> {
  const champion = await prisma.modelVersion.findFirst({
    where: { workspaceId, status: "champion" },
  })

  const challenger = await prisma.modelVersion.findFirst({
    where: { workspaceId, status: "challenger" },
  })

  const needsRetraining = champion
    ? champion.featureFreshness < 0.6 || champion.driftScore > 0.15
    : true

  const driftAlert = champion ? champion.driftScore > 0.2 : false

  return {
    championModel: champion
      ? {
          id: champion.id,
          name: champion.name,
          driftScore: champion.driftScore,
          p95Latency: champion.p95Latency,
          featureFreshness: champion.featureFreshness,
        }
      : null,
    challengerModel: challenger
      ? { id: challenger.id, name: challenger.name, driftScore: challenger.driftScore }
      : null,
    needsRetraining,
    driftAlert,
  }
}

export async function runFullPipeline(
  workspaceId: string
): Promise<{
  identity: { resolved: number; merged: number; confidence: number }
  segments: SegmentInsight[]
  models: { needsRetraining: boolean; driftAlert: boolean }
  campaigns: CampaignPipelineResult[]
  durationMs: number
}> {
  const start = Date.now()

  const [identity, segments, models, campaigns] = await Promise.all([
    runIdentityResolution(workspaceId),
    recomputeSegmentInsights(workspaceId),
    runModelOpsCheck(workspaceId),
    prisma.campaign
      .findMany({ where: { workspaceId, status: { in: ["live", "learning"] } } })
      .then((cs) =>
        Promise.all(
          cs.map((c) => processCampaignPipeline(c.id, workspaceId))
        )
      ),
  ])

  return {
    identity,
    segments,
    models: {
      needsRetraining: models.needsRetraining,
      driftAlert: models.driftAlert,
    },
    campaigns,
    durationMs: Date.now() - start,
  }
}
