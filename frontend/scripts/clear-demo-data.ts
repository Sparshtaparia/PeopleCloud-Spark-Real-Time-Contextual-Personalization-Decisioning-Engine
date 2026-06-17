import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Clearing Demo Data ---')

  // Due to cascade deletes, we can just delete the organizations
  const orgs = await prisma.organization.findMany()
  for (const org of orgs) {
    await prisma.organization.delete({ where: { id: org.id } })
  }

  console.log('--- Successfully Cleared All Data ---')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
