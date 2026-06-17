import { hasPermission } from '../server-utils'
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function requirePermission({
  userId,
  organizationId,
  permission,
  workspaceId
}: {
  userId: string
  organizationId: string
  permission: string
  workspaceId?: string
}) {
  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId }
  })
  
  if (!membership) throw new Error("TenantAccessError: Not a member of this organization")
  
  // Check action permission
  if (!hasPermission(membership.role, permission)) {
    throw new Error(`AuthorizationError: Insufficient permission (${permission})`)
  }
  
  // Check object/workspace level permission
  if (workspaceId) {
    if (membership.workspaceAccess !== 'all' && membership.workspaceAccess !== workspaceId) {
      throw new Error("AuthorizationError: Insufficient workspace access")
    }
  }
  
  return membership
}
