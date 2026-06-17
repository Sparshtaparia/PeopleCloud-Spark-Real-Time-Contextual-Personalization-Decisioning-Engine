"use server"

import { PrismaClient } from "@prisma/client"
import { requireAuth } from "../server-utils"

const prisma = new PrismaClient()

export async function getUserContext() {
  const sessionUser = await requireAuth()

  let dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } })
  if (!dbUser && sessionUser.email) {
    dbUser = await prisma.user.findUnique({ where: { email: sessionUser.email } })
  }

  if (!dbUser) throw new Error("User not found in DB")

  const memberships = await prisma.membership.findMany({
    where: { 
      userId: dbUser.id,
      organization: {
        is: { isDeleted: false }
      }
    },
    include: {
      organization: {
        include: {
          workspaces: true,
          billingPlan: true,
        },
      },
    },
  })

  const organizations = memberships.map(m => ({
    id: m.organization.id,
    name: m.organization.name,
    industry: m.organization.industry || "Unknown",
    plan: m.organization.billingPlan?.tier || "Growth",
  }))

  const workspaces = memberships.flatMap(m =>
    m.organization.workspaces.map(w => ({
      id: w.id,
      organizationId: w.organizationId,
      name: w.name,
      environment: w.environment,
    }))
  )

  const defaultOrg = organizations[0] || null
  const defaultWorkspace = defaultOrg
    ? workspaces.find(w => w.organizationId === defaultOrg.id) || null
    : null

  return {
    user: {
      id: dbUser.id,
      name: dbUser.name || "Unknown",
      email: dbUser.email || "Unknown",
      avatarUrl: dbUser.avatarUrl || "",
      role: memberships[0]?.role || "viewer",
      canCreateOrganization: dbUser.canCreateOrganization,
    },
    organizations,
    workspaces,
    defaultOrg,
    defaultWorkspace,
  }
}
