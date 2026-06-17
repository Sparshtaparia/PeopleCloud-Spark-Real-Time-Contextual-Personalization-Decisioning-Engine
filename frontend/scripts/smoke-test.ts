import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Epsilon Smoke Test ---')
  try {
    // 1. Check DB Connection
    await prisma.$connect()
    console.log('[OK] Database connected')

    // 2. Check Users
    const users = await prisma.user.count()
    console.log(`[OK] Users: ${users}`)

    // 3. Check Organizations
    const orgs = await prisma.organization.count()
    console.log(`[OK] Organizations: ${orgs}`)

    // 4. Check Workspaces
    const workspaces = await prisma.workspace.count()
    console.log(`[OK] Workspaces: ${workspaces}`)

    // 5. Check Campaigns
    const campaigns = await prisma.campaign.count()
    console.log(`[OK] Campaigns: ${campaigns}`)

    // 6. Check Creatives
    const creatives = await prisma.creativeVariant.count()
    console.log(`[OK] Creatives: ${creatives}`)

    console.log('--- Smoke Test Passed ---')
  } catch (error) {
    console.error('[FAIL] Smoke test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
