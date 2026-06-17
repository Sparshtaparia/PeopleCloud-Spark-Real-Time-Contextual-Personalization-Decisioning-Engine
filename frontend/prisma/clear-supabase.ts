import { PrismaClient } from '@prisma/client'

async function main() {
  const p = new PrismaClient()
  const tables = ['WebhookEndpoint','ApiKey','Notification','GuardrailRule','BrandVoice','BillingPlan','UsageMeter','AuditLog','ModelMetric','ModelVersion','FeedbackEvent','PersonalizationDecision','ExperimentVariant','Experiment','CreativeVariant','Campaign','SegmentCustomer','Segment','CustomerEvent','Customer','DataSourceSyncLog','DataSource','WorkspaceSetting','Membership','Workspace','Organization','User']
  for (const t of tables) {
    try {
      await p.$executeRawUnsafe(`DELETE FROM "${t}"`)
      console.log(`  Cleared ${t}`)
    } catch (e: any) {
      console.error(`  Failed ${t}: ${e.message}`)
    }
  }
  console.log('Done')
}

main()
