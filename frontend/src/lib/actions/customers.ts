"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "../server-utils"
import { getGeminiClient } from "@/lib/ai/gemini-client"

export async function getCustomers(workspaceId: string) {
  const user = await requireAuth()
  return await prisma.customer.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" }
  })
}

export async function getCustomerDetails(customerId: string) {
  const user = await requireAuth()
  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  })
  
  if (!customer) return null
  
  const affinities = customer.categoryAffinities 
    ? JSON.parse(customer.categoryAffinities)
    : { "Unknown": 0 }

  const topAffinity = Object.entries(affinities as Record<string, number>)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || "general"

  const nextBestAction = getActionLabel(customer.lifecycleStage)
  const fallbackExplanation = getActionDescription(customer.lifecycleStage, topAffinity)

  const gemini = getGeminiClient()
  let aiExplanation = fallbackExplanation
  if (gemini.available) {
    try {
      aiExplanation = await gemini.generateNaturalLanguageExplanation(
        `Customer lifecycle=${customer.lifecycleStage}, top affinity=${topAffinity}, LTV=$${customer.predictedLtv}, churnRisk=${customer.churnRisk}. Generate a personalized next-best-action explanation.`
      )
    } catch {}
  }

  return {
    ...customer,
    parsedAffinities: affinities,
    nextBestAction,
    aiExplanation
  }
}

function getActionLabel(stage: string | null): string {
  switch (stage) {
    case "cart_abandoner": return "Send Cart Recovery Offer"
    case "churn_risk":
    case "At Risk":
    case "Churned": return "Send Win-Back Discount"
    case "loyal_customer":
    case "Loyalist":
    case "premium_value": return "Early Access Loyalty Drop"
    case "high_intent":
    case "active_browser": return "High Intent Conversion Offer"
    case "New":
    case "Active": return "Welcome & Onboarding Series"
    case "suppressed": return "Re-engagement Campaign"
    default: return "Explore Collection"
  }
}

function getActionDescription(stage: string | null, topAffinity: string): string {
  switch (stage) {
    case "cart_abandoner":
      return `Personalized cart recovery offer for abandoned ${topAffinity} items, driven by recent intent signals and predicted purchase window.`
    case "churn_risk":
    case "At Risk":
      return `Win-back discount tailored to ${topAffinity} category engagement history, designed to re-activate declining interaction patterns.`
    case "Churned":
      return `Re-engagement campaign for lapsed ${topAffinity} customers, offering a compelling incentive to return and rebuild relationship.`
    case "loyal_customer":
    case "Loyalist":
      return `Early access loyalty drop for ${topAffinity} with premium tier benefits, maximizing lifetime value through exclusive offers.`
    case "premium_value":
      return `Premium-tier loyalty offer for high-value ${topAffinity} customers, with exclusive perks and early access to new collections.`
    case "high_intent":
      return `Personalized conversion offer triggered by recent high-intent ${topAffinity} navigation and predicted affinity spike.`
    case "active_browser":
      return `Real-time browsing-based recommendation for ${topAffinity} products, capturing active consideration intent.`
    case "New":
      return `Onboarding flow introducing ${topAffinity} category highlights, designed to build engagement momentum from first interaction.`
    case "Active":
      return `Sustained engagement campaign for active ${topAffinity} customers, with personalized cross-sell and upsell opportunities.`
    case "suppressed":
      return `Sensitive re-engagement outreach for previously suppressed ${topAffinity} segment, with adjusted frequency and channel preferences.`
    default:
      return `Recommended ${topAffinity} discovery based on profile analysis and predicted category affinity.`
  }
}
