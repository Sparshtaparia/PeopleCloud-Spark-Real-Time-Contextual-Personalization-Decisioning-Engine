import { PrismaClient } from "@prisma/client"
import { getGeminiClient } from "./gemini-client"
import { buildExperimentSummaryPrompt } from "./prompt-builder"

const prisma = new PrismaClient()

export interface ExperimentSummaryResult {
  experimentId: string
  summary: string
  recommendation: string
  keyInsight: string
  winningVariant: string | null
  confidence: number
  source: "gemini" | "deterministic"
}

export async function generateExperimentSummary(
  experimentId: string
): Promise<ExperimentSummaryResult> {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: { variants: true, campaign: true },
  })

  if (!experiment) throw new Error(`Experiment ${experimentId} not found`)

  const variantData = experiment.variants.map((v) => ({
    name: v.name,
    impressions: v.impressions,
    clicks: v.clicks,
    conversions: v.conversions,
    ctr: v.impressions > 0 ? v.clicks / v.impressions : 0,
  }))

  const winner = variantData.length > 0
    ? variantData.reduce((best, v) => (v.ctr > best.ctr ? v : best), variantData[0])
    : null

  const durationMs = experiment.updatedAt.getTime() - experiment.createdAt.getTime()
  const durationDays = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)))

  let result: ExperimentSummaryResult

  const gemini = getGeminiClient()

  if (gemini.available) {
    try {
      const { fullPrompt } = buildExperimentSummaryPrompt({
        name: experiment.campaign?.name || experiment.id,
        type: experiment.type,
        duration: `${durationDays} days`,
        variantCount: variantData.length,
        variantData,
        winner: winner?.name,
      })

      const geminiResult = await gemini.generateExperimentSummary(fullPrompt)

      result = {
        experimentId,
        summary: geminiResult.summary,
        recommendation: geminiResult.recommendation,
        keyInsight: geminiResult.keyInsight,
        winningVariant: winner?.name || null,
        confidence: winner
          ? calculateConfidence(winner, variantData.filter((v) => v.name !== winner.name))
          : 0,
        source: "gemini",
      }
    } catch {
      result = deterministicSummary(experiment.id, experiment.type, variantData, winner)
    }
  } else {
    result = deterministicSummary(experiment.id, experiment.type, variantData, winner)
  }

  return result
}

export async function summarizeCampaignPerformance(
  campaignId: string
): Promise<{
  narrative: string
  source: "gemini" | "deterministic"
}> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { creativeVariants: true, segment: true },
  })

  if (!campaign) throw new Error(`Campaign ${campaignId} not found`)

  const bestVariant = campaign.creativeVariants.reduce(
    (best, v) => (v.predictedCtr > (best?.predictedCtr ?? 0) ? v : best),
    campaign.creativeVariants[0]
  )

  const context = `Campaign "${campaign.name}" targeting "${campaign.segment?.name || "unknown"}" segment with objective "${campaign.objective}". Status: ${campaign.status}. Channel: ${campaign.channel}. Best predicted CTR: ${bestVariant ? (bestVariant.predictedCtr * 100).toFixed(2) + "%" : "N/A"}. Total variants: ${campaign.creativeVariants.length}. Brand safety score range: ${Math.min(...campaign.creativeVariants.map((v) => v.brandSafetyScore)).toFixed(2)}–${Math.max(...campaign.creativeVariants.map((v) => v.brandSafetyScore)).toFixed(2)}. Compliance score range: ${Math.min(...campaign.creativeVariants.map((v) => v.complianceScore)).toFixed(2)}–${Math.max(...campaign.creativeVariants.map((v) => v.complianceScore)).toFixed(2)}.`

  const gemini = getGeminiClient()

  if (gemini.available) {
    try {
      const narrative = await gemini.generateNaturalLanguageExplanation(context)
      return { narrative, source: "gemini" }
    } catch {
      return { narrative: deterministicCampaignNarrative(campaign), source: "deterministic" }
    }
  }

  return { narrative: deterministicCampaignNarrative(campaign), source: "deterministic" }
}

function deterministicSummary(
  experimentId: string,
  type: string,
  variantData: Array<{ name: string; impressions: number; clicks: number; conversions: number; ctr: number }>,
  winner: { name: string; ctr: number } | null
): ExperimentSummaryResult {
  const totalClicks = variantData.reduce((s, v) => s + v.clicks, 0)
  const totalImpressions = variantData.reduce((s, v) => s + v.impressions, 0)
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0

  const summary = type === "contextual_bandit"
    ? `Bandit experiment completed with ${variantData.length} variants over ${totalImpressions} total impressions. Average CTR: ${(avgCtr * 100).toFixed(2)}%.${winner ? ` Leading variant "${winner.name}" at ${(winner.ctr * 100).toFixed(2)}% CTR.` : ""}`
    : `A/B test with ${variantData.length} variants showed${winner ? ` "${winner.name}" leading` : " no clear winner yet"} across ${totalImpressions} impressions. Overall CTR: ${(avgCtr * 100).toFixed(2)}%.`

  const recommendation = winner
    ? `Consider shifting more traffic to "${winner.name}" (CTR: ${(winner.ctr * 100).toFixed(2)}%) for optimal engagement.`
    : "Continue collecting data. No variant has achieved statistically significant lift yet."

  const keyInsight = winner
    ? `"${winner.name}" outperforms other variants with ${(winner.ctr * 100).toFixed(2)}% CTR, suggesting strong audience resonance.`
    : `Current CTR range: ${variantData.map((v) => `${v.name}=${(v.ctr * 100).toFixed(2)}%`).join(", ")}.`

  const confidence = winner
    ? calculateConfidence(
        winner,
        variantData.filter((v) => v.name !== winner.name)
      )
    : 0

  return {
    experimentId,
    summary,
    recommendation,
    keyInsight,
    winningVariant: winner?.name || null,
    confidence,
    source: "deterministic",
  }
}

function deterministicCampaignNarrative(campaign: {
  name: string
  status: string
  channel: string
  objective: string
  creativeVariants: Array<{ predictedCtr: number; brandSafetyScore: number; complianceScore: number }>
  segment?: { name: string } | null
}): string {
  const avgCtr =
    campaign.creativeVariants.length > 0
      ? campaign.creativeVariants.reduce((s, v) => s + v.predictedCtr, 0) /
        campaign.creativeVariants.length
      : 0

  return `Campaign "${campaign.name}" is currently ${campaign.status} on the ${campaign.channel} channel. Targeting ${campaign.segment?.name || "the selected segment"} with objective: ${campaign.objective}. Average predicted CTR across ${campaign.creativeVariants.length} variants is ${(avgCtr * 100).toFixed(2)}%.`
}

function calculateConfidence(
  winner: { name: string; ctr: number; impressions?: number },
  others: Array<{ name: string; ctr: number }>
): number {
  const maxOtherCtr = Math.max(...others.map((v) => v.ctr), 0)
  if (maxOtherCtr === 0) return 0.95

  const lift = (winner.ctr - maxOtherCtr) / maxOtherCtr
  const confidence = Math.min(0.99, Math.max(0.5, 0.5 + lift * 2))
  return Math.round(confidence * 100) / 100
}
