import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Seeding Workspaces ---')

  const user = await prisma.user.findFirst()
  if (!user) {
    console.log('No user found to assign workspaces to.')
    return
  }

  const setups = [
    {
      orgName: 'Nike India',
      workspaceName: 'Running Shoes Q3',
      campaignName: 'Running Shoes',
      customers: ['Aarav Mehta', 'Riya Kapoor', 'Kabir Sinha', 'Ananya Rao', 'Vivaan Sharma']
    },
    {
      orgName: 'Tata Neu',
      workspaceName: 'Festival Rewards',
      campaignName: 'Festival Loyalty Rewards',
      customers: ['Meera Iyer', 'Rohan Nair', 'Ishita Sen', 'Dev Malhotra']
    },
    {
      orgName: 'HDFC SmartBuy',
      workspaceName: 'Premium Card Offers',
      campaignName: 'Credit Card Travel Offer',
      customers: ['Neha Bansal', 'Aditya Khanna', 'Priya Menon', 'Karan Shah']
    },
    {
      orgName: 'Myntra Luxe',
      workspaceName: 'Luxury Drop Campaign',
      campaignName: 'Luxury Fashion Drop',
      customers: ['Sana Mirza', 'Tanya Arora', 'Ira Kapoor', 'Rhea Malhotra']
    }
  ]

  for (const s of setups) {
    // Upsert Org
    let org = await prisma.organization.findFirst({ where: { name: s.orgName } })
    if (!org) {
      org = await prisma.organization.create({ data: { name: s.orgName, isSeededDemo: true } })
    }

    // Upsert Membership
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
      update: {},
      create: { userId: user.id, organizationId: org.id, role: 'owner', workspaceAccess: 'all' }
    })

    // Upsert Workspace
    let workspace = await prisma.workspace.findFirst({ where: { name: s.workspaceName, organizationId: org.id } })
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: { name: s.workspaceName, organizationId: org.id, environment: 'production' }
      })
    }

    // Seed Customers
    for (const cName of s.customers) {
      const corePersonId = `${s.workspaceName}-${cName}`.replace(/\s+/g, '-').toLowerCase()
      await prisma.customer.upsert({
        where: { corePersonId },
        update: {},
        create: {
          workspaceId: workspace.id,
          corePersonId,
          name: cName,
          emailHash: `${cName.replace(/\s+/g, '').toLowerCase()}@demo.com`,
          identityConfidence: 0.9,
          predictedLtv: 1200,
          categoryAffinities: JSON.stringify({ premium: 0.8, discount: 0.2 })
        }
      })
    }

    // Seed Segment
    let segment = await prisma.segment.findFirst({ where: { workspaceId: workspace.id } })
    if (!segment) {
      segment = await prisma.segment.create({
        data: { workspaceId: workspace.id, name: `${s.orgName} High Value`, audienceSize: 1000 }
      })
    }

    // Seed Campaign
    let campaign = await prisma.campaign.findFirst({ where: { workspaceId: workspace.id } })
    if (!campaign) {
      campaign = await prisma.campaign.create({
        data: {
          workspaceId: workspace.id,
          segmentId: segment.id,
          name: s.campaignName,
          objective: 'conversion',
          status: 'live',
          channel: 'email'
        }
      })
    }

    // Seed Models
    let model = await prisma.modelVersion.findFirst({ where: { workspaceId: workspace.id } })
    if (!model) {
      await prisma.modelVersion.create({
        data: {
          workspaceId: workspace.id,
          name: `${s.orgName} Decision Model`,
          status: 'champion',
          p95Latency: 45
        }
      })
    }
  }

  console.log('--- Done Seeding Workspaces ---')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
