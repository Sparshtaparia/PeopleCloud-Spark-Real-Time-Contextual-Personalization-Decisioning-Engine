import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.user.update({
    where: { email: 'admin@demo.com' },
    data: { canCreateOrganization: true }
  })
  console.log("Updated admin@demo.com to canCreateOrganization: true")
}

main().finally(() => prisma.$disconnect())
