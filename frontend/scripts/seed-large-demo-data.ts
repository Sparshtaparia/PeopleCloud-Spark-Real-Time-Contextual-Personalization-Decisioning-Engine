import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Deterministic seed for reproducibility
faker.seed(42)

const DEMO_PASSWORD = 'password123'

const orgConfigs = [
  {
    org: 'Nike India',
    industry: 'Retail',
    workspaces: [
      { name: 'Nike Core', env: 'production', affinities: ['Running', 'Basketball', 'Streetwear'], scale: 'large' },
      { name: 'Nike SNRKS App', env: 'production', affinities: ['Sneakers', 'Limited Drops', 'Streetwear'], scale: 'medium' },
      { name: 'Nike Run Club', env: 'staging', affinities: ['Running', 'Fitness', 'Training'], scale: 'medium' },
    ]
  },
  {
    org: 'Tata Neu',
    industry: 'E-commerce',
    workspaces: [
      { name: 'Festival Rewards', env: 'production', affinities: ['Electronics', 'Fashion', 'Grocery'], scale: 'large' },
      { name: 'NeuCoins Program', env: 'production', affinities: ['Loyalty', 'Travel', 'Finance'], scale: 'medium' },
      { name: 'Tata Grocery', env: 'staging', affinities: ['Grocery', 'FMCG', 'Home'], scale: 'small' },
    ]
  },
  {
    org: 'HDFC SmartBuy',
    industry: 'Finance',
    workspaces: [
      { name: 'Premium Card Offers', env: 'production', affinities: ['Travel Cards', 'Mutual Funds', 'Home Loans'], scale: 'large' },
      { name: 'HDFC Millennials', env: 'production', affinities: ['Credit Cards', 'SIPs', 'Insurance'], scale: 'medium' },
      { name: 'Corporate Banking', env: 'staging', affinities: ['Business Loans', 'Forex', 'Trade Finance'], scale: 'small' },
    ]
  },
  {
    org: 'Myntra Luxe',
    industry: 'Fashion',
    workspaces: [
      { name: 'Luxury Drop Campaign', env: 'production', affinities: ['Dresses', 'Accessories', 'Beauty'], scale: 'large' },
      { name: 'FWD Fashion', env: 'production', affinities: ['Streetwear', 'Sneakers', 'Gen-Z Trends'], scale: 'medium' },
      { name: 'Myntra Studio', env: 'staging', affinities: ['Designer', 'Premium', 'Occasion Wear'], scale: 'small' },
    ]
  },
]

const scaleMap = { large: 1500, medium: 600, small: 200 }
const eventScaleMap = { large: 12000, medium: 4500, small: 1200 }

const demoAccounts = [
  { email: 'maya@nike.demo', password: DEMO_PASSWORD, role: 'marketer', name: 'Maya Sharma', avatar: 'https://i.pravatar.cc/150?img=47' },
  { email: 'arjun@nike.demo', password: DEMO_PASSWORD, role: 'data_scientist', name: 'Arjun Patel', avatar: 'https://i.pravatar.cc/150?img=12' },
  { email: 'kavya@nike.demo', password: DEMO_PASSWORD, role: 'approver', name: 'Kavya Singh', avatar: 'https://i.pravatar.cc/150?img=26' },
  { email: 'riya@nike.demo', password: DEMO_PASSWORD, role: 'analyst', name: 'Riya Gupta', avatar: 'https://i.pravatar.cc/150?img=32' },
  { email: 'admin@demo.com', password: DEMO_PASSWORD, role: 'owner', name: 'Admin User', avatar: 'https://i.pravatar.cc/150?img=3' },
]

async function main() {
  console.log('🌱 Starting Massive Deterministic Demo Seed...')

  // --- Create / upsert all demo persona accounts ---
  console.log('👤 Seeding demo user accounts...')
  const createdUsers: any[] = []
  for (const account of demoAccounts) {
    const u = await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, avatarUrl: account.avatar },
      create: {
        email: account.email,
        name: account.name,
        avatarUrl: account.avatar,
        canCreateOrganization: account.email === 'admin@demo.com',
      }
    })
    createdUsers.push({ ...u, role: account.role })
    console.log(`  ✓ ${account.email}`)
  }

  // --- Seed each org + workspaces ---
  for (const config of orgConfigs) {
    console.log(`\n🏢 Seeding ${config.org}...`)

    // 1. Org
    let org = await prisma.organization.findFirst({ where: { name: config.org } })
    if (!org) {
      org = await prisma.organization.create({ data: { name: config.org, industry: config.industry } })
    }

    // 2. Memberships (all demo users get access)
    for (const u of createdUsers) {
      await prisma.membership.upsert({
        where: { userId_organizationId: { userId: u.id, organizationId: org.id } },
        update: { role: u.role },
        create: { userId: u.id, organizationId: org.id, role: u.role, workspaceAccess: 'all' }
      })
    }

    // 3. Model Versions (per org)
    const existingModel = await prisma.modelVersion.findFirst({ where: { workspace: { organizationId: org.id } } })

    // 4. Workspaces
    for (const wsCfg of config.workspaces) {
      console.log(`  📂 Workspace: ${wsCfg.name}`)

      let workspace = await prisma.workspace.findFirst({ where: { name: wsCfg.name, organizationId: org.id } })
      if (!workspace) {
        workspace = await prisma.workspace.create({
          data: { name: wsCfg.name, organizationId: org.id, environment: wsCfg.env }
        })
      }

      // Model version per workspace
      const existingMV = await prisma.modelVersion.findFirst({ where: { workspaceId: workspace.id } })
      if (!existingMV) {
        const isFinance = config.industry === 'Finance'
        await prisma.modelVersion.create({
          data: {
            workspaceId: workspace.id,
            name: isFinance
              ? `Finance Intent Ranker v${faker.number.int({ min: 3, max: 6 })}.${faker.number.int({ min: 0, max: 9 })}`
              : `${config.industry} Intent Ranker v${faker.number.int({ min: 2, max: 5 })}.${faker.number.int({ min: 0, max: 9 })}`,
            status: 'champion',
            driftScore: faker.number.float({ min: 0.001, max: 0.05 }),
            p95Latency: faker.number.float({ min: isFinance ? 18 : 30, max: isFinance ? 40 : 80 }),
            featureFreshness: faker.number.float({ min: 0.85, max: 1.0 }),
          }
        })
      }

      // 5. Customers (scaled by workspace size)
      const numCustomers = scaleMap[wsCfg.scale as keyof typeof scaleMap]
      const existingCustomerCount = await prisma.customer.count({ where: { workspaceId: workspace.id } })
      const customersToCreate = Math.max(0, numCustomers - existingCustomerCount)

      const createdCustomers: any[] = await prisma.customer.findMany({
        where: { workspaceId: workspace.id }, select: { id: true }
      })

      if (customersToCreate > 0) {
        console.log(`    👥 Creating ${customersToCreate} customers...`)
        const batchSize = 500
        for (let batch = 0; batch < customersToCreate; batch += batchSize) {
          const batchEnd = Math.min(batch + batchSize, customersToCreate)
          const customerData = []
          for (let i = batch; i < batchEnd; i++) {
            const affinityDict: Record<string, number> = {}
            wsCfg.affinities.forEach(a => { affinityDict[a] = faker.number.float({ min: 0.05, max: 0.99 }) })

            customerData.push({
              workspaceId: workspace.id,
              corePersonId: `pid_${faker.string.alphanumeric(10)}`,
              name: faker.person.fullName(),
              emailHash: faker.internet.email().toLowerCase(),
              lifecycleStage: faker.helpers.arrayElement(['New', 'Active', 'At Risk', 'Churned', 'Loyalist']),
              identityConfidence: faker.number.float({ min: 0.55, max: 0.99 }),
              predictedLtv: faker.number.float({ min: 50, max: 12000 }),
              churnRisk: faker.number.float({ min: 0.01, max: 0.95 }),
              categoryAffinities: JSON.stringify(affinityDict),
            })
          }
          await prisma.customer.createMany({ data: customerData })
          // Refresh IDs
          const newCustomers = await prisma.customer.findMany({
            where: { workspaceId: workspace.id }, select: { id: true }
          })
          newCustomers.forEach(c => { if (!createdCustomers.find(x => x.id === c.id)) createdCustomers.push(c) })
        }
      }

      // Refresh all customer IDs for event generation
      const allCustomers = await prisma.customer.findMany({
        where: { workspaceId: workspace.id }, select: { id: true }
      })

      // 6. Events (scaled)
      const numEvents = eventScaleMap[wsCfg.scale as keyof typeof eventScaleMap]
      const existingEventCount = await prisma.customerEvent.count({ where: { customer: { workspaceId: workspace.id } } })
      const eventsToCreate = Math.max(0, numEvents - existingEventCount)

      if (eventsToCreate > 0 && allCustomers.length > 0) {
        console.log(`    ⚡ Creating ${eventsToCreate} events...`)
        const eventTypes = ['page_view', 'add_to_cart', 'purchase', 'email_open', 'app_open', 'search', 'wishlist_add', 'checkout_start']
        const channels = ['web', 'mobile_app', 'email', 'sms', 'push']
        const eventChunk = 500

        for (let i = 0; i < eventsToCreate; i += eventChunk) {
          const end = Math.min(i + eventChunk, eventsToCreate)
          const eventsData = []
          for (let j = i; j < end; j++) {
            eventsData.push({
              customerId: faker.helpers.arrayElement(allCustomers).id,
              eventType: faker.helpers.arrayElement(eventTypes),
              channel: faker.helpers.arrayElement(channels),
              timestamp: faker.date.recent({ days: 90 }),
              metadata: JSON.stringify({ source: 'seed', campaign: faker.helpers.arrayElement(['email_oct', 'push_nov', 'sms_dec', null]) }),
            })
          }
          await prisma.customerEvent.createMany({ data: eventsData })
        }
      }

      // 7. Segments (8 per workspace)
      const segmentNames = ['High Intent', 'Cart Abandoners', 'Loyalists', 'Churn Risk', 'Discount Seekers', 'Whales', 'New Users', 'Re-Engagement']
      const existingSegs = await prisma.segment.count({ where: { workspaceId: workspace.id } })
      if (existingSegs < segmentNames.length) {
        for (const sName of segmentNames) {
          const exists = await prisma.segment.findFirst({ where: { workspaceId: workspace.id, name: `${wsCfg.name} - ${sName}` } })
          if (!exists) {
            await prisma.segment.create({
              data: {
                workspaceId: workspace.id,
                name: `${wsCfg.name} - ${sName}`,
                audienceSize: faker.number.int({ min: 2000, max: 150000 }),
                avgLtv: faker.number.float({ min: 200, max: 8000 }),
                convProb: faker.number.float({ min: 0.03, max: 0.65 }),
              }
            })
          }
        }
      }

      // 8. Campaigns (10 per workspace)
      const segments = await prisma.segment.findMany({ where: { workspaceId: workspace.id } })
      const existingCampaignCount = await prisma.campaign.count({ where: { workspaceId: workspace.id } })
      const campaignsToCreate = Math.max(0, 10 - existingCampaignCount)
      const statuses = ['draft', 'learning', 'live', 'approved', 'review', 'live', 'live']
      const channels2 = ['email', 'sms', 'push', 'web', 'ads']
      const objectives = ['Conversion', 'Retention', 'Awareness', 'Loyalty', 'Win-Back']

      for (let i = 0; i < campaignsToCreate; i++) {
        const seg = faker.helpers.arrayElement(segments)
        const status = faker.helpers.arrayElement(statuses)
        const channel = faker.helpers.arrayElement(channels2)
        const campaign = await prisma.campaign.create({
          data: {
            workspaceId: workspace.id,
            segmentId: seg.id,
            name: `${wsCfg.name} — ${faker.helpers.arrayElement(objectives)} ${faker.date.month()} Push`,
            objective: faker.helpers.arrayElement(objectives),
            status,
            channel,
            lift: status === 'live' || status === 'learning'
              ? `+${faker.number.float({ min: 2, max: 24 }).toFixed(1)}%`
              : '-',
          }
        })

        // Creatives (3 per campaign)
        for (let j = 0; j < 3; j++) {
          const variantLabel = ['Variant A', 'Variant B', 'Control'][j]
          await prisma.creativeVariant.create({
            data: {
              campaignId: campaign.id,
              headline: faker.helpers.arrayElement([
                `${wsCfg.affinities[0]} — Made For You`,
                `Unlock Your Exclusive ${wsCfg.affinities[0]} Deal`,
                `Last Chance: ${faker.helpers.arrayElement(wsCfg.affinities)} Awaits`,
                `Your Personal ${wsCfg.affinities[0]} Pick`,
              ]),
              body: `Personalized for ${seg.name}. Tap to explore ${faker.helpers.arrayElement(wsCfg.affinities)} curated just for you.`,
              cta: faker.helpers.arrayElement(['Shop Now', 'Explore', 'Claim Offer', 'Get Started', 'See More']),
              predictedCtr: faker.number.float({ min: 2, max: 12 }),
              brandSafetyScore: faker.number.float({ min: 0.82, max: 0.99 }),
              complianceScore: faker.number.float({ min: 0.80, max: 0.99 }),
              status: status === 'live' || status === 'approved' ? 'approved' : 'generated',
            }
          })
        }

        // Experiments for live/learning campaigns
        if (status === 'live' || status === 'learning') {
          const exp = await prisma.experiment.create({
            data: {
              workspaceId: workspace.id,
              campaignId: campaign.id,
              type: 'contextual_bandit',
              status: 'running',
            }
          })
          const allocs = [faker.number.float({ min: 0.35, max: 0.65 })]
          allocs.push(1 - allocs[0])
          for (let k = 0; k < 2; k++) {
            await prisma.experimentVariant.create({
              data: {
                experimentId: exp.id,
                name: k === 0 ? 'Variant A' : 'Variant B',
                allocation: allocs[k],
                impressions: faker.number.int({ min: 5000, max: 200000 }),
                clicks: faker.number.int({ min: 300, max: 15000 }),
                conversions: faker.number.int({ min: 30, max: 2000 }),
              }
            })
          }
        }
      }

      // 9. Personalization decisions & Feedback
      const existingDecisions = await prisma.personalizationDecision.count({
        where: { customer: { workspaceId: workspace.id } }
      })
      
      const allCampaigns = await prisma.campaign.findMany({ where: { workspaceId: workspace.id } })
      const allCreatives = await prisma.creativeVariant.findMany({ where: { campaign: { workspaceId: workspace.id } } })
      const allExps = await prisma.experiment.findMany({ where: { workspaceId: workspace.id } })

      if (existingDecisions < 200 && allCustomers.length > 0 && allCampaigns.length > 0) {
        const decisions = []
        const feedbacks = []
        const numDecisions = faker.number.int({ min: 200, max: 600 })
        
        for (let i = 0; i < numDecisions; i++) {
          const customer = faker.helpers.arrayElement(allCustomers)
          const campaign = faker.helpers.arrayElement(allCampaigns)
          const variant = allCreatives.find(v => v.campaignId === campaign.id) || null
          const exp = allExps.find(e => e.campaignId === campaign.id) || null
          
          decisions.push({
            organizationId: org.id,
            workspaceId: workspace.id,
            customerId: customer.id,
            campaignId: campaign.id,
            creativeVariantId: variant?.id || null,
            experimentId: exp?.id || null,
            offer: faker.helpers.arrayElement(['variant_a', 'variant_b', 'control', 'suppress']),
            channel: campaign.channel || faker.helpers.arrayElement(['email', 'push', 'sms', 'web']),
            confidence: faker.number.float({ min: 0.5, max: 0.99 }),
            reasons: JSON.stringify([faker.helpers.arrayElement(['high_ltv', 'cart_abandoner', 'churn_risk', 'repeat_buyer'])]),
          })
        }
        
        const dChunk = 200
        for (let i = 0; i < decisions.length; i += dChunk) {
          await prisma.personalizationDecision.createMany({ data: decisions.slice(i, i + dChunk) })
        }
        
        // Refresh to get decision IDs for feedback
        const createdDecisions = await prisma.personalizationDecision.findMany({ where: { workspaceId: workspace.id }, take: numDecisions })
        for (const d of createdDecisions) {
          if (faker.number.float() > 0.4) {
            const isConv = faker.number.float() > 0.7
            feedbacks.push({
              organizationId: org.id,
              workspaceId: workspace.id,
              decisionId: d.id,
              customerId: d.customerId,
              eventType: isConv ? 'purchase' : 'click',
              channel: d.channel,
              value: isConv ? faker.number.float({ min: 20, max: 500 }) : null
            })
          }
        }
        
        for (let i = 0; i < feedbacks.length; i += dChunk) {
          await prisma.feedbackEvent.createMany({ data: feedbacks.slice(i, i + dChunk) })
        }
      }

      // 10. Usage record
      await prisma.usageMeter.upsert({
        where: { organizationId_metric_period: { organizationId: org.id, metric: 'events_ingested', period: '2026-06' } },
        update: { amount: numEvents },
        create: { organizationId: org.id, metric: 'events_ingested', amount: numEvents, period: '2026-06' }
      })

      // 11. Audit log
      const ownerUser = createdUsers.find(u => u.role === 'owner')
      if (ownerUser) {
        await prisma.auditLog.create({
          data: {
            organizationId: org.id,
            workspaceId: workspace.id,
            actorId: ownerUser.id,
            actorName: ownerUser.name,
            actorRole: 'owner',
            action: `Provisioned ${wsCfg.name} workspace with ${numCustomers} profiles`,
            resourceType: 'Workspace',
            severity: 'Info',
          }
        })
      }
    }
  }

  console.log('\n✅ Massive seed complete!')
  console.log('\n📋 Demo Accounts (password: password123):')
  for (const a of demoAccounts) {
    console.log(`  ${a.email} (${a.role})`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
