import { CustomerFeatures } from "./feature-engineering"
import { CustomerScoringResult, scoreCustomer } from "./scoring"

export type ActionChannel = "email" | "web" | "push" | "sms" | "ads"

export interface Action {
  id: string
  offer: string
  channel: ActionChannel
  score: number
  confidence: number
  reasons: string[]
  priority: number
}

export type OfferType =
  | "welcome_series"
  | "abandoned_cart"
  | "browse_retarget"
  | "loyalty_reward"
  | "win_back"
  | "cross_sell"
  | "upsell"
  | "replenishment"
  | "birthday"
  | "feedback_request"
  | "reengagement"
  | "premium_invite"

const OFFER_RULES: Array<{
  offer: OfferType
  label: string
  condition: (f: CustomerFeatures, s: CustomerScoringResult) => boolean
  baseScore: number
  preferredChannels: ActionChannel[]
}> = [
  {
    offer: "welcome_series",
    label: "Welcome Series",
    condition: (f) => f.lifecycleStage === "New" && f.frequency30d <= 2,
    baseScore: 0.95,
    preferredChannels: ["email", "web"],
  },
  {
    offer: "abandoned_cart",
    label: "Abandoned Cart",
    condition: (f) =>
      f.eventTypeDistribution.cart_add > 0 &&
      f.eventTypeDistribution.purchase === undefined &&
      f.recencyDays < 7,
    baseScore: 0.92,
    preferredChannels: ["email", "push"],
  },
  {
    offer: "browse_retarget",
    label: "Browse Retarget",
    condition: (f) =>
      (f.eventTypeDistribution.page_view || 0) > 3 &&
      f.eventTypeDistribution.purchase === undefined &&
      f.recencyDays < 3,
    baseScore: 0.7,
    preferredChannels: ["web", "ads"],
  },
  {
    offer: "loyalty_reward",
    label: "Loyalty Reward",
    condition: (f, s) =>
      s.ltv.tier === "premium" || s.ltv.tier === "high",
    baseScore: 0.85,
    preferredChannels: ["email", "push"],
  },
  {
    offer: "win_back",
    label: "Win Back",
    condition: (f) =>
      f.lifecycleStage === "Churned" ||
      (f.recencyDays > 30 && f.recencyDays <= 90),
    baseScore: 0.5,
    preferredChannels: ["email", "sms"],
  },
  {
    offer: "cross_sell",
    label: "Cross Sell",
    condition: (f) =>
      f.eventTypeDistribution.purchase !== undefined &&
      Object.keys(f.categoryAffinities).length > 0,
    baseScore: 0.6,
    preferredChannels: ["email", "web"],
  },
  {
    offer: "upsell",
    label: "Upsell",
    condition: (f, s) =>
      (s.ltv.tier === "high" || s.ltv.tier === "premium") &&
      f.monetary30d > 100,
    baseScore: 0.65,
    preferredChannels: ["email", "push"],
  },
  {
    offer: "replenishment",
    label: "Replenishment",
    condition: (f) =>
      f.eventTypeDistribution.purchase !== undefined &&
      (f.categoryAffinities.essentials || 0) > 0,
    baseScore: 0.75,
    preferredChannels: ["email", "push"],
  },
  {
    offer: "reengagement",
    label: "Re-engagement",
    condition: (f) =>
      f.recencyDays >= 14 && f.recencyDays <= 60 && f.frequency30d === 0,
    baseScore: 0.45,
    preferredChannels: ["email", "sms", "push"],
  },
  {
    offer: "premium_invite",
    label: "Premium Invite",
    condition: (f, s) => s.ltv.tier === "premium" && f.monetary30d > 300,
    baseScore: 0.55,
    preferredChannels: ["email"],
  },
  {
    offer: "feedback_request",
    label: "Feedback Request",
    condition: (f) =>
      (f.eventTypeDistribution.purchase || 0) > 2,
    baseScore: 0.35,
    preferredChannels: ["email", "web"],
  },
  {
    offer: "birthday",
    label: "Birthday",
    condition: () => false,
    baseScore: 0.8,
    preferredChannels: ["email", "push"],
  },
]

export function determineNextBestAction(
  features: CustomerFeatures
): { actions: Action[]; topAction: Action } {
  const scoring = scoreCustomer(features)
  const offers: Action[] = []
  const churnBoost = scoring.churn.risk > 0.6 ? 0.15 : 0
  const ltvBoost =
    scoring.ltv.tier === "premium" ? 0.1 : scoring.ltv.tier === "high" ? 0.05 : 0

  for (const rule of OFFER_RULES) {
    const matched = rule.condition(features, scoring)
    if (!matched) continue

    const bestChannel = findBestChannel(rule.preferredChannels, scoring.channelPreferences)
    const channelScore = scoring.channelPreferences.find(
      (p) => p.channel === bestChannel
    )?.score ?? 0.5

    let score = rule.baseScore + churnBoost + ltvBoost + channelScore * 0.1
    if (scoring.churn.riskLevel === "critical") score -= 0.2

    score = Math.max(0, Math.min(1, score))

    const reasons: string[] = []
    if (scoring.churn.risk > 0.5) reasons.push(`Churn risk: ${scoring.churn.riskLevel}`)
    if (scoring.ltv.tier !== "low") reasons.push(`LTV tier: ${scoring.ltv.tier}`)
    reasons.push(`Best channel: ${bestChannel}`)

    offers.push({
      id: `${features.customerId}_${rule.offer}`,
      offer: rule.offer,
      channel: bestChannel,
      score,
      confidence: scoring.churn.risk < 0.3 ? 0.85 : 0.65,
      reasons,
      priority: 0,
    })
  }

  offers.sort((a, b) => b.score - a.score)
  const ranked = offers.map((o, i) => ({ ...o, priority: i + 1 }))

  return {
    actions: ranked,
    topAction:
      ranked.length > 0
        ? ranked[0]
        : {
            id: `${features.customerId}_default`,
            offer: "general_engagement",
            channel: "email" as ActionChannel,
            score: 0.3,
            confidence: 0.5,
            reasons: ["No specific trigger matched"],
            priority: 1,
          },
  }
}

export function rankActionsForSegment(
  featuresList: CustomerFeatures[]
): Map<string, Action[]> {
  const ranked = new Map<string, Action[]>()
  for (const f of featuresList) {
    const { actions } = determineNextBestAction(f)
    ranked.set(f.customerId, actions)
  }
  return ranked
}

function findBestChannel(
  preferred: ActionChannel[],
  preferences: { channel: string; score: number }[]
): ActionChannel {
  const prefSet = new Set(preferred)
  const matching = preferences.filter((p) => prefSet.has(p.channel as ActionChannel))
  if (matching.length > 0) {
    return matching.sort((a, b) => b.score - a.score)[0].channel as ActionChannel
  }
  return preferred[0] || "email"
}
