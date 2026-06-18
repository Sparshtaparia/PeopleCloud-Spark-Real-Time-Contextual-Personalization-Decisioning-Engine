"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/rbac/require-permission"
import { requireAuth } from "../server-utils"

export async function getAuditLogs(workspaceId: string, correlationId?: string) {
  const user = await requireAuth()
  
  // Enforce explicit RBAC for viewing audit logs within this specific workspace
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { organizationId: true }
  })
  
  if (!workspace) throw new Error("Workspace not found")

  await requirePermission({ 
    userId: user.id, 
    organizationId: workspace.organizationId, 
    workspaceId, 
    permission: 'view_audit_logs' 
  })

  return await prisma.auditLog.findMany({
    where: correlationId ? { workspaceId, correlationId } : { workspaceId },
    orderBy: { timestamp: 'desc' },
    take: 100
  })
}
