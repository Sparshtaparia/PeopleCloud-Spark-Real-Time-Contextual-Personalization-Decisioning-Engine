import { getServerSession } from "next-auth"
import { PrismaClient } from "@prisma/client"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function getDbUser() {
  const sessionUser = await requireAuth()
  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  })
  if (!dbUser && sessionUser.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: sessionUser.email } })
    if (byEmail) return byEmail
  }
  if (!dbUser) throw new Error("User not found in database")
  return dbUser
}

export async function requireTenantContext(userId: string, organizationId: string, workspaceId?: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId }
  })
  if (!membership) throw new Error("TenantAccessError: Not a member of this organization")

  if (workspaceId) {
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, organizationId }
    })
    if (!workspace) throw new Error("TenantAccessError: Workspace does not belong to organization")
    return { membership, workspace }
  }

  return { membership, workspace: null }
}

export const rolePermissions: Record<string, string[]> = {
  owner: ["*", "delete_organization"],
  admin: ["*", "delete_organization"],
  data_scientist: ["view_dashboard", "view_customers", "view_segments", "view_experiments", "view_model_ops", "view_analytics", "trigger_retraining", "manage_models", "simulate_experiment"],
  marketer: ["view_dashboard", "view_campaigns", "view_creatives", "view_customers", "view_segments", "view_experiments", "view_analytics", "create_campaign", "edit_campaign", "generate_creative"],
  approver: ["view_dashboard", "view_campaigns", "view_creatives", "view_analytics", "approve_campaign", "approve_creative"],
  analyst: ["view_dashboard", "view_campaigns", "view_customers", "view_segments", "view_analytics"],
  viewer: ["view_dashboard", "view_analytics"]
}

export function hasPermission(role: string, permission: string) {
  const permissions = rolePermissions[role] || []
  return permissions.includes("*") || permissions.includes(permission)
}

export async function requirePermission(userId: string, organizationId: string, requiredRole: string[]) {
  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId }
  })
  
  if (!membership) throw new Error("TenantAccessError: Not a member of this organization")
  
  // Backwards compatibility for old index checking or check if role is in requiredRole list
  // Actually, we'll check if membership.role is in the allowed roles, or if it has '*' permission
  const allowed = requiredRole.includes(membership.role) || rolePermissions[membership.role]?.includes("*")

  if (!allowed) {
    throw new Error("AuthorizationError: Insufficient permission")
  }
  
  return membership
}

export async function createAuditLog({
  organizationId,
  workspaceId,
  actorId,
  actorName,
  actorRole,
  action,
  resourceType,
  resourceId,
  severity,
  metadata,
  correlationId
}: {
  organizationId: string
  workspaceId?: string
  actorId?: string
  actorName: string
  actorRole: string
  action: string
  resourceType: string
  resourceId?: string
  severity?: "Info" | "Warning" | "High"
  metadata?: any
  correlationId?: string
}) {
  return await prisma.auditLog.create({
    data: {
      organizationId,
      workspaceId,
      actorId,
      actorName,
      actorRole,
      action,
      resourceType,
      resourceId,
      severity: severity || "Info",
      metadata: metadata ? JSON.stringify(metadata) : null,
      correlationId,
      ipAddress: "192.168.1.42"
    }
  })
}

export async function incrementUsage({
  organizationId,
  metric,
  amount
}: {
  organizationId: string
  metric: string
  amount: number
}) {
  const period = new Date().toISOString().substring(0, 7) // "YYYY-MM"
  
  return await prisma.usageMeter.upsert({
    where: {
      organizationId_metric_period: {
        organizationId,
        metric,
        period
      }
    },
    update: {
      amount: { increment: amount }
    },
    create: {
      organizationId,
      metric,
      period,
      amount
    }
  })
}

export async function createOrganizationWithDefaults({
  name,
  industry,
  workspaceName,
  userId,
  correlationId
}: {
  name: string
  industry: string
  workspaceName: string
  userId: string
  correlationId?: string
}) {
  const dbUser = await prisma.user.findUnique({ where: { id: userId } })
  if (!dbUser) throw new Error("User not found")
  if (!dbUser.canCreateOrganization) throw new Error("PlatformError: You do not have permission to create a new organization")

  return await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name, industry },
    })

    const workspace = await tx.workspace.create({
      data: {
        organizationId: org.id,
        name: workspaceName,
        environment: "production",
      },
    })

    await tx.membership.create({
      data: {
        userId: dbUser.id,
        organizationId: org.id,
        role: "owner",
        workspaceAccess: "all",
      },
    })

    await tx.brandVoice.create({
      data: {
        organizationId: org.id,
        coreTone: "professional",
        bannedPhrases: "",
        approvedClaims: "",
        strictness: 85,
      },
    })

    await tx.guardrailRule.create({
      data: {
        workspaceId: workspace.id,
        name: "Competitor Mentions",
        type: "block",
        isActive: true,
      },
    })

    await tx.guardrailRule.create({
      data: {
        workspaceId: workspace.id,
        name: "Sensitive Topics",
        type: "block",
        isActive: true,
      },
    })

    const period = new Date().toISOString().substring(0, 7)
    await tx.usageMeter.create({
      data: {
        organizationId: org.id,
        metric: "events_ingested",
        amount: 0,
        period,
      },
    })

    await tx.auditLog.create({
      data: {
        organizationId: org.id,
        workspaceId: workspace.id,
        actorId: dbUser.id,
        actorName: dbUser.name || "Unknown",
        actorRole: "owner",
        action: "organization.created",
        resourceType: "Organization",
        resourceId: org.id,
        severity: "High",
        metadata: JSON.stringify({ industry, workspaceName }),
        correlationId,
        ipAddress: "192.168.1.42",
      },
    })

    await tx.auditLog.create({
      data: {
        organizationId: org.id,
        workspaceId: workspace.id,
        actorId: dbUser.id,
        actorName: dbUser.name || "Unknown",
        actorRole: "owner",
        action: "workspace.created",
        resourceType: "Workspace",
        resourceId: workspace.id,
        severity: "Info",
        correlationId,
        ipAddress: "192.168.1.42",
      },
    })

    return { org, workspace }
  })
}
