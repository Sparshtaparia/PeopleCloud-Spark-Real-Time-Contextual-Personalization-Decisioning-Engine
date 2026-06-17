import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Seeding Minimum Base Data ---')

  // Create Base Demo User with canCreateOrganization
  const user = await prisma.user.upsert({
    where: { email: 'demo@epsilon.com' },
    update: {},
    create: {
      email: 'demo@epsilon.com',
      name: 'Maya Sharma',
      avatarUrl: 'https://i.pravatar.cc/150?u=maya',
      canCreateOrganization: false,
    }
  })

  console.log('Created base user:', user.email)
  console.log('--- Done Seeding Base Data ---')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
