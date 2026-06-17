"use server"

import { PrismaClient } from "@prisma/client"
import { requireAuth, createOrganizationWithDefaults, createAuditLog, incrementUsage } from "../server-utils"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

export async function createOrganization(formData: FormData) {
  const sessionUser = await requireAuth()
  const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } })
  if (!dbUser) throw new Error("User not found")

  const name = formData.get("name") as string
  const industry = formData.get("industry") as string
  const workspaceName = formData.get("workspaceName") as string

  if (!name || !industry || !workspaceName) {
    throw new Error("ValidationError: name, industry, and workspaceName are required")
  }

  const correlationId = crypto.randomUUID()
  const { org, workspace } = await createOrganizationWithDefaults({
    name,
    industry,
    workspaceName,
    userId: dbUser.id,
    correlationId,
  })

  revalidatePath("/app")
  return {
    success: true,
    organizationId: org.id,
    workspaceId: workspace.id,
    organizationName: org.name,
    workspaceName: workspace.name,
    correlationId,
  }
}

export async function getOrganization(organizationId: string) {
  await requireAuth()
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { workspaces: true, brandVoice: true, billingPlan: true },
  })
  if (!org) throw new Error("Organization not found")
  return org
}

export async function updateOrganizationIndustry(organizationId: string, industry: string) {
  const sessionUser = await requireAuth()
  const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } })
  if (!dbUser) throw new Error("User not found")

  await prisma.organization.update({
    where: { id: organizationId },
    data: { industry },
  })

  await createAuditLog({
    organizationId,
    actorId: dbUser.id,
    actorName: dbUser.name || "Unknown",
    actorRole: "owner",
    action: "organization.updated",
    resourceType: "Organization",
    resourceId: organizationId,
    severity: "Info",
    metadata: { industry },
  })

  revalidatePath("/app/settings")
  return { success: true }
}
