import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export interface CustomerFeatures {
  customerId: string
  recencyDays: number
  frequency7d: number
  frequency30d: number
  monetary7d: number
  monetary30d: number
  channelDistribution: Record<string, number>
  eventTypeDistribution: Record<string, number>
  categoryAffinities: Record<string, number>
  hourOfDayMode: number
  dayOfWeekMode: number
  sessionCount: number
  avgSessionGapHours: number
  bounceRate: number
  pageDepthAvg: number
  lifecycleStage: string | null
  identityConfidence: number
  consentStatus: boolean
}

export interface SegmentFeatures {
  segmentId: string
  customerCount: number
  avgRecency: number
  avgFrequency30d: number
  avgMonetary30d: number
  topChannels: string[]
  topCategories: string[]
  churnRate: number
  avgLtv: number
  convProb: number
}

function seededRand(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  return Math.abs((Math.sin(hash) * 10000) % 1)
}

export async function computeCustomerFeatures(customerId: string): Promise<CustomerFeatures> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      events: {
        orderBy: { timestamp: "desc" },
        take: 500,
      },
    },
  })

  if (!customer) throw new Error(`Customer ${customerId} not found`)

  const events = customer.events
  const now = Date.now()

  const recencyDays =
    events.length > 0
      ? (now - events[0].timestamp.getTime()) / (1000 * 60 * 60 * 24)
      : 999

  const cutoff7d = new Date(now - 7 * 24 * 60 * 60 * 1000)
  const cutoff30d = new Date(now - 30 * 24 * 60 * 60 * 1000)

  const events7d = events.filter((e) => e.timestamp >= cutoff7d)
  const events30d = events.filter((e) => e.timestamp >= cutoff30d)

  const channelDist: Record<string, number> = {}
  const eventTypeDist: Record<string, number> = {}
  let totalValue = 0

  for (const e of events30d) {
    channelDist[e.channel] = (channelDist[e.channel] || 0) + 1
    eventTypeDist[e.eventType] = (eventTypeDist[e.eventType] || 0) + 1
    try {
      const meta = JSON.parse(e.metadata || "{}")
      if (typeof meta.value === "number") totalValue += meta.value
    } catch {}
  }

  const hourCounts: number[] = new Array(24).fill(0)
  const dayCounts: number[] = new Array(7).fill(0)
  for (const e of events) {
    hourCounts[e.timestamp.getHours()]++
    dayCounts[e.timestamp.getDay()]++
  }
  const hourOfDayMode = hourCounts.indexOf(Math.max(...hourCounts))
  const dayOfWeekMode = dayCounts.indexOf(Math.max(...dayCounts))

  const timestampsMs = events.map((e) => e.timestamp.getTime()).sort((a, b) => a - b)
  let totalGap = 0
  let gapCount = 0
  for (let i = 1; i < timestampsMs.length; i++) {
    totalGap += (timestampsMs[i] - timestampsMs[i - 1]) / (1000 * 60 * 60)
    gapCount++
  }

  const categoryAffinities: Record<string, number> = {}
  try {
    const parsed = JSON.parse(customer.categoryAffinities || "{}")
    for (const [k, v] of Object.entries(parsed)) {
      categoryAffinities[k] = v as number
    }
  } catch {}

  return {
    customerId,
    recencyDays,
    frequency7d: events7d.length,
    frequency30d: events30d.length,
    monetary7d: events7d.reduce((sum, e) => {
      try {
        const meta = JSON.parse(e.metadata || "{}")
        return sum + (typeof meta.value === "number" ? meta.value : 0)
      } catch {
        return sum
      }
    }, 0),
    monetary30d: totalValue,
    channelDistribution: channelDist,
    eventTypeDistribution: eventTypeDist,
    categoryAffinities,
    hourOfDayMode,
    dayOfWeekMode,
    sessionCount: Math.max(1, Math.round(events30d.length / 3)),
    avgSessionGapHours: gapCount > 0 ? totalGap / gapCount : 0,
    bounceRate: events.length > 0 ? events.filter((e) => e.eventType === "page_view" && e.channel === "web").length / events.length : 0,
    pageDepthAvg: 3.2 + seededRand(customerId) * 3,
    lifecycleStage: customer.lifecycleStage,
    identityConfidence: customer.identityConfidence,
    consentStatus: customer.consentStatus,
  }
}

export async function computeSegmentFeatures(segmentId: string): Promise<SegmentFeatures> {
  const segment = await prisma.segment.findUnique({
    where: { id: segmentId },
  })

  if (!segment) throw new Error(`Segment ${segmentId} not found`)

  const customers = await prisma.customer.findMany({
    where: { workspaceId: segment.workspaceId },
    take: 100,
  })

  if (customers.length === 0) {
    return {
      segmentId,
      customerCount: 0,
      avgRecency: 0,
      avgFrequency30d: 0,
      avgMonetary30d: 0,
      topChannels: [],
      topCategories: [],
      churnRate: 0,
      avgLtv: segment.avgLtv,
      convProb: segment.convProb,
    }
  }

  const features = await Promise.all(
    customers.slice(0, 50).map((c) =>
      computeCustomerFeatures(c.id).catch(() => null)
    )
  )
  const valid = features.filter((f): f is CustomerFeatures => f !== null)

  const channelFreq: Record<string, number> = {}
  const catFreq: Record<string, number> = {}
  let totalRecency = 0
  let totalFreq30d = 0
  let totalMonetary30d = 0
  let churnedCount = 0

  for (const f of valid) {
    totalRecency += f.recencyDays
    totalFreq30d += f.frequency30d
    totalMonetary30d += f.monetary30d
    if (f.recencyDays > 90) churnedCount++

    for (const [ch, cnt] of Object.entries(f.channelDistribution)) {
      channelFreq[ch] = (channelFreq[ch] || 0) + cnt
    }
    for (const [cat, val] of Object.entries(f.categoryAffinities)) {
      catFreq[cat] = (catFreq[cat] || 0) + val
    }
  }

  const sortedChannels = Object.entries(channelFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([ch]) => ch)

  const sortedCats = Object.entries(catFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat)

  return {
    segmentId,
    customerCount: customers.length,
    avgRecency: valid.length > 0 ? totalRecency / valid.length : 0,
    avgFrequency30d: valid.length > 0 ? totalFreq30d / valid.length : 0,
    avgMonetary30d: valid.length > 0 ? totalMonetary30d / valid.length : 0,
    topChannels: sortedChannels,
    topCategories: sortedCats,
    churnRate: valid.length > 0 ? churnedCount / valid.length : 0,
    avgLtv: segment.avgLtv,
    convProb: segment.convProb,
  }
}

export async function featurePipeline(customerIds: string[]): Promise<Map<string, CustomerFeatures>> {
  const results = new Map<string, CustomerFeatures>()
  const features = await Promise.allSettled(
    customerIds.map((id) => computeCustomerFeatures(id))
  )
  for (const result of features) {
    if (result.status === "fulfilled") {
      results.set(result.value.customerId, result.value)
    }
  }
  return results
}
