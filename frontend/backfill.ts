import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  const events = await prisma.customerEvent.findMany({
    where: { workspaceId: null },
    include: { customer: true }
  })
  let updated = 0
  for (const ev of events) {
    if (ev.customer?.workspaceId) {
      await prisma.customerEvent.update({
        where: { id: ev.id },
        data: { workspaceId: ev.customer.workspaceId }
      })
      updated++
    }
  }
  console.log("Updated", updated, "events")

  const decisions = await prisma.personalizationDecision.findMany({
    where: { workspaceId: null },
    include: { customer: true }
  })
  let decUpdated = 0
  for (const dec of decisions) {
    if (dec.customer?.workspaceId) {
      await prisma.personalizationDecision.update({
        where: { id: dec.id },
        data: { workspaceId: dec.customer.workspaceId }
      })
      decUpdated++
    }
  }
  console.log("Updated", decUpdated, "decisions")
}
main().catch(console.error).finally(() => prisma.$disconnect())
