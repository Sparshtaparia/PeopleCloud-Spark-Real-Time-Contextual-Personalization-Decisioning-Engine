"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "../server-utils"
import { getCached, setCache, clearCache, cacheKey } from "@/lib/cache"

export async function getNotifications(workspaceId: string) {
  await requireAuth()
  const cached = getCached(cacheKey("notifications", workspaceId))
  if (cached) return cached
  const data = await prisma.notification.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  setCache(cacheKey("notifications", workspaceId), data, 1000 * 15)
  return data
}

export async function createNotification(data: {
  organizationId: string
  workspaceId: string
  title: string
  message: string
  type: "info" | "warning" | "success" | "error"
}) {
  await requireAuth()
  const result = await prisma.notification.create({ data })
  clearCache("notifications")
  return result
}

export async function markNotificationRead(id: string) {
  await requireAuth()
  return prisma.notification.update({ where: { id }, data: { isRead: true } })
}

export async function markAllRead(workspaceId: string) {
  await requireAuth()
  const result = await prisma.notification.updateMany({
    where: { workspaceId, isRead: false },
    data: { isRead: true },
  })
  clearCache("notifications")
  return result
}
