export interface CTRPredictionInput {
  headline: string
  body: string
  cta: string
  channel: string
  segmentFeatures: {
    avgRecency: number
    avgFrequency: number
    avgLtv: number
    churnRate: number
  }
  brandSafetyScore: number
  complianceScore: number
}

export interface CTRPredictionResult {
  predictedCtr: number
  confidence: number
  contributingFactors: Record<string, number>
}

const HEADLINE_LENGTH_OPTIMAL = 60
const BODY_LENGTH_OPTIMAL = 150
const CTA_POWER_WORDS = [
  "free", "exclusive", "limited", "now", "today",
  "instant", "guaranteed", "save", "discover", "unlock",
]

const CTA_STRONG_WORDS = ["shop", "get", "try", "see", "start", "join", "claim"]

function countPowerWords(text: string): number {
  const lower = text.toLowerCase()
  return CTA_POWER_WORDS.filter((w) => lower.includes(w)).length
}

function countStrongWords(text: string): number {
  const lower = text.toLowerCase()
  return CTA_STRONG_WORDS.filter((w) => lower.includes(w)).length
}

function headlineQuality(headline: string): number {
  const len = headline.length
  const lenScore = 1 - Math.abs(len - HEADLINE_LENGTH_OPTIMAL) / HEADLINE_LENGTH_OPTIMAL
  const powerScore = Math.min(1, countPowerWords(headline) * 0.2)
  const hasQuestion = headline.includes("?") ? 0.1 : 0
  const hasNumbers = /\d/.test(headline) ? 0.1 : 0
  return Math.max(0, Math.min(1, lenScore * 0.4 + powerScore * 0.3 + hasQuestion + hasNumbers))
}

function bodyQuality(body: string): number {
  const len = body.length
  const lenScore = 1 - Math.abs(len - BODY_LENGTH_OPTIMAL) / BODY_LENGTH_OPTIMAL
  const powerScore = Math.min(1, countPowerWords(body) * 0.15)
  const strongScore = Math.min(1, countStrongWords(body) * 0.15)
  return Math.max(0, Math.min(1, lenScore * 0.4 + powerScore * 0.3 + strongScore * 0.3))
}

function ctaQuality(cta: string): number {
  const lenScore = cta.length >= 2 && cta.length <= 5 ? 1 : cta.length <= 8 ? 0.7 : 0.3
  const actionScore = countStrongWords(cta) > 0 ? 0.3 : 0
  const urgencyScore = countPowerWords(cta) > 0 ? 0.2 : 0
  return Math.max(0, Math.min(1, lenScore * 0.5 + actionScore + urgencyScore))
}

function channelBoost(channel: string): number {
  const boosts: Record<string, number> = {
    email: 1.0,
    push: 1.1,
    sms: 0.85,
    web: 0.95,
    ads: 0.9,
  }
  return boosts[channel] ?? 0.9
}

export function predictCTR(input: CTRPredictionInput): CTRPredictionResult {
  const headlineScore = headlineQuality(input.headline)
  const bodyScore = bodyQuality(input.body)
  const ctaScore = ctaQuality(input.cta)
  const channelFactor = channelBoost(input.channel)
  const safetyFactor = input.brandSafetyScore
  const complianceFactor = input.complianceScore

  const segmentRecencyFactor = Math.max(0, 1 - input.segmentFeatures.avgRecency / 365)
  const segmentFrequencyFactor = Math.min(1, input.segmentFeatures.avgFrequency / 20)
  const segmentLtvFactor = Math.min(1, input.segmentFeatures.avgLtv / 1000)
  const churnPenalty = input.segmentFeatures.churnRate > 0.5 ? 0.85 : 1.0

  const baseline = 0.03

  const predictedCtr =
    baseline *
    (1 + headlineScore * 0.4) *
    (1 + bodyScore * 0.2) *
    (1 + ctaScore * 0.25) *
    channelFactor *
    safetyFactor *
    complianceFactor *
    churnPenalty *
    (0.8 + segmentRecencyFactor * 0.2) *
    (0.8 + segmentFrequencyFactor * 0.2) *
    (0.8 + segmentLtvFactor * 0.2)

  const clippedCtr = Math.min(0.25, Math.max(0.001, predictedCtr))

  const variance =
    (1 - headlineScore) * 0.02 +
    (1 - bodyScore) * 0.01 +
    (1 - ctaScore) * 0.015 +
    (1 - safetyFactor) * 0.03 +
    (1 - complianceFactor) * 0.02

  const confidence = Math.max(0.3, Math.min(0.95, 1 - variance))

  return {
    predictedCtr: Math.round(clippedCtr * 1000) / 1000,
    confidence: Math.round(confidence * 100) / 100,
    contributingFactors: {
      headlineQuality: headlineScore,
      bodyQuality: bodyScore,
      ctaQuality: ctaScore,
      channelFactor,
      brandSafety: safetyFactor,
      compliance: complianceFactor,
      segmentRecency: segmentRecencyFactor,
      segmentFrequency: segmentFrequencyFactor,
      segmentLtv: segmentLtvFactor,
    },
  }
}

export function rankVariantsByCTR(
  variants: Array<{
    headline: string
    body: string
    cta: string
    channel: string
    brandSafetyScore: number
    complianceScore: number
  }>,
  segmentFeatures: CTRPredictionInput["segmentFeatures"]
): Array<{ index: number; ctr: number; confidence: number } & (typeof variants[0])> {
  return variants
    .map((v, i) => {
      const result = predictCTR({
        headline: v.headline,
        body: v.body,
        cta: v.cta,
        channel: v.channel,
        segmentFeatures,
        brandSafetyScore: v.brandSafetyScore,
        complianceScore: v.complianceScore,
      })
      return { ...v, index: i, ctr: result.predictedCtr, confidence: result.confidence }
    })
    .sort((a, b) => b.ctr - a.ctr)
}
