"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/rbac/require-permission"
import { requireAuth } from "../server-utils"
import { getCached, setCache, cacheKey } from "@/lib/cache"

import { dashboardService } from "../services/dashboard-metrics.service"

export async function getDashboardMetrics(organizationId: string, workspaceId: string, channelFilter: string = 'All Channels') {
  const user = await requireAuth()
  await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'view_dashboard' })

  const cacheKeyStr = cacheKey("dash", workspaceId, channelFilter)
  const cached = getCached(cacheKeyStr)
  if (cached) return cached

  const [metrics, channelPerf, decisions, campaigns] = await Promise.all([
    dashboardService.getCommandCenterMetrics(organizationId, workspaceId, channelFilter),
    dashboardService.getChannelPerformance(organizationId, workspaceId, channelFilter),
    dashboardService.getRecentDecisions(organizationId, workspaceId, channelFilter),
    dashboardService.getRecentCampaigns(organizationId, workspaceId, channelFilter)
  ])

  const result = {
    ...metrics,
    channelPerf,
    decisions,
    campaigns
  }
  setCache(cacheKeyStr, result, 1000 * 30)
  return result
}
