"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "../server-utils"
import { requirePermission } from "@/lib/rbac/require-permission"

const channelMap: Record<string, string | undefined> = {
  'All Channels': undefined,
  'Email': 'email',
  'Web': 'web',
  'App Push': 'app_push',
  'SMS': 'sms',
  'Ads': 'ads',
}

const channels = ['email', 'web', 'app_push', 'sms', 'ads'] as const

export interface ExportPayload {
  commandCenter: { rows: Record<string, string>[]; headers: string[] }
  channelBreakdown: { rows: Record<string, string>[]; headers: string[] }
  campaignAnalytics: { rows: Record<string, string>[]; headers: string[] }
  creativeVariantAnalytics: { rows: Record<string, string>[]; headers: string[] }
  experimentBandits: { rows: Record<string, string>[]; headers: string[] }
  liveDecisions: { rows: Record<string, string>[]; headers: string[] }
  customerAnalytics: { rows: Record<string, string>[]; headers: string[] }
}

export async function exportAnalytics(organizationId: string, workspaceId: string, channelFilter: string = 'All Channels'): Promise<ExportPayload> {
  const user = await requireAuth()
  await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'view_dashboard' })

  const org = await prisma.organization.findUnique({ where: { id: organizationId } })
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } })
  const orgName = org?.name || ''
  const wsName = ws?.name || ''
  const now = new Date().toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const dbChannel = channelMap[channelFilter]

  async function getChannelMetrics(channel?: string) {
    const eventWhere: any = { workspaceId, timestamp: { gte: thirtyDaysAgo } }
    const decisionWhere: any = { workspaceId, timestamp: { gte: thirtyDaysAgo } }
    const campaignWhere: any = { workspaceId }
    if (channel) { eventWhere.channel = channel; decisionWhere.channel = channel; campaignWhere.channel = channel }

    const events = await prisma.customerEvent.findMany({ where: eventWhere, select: { customerId: true, eventType: true } })
    const decisions = await prisma.personalizationDecision.findMany({ where: decisionWhere, select: { customerId: true, experimentId: true, confidence: true } })
    const campaigns = await prisma.campaign.findMany({ where: campaignWhere, select: { status: true, lift: true, objective: true } })
    const feedbackWhere: any = { workspaceId, eventType: 'purchase', value: { not: null } }
    if (channel) feedbackWhere.channel = channel
    const purchaseFeedbacks = await prisma.feedbackEvent.findMany({ where: feedbackWhere, select: { value: true } })
    const activeCustomers = new Set([...events.map(e => e.customerId), ...decisions.map(d => d.customerId)])
    const activeProfiles = activeCustomers.size
    const eventsIngested = events.length
    const decisionsServed = decisions.length
    const banditDecisions = decisions.filter(d => d.experimentId).length
    const delivered = events.filter(e => e.eventType === 'delivered').length
    const opened = events.filter(e => e.eventType === 'open').length
    const clicked = events.filter(e => e.eventType === 'click').length
    const addedToCart = events.filter(e => e.eventType === 'add_to_cart').length
    const purchased = events.filter(e => e.eventType === 'purchase').length
    const unsubscribed = events.filter(e => e.eventType === 'unsubscribe').length
    const ctr = delivered > 0 ? ((clicked / delivered) * 100).toFixed(2) : '0.00'
    const conversionRate = clicked > 0 ? ((purchased / clicked) * 100).toFixed(2) : '0.00'
    const liveCampaigns = campaigns.filter(c => c.status === 'live' || c.status === 'learning').length
    const liftValues = campaigns.filter(c => (c.status === 'live' || c.status === 'learning') && c.lift && c.lift !== '-').map(c => parseFloat(String(c.lift).replace(/[+%]/g, ''))).filter(v => !isNaN(v) && v > 0)
    const avgLift = liftValues.length > 0 ? (liftValues.reduce((a, b) => a + b, 0) / liftValues.length).toFixed(2) : '0.00'
    const revenueInfluenced = purchaseFeedbacks.reduce((acc, f) => acc + (f.value || 0), 0)
    const creativeVariants = await prisma.creativeVariant.count({ where: { workspaceId, status: { in: ['generated', 'approved'] } } })
    const customers = await prisma.customer.findMany({ where: { id: { in: Array.from(activeCustomers) } }, select: { identityConfidence: true, predictedLtv: true } })
    const sumConfidence = customers.reduce((acc, c) => acc + c.identityConfidence, 0)
    const identityMatchRate = activeProfiles > 0 ? ((sumConfidence / activeProfiles) * 100).toFixed(2) : '0.00'
    return { activeProfiles, identityMatchRate, eventsIngested, decisionsServed, banditDecisions, delivered, opened, clicked, addedToCart, purchased, unsubscribed, ctr, conversionRate, revenueInfluenced, avgLift, creativeVariants, liveCampaigns }
  }

  const baseMetrics = await getChannelMetrics(dbChannel)

  const feedbacks = await prisma.feedbackEvent.findMany({ where: { workspaceId, eventType: 'purchase', value: { not: null } }, select: { value: true } })
  const totalPurchaseRevenue = feedbacks.reduce((acc, f) => acc + (f.value || 0), 0)

  const allCampaigns = await prisma.campaign.findMany({
    where: { workspaceId },
    include: {
      creativeVariants: { select: { id: true, status: true, predictedCtr: true, brandSafetyScore: true, complianceScore: true } },
      experiments: {
        include: {
          variants: { select: { impressions: true, clicks: true, conversions: true, lift: true } },
        },
      },
      segment: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const latestMetric = await prisma.modelMetric.findFirst({
    where: { workspaceId },
    orderBy: { timestamp: 'desc' },
    select: { latencyP95: true, driftScore: true },
  })

  const allDecisions = await prisma.personalizationDecision.findMany({
    where: { workspaceId },
    include: {
      customer: { select: { name: true, corePersonId: true } },
      feedbackEvents: { select: { eventType: true, value: true } },
    },
    orderBy: { timestamp: 'desc' },
    take: 5000,
  })

  const customers: any[] = await prisma.customer.findMany({
    where: { workspaceId },
    include: {
      events: { select: { id: true, eventType: true } },
      segments: { include: { segment: { select: { name: true } } } },
    },
    take: 5000,
  })

  const totalCustomers = customers.length
  const resolvedCustomers = customers.filter((c: any) => c.identityConfidence >= 0.7).length
  const anonymousProfiles = totalCustomers - resolvedCustomers

  const experiments = await prisma.experiment.findMany({
    where: { workspaceId },
    include: {
      variants: true,
      campaign: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 1000,
  })

  const creativeVariants = await prisma.creativeVariant.findMany({
    where: { workspaceId },
    include: {
      campaign: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5000,
  })

  const eventsByType = await prisma.customerEvent.groupBy({
    by: ['eventType'],
    where: { workspaceId, timestamp: { gte: thirtyDaysAgo } },
    _count: true,
  })
  const eventTypeCounts = Object.fromEntries(eventsByType.map(e => [e.eventType, e._count]))

  const allClickEvents = await prisma.customerEvent.findMany({
    where: { workspaceId, eventType: 'click', timestamp: { gte: thirtyDaysAgo } },
    select: { id: true },
  })
  const allDeliveredEvents = await prisma.customerEvent.findMany({
    where: { workspaceId, eventType: 'delivered', timestamp: { gte: thirtyDaysAgo } },
    select: { id: true },
  })
  const avgCtr = allDeliveredEvents.length > 0 ? ((allClickEvents.length / allDeliveredEvents.length) * 100).toFixed(2) : '0.00'

  const allPurchaseEvents = await prisma.customerEvent.findMany({
    where: { workspaceId, eventType: 'purchase', timestamp: { gte: thirtyDaysAgo } },
    select: { id: true },
  })
  const avgConversionRate = allClickEvents.length > 0 ? ((allPurchaseEvents.length / allClickEvents.length) * 100).toFixed(2) : '0.00'

  const modelHealth = latestMetric?.latencyP95 ? (latestMetric.latencyP95 < 200 ? 'Optimal' : latestMetric.latencyP95 < 500 ? 'Degraded' : 'Critical') : 'Unknown'

  const liveCamps = allCampaigns.filter(c => c.status === 'live').length
  const learningCamps = allCampaigns.filter(c => c.status === 'learning').length

  const dateStart = thirtyDaysAgo.toISOString().split('T')[0]
  const dateEnd = new Date().toISOString().split('T')[0]

  const commandCenterHeaders = [
    'exported_at', 'organization_name', 'workspace_name', 'channel_filter',
    'date_range_start', 'date_range_end', 'active_profiles', 'resolved_profiles',
    'anonymous_profiles', 'identity_match_rate', 'events_ingested',
    'personalization_decisions', 'bandit_decisions', 'creative_variants_ready',
    'active_campaigns', 'live_campaigns', 'learning_campaigns', 'revenue_influenced',
    'total_purchase_revenue', 'personalization_lift', 'avg_ctr', 'avg_conversion_rate',
    'model_health_status', 'model_p95_latency_ms', 'model_drift_score',
  ]

  const channelBreakdownHeaders = [
    'channel', 'active_profiles', 'identity_match_rate', 'events_ingested',
    'decisions_served', 'bandit_decisions', 'delivered', 'opened', 'clicked',
    'added_to_cart', 'purchased', 'unsubscribed', 'ctr', 'conversion_rate',
    'revenue_influenced', 'personalization_lift', 'creative_variants', 'active_campaigns',
  ]

  const campaignHeaders = [
    'campaign_id', 'campaign_name', 'segment_name', 'objective', 'channel', 'status',
    'creative_variants_count', 'approved_variants_count', 'experiment_status',
    'impressions', 'clicks', 'conversions', 'ctr', 'conversion_rate',
    'revenue_influenced', 'lift', 'last_updated_at',
  ]

  const creativeVariantHeaders = [
    'creative_variant_id', 'campaign_name', 'channel', 'strategy', 'headline', 'body', 'cta',
    'status', 'predicted_ctr', 'brand_safety_score', 'compliance_score',
    'personalization_reason', 'guardrail_warnings', 'impressions', 'clicks', 'conversions',
    'revenue_influenced', 'created_at',
  ]

  const experimentHeaders = [
    'experiment_id', 'experiment_name', 'campaign_name', 'experiment_type', 'status',
    'variant_id', 'variant_label', 'allocation_percent', 'impressions', 'clicks',
    'conversions', 'ctr', 'conversion_rate', 'lift', 'confidence', 'is_winner',
    'started_at', 'ended_at', 'last_simulated_at',
  ]

  const liveDecisionHeaders = [
    'decision_id', 'timestamp', 'customer_id', 'customer_name', 'core_person_id',
    'campaign_name', 'creative_variant_id', 'channel', 'offer', 'confidence',
    'reasons', 'experiment_id', 'feedback_status', 'purchase_value',
  ]

  const customerHeaders = [
    'customer_id', 'core_person_id', 'customer_name', 'lifecycle_stage',
    'identity_confidence', 'consent_status', 'predicted_ltv', 'churn_risk',
    'preferred_channel', 'top_affinity_1', 'top_affinity_2', 'top_affinity_3',
    'event_count', 'purchase_count', 'total_purchase_value', 'last_seen_at',
    'segments', 'next_best_action',
  ]

  const commandCenterRow = {
    exported_at: now,
    organization_name: orgName,
    workspace_name: wsName,
    channel_filter: channelFilter,
    date_range_start: dateStart,
    date_range_end: dateEnd,
    active_profiles: String(baseMetrics.activeProfiles),
    resolved_profiles: String(resolvedCustomers),
    anonymous_profiles: String(anonymousProfiles),
    identity_match_rate: baseMetrics.identityMatchRate,
    events_ingested: String(baseMetrics.eventsIngested),
    personalization_decisions: String(baseMetrics.decisionsServed),
    bandit_decisions: String(baseMetrics.banditDecisions),
    creative_variants_ready: String(baseMetrics.creativeVariants),
    active_campaigns: String(baseMetrics.liveCampaigns),
    live_campaigns: String(liveCamps),
    learning_campaigns: String(learningCamps),
    revenue_influenced: String(Math.round(baseMetrics.revenueInfluenced)),
    total_purchase_revenue: String(Math.round(totalPurchaseRevenue)),
    personalization_lift: baseMetrics.avgLift,
    avg_ctr: avgCtr,
    avg_conversion_rate: avgConversionRate,
    model_health_status: modelHealth,
    model_p95_latency_ms: String(latestMetric?.latencyP95 || 0),
    model_drift_score: String(latestMetric?.driftScore || 0),
  }

  const channelRows = []
  for (const ch of channels) {
    const m = await getChannelMetrics(ch)
    channelRows.push({
      channel: ch,
      active_profiles: String(m.activeProfiles),
      identity_match_rate: m.identityMatchRate,
      events_ingested: String(m.eventsIngested),
      decisions_served: String(m.decisionsServed),
      bandit_decisions: String(m.banditDecisions),
      delivered: String(m.delivered),
      opened: String(m.opened),
      clicked: String(m.clicked),
      added_to_cart: String(m.addedToCart),
      purchased: String(m.purchased),
      unsubscribed: String(m.unsubscribed),
      ctr: m.ctr,
      conversion_rate: m.conversionRate,
      revenue_influenced: String(Math.round(m.revenueInfluenced)),
      personalization_lift: m.avgLift,
      creative_variants: String(m.creativeVariants),
      active_campaigns: String(m.liveCampaigns),
    })
  }
  channelRows.push({
    channel: 'all_channels',
    active_profiles: String(baseMetrics.activeProfiles),
    identity_match_rate: baseMetrics.identityMatchRate,
    events_ingested: String(baseMetrics.eventsIngested),
    decisions_served: String(baseMetrics.decisionsServed),
    bandit_decisions: String(baseMetrics.banditDecisions),
    delivered: String(baseMetrics.delivered),
    opened: String(baseMetrics.opened),
    clicked: String(baseMetrics.clicked),
    added_to_cart: String(baseMetrics.addedToCart),
    purchased: String(baseMetrics.purchased),
    unsubscribed: String(baseMetrics.unsubscribed),
    ctr: baseMetrics.ctr,
    conversion_rate: baseMetrics.conversionRate,
    revenue_influenced: String(Math.round(baseMetrics.revenueInfluenced)),
    personalization_lift: baseMetrics.avgLift,
    creative_variants: String(baseMetrics.creativeVariants),
    active_campaigns: String(baseMetrics.liveCampaigns),
  })

  const campaignRows = allCampaigns.map(c => {
    const variants = c.creativeVariants || []
    const expVariants = (c.experiments || []).flatMap(e => e.variants || [])
    const totalImpressions = expVariants.reduce((s, v) => s + (v.impressions || 0), 0)
    const totalClicks = expVariants.reduce((s, v) => s + (v.clicks || 0), 0)
    const totalConversions = expVariants.reduce((s, v) => s + (v.conversions || 0), 0)
    const totalLift = expVariants.reduce((s, v) => s + (v.lift || 0), 0)
    const ctrVal = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00'
    const convRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : '0.00'
    const expStatus = (c.experiments || []).map(e => e.status).join(', ')
    return {
      campaign_id: c.id,
      campaign_name: c.name,
      segment_name: c.segment?.name || '',
      objective: c.objective,
      channel: c.channel,
      status: c.status,
      creative_variants_count: String(variants.length),
      approved_variants_count: String(variants.filter(v => v.status === 'approved').length),
      experiment_status: expStatus,
      impressions: String(totalImpressions),
      clicks: String(totalClicks),
      conversions: String(totalConversions),
      ctr: ctrVal,
      conversion_rate: convRate,
      revenue_influenced: '0',
      lift: totalLift > 0 ? `${(totalLift * 100).toFixed(2)}%` : (c.lift || '0'),
      last_updated_at: c.updatedAt.toISOString(),
    }
  })

  const creativeVariantRows = creativeVariants.map(v => ({
    creative_variant_id: v.id,
    campaign_name: v.campaign?.name || '',
    channel: v.channel,
    strategy: v.strategy,
    headline: v.headline,
    body: v.body,
    cta: v.cta,
    status: v.status,
    predicted_ctr: String(v.predictedCtr),
    brand_safety_score: String(v.brandSafetyScore),
    compliance_score: String(v.complianceScore),
    personalization_reason: v.personalizationReason || '',
    guardrail_warnings: v.guardrailWarnings || '',
    impressions: '0',
    clicks: '0',
    conversions: '0',
    revenue_influenced: '0',
    created_at: v.createdAt.toISOString(),
  }))

  const experimentRows = experiments.flatMap(e => {
    const variantRows = (e.variants || []).map(v => ({
      experiment_id: e.id,
      experiment_name: e.type,
      campaign_name: e.campaign?.name || '',
      experiment_type: e.type,
      status: e.status,
      variant_id: v.id,
      variant_label: v.name,
      allocation_percent: String((v.allocation * 100).toFixed(2)),
      impressions: String(v.impressions || 0),
      clicks: String(v.clicks || 0),
      conversions: String(v.conversions || 0),
      ctr: v.impressions > 0 ? ((v.clicks / v.impressions) * 100).toFixed(2) : '0.00',
      conversion_rate: v.clicks > 0 ? ((v.conversions / v.clicks) * 100).toFixed(2) : '0.00',
      lift: String(v.lift || 0),
      confidence: String(v.confidence || 0),
      is_winner: '',
      started_at: e.createdAt.toISOString(),
      ended_at: e.status === 'completed' ? e.updatedAt.toISOString() : '',
      last_simulated_at: e.updatedAt.toISOString(),
    }))
    return variantRows
  })

  const liveDecisionRows = allDecisions.map(d => {
    const fb = d.feedbackEvents || []
    const purchaseFb = fb.find(f => f.eventType === 'purchase')
    const fbStatuses = [...new Set(fb.map(f => f.eventType))].join(', ')
    return {
      decision_id: d.id,
      timestamp: d.timestamp.toISOString(),
      customer_id: d.customerId,
      customer_name: d.customer?.name || '',
      core_person_id: d.customer?.corePersonId || '',
      campaign_name: '',
      creative_variant_id: d.creativeVariantId || '',
      channel: d.channel,
      offer: d.offer,
      confidence: String(d.confidence),
      reasons: d.reasons,
      experiment_id: d.experimentId || '',
      feedback_status: fbStatuses,
      purchase_value: purchaseFb?.value ? String(purchaseFb.value) : '0',
    }
  })

  const lifecycleActions: Record<string, string> = {
    cart_abandoner: 'Send Cart Recovery Offer',
    churn_risk: 'Send Win-Back Discount',
    'At Risk': 'Send Win-Back Discount',
    Churned: 'Send Win-Back Discount',
    loyal_customer: 'Early Access Loyalty Drop',
    Loyalist: 'Early Access Loyalty Drop',
    premium_value: 'Early Access Loyalty Drop',
    high_intent: 'High Intent Conversion Offer',
    active_browser: 'High Intent Conversion Offer',
    New: 'Welcome & Onboarding Series',
    Active: 'Welcome & Onboarding Series',
    suppressed: 'Re-engagement Campaign',
  }

  const customerRows = customers.map((c: typeof customers[0] & { events?: { eventType: string }[], segments?: { segment?: { name: string } }[] }) => {
    const affinities: Record<string, number> = (() => { try { return JSON.parse(c.categoryAffinities || '{}') } catch { return {} } })()
    const topAffs = Object.entries(affinities).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 3).map(([k]) => k)
    const evts = c.events || []
    const eventCount = evts.length
    const purchaseEvents = evts.filter((e: any) => e.eventType === 'purchase')
    const segs = (c.segments || []).map((s: any) => s.segment?.name).filter(Boolean).join('; ')
    return {
      customer_id: c.id,
      core_person_id: c.corePersonId || '',
      customer_name: c.name || '',
      lifecycle_stage: c.lifecycleStage || '',
      identity_confidence: String(c.identityConfidence),
      consent_status: c.consentStatus ? 'granted' : 'revoked',
      predicted_ltv: String(c.predictedLtv),
      churn_risk: String(c.churnRisk),
      preferred_channel: '',
      top_affinity_1: topAffs[0] || '',
      top_affinity_2: topAffs[1] || '',
      top_affinity_3: topAffs[2] || '',
      event_count: String(eventCount),
      purchase_count: String(purchaseEvents.length),
      total_purchase_value: '0',
      last_seen_at: c.updatedAt.toISOString(),
      segments: segs,
      next_best_action: lifecycleActions[c.lifecycleStage || ''] || 'Explore Collection',
    }
  })

  return {
    commandCenter: { rows: [commandCenterRow], headers: commandCenterHeaders },
    channelBreakdown: { rows: channelRows, headers: channelBreakdownHeaders },
    campaignAnalytics: { rows: campaignRows, headers: campaignHeaders },
    creativeVariantAnalytics: { rows: creativeVariantRows, headers: creativeVariantHeaders },
    experimentBandits: { rows: experimentRows, headers: experimentHeaders },
    liveDecisions: { rows: liveDecisionRows, headers: liveDecisionHeaders },
    customerAnalytics: { rows: customerRows, headers: customerHeaders },
  }
}
