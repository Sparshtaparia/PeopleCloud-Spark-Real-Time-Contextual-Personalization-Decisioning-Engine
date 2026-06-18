"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "../server-utils"

export async function getNotifications(workspaceId: string) {
  await requireAuth()
  return prisma.notification.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
}

export async function createNotification(data: {
  organizationId: string
  workspaceId: string
  title: string
  message: string
  type: "info" | "warning" | "success" | "error"
}) {
  await requireAuth()
  return prisma.notification.create({ data })
}

export async function markNotificationRead(id: string) {
  await requireAuth()
  return prisma.notification.update({ where: { id }, data: { isRead: true } })
}

export async function markAllRead(workspaceId: string) {
  await requireAuth()
  return prisma.notification.updateMany({
    where: { workspaceId, isRead: false },
    data: { isRead: true },
  })
}
