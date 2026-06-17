export interface PromptContext {
  campaignName: string
  objective: string
  channel: string
  segmentName: string
  segmentSize: number
  avgLtv: number
  avgRecency: number
  avgFrequency: number
  topChannels: string[]
  topCategories: string[]
  churnRate: number
  brandTone: string
  brandBannedPhrases: string[]
  brandApprovedClaims: string[]
  guardrailStrictness: number
  customerLifecycleStage?: string
  fatigueLevel?: string
}

export interface BuiltPrompt {
  systemPrompt: string
  userPrompt: string
  fullPrompt: string
}

export function buildCreativePrompt(context: PromptContext): BuiltPrompt {
  let channelFormatting = ""
  if (context.channel.toLowerCase() === "email") {
    channelFormatting = "- Email variants MUST include 'subject' and 'preheader' fields."
  } else if (context.channel.toLowerCase().includes("push")) {
    channelFormatting = "- App Push variants MUST have short titles (mapped to 'headline' max 45 chars) and bodies (max 90 chars)."
  } else if (context.channel.toLowerCase() === "sms") {
    channelFormatting = "- SMS variants MUST have very short body texts (max 160 chars) and a short CTA."
  }

  const systemPrompt = `You are a brand-safe marketing creative generator for PeopleCloud Spark.
Your output must be valid JSON matching this schema:
{
  "variants": [
    {
      "strategy": "string (one of: conversion, cart_recovery, premium_upsell, loyalty, winback, urgency_safe, social_proof, personalized_recommendation)",
      "headline": "string (contextual title/headline)",
      "body": "string",
      "cta": "string",
      "subject": "string (optional, only if Email)",
      "preheader": "string (optional, only if Email)",
      "personalizationReason": "string (Explain why this variant matches the segment/offer)"
    }
  ]
}

Rules:
- Generate exactly 3 variants.
- Each variant MUST use a DIFFERENT strategy.
- Every variant must be meaningfully different from the others (do not duplicate headlines or bodies).
- Every variant must mention or imply the selected campaign/offer/segment context.
- Never include PII.
- Stay on-brand with the provided tone.
- Do NOT use banned phrases.
- Do NOT use artificial urgency unless explicitly allowed.
${channelFormatting}`

  const userPrompt = `Generate creative variants for the following campaign:

Campaign: "${context.campaignName}"
Objective: "${context.objective}"
Channel: "${context.channel}"

Target Segment: "${context.segmentName}"
Segment Size: ${context.segmentSize}
Average LTV: $${context.avgLtv}
Average Recency: ${Math.round(context.avgRecency)} days
Average Frequency (30d): ${Math.round(context.avgFrequency)}
Top Channels: ${context.topChannels.join(", ")}
Top Categories: ${context.topCategories.join(", ")}
Churn Rate: ${(context.churnRate * 100).toFixed(0)}%

Brand Voice
Tone: "${context.brandTone}"
Approved Claims: ${context.brandApprovedClaims.join(", ")}
Banned Phrases: ${context.brandBannedPhrases.join(", ")}
Strictness Level: ${context.guardrailStrictness}/100

${
  context.customerLifecycleStage
    ? `Customer Lifecycle Stage: ${context.customerLifecycleStage}`
    : ""
}
${
  context.fatigueLevel && context.fatigueLevel !== "none"
    ? `Audience Fatigue Level: ${context.fatigueLevel} (consider gentle, spaced messaging)`
    : ""
}

Produce exactly 3 JSON variants.`

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

  return { systemPrompt, userPrompt, fullPrompt }
}

export function buildExperimentSummaryPrompt(experimentData: {
  name: string
  type: string
  duration: string
  variantCount: number
  variantData: Array<{ name: string; impressions: number; clicks: number; conversions: number; ctr: number }>
  winner?: string
}): BuiltPrompt {
  const systemPrompt = `You are a marketing experiment analyst for PeopleCloud Spark.
Summarize A/B test and bandit experiment results in clear, actionable language for marketers.
Output valid JSON matching:
{
  "summary": "string (10-1000 chars)",
  "recommendation": "string (10-500 chars)",
  "keyInsight": "string (10-300 chars)"
}`

  const variantTable = experimentData.variantData
    .map(
      (v) =>
        `- ${v.name}: ${v.impressions} impressions, ${v.clicks} clicks, ${v.conversions} conversions, ${(v.ctr * 100).toFixed(2)}% CTR`
    )
    .join("\n")

  const userPrompt = `Experiment: "${experimentData.name}"
Type: ${experimentData.type}
Duration: ${experimentData.duration}
Variants: ${experimentData.variantCount}

Results:
${variantTable}

${experimentData.winner ? `Preliminary Winner: ${experimentData.winner}` : "No clear winner yet."}`

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`
  return { systemPrompt, userPrompt, fullPrompt }
}

export function buildExplanationPrompt(
  metricName: string,
  metricValue: string,
  context: string
): BuiltPrompt {
  const systemPrompt = `You are a marketing analytics explainer for PeopleCloud Spark.
Explain metrics in plain language for non-technical marketers. Keep responses under 3 sentences.`

  const userPrompt = `Explain this metric:
Metric: ${metricName}
Value: ${metricValue}
Context: ${context}`

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`
  return { systemPrompt, userPrompt, fullPrompt }
}
