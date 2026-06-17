"use server"

import { PrismaClient } from "@prisma/client"
import { requirePermission } from "@/lib/rbac/require-permission"
import { requireAuth, createAuditLog, incrementUsage } from "../server-utils"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

export async function getModels(workspaceId: string) {
  const user = await requireAuth()
  return await prisma.modelVersion.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getModelMetrics(workspaceId: string) {
  const user = await requireAuth()
  return await prisma.modelMetric.findMany({
    where: { workspaceId },
    orderBy: { timestamp: 'asc' },
    take: 30
  })
}

export async function triggerRetraining(modelVersionId: string, organizationId: string, workspaceId: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'trigger_retraining' })

  let newModelId = ""

  await prisma.$transaction(async (tx) => {
    // Check if model exists
    const model = await tx.modelVersion.findUnique({
      where: { id: modelVersionId }
    })
    
    if (!model) throw new Error("Model not found")

    // Create a new model in "training" state
    const newModel = await tx.modelVersion.create({
      data: {
        workspaceId,
        name: `${model.name} (Retraining)`,
        status: "training",
        driftScore: 0.0,
        p95Latency: 0.0,
        featureFreshness: 1.0
      }
    })
    
    newModelId = newModel.id

    // Create a new ModelMetric point simulating dropped drift after retraining
    await tx.modelMetric.create({
      data: {
        organizationId,
        workspaceId,
        modelVersionId: newModel.id,
        modelName: newModel.name,
        driftScore: 0.01,
        latencyP50: 25,
        latencyP95: 45,
        latencyP99: 60,
        errorRate: 0.001,
        featureFreshness: 0.99,
        toxicityScore: 0.001,
        onlineCtrLift: 0.15
      }
    })
  })

  await incrementUsage({
    organizationId,
    metric: "model_retraining_runs",
    amount: 1
  })

  await createAuditLog({
    organizationId,
    workspaceId,
    actorId: user.id,
    actorName: user.name || "Unknown",
    actorRole: membership.role,
    action: "Triggered retraining",
    resourceType: "ModelVersion",
    resourceId: newModelId,
    severity: "Info"
  })

  revalidatePath("/app/model-ops")
  return { success: true }
}

export async function promoteModel(modelVersionId: string, organizationId: string, workspaceId: string) {
  const user = await requireAuth()
  const membership = await requirePermission({ userId: user.id, organizationId, workspaceId, permission: 'promote_model' })

  await prisma.$transaction(async (tx) => {
    // Demote current champion
    await tx.modelVersion.updateMany({
      where: { workspaceId, status: "champion" },
      data: { status: "archived" }
    })

    // Promote new model
    await tx.modelVersion.update({
      where: { id: modelVersionId },
      data: { status: "champion", name: "Finance Intent Ranker v5.0 (Champion)" } // Mock rename for demo
    })

    await createAuditLog({
      organizationId,
      workspaceId,
      actorId: user.id,
      actorName: user.name || "Unknown",
      actorRole: membership.role,
      action: "Promoted model to champion",
      resourceType: "ModelVersion",
      resourceId: modelVersionId,
      severity: "High"
    })
  })

  revalidatePath("/app/model-ops")
  return { success: true }
}
