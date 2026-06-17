import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Feed Events ---')
  const numEvents = parseInt(process.argv[2] || '10')
  console.log(`Generating ${numEvents} events...`)

  const customers = await prisma.customer.findMany()
  if (customers.length === 0) {
    console.log('No customers found. Run db:seed:large first.')
    return
  }

  const eventTypes = ['page_view', 'add_to_cart', 'purchase', 'email_open', 'app_open']
  const channels = ['web', 'mobile_app', 'email', 'sms']

  for (let i = 0; i < numEvents; i++) {
    const c = faker.helpers.arrayElement(customers)
    await prisma.customerEvent.create({
      data: {
        customerId: c.id,
        eventType: faker.helpers.arrayElement(eventTypes),
        channel: faker.helpers.arrayElement(channels),
        timestamp: new Date(),
        metadata: JSON.stringify({ source: 'live_feed' })
      }
    })
  }

  console.log(`Successfully fed ${numEvents} events.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
