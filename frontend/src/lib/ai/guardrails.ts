import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export interface GuardrailResult {
  passed: boolean
  brandSafetyScore: number
  complianceScore: number
  violations: GuardrailViolation[]
  warnings: string[]
}

export interface GuardrailViolation {
  rule: string
  severity: "block" | "warn"
  detail: string
}

const BANNED_PATTERNS = [
  /\b(guaranteed?|100%[-\s]?success|no[-\s]risk|risk[-\s]free|money[-\s]back[-\s]guarantee)\b/i,
  /\b(click[-\s]bait|you[-\s]won['']t[-\s]believe|shocking|mind[-\s]blowing)\b/i,
  /\b(buy[-\s]now[!]+|act[-\s]now[!]+|limited[-\s]time[!]+|hurry[!]+)\b/i,
]

const COMPETITOR_MENTIONS = [
  /\bsalesforce\b/i,
  /\bhubspot\b/i,
  /\bsegment\b/i,
  /\bmparticle\b/i,
  /\boptimizely\b/i,
]

const SENSITIVE_TOPICS = [
  /\b(health[-\s]?care|medical|diagnosis|treatment|disease)\b/i,
  /\b(insurance|coverage|policy|premium)\b/i,
  /\b(investment|stock|trading|dividend|return[-\s]on[-\s]investment)\b/i,
  /\b(loan|credit[-\s]?score|debt|mortgage|refinance)\b/i,
  /\b(religion|religious|prayer|church|faith)\b/i,
  /\b(politics|political|election|campaign|party|vote)\b/i,
]

export async function runGuardrails(
  headline: string,
  body: string,
  cta: string,
  workspaceId: string,
  organizationId: string
): Promise<GuardrailResult> {
  const violations: GuardrailViolation[] = []
  const warnings: string[] = []
  const fullText = `${headline} ${body} ${cta}`

  const dbRules = await prisma.guardrailRule.findMany({
    where: { workspaceId, isActive: true },
  })

  const brandVoice = await prisma.brandVoice.findUnique({
    where: { organizationId },
  })

  const strictness = brandVoice?.strictness ?? 90
  const bannedFromBrand = brandVoice?.bannedPhrases
    ? brandVoice.bannedPhrases.split(",").map((s) => s.trim()).filter(Boolean)
    : []
  const approvedClaims = brandVoice?.approvedClaims
    ? brandVoice.approvedClaims.split(",").map((s) => s.trim()).filter(Boolean)
    : []
  const coreTone = brandVoice?.coreTone ?? "professional"

  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(fullText)) {
      violations.push({
        rule: "Banned Marketing Pattern",
        severity: "block",
        detail: `Text contains a banned marketing pattern: ${pattern}`,
      })
    }
  }

  for (const pattern of COMPETITOR_MENTIONS) {
    if (pattern.test(fullText)) {
      violations.push({
        rule: "Competitor Mention",
        severity: "warn",
        detail: `Text may reference a competitor`,
      })
    }
  }

  for (const pattern of SENSITIVE_TOPICS) {
    if (pattern.test(fullText)) {
      violations.push({
        rule: "Sensitive Topic",
        severity: "block",
        detail: `Text touches a sensitive topic: ${pattern}`,
      })
    }
  }

  for (const banned of bannedFromBrand) {
    if (banned && fullText.toLowerCase().includes(banned.toLowerCase())) {
      violations.push({
        rule: "Brand Banned Phrase",
        severity: "block",
        detail: `Contains brand-banned phrase: "${banned}"`,
      })
    }
  }

  if (approvedClaims.length > 0) {
    const foundClaims = approvedClaims.filter((claim) =>
      fullText.toLowerCase().includes(claim.toLowerCase())
    )
    if (foundClaims.length === 0 && strictness >= 80) {
      warnings.push(
        `None of the approved claims (${approvedClaims.join(", ")}) were included in the copy`
      )
    }
  }

  for (const rule of dbRules) {
    if (fullText.toLowerCase().includes(rule.name.toLowerCase())) {
      violations.push({
        rule: rule.name,
        severity: "warn",
        detail: `Matched guardrail rule: ${rule.name}`,
      })
    }
  }

  const blockedCount = violations.filter((v) => v.severity === "block").length
  const warnCount = violations.filter((v) => v.severity === "warn").length + warnings.length

  const brandSafetyScore = Math.max(
    0,
    Math.min(1, 1 - blockedCount * 0.15 - warnCount * 0.05)
  )

  let compliancePenalty = calculateCompliancePenalty(headline, body, cta, coreTone, strictness)
  
  if (blockedCount > 0) {
    compliancePenalty += 0.20 // Drop compliance strictly for blocked terms
  }

  const complianceScore = Math.max(0, Math.min(1, 1 - compliancePenalty))

  const passed = brandSafetyScore >= 0.5 // We allow saving to DB but it will be flagged as needs_edit later if compliance is low

  return {
    passed,
    brandSafetyScore: Math.round(brandSafetyScore * 100) / 100,
    complianceScore: Math.round(complianceScore * 100) / 100,
    violations,
    warnings,
  }
}

export function quickGuardrailCheck(
  headline: string,
  body: string,
  cta: string
): GuardrailResult {
  const violations: GuardrailViolation[] = []
  const warnings: string[] = []
  const fullText = `${headline} ${body} ${cta}`

  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(fullText)) {
      violations.push({
        rule: "Banned Marketing Pattern",
        severity: "block",
        detail: `Banned pattern detected`,
      })
    }
  }

  for (const pattern of COMPETITOR_MENTIONS) {
    if (pattern.test(fullText)) {
      violations.push({
        rule: "Competitor Mention",
        severity: "warn",
        detail: `Competitor reference detected`,
      })
    }
  }

  for (const pattern of SENSITIVE_TOPICS) {
    if (pattern.test(fullText)) {
      violations.push({
        rule: "Sensitive Topic",
        severity: "block",
        detail: `Sensitive topic detected`,
      })
    }
  }

  const blockedCount = violations.filter((v) => v.severity === "block").length
  const warnCount = violations.filter((v) => v.severity === "warn").length

  return {
    passed: blockedCount === 0,
    brandSafetyScore: Math.round(Math.max(0, 1 - blockedCount * 0.15 - warnCount * 0.05) * 100) / 100,
    complianceScore: 0.95,
    violations,
    warnings,
  }
}

export function calculateCompliancePenalty(
  headline: string,
  body: string,
  cta: string,
  coreTone: string,
  strictness: number
): number {
  let penalty = 0

  if (headline.length < 5) penalty += 0.1
  if (body.length < 10) penalty += 0.1
  if (headline.length > 120) penalty += 0.1
  if (body.length > 500) penalty += 0.1

  const allCapsWords = headline.split(" ").filter((w) => w === w.toUpperCase() && w.length > 1).length
  if (allCapsWords > 2) penalty += 0.1

  const exclamationCount = (headline.match(/!/g) || []).length
  if (exclamationCount > 2) penalty += 0.05

  const toneMap: Record<string, RegExp[]> = {
    professional: [/\bhey\b/i, /\bgonna\b/i, /\bwanna\b/i],
    casual: [/\bthus\b/i, /\bhence\b/i, /\btherefore\b/i],
    luxury: [/\bdiscount\b/i, /\bsale\b/i, /\bcheap\b/i, /\bbargain\b/i],
    friendly: [/\bnotice\b/i, /\bpursuant\b/i],
  }

  const toneMismatches = toneMap[coreTone]
  if (toneMismatches) {
    for (const pattern of toneMismatches) {
      if (pattern.test(`${headline} ${body}`)) {
        penalty += 0.05
      }
    }
  }

  return Math.min(1, penalty * (strictness / 100))
}

export async function loadGuardrails(
  workspaceId: string,
  organizationId: string
): Promise<{
  rules: { id: string; name: string; type: string; isActive: boolean }[]
  brandVoice: { coreTone: string; bannedPhrases: string; approvedClaims: string; strictness: number } | null
}> {
  const [rules, brandVoice] = await Promise.all([
    prisma.guardrailRule.findMany({ where: { workspaceId, isActive: true } }),
    prisma.brandVoice.findUnique({ where: { organizationId } }),
  ])

  return { rules, brandVoice }
}
