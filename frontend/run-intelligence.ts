import { PrismaClient } from '@prisma/client'
import { runPostImportIntelligence } from './src/lib/services/post-import-intelligence.service'

async function main() {
  const prisma = new PrismaClient()
  const ws = await prisma.workspace.findUnique({ where: { id: 'cmqijxg3n0005s3m6e9nal5kn' } })
  if (ws) {
    console.log("Running intelligence for", ws.organizationId, ws.id)
    await runPostImportIntelligence({
      organizationId: ws.organizationId,
      workspaceId: ws.id,
      correlationId: 'manual_backfill'
    })
    console.log("Success")
  }
}
main()
