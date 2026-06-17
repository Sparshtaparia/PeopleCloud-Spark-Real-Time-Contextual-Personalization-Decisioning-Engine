import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const channelMap: Record<string, string | undefined> = {
  'All Channels': undefined,
  'Email': 'email',
  'Web': 'web',
  'App Push': 'app_push',
  'SMS': 'sms',
  'Ads': 'ads',
}

export const dashboardService = {
  async getCommandCenterMetrics(organizationId: string, workspaceId: string, channelFilter: string) {
    const dbChannel = channelMap[channelFilter]
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Active Profiles: distinct customers with events or decisions in selected channel during last 30 days
    const eventWhere: any = { workspaceId, timestamp: { gte: thirtyDaysAgo } }
    if (dbChannel) eventWhere.channel = dbChannel
    const decisionWhere: any = { workspaceId, timestamp: { gte: thirtyDaysAgo } }
    if (dbChannel) decisionWhere.channel = dbChannel

    const [activeEvents, activeDecisions] = await Promise.all([
      prisma.customerEvent.findMany({ where: eventWhere, select: { customerId: true } }),
      prisma.personalizationDecision.findMany({ where: decisionWhere, select: { customerId: true } })
    ])

    const activeProfileIds = new Set([...activeEvents.map(e => e.customerId), ...activeDecisions.map(d => d.customerId)])
    const activeProfiles = activeProfileIds.size

    // Identity Match: average Customer.identityConfidence for active profiles
    let identityMatchRate = 0
    let audienceResolved = 0
    let audienceAnonymous = 0
    if (activeProfiles > 0) {
      const customers = await prisma.customer.findMany({
        where: { id: { in: Array.from(activeProfileIds) } },
        select: { identityConfidence: true }
      })
      const sumConfidence = customers.reduce((acc, c) => acc + c.identityConfidence, 0)
      identityMatchRate = (sumConfidence / activeProfiles) * 100
      audienceResolved = customers.filter(c => c.identityConfidence >= 0.7).length
      audienceAnonymous = activeProfiles - audienceResolved
    }

    // Revenue Influenced: sum(FeedbackEvent.value where type = purchased and decisionId is not null)
    const feedbackWhere: any = { workspaceId, eventType: 'purchase', decisionId: { not: null } }
    if (dbChannel) feedbackWhere.channel = dbChannel
    const feedbacks = await prisma.feedbackEvent.findMany({ where: feedbackWhere, select: { value: true } })
    const revenueInfluenced = feedbacks.reduce((acc, f) => acc + (f.value || 0), 0)

    // Bandit Decisions: count(PersonalizationDecision where experimentId is not null)
    const banditWhere: any = { workspaceId, experimentId: { not: null } }
    if (dbChannel) banditWhere.channel = dbChannel
    const banditDecisions = await prisma.personalizationDecision.count({ where: banditWhere })

    // Creative Generation: count(CreativeVariant where status in generated/approved)
    const creativesCount = await prisma.creativeVariant.count({
      where: { workspaceId, status: { in: ['generated', 'approved'] } }
    })

    // Model Health: latest ModelMetric latencyP95 + driftScore + errorRate
    const latestModelMetric = await prisma.modelMetric.findFirst({
      where: { workspaceId },
      orderBy: { timestamp: 'desc' }
    })

    const campaignWhere: any = { workspaceId }
    if (dbChannel) campaignWhere.channel = dbChannel

    const filteredCampaigns = await prisma.campaign.findMany({ where: campaignWhere })
    const allCampaignsCount = await prisma.campaign.count({ where: { workspaceId } })

    const liveCampaigns = filteredCampaigns.filter(c =>
      (c.status === 'live' || c.status === 'learning') && c.lift && c.lift !== '-'
    )
    let avgLift = 0
    if (liveCampaigns.length > 0) {
      const liftValues = liveCampaigns.map(c => {
        const raw = parseFloat(String(c.lift).replace(/[+%]/g, ''))
        return isNaN(raw) ? 0 : raw
      }).filter(v => v > 0)
      if (liftValues.length > 0) {
        avgLift = liftValues.reduce((a, b) => a + b, 0) / liftValues.length
      }
    }

    const fatigueAlerts = filteredCampaigns.filter(c => {
      if (c.status !== 'live' && c.status !== 'learning') return false
      const raw = parseFloat(String(c.lift).replace(/[+%]/g, ''))
      return !isNaN(raw) && raw < 3
    }).length

    return {
      activeProfiles,
      identityMatchRate: identityMatchRate.toFixed(1),
      revenueInfluenced: revenueInfluenced.toFixed(0),
      activeCampaigns: filteredCampaigns.filter(c => c.status === 'live' || c.status === 'learning').length,
      totalCampaigns: allCampaignsCount,
      generatedCreatives: creativesCount,
      banditDecisions,
      modelLatency: latestModelMetric?.latencyP95 || 0,
      modelDrift: latestModelMetric?.driftScore || 0,
      fatigueAlerts,
      personalizationLift: avgLift.toFixed(1),
      audienceResolved,
      audienceAnonymous
    }
  },

  async getChannelPerformance(organizationId: string, workspaceId: string, channelFilter: string) {
    const dbChannel = channelMap[channelFilter]
    const whereClause: any = { workspaceId }
    if (dbChannel) whereClause.channel = dbChannel

    const events = await prisma.customerEvent.findMany({
      where: whereClause,
      select: { timestamp: true }
    })

    const now = new Date()
    const series = new Array(10).fill(0)
    events.forEach(e => {
      const diffDays = Math.floor((now.getTime() - e.timestamp.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays >= 0 && diffDays < 10) series[9 - diffDays]++
    })

    const maxVal = Math.max(...series, 1)
    return series.map((val) => {
      const base = Math.round((val / maxVal) * 80) + 10
      return Math.min(95, Math.max(15, base))
    })
  },

  async getRecentDecisions(organizationId: string, workspaceId: string, channelFilter: string = 'All Channels') {
    const dbChannel = channelMap[channelFilter]
    
    const whereClause: any = { workspaceId }
    if (dbChannel) whereClause.channel = dbChannel

    const decisions = await prisma.personalizationDecision.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 8,
      include: { customer: { select: { name: true, lifecycleStage: true } } }
    })

    return decisions.map(d => ({
      id: d.id.substring(0, 8),
      action: `${d.channel.charAt(0).toUpperCase() + d.channel.slice(1)} — ${d.offer.replace(/_/g, ' ')}`,
      segment: d.customer?.lifecycleStage || 'General',
      time: (() => {
        const secs = Math.floor((Date.now() - d.timestamp.getTime()) / 1000)
        if (secs < 60) return `${secs}s ago`
        if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
        return `${Math.floor(secs / 3600)}h ago`
      })(),
      alert: d.confidence < 0.6,
    }))
  },

  async getRecentCampaigns(organizationId: string, workspaceId: string, channelFilter: string = 'All Channels') {
    const dbChannel = channelMap[channelFilter]
    
    const whereClause: any = { workspaceId }
    if (dbChannel) whereClause.channel = dbChannel

    return prisma.campaign.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      take: 5
    })
  }
}
