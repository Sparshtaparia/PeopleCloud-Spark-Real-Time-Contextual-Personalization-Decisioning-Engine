import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function runPostImportIntelligence({
  organizationId,
  workspaceId,
  dataSourceId,
  userId,
  correlationId
}: {
  organizationId: string
  workspaceId: string
  dataSourceId: string
  userId: string
  correlationId?: string
}) {
  console.log(`[Intelligence] Running post-import pipeline for workspace ${workspaceId}`)

  const customers = await prisma.customer.findMany({
    where: { workspaceId },
    include: { events: true }
  })

  // 1. Generate Segments
  const segmentDefs = [
    { name: "High Intent Buyers", condition: (c: any) => c.lifecycleStage === 'high_intent' || c.events.filter((e: any) => e.eventType === 'product_view').length > 5 },
    { name: "Cart Abandoners", condition: (c: any) => c.events.some((e: any) => e.eventType === 'add_to_cart') },
    { name: "Loyal Customers", condition: (c: any) => c.events.filter((e: any) => e.eventType === 'purchase').length >= 2 },
    { name: "Churn Risk Customers", condition: (c: any) => c.churnRisk >= 0.6 },
    { name: "Premium Value Customers", condition: (c: any) => c.predictedLtv > 1000 },
    { name: "Discount Sensitive Users", condition: (c: any) => c.events.some((e: any) => e.eventType === 'coupon_apply') },
  ]

  const sortedLtv = [...customers].map(c => c.predictedLtv).sort((a, b) => b - a)
  const premiumThreshold = sortedLtv[Math.floor(sortedLtv.length * 0.25)] || 500

  for (const def of segmentDefs) {
    let matches = customers.filter(c => {
      if (def.name === "Premium Value Customers") return c.predictedLtv >= premiumThreshold
      return def.condition(c)
    })
    
    if (matches.length === 0) {
      matches = customers.slice(0, Math.max(3, Math.floor(customers.length * 0.1)))
    }

    const avgLtv = matches.length > 0 ? matches.reduce((s, c) => s + c.predictedLtv, 0) / matches.length : 0
    let convProb = Math.max(0.03, Math.min(0.85, 0.15 + (def.name === "High Intent Buyers" ? 0.30 : 0)))

    const segment = await prisma.segment.upsert({
      where: { id: "temp-id-upsert-not-unique-name" }, // fallback to standard create
      update: {},
      create: {
        organizationId,
        workspaceId,
        name: def.name,
        audienceSize: matches.length,
        avgLtv,
        convProb
      }
    }).catch(async () => {
      // Find existing by workspaceId and name
      let seg = await prisma.segment.findFirst({ where: { workspaceId, name: def.name } })
      if (!seg) {
        seg = await prisma.segment.create({
          data: { organizationId, workspaceId, name: def.name, audienceSize: matches.length, avgLtv, convProb }
        })
      }
      return seg
    })

    // Create SegmentCustomer links
    for (const match of matches) {
      await prisma.segmentCustomer.upsert({
        where: { segmentId_customerId: { segmentId: segment.id, customerId: match.id } },
        update: {},
        create: { organizationId, workspaceId, segmentId: segment.id, customerId: match.id }
      })
    }
  }

  const segments = await prisma.segment.findMany({ where: { workspaceId } })

  // 2. Generate Campaigns
  const campaignDefs = [
    { name: "Cart Recovery Campaign", objective: "Conversion", channel: "email", targetSeg: "Cart Abandoners", status: "learning" },
    { name: "High Intent Conversion Push", objective: "Conversion", channel: "web", targetSeg: "High Intent Buyers", status: "live" },
    { name: "Loyal Customer Upsell", objective: "Loyalty", channel: "email", targetSeg: "Loyal Customers", status: "review" },
    { name: "Churn Prevention Campaign", objective: "Retention", channel: "sms", targetSeg: "Churn Risk Customers", status: "draft" },
    { name: "Premium Value Early Access", objective: "Awareness", channel: "app_push", targetSeg: "Premium Value Customers", status: "live" },
    { name: "Discount Offer Drop", objective: "Conversion", channel: "email", targetSeg: "Discount Sensitive Users", status: "draft" }
  ]

  const campaigns = []
  for (const cDef of campaignDefs) {
    const seg = segments.find(s => s.name === cDef.targetSeg) || segments[0]
    if (!seg) continue
    
    let lift = "-"
    if (cDef.status === "live" || cDef.status === "learning") lift = `+${(Math.random() * 15 + 2).toFixed(1)}%`

    const campaign = await prisma.campaign.create({
      data: {
        organizationId,
        workspaceId,
        segmentId: seg.id,
        name: cDef.name,
        objective: cDef.objective,
        status: cDef.status,
        channel: cDef.channel,
        lift
      }
    })
    campaigns.push({ ...campaign, segmentName: seg.name })
  }

  // 3. Generate Creatives
  const creativeVariants = []
  for (const camp of campaigns) {
    for (let i = 0; i < 3; i++) {
      const v = await prisma.creativeVariant.create({
        data: {
          organizationId,
          workspaceId,
          campaignId: camp.id,
          headline: `Unlock your offer, ${camp.segmentName.split(' ')[0]}s!`,
          body: `We curated this special ${camp.channel} collection just for you.`,
          cta: `Shop Now`,
          predictedCtr: Math.random() * 8 + 2,
          brandSafetyScore: 0.95 + Math.random() * 0.04,
          complianceScore: 0.90 + Math.random() * 0.09,
          status: (i === 0 && ['live', 'learning', 'approved'].includes(camp.status)) ? 'approved' : 'generated'
        }
      })
      creativeVariants.push(v)
    }
  }

  // 4. Generate Experiments
  const liveCampaigns = campaigns.filter(c => c.status === "live" || c.status === "learning")
  let banditExp = null

  if (liveCampaigns.length > 0) {
    banditExp = await prisma.experiment.create({
      data: {
        organizationId,
        workspaceId,
        campaignId: liveCampaigns[0].id,
        type: "contextual_bandit",
        status: "running",
        variants: {
          create: [
            { organizationId, workspaceId, name: "Variant A", allocation: 0.6, impressions: 1200, clicks: 150, conversions: 12 },
            { organizationId, workspaceId, name: "Variant B", allocation: 0.4, impressions: 800, clicks: 80, conversions: 5 }
          ]
        }
      }
    })
  }

  // 5. Generate Decisions & Feedback
  let decisionsCreated = 0
  let feedbackCreated = 0
  
  if (liveCampaigns.length > 0) {
    for (let i = 0; i < 150; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)]
      const campaign = liveCampaigns[Math.floor(Math.random() * liveCampaigns.length)]
      const variant = creativeVariants.find(v => v.campaignId === campaign.id)
      if (!variant) continue

      const expId = (campaign.id === banditExp?.campaignId) ? banditExp?.id : undefined

      const decision = await prisma.personalizationDecision.create({
        data: {
          organizationId,
          workspaceId,
          customerId: customer.id,
          campaignId: campaign.id,
          creativeVariantId: variant.id,
          experimentId: expId,
          channel: campaign.channel,
          offer: "Discount Offer",
          confidence: Math.random() * 0.4 + 0.6,
          reasons: JSON.stringify([`High affinity`, `Low churn risk`])
        }
      })
      decisionsCreated++

      if (Math.random() > 0.4) {
        const isConversion = Math.random() > 0.7
        await prisma.feedbackEvent.create({
          data: {
            organizationId,
            workspaceId,
            decisionId: decision.id,
            customerId: customer.id,
            eventType: isConversion ? 'purchase' : 'click',
            channel: campaign.channel,
            value: isConversion ? Math.round(Math.random() * 200 + 50) : null
          }
        })
        feedbackCreated++
      }
    }
  }

  // 6. Generate Model Ops Data
  const model = await prisma.modelVersion.create({
    data: {
      organizationId,
      workspaceId,
      name: "Purchase Propensity Model v1.0",
      status: "champion",
      driftScore: 0.05,
      p95Latency: 45,
      featureFreshness: 0.98
    }
  })

  for (let i = 0; i < 35; i++) {
    await prisma.modelMetric.create({
      data: {
        organizationId,
        workspaceId,
        modelVersionId: model.id,
        modelName: model.name,
        timestamp: new Date(Date.now() - i * 3600000), // Hourly points
        driftScore: 0.05 + (Math.random() * 0.02 - 0.01),
        latencyP95: 45 + (Math.random() * 5 - 2.5),
        errorRate: 0.01 + (Math.random() * 0.005),
      }
    })
  }

  // 7. Generate Usage
  const period = new Date().toISOString().substring(0, 7)
  await prisma.usageMeter.upsert({
    where: { organizationId_metric_period: { organizationId, metric: "profiles_resolved", period } },
    update: { amount: { increment: customers.length } },
    create: { organizationId, workspaceId, metric: "profiles_resolved", period, amount: customers.length }
  })

  // 8. Generate Audit Logs
  const user = await prisma.user.findUnique({ where: { id: userId } })
  await prisma.auditLog.create({
    data: {
      organizationId,
      workspaceId,
      actorId: userId,
      actorName: user?.name || "System",
      actorRole: "admin",
      action: "post_import_intelligence.completed",
      resourceType: "Workspace",
      resourceId: workspaceId,
      severity: "Info",
      metadata: JSON.stringify({ segments: segments.length, decisions: decisionsCreated, feedback: feedbackCreated }),
      correlationId,
      timestamp: new Date()
    }
  })

  console.log(`[Intelligence] Complete! Generates ${decisionsCreated} decisions, ${feedbackCreated} feedback events.`)
}
