"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "../server-utils"

export async function getProfile() {
  const user = await requireAuth()

  // Fetch recent activity for user
  const recentActivity = await prisma.auditLog.findMany({
    where: { actorId: user.id },
    orderBy: { timestamp: 'desc' },
    take: 5
  })

  // For this demo, we assume the frontend already has the basic user details from the session,
  // but we can return some enriched data if needed.
  
  return {
    recentActivity
  }
}
