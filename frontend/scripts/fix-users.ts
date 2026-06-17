import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const demoAccounts = [
  { email: 'maya@nike.demo', role: 'marketer', name: 'Maya Sharma' },
  { email: 'arjun@nike.demo', role: 'data_scientist', name: 'Arjun Patel' },
  { email: 'kavya@nike.demo', role: 'approver', name: 'Kavya Singh' },
  { email: 'riya@nike.demo', role: 'analyst', name: 'Riya Gupta' },
  { email: 'admin@demo.com', role: 'owner', name: 'Admin User' },
]

async function main() {
  console.log('--- Fixing missing users and roles ---')

  const orgs = await prisma.organization.findMany()

  for (const account of demoAccounts) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {},
      create: {
        email: account.email,
        name: account.name,
        avatarUrl: `https://i.pravatar.cc/150?u=${account.name.split(' ')[0].toLowerCase()}`,
      }
    })

    // Give them membership to all orgs for the demo
    for (const org of orgs) {
      await prisma.membership.upsert({
        where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
        update: { role: account.role },
        create: {
          userId: user.id,
          organizationId: org.id,
          role: account.role,
          workspaceAccess: 'all'
        }
      })
    }
    console.log(`Setup ${account.email} with role ${account.role}`)
  }

  console.log('--- Done fixing users ---')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
