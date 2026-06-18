"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/rbac/require-permission"
import { requireAuth, createAuditLog, incrementUsage } from "../server-utils"
import { revalidatePath } from "next/cache"

export async function getDataSources(workspaceId: string) {
  const user = await requireAuth()
  return await prisma.dataSource.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" }
  })
}

export async function connectDataSource(workspaceId: string, organizationId: string, name: string, type: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'manage_data_sources' })

  const source = await prisma.dataSource.create({
    data: {
      workspaceId,
      name,
      type,
      status: "connected",
      eventsReceived: 0
    }
  })

  await createAuditLog({
    organizationId,
    workspaceId,
    actorId: user.id,
    actorName: user.name || "Unknown",
    actorRole: membership.role,
    action: "Connected data source",
    resourceType: "DataSource",
    resourceId: source.id,
    severity: "Info"
  })

  revalidatePath("/app/data-sources")
  return { success: true, sourceId: source.id }
}

export async function syncDataSource(sourceId: string, organizationId: string, workspaceId: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'manage_data_sources' })

  await prisma.$transaction(async (tx) => {
    // 1. Log the sync start
    const syncLog = await tx.dataSourceSyncLog.create({
      data: {
        dataSourceId: sourceId,
        status: "syncing"
      }
    })

    // Simulate ingesting events
    const simulatedEvents = Math.floor(Math.random() * 50000) + 10000

    // 2. Update source
    await tx.dataSource.update({
      where: { id: sourceId },
      data: {
        status: "healthy",
        lastSyncAt: new Date(),
        eventsReceived: { increment: simulatedEvents }
      }
    })

    // 3. Update sync log
    await tx.dataSourceSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "success",
        eventsProcessed: simulatedEvents,
        finishedAt: new Date()
      }
    })

    await incrementUsage({
      organizationId,
      metric: "events_ingested",
      amount: simulatedEvents
    })

    await createAuditLog({
      organizationId,
      workspaceId,
      actorId: user.id,
      actorName: user.name || "Unknown",
      actorRole: membership.role,
      action: "Synced data source",
      resourceType: "DataSource",
      resourceId: sourceId,
      severity: "Info",
      metadata: { events: simulatedEvents }
    })
  })

  revalidatePath("/app/data-sources")
  return { success: true }
}

export async function removeDataSource(sourceId: string, organizationId: string, workspaceId: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'manage_data_sources' })

  // Find source to get events received
  const source = await prisma.dataSource.findUnique({ where: { id: sourceId } })
  if (!source) throw new Error("Data source not found")

  await prisma.$transaction(async (tx) => {
    await tx.dataSource.delete({ where: { id: sourceId } })
  })

  if (source.eventsReceived > 0) {
    await incrementUsage({
      organizationId,
      metric: "events_ingested",
      amount: -source.eventsReceived
    })
  }

  await createAuditLog({
    organizationId,
    workspaceId,
    actorId: user.id,
    actorName: user.name || "Unknown",
    actorRole: membership.role,
    action: "Removed data source",
    resourceType: "DataSource",
    resourceId: sourceId,
    severity: "Warning",
    metadata: { sourceName: source.name, eventsLost: source.eventsReceived }
  })

  revalidatePath("/app/data-sources")
  return { success: true }
}
