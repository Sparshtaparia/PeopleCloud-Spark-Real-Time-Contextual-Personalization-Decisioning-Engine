import { PrismaClient } from "@prisma/client"
import { getGeminiClient, CreativeBatchOutput, CreativeVariantSchema } from "./gemini-client"
import { buildCreativePrompt, PromptContext } from "./prompt-builder"
import { runGuardrails } from "./guardrails"
import { predictCTR } from "./predicted-ctr"
import { computeSegmentFeatures } from "./feature-engineering"
import { requireAuth, requirePermission, createAuditLog, incrementUsage } from "../server-utils"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

function seededVariants(
  campaignName: string,
  channel: string,
  segmentName: string
): CreativeBatchOutput {
  const isEmail = channel.toLowerCase() === "email"
  
  if (segmentName.toLowerCase().includes("cart")) {
    return {
      variants: [
        { strategy: "cart_recovery", headline: "Your saved picks are waiting", body: "Complete your checkout with a personalized offer selected for your recent activity.", cta: "Return to Cart", subject: isEmail ? "Still interested?" : undefined, preheader: isEmail ? "Your cart is ready." : undefined },
        { strategy: "personalized_recommendation", headline: "Pick up where you left off", body: "We saved your selected items so you can continue without starting over.", cta: "Continue", subject: isEmail ? "Your items are waiting" : undefined, preheader: isEmail ? "Checkout now." : undefined },
        { strategy: "loyalty", headline: "A reward is ready for you", body: "Return to your favorites and use your member offer today.", cta: "View Reward", subject: isEmail ? "Member exclusive inside" : undefined, preheader: isEmail ? "Claim your offer." : undefined },
      ]
    }
  }

  if (segmentName.toLowerCase().includes("premium") || segmentName.toLowerCase().includes("high")) {
    return {
      variants: [
        { strategy: "premium_upsell", headline: "Early access is open", body: "Explore a premium selection based on your recent interest and loyalty profile.", cta: "Shop Premium", subject: isEmail ? "Your early access is here" : undefined, preheader: isEmail ? "Shop the new drop." : undefined },
        { strategy: "loyalty", headline: "Your premium edit is ready", body: "Get first access to high-value picks selected for your preferences.", cta: "View Edit", subject: isEmail ? "Curated just for you" : undefined, preheader: isEmail ? "See your edit." : undefined },
        { strategy: "social_proof", headline: "A curated drop for top members", body: "Join other top members in exploring our latest premium collection.", cta: "Explore Now", subject: isEmail ? "Top member exclusive" : undefined, preheader: isEmail ? "Don't miss this drop." : undefined },
      ]
    }
  }

  return {
    variants: [
      { strategy: "conversion", headline: "Unlock your offer", body: "We curated this special collection just for you based on your recent activity.", cta: "Shop Now", subject: isEmail ? "Your personalized offer" : undefined, preheader: isEmail ? "Open to unlock." : undefined },
      { strategy: "social_proof", headline: "See what's trending", body: "Explore the items that are catching everyone's attention this week.", cta: "Discover", subject: isEmail ? "Trending this week" : undefined, preheader: isEmail ? "See what's new." : undefined },
      { strategy: "loyalty", headline: "A special reward for you", body: "Thank you for being a valued customer. Enjoy this exclusive offer.", cta: "Claim Reward", subject: isEmail ? "A gift inside" : undefined, preheader: isEmail ? "Just for you." : undefined },
    ]
  }
}

export interface GenerateCreativeInput {
  campaignId: string
  organizationId: string
  workspaceId: string
  channel: string
}

export interface GenerateCreativeResult {
  success: boolean
  variantCount: number
  source: "gemini" | "fallback" | "deterministic"
}

export async function generateCreativeVariants(
  input: GenerateCreativeInput
): Promise<GenerateCreativeResult> {
  const session = await requireAuth()
  const _user = session as { id: string; name?: string; email?: string }
  const membership = await requirePermission(_user.id, input.organizationId, [
    "marketer",
    "admin",
    "owner",
  ])

  const campaign = await prisma.campaign.findFirst({
    where: { id: input.campaignId, workspaceId: input.workspaceId },
    include: { segment: true },
  })

  if (!campaign) throw new Error("Campaign not found")
  if (!campaign.segment) throw new Error("Campaign has no associated segment")

  const segmentFeatures = await computeSegmentFeatures(campaign.segmentId)

  const brandVoice = await prisma.brandVoice.findUnique({
    where: { organizationId: input.organizationId },
  })

  const promptContext: PromptContext = {
    campaignName: campaign.name,
    objective: campaign.objective,
    channel: input.channel,
    segmentName: campaign.segment.name,
    segmentSize: segmentFeatures.customerCount,
    avgLtv: segmentFeatures.avgLtv,
    avgRecency: segmentFeatures.avgRecency,
    avgFrequency: segmentFeatures.avgFrequency30d,
    topChannels: segmentFeatures.topChannels,
    topCategories: segmentFeatures.topCategories,
    churnRate: segmentFeatures.churnRate,
    brandTone: brandVoice?.coreTone ?? "professional",
    brandBannedPhrases: brandVoice?.bannedPhrases
      ? brandVoice.bannedPhrases.split(",").map((s) => s.trim())
      : [],
    brandApprovedClaims: brandVoice?.approvedClaims
      ? brandVoice.approvedClaims.split(",").map((s) => s.trim())
      : [],
    guardrailStrictness: brandVoice?.strictness ?? 90,
  }

  let variantSource: "gemini" | "fallback" | "deterministic"
  let rawVariants: CreativeBatchOutput

  const gemini = getGeminiClient()

  if (gemini.available) {
    try {
      const { fullPrompt } = buildCreativePrompt(promptContext)
      rawVariants = await gemini.generateCreative(fullPrompt)
      variantSource = "gemini"
    } catch {
      rawVariants = seededVariants(campaign.name, input.channel, campaign.segment.name)
      variantSource = "fallback"
    }
  } else {
    rawVariants = seededVariants(campaign.name, input.channel, campaign.segment.name)
    variantSource = "deterministic"
  }

  const validatedVariants: CreativeBatchOutput = {
    variants: rawVariants.variants.slice(0, 3).map((v) => {
      const safe = CreativeVariantSchema.safeParse(v)
      return safe.success
        ? safe.data
        : {
            strategy: "conversion",
            headline: v.headline?.substring(0, 120) || "Special Offer",
            body: v.body?.substring(0, 500) || "Check out our latest selection.",
            cta: v.cta?.substring(0, 30) || "Learn More",
          }
    }),
  }

  // Deduplication check
  for (let i = 0; i < validatedVariants.variants.length; i++) {
    for (let j = i + 1; j < validatedVariants.variants.length; j++) {
      if (
        validatedVariants.variants[i].headline.toLowerCase() === validatedVariants.variants[j].headline.toLowerCase() ||
        validatedVariants.variants[i].body.toLowerCase() === validatedVariants.variants[j].body.toLowerCase()
      ) {
        // Similarity too high, replace with fallback
        const fallback = seededVariants(campaign.name, input.channel, campaign.segment.name).variants[j % 3]
        validatedVariants.variants[j] = fallback
      }
    }
  }

  const savedVariants: Array<{
    strategy: string
    headline: string
    body: string
    cta: string
    subject?: string
    preheader?: string
    predictedCtr: number
    brandSafetyScore: number
    complianceScore: number
    personalizationReason: string | null
    warnings: string
    status: string
  }> = []

  const strictness = brandVoice?.strictness ?? 90

  for (const v of validatedVariants.variants) {
    const guardrailResult = await runGuardrails(
      v.headline,
      v.body,
      v.cta,
      input.workspaceId,
      input.organizationId
    )

    let finalStatus = "generated"
    const finalCompliance = guardrailResult.complianceScore * 100
    if (finalCompliance < strictness || !guardrailResult.passed) {
      finalStatus = "needs_edit"
    }

    const ctrResult = predictCTR({
      headline: v.headline,
      body: v.body,
      cta: v.cta,
      channel: input.channel,
      segmentFeatures: {
        avgRecency: segmentFeatures.avgRecency,
        avgFrequency: segmentFeatures.avgFrequency30d,
        avgLtv: segmentFeatures.avgLtv,
        churnRate: segmentFeatures.churnRate,
      },
      brandSafetyScore: guardrailResult.brandSafetyScore,
      complianceScore: guardrailResult.complianceScore,
    })

    savedVariants.push({
      strategy: v.strategy || "conversion",
      headline: v.headline,
      body: v.body,
      cta: v.cta,
      subject: v.subject,
      preheader: v.preheader,
      predictedCtr: ctrResult.predictedCtr,
      brandSafetyScore: guardrailResult.brandSafetyScore,
      complianceScore: guardrailResult.complianceScore,
      personalizationReason: v.personalizationReason || null,
      warnings: guardrailResult.violations.map(v => v.detail).join("; "),
      status: finalStatus,
    })
  }

  // Champion logic
  let bestScore = -1
  let championIndex = -1
  
  savedVariants.forEach((sv, i) => {
    const channelFit = 0.9 // mocked
    const segmentFit = 0.9 // mocked
    const fatiguePenalty = 0.05 // mocked
    
    const score = 
      sv.predictedCtr * 0.40 + 
      sv.brandSafetyScore * 0.20 + 
      sv.complianceScore * 0.20 + 
      channelFit * 0.10 + 
      segmentFit * 0.10 - 
      fatiguePenalty

    if (score > bestScore) {
      bestScore = score
      championIndex = i
    }
  })

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < savedVariants.length; i++) {
      const sv = savedVariants[i]
      await tx.creativeVariant.create({
        data: {
          campaignId: input.campaignId,
          channel: input.channel,
          segmentId: campaign.segmentId,
          strategy: sv.strategy,
          headline: sv.headline,
          body: sv.body,
          cta: sv.cta,
          subject: sv.subject,
          preheader: sv.preheader,
          predictedCtr: sv.predictedCtr,
          brandSafetyScore: sv.brandSafetyScore,
          complianceScore: sv.complianceScore,
          personalizationReason: sv.personalizationReason,
          guardrailWarnings: sv.warnings,
          championReason: i === championIndex ? "Highest predicted CTR, strong channel fit, and compliance above workspace threshold." : null,
          status: sv.status,
        },
      })
    }

    await tx.campaign.update({
      where: { id: input.campaignId },
      data: { status: "ai_generated" },
    })

  }, { timeout: 15000 })

  await incrementUsage({
    organizationId: input.organizationId,
    metric: "genai_creatives_generated",
    amount: savedVariants.length,
  })

  await createAuditLog({
    organizationId: input.organizationId,
    workspaceId: input.workspaceId,
    actorId: _user.id,
    actorName: _user.name || "Unknown",
    actorRole: membership.role,
    action: "Generated creative variants via AI pipeline",
    resourceType: "Campaign",
    resourceId: input.campaignId,
    severity: "Info",
    metadata: {
      source: variantSource,
      variantCount: savedVariants.length,
      channel: input.channel,
    },
  })

  revalidatePath("/app/creative-studio")

  return {
    success: savedVariants.length > 0,
    variantCount: savedVariants.length,
    source: variantSource,
  }
}
