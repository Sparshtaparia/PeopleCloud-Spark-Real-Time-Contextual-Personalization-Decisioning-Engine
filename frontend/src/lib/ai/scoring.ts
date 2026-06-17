import { CustomerFeatures } from "./feature-engineering"

export interface ChurnScore {
  risk: number
  riskLevel: "low" | "medium" | "high" | "critical"
  primaryFactors: string[]
}

export interface LTVScore {
  predictedLtv: number
  percentile: number
  tier: "low" | "medium" | "high" | "premium"
}

export interface ChannelPreferenceScore {
  channel: string
  score: number
  rank: number
}

export interface CustomerScoringResult {
  customerId: string
  churn: ChurnScore
  ltv: LTVScore
  channelPreferences: ChannelPreferenceScore[]
}

const CHURN_WEIGHTS = {
  recencyDays: 0.35,
  frequency30d: -0.25,
  frequency7d: -0.15,
  monetary30d: -0.15,
  bounceRate: 0.05,
  identityConfidence: -0.05,
} as const

export function computeChurnScore(features: CustomerFeatures): ChurnScore {
  const rawScore =
    normalizeMono(features.recencyDays, 0, 365, true) * CHURN_WEIGHTS.recencyDays +
    normalizeMono(features.frequency30d, 0, 100, false) * CHURN_WEIGHTS.frequency30d +
    normalizeMono(features.frequency7d, 0, 50, false) * CHURN_WEIGHTS.frequency7d +
    normalizeMono(features.monetary30d, 0, 2000, false) * CHURN_WEIGHTS.monetary30d +
    features.bounceRate * CHURN_WEIGHTS.bounceRate +
    (1 - features.identityConfidence) * Math.abs(CHURN_WEIGHTS.identityConfidence)

  const risk = Math.max(0, Math.min(1, rawScore))

  const riskLevel: ChurnScore["riskLevel"] =
    risk >= 0.75 ? "critical" : risk >= 0.5 ? "high" : risk >= 0.25 ? "medium" : "low"

  const primaryFactors: string[] = []
  if (features.recencyDays > 30) primaryFactors.push("Low recency")
  if (features.frequency30d < 2) primaryFactors.push("Low engagement")
  if (features.frequency7d === 0) primaryFactors.push("No activity this week")
  if (features.monetary30d === 0) primaryFactors.push("Zero monetary value")
  if (features.identityConfidence < 0.5) primaryFactors.push("Weak identity signal")
  if (features.recencyDays > 90) primaryFactors.push("Extended dormancy")

  return { risk, riskLevel, primaryFactors }
}

export function computeLTVScore(features: CustomerFeatures): LTVScore {
  const baseLtv =
    features.monetary30d * 3.5 +
    features.frequency30d * 12 +
    features.sessionCount * 5 +
    features.categoryAffinities.luxury * 50 +
    features.categoryAffinities.finance * 40 +
    (features.lifecycleStage === "VIP" ? 200 : 0) +
    (features.identityConfidence > 0.8 ? 100 : 0)

  const predictedLtv = Math.max(0, Math.round(baseLtv * 100) / 100)

  const percentile = Math.min(99, Math.round(normalizeMono(predictedLtv, 0, 2000, true) * 100))

  const tier: LTVScore["tier"] =
    percentile >= 90 ? "premium" : percentile >= 70 ? "high" : percentile >= 40 ? "medium" : "low"

  return { predictedLtv, percentile, tier }
}

export function computeChannelPreferences(features: CustomerFeatures): ChannelPreferenceScore[] {
  const total = Object.values(features.channelDistribution).reduce((a, b) => a + b, 0)
  if (total === 0) {
    return [
      { channel: "email", score: 0.25, rank: 1 },
      { channel: "web", score: 0.25, rank: 2 },
      { channel: "push", score: 0.25, rank: 3 },
      { channel: "sms", score: 0.25, rank: 4 },
    ]
  }

  const preferences: ChannelPreferenceScore[] = Object.entries(features.channelDistribution)
    .map(([channel, count]) => ({
      channel,
      score: count / total,
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }))

  return preferences
}

export function scoreCustomer(features: CustomerFeatures): CustomerScoringResult {
  return {
    customerId: features.customerId,
    churn: computeChurnScore(features),
    ltv: computeLTVScore(features),
    channelPreferences: computeChannelPreferences(features),
  }
}

export function scoreCustomerBatch(
  features: CustomerFeatures[]
): CustomerScoringResult[] {
  return features.map(scoreCustomer)
}

function normalizeMono(
  value: number,
  min: number,
  max: number,
  inverted: boolean
): number {
  if (max <= min) return 0.5
  const raw = (value - min) / (max - min)
  const clamped = Math.max(0, Math.min(1, raw))
  return inverted ? 1 - clamped : clamped
}
