"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/rbac/require-permission"
import { requireAuth, createAuditLog } from "../server-utils"
import { revalidatePath } from "next/cache"

export async function getTeam(organizationId: string) {
  const user = await requireAuth()
  
  // Basic read permission validation
  const mem = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId } }
  })
  if (!mem) throw new Error("Unauthorized")

  return await prisma.membership.findMany({
    where: { organizationId },
    include: {
      user: true
    }
  })
}

export async function inviteMember(organizationId: string, email: string, role: string, workspaceAccess: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, permission: 'manage_team' })

  // For this demo, just create a dummy user and add them.
  // In real life, we would send an invite or check if user exists.
  
  await prisma.$transaction(async (tx) => {
    let invitee = await tx.user.findUnique({ where: { email } })
    if (!invitee) {
      invitee = await tx.user.create({
        data: {
          email,
          name: email.split('@')[0],
        }
      })
    }

    // Upsert membership
    await tx.membership.upsert({
      where: {
        userId_organizationId: {
          userId: invitee.id,
          organizationId
        }
      },
      update: { role, workspaceAccess },
      create: {
        userId: invitee.id,
        organizationId,
        role,
        workspaceAccess
      }
    })

    await createAuditLog({
      organizationId,
      actorId: user.id,
      actorName: user.name || "Unknown",
      actorRole: membership.role,
      action: "Invited Team Member",
      resourceType: "User",
      resourceId: invitee.id,
      severity: "Info"
    })
  })

  revalidatePath("/app/team")
  return { success: true }
}
