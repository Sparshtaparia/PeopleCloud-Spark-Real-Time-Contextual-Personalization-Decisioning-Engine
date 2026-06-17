"use server"

import { PrismaClient } from "@prisma/client"
import { requirePermission } from "@/lib/rbac/require-permission"
import { requireAuth } from "../server-utils"

const prisma = new PrismaClient()

import { dashboardService } from "../services/dashboard-metrics.service"

export async function getDashboardMetrics(organizationId: string, workspaceId: string, channelFilter: string = 'All Channels') {
  const user = await requireAuth()
  await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'view_dashboard' })

  const [metrics, channelPerf, decisions, campaigns] = await Promise.all([
    dashboardService.getCommandCenterMetrics(organizationId, workspaceId, channelFilter),
    dashboardService.getChannelPerformance(organizationId, workspaceId, channelFilter),
    dashboardService.getRecentDecisions(organizationId, workspaceId, channelFilter),
    dashboardService.getRecentCampaigns(organizationId, workspaceId, channelFilter)
  ])

  return {
    ...metrics,
    channelPerf,
    decisions,
    campaigns
  }
}
