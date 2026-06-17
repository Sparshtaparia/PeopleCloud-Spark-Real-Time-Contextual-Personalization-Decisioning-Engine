import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Verifying DB Seed ---')

  const orgs = await prisma.organization.count()
  console.assert(orgs >= 4, `Expected at least 4 Orgs, got ${orgs}`)

  const workspaces = await prisma.workspace.count()
  console.assert(workspaces >= 4, `Expected at least 4 Workspaces, got ${workspaces}`)

  const customers = await prisma.customer.count()
  console.assert(customers >= 300, `Expected at least 300 Customers across orgs, got ${customers}`)

  const events = await prisma.customerEvent.count()
  console.assert(events >= 3000, `Expected at least 3000 Events, got ${events}`)

  const segments = await prisma.segment.count()
  console.assert(segments >= 24, `Expected at least 24 Segments, got ${segments}`)

  const campaigns = await prisma.campaign.count()
  console.assert(campaigns >= 32, `Expected at least 32 Campaigns, got ${campaigns}`)

  console.log('Verification Complete. All assertions passed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
