"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, requirePermission, createAuditLog } from "../server-utils"

export async function deleteOrganizationAction(input: {
  organizationId: string
  confirmationText: string
}) {
  const user = await requireAuth()

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId }
  })

  if (!org) throw new Error("Organization not found")
  if (org.isDeleted) throw new Error("Organization already deleted")

  await requirePermission(user.id, org.id, ["owner"])

  if (org.isSeededDemo) {
    await createAuditLog({
      organizationId: org.id,
      actorId: user.id,
      actorName: user.name || "Unknown",
      actorRole: "owner",
      action: "organization.delete_blocked",
      resourceType: "Organization",
      resourceId: org.id,
      severity: "Warning" as const,
      metadata: JSON.stringify({
        reason: "Seeded demo organization is protected"
      })
    })

    throw new Error("Seeded demo organizations are protected and cannot be deleted.")
  }

  const expected = `DELETE ${org.name}`

  if (input.confirmationText.trim().toLowerCase() !== `delete ${org.name.toLowerCase()}`) {
    throw new Error(`Please type "DELETE ${org.name}" to confirm.`)
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: user.id
    }
  })

  await createAuditLog({
    organizationId: org.id,
    actorId: user.id,
    actorName: user.name || "Unknown",
    actorRole: "owner",
    action: "organization.deleted",
    resourceType: "Organization",
    resourceId: org.id,
    severity: "High" as const,
    metadata: JSON.stringify({
      organizationName: org.name,
      deletionMode: "soft_delete"
    })
  })

  const nextMembership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      organization: {
        is: { isDeleted: false }
      }
    },
    include: {
      organization: {
        include: {
          workspaces: {
            take: 1,
            orderBy: { createdAt: "asc" }
          }
        }
      }
    }
  })

  return {
    success: true,
    nextOrganizationId: nextMembership?.organizationId ?? null,
    nextWorkspaceId: nextMembership?.organization.workspaces[0]?.id ?? null
  }
}
