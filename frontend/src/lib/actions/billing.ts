"use server"

import { PrismaClient } from "@prisma/client"
import { requireAuth } from "../server-utils"

const prisma = new PrismaClient()

export async function getUsage(organizationId: string) {
  const user = await requireAuth()

  // Validate user has access to org
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organizationId
      }
    }
  })

  if (!membership) throw new Error("Unauthorized")

  const usageRecords = await prisma.usageMeter.findMany({
    where: { organizationId }
  })

  // Format to standard metrics map
  const usageMap: Record<string, number> = {}
  usageRecords.forEach(r => {
    usageMap[r.metric] = r.amount
  })

  // Get workspace IDs for this org
  const workspaceIds = (await prisma.workspace.findMany({
    where: { organizationId },
    select: { id: true },
  })).map(w => w.id)

  // Real counts from DB
  const profilesCount = await prisma.customer.count({
    where: { workspace: { organizationId } }
  })
  
  const banditDecisions = await prisma.personalizationDecision.count({
    where: { organizationId }
  })

  const eventsIngested = await prisma.customerEvent.count({
    where: { organizationId }
  })

  const genaiCreatives = await prisma.creativeVariant.count({
    where: { organizationId, status: { in: ['generated', 'approved'] } }
  })

  usageMap['profiles_resolved'] = profilesCount
  usageMap['bandit_decisions'] = banditDecisions
  usageMap['events_ingested'] = eventsIngested
  usageMap['genai_creatives_generated'] = genaiCreatives

  return usageMap
}
