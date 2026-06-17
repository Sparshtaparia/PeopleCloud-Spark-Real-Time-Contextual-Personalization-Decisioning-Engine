import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'
import path from 'path'

const SQLITE_PATH = path.join(__dirname, 'dev.db')
const sqlite = new Database(SQLITE_PATH)
sqlite.pragma('journal_mode = WAL')

const prisma = new PrismaClient()

const DATETIME_FIELDS = new Set([
  'createdAt', 'updatedAt', 'timestamp', 'lastSyncAt', 'startedAt', 'finishedAt',
  'deletedAt', 'lastUsedAt', 'birthDate',
])

const BOOLEAN_FIELDS = new Set([
  'isActive', 'isSeededDemo', 'isDeleted', 'isRead', 'consentStatus',
  'canCreateOrganization', 'alert',
])

function toPG(val: any): any {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'bigint') return Number(val)
  if (typeof val === 'number') return val
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (val instanceof Date) return `'${val.toISOString()}'`
  const s = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
  return `'${s}'`
}

function mapRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) continue
    if (DATETIME_FIELDS.has(k)) {
      out[k] = typeof v === 'number' ? new Date(v) : new Date(v)
    } else if (BOOLEAN_FIELDS.has(k)) {
      out[k] = v === 1 || v === true || v === 'true' || v === 1n
    } else if (typeof v === 'bigint') {
      out[k] = Number(v)
    } else if (typeof v === 'number') {
      out[k] = v
    } else if (typeof v === 'boolean') {
      out[k] = v
    } else {
      out[k] = String(v)
    }
  }
  return out
}

const ALL_TABLES: { table: string; model: string; columns: string[]; idField: string }[] = [
  { table: 'User', model: 'user', columns: ['id','email','passwordHash','name','avatarUrl','canCreateOrganization','createdAt','updatedAt'], idField: 'id' },
  { table: 'Organization', model: 'organization', columns: ['id','name','industry','isSeededDemo','isDeleted','deletedAt','deletedBy','createdAt','updatedAt'], idField: 'id' },
  { table: 'Workspace', model: 'workspace', columns: ['id','organizationId','name','environment','createdAt','updatedAt'], idField: 'id' },
  { table: 'Membership', model: 'membership', columns: ['id','userId','organizationId','role','workspaceAccess','createdAt','updatedAt'], idField: 'id' },
  { table: 'WorkspaceSetting', model: 'workspaceSetting', columns: ['id','organizationId','workspaceId','key','value','createdAt','updatedAt'], idField: 'id' },
  { table: 'DataSource', model: 'dataSource', columns: ['id','organizationId','workspaceId','name','type','status','eventsReceived','lastSyncAt','createdAt','updatedAt'], idField: 'id' },
  { table: 'DataSourceSyncLog', model: 'dataSourceSyncLog', columns: ['id','dataSourceId','status','eventsProcessed','startedAt','finishedAt','errorMessage'], idField: 'id' },
  { table: 'Customer', model: 'customer', columns: ['id','organizationId','workspaceId','corePersonId','name','emailHash','lifecycleStage','identityConfidence','consentStatus','predictedLtv','churnRisk','categoryAffinities','createdAt','updatedAt'], idField: 'id' },
  { table: 'CustomerEvent', model: 'customerEvent', columns: ['id','organizationId','workspaceId','customerId','eventType','channel','metadata','timestamp','campaignId','decisionId'], idField: 'id' },
  { table: 'Segment', model: 'segment', columns: ['id','organizationId','workspaceId','name','audienceSize','avgLtv','convProb','alert','createdAt','updatedAt'], idField: 'id' },
  { table: 'SegmentCustomer', model: 'segmentCustomer', columns: ['id','organizationId','workspaceId','segmentId','customerId','createdAt'], idField: 'id' },
  { table: 'Campaign', model: 'campaign', columns: ['id','organizationId','workspaceId','segmentId','name','objective','status','channel','lift','createdAt','updatedAt'], idField: 'id' },
  { table: 'CreativeVariant', model: 'creativeVariant', columns: ['id','organizationId','workspaceId','campaignId','headline','body','cta','predictedCtr','brandSafetyScore','complianceScore','personalizationReason','status','segmentId','channel','strategy','subject','preheader','championReason','guardrailWarnings','createdAt','updatedAt'], idField: 'id' },
  { table: 'Experiment', model: 'experiment', columns: ['id','organizationId','workspaceId','campaignId','type','status','totalLift','createdAt','updatedAt'], idField: 'id' },
  { table: 'ExperimentVariant', model: 'experimentVariant', columns: ['id','organizationId','workspaceId','experimentId','creativeVariantId','name','allocation','impressions','clicks','conversions','lift','confidence'], idField: 'id' },
  { table: 'PersonalizationDecision', model: 'personalizationDecision', columns: ['id','organizationId','workspaceId','customerId','campaignId','creativeVariantId','experimentId','offer','channel','confidence','reasons','timestamp'], idField: 'id' },
  { table: 'FeedbackEvent', model: 'feedbackEvent', columns: ['id','organizationId','workspaceId','decisionId','customerId','eventType','channel','value','metadata','timestamp'], idField: 'id' },
  { table: 'ModelVersion', model: 'modelVersion', columns: ['id','organizationId','workspaceId','name','status','driftScore','p95Latency','featureFreshness','createdAt','updatedAt'], idField: 'id' },
  { table: 'ModelMetric', model: 'modelMetric', columns: ['id','organizationId','workspaceId','modelVersionId','modelName','timestamp','driftScore','latencyP50','latencyP95','latencyP99','errorRate','featureFreshness','toxicityScore','onlineCtrLift'], idField: 'id' },
  { table: 'AuditLog', model: 'auditLog', columns: ['id','organizationId','workspaceId','correlationId','actorId','actorName','actorRole','action','resourceType','resourceId','severity','metadata','ipAddress','userAgent','timestamp'], idField: 'id' },
  { table: 'UsageMeter', model: 'usageMeter', columns: ['id','organizationId','workspaceId','metric','amount','period','updatedAt'], idField: 'id' },
  { table: 'BillingPlan', model: 'billingPlan', columns: ['id','organizationId','tier','price','billingPeriod','createdAt','updatedAt'], idField: 'id' },
  { table: 'BrandVoice', model: 'brandVoice', columns: ['id','organizationId','coreTone','bannedPhrases','approvedClaims','strictness','updatedAt'], idField: 'id' },
  { table: 'GuardrailRule', model: 'guardrailRule', columns: ['id','organizationId','workspaceId','name','type','isActive'], idField: 'id' },
  { table: 'Notification', model: 'notification', columns: ['id','organizationId','workspaceId','title','message','type','isRead','createdAt'], idField: 'id' },
  { table: 'ApiKey', model: 'apiKey', columns: ['id','organizationId','workspaceId','name','maskedKey','keyHash','type','isActive','createdAt','lastUsedAt'], idField: 'id' },
  { table: 'WebhookEndpoint', model: 'webhookEndpoint', columns: ['id','organizationId','workspaceId','url','secret','events','isActive','createdAt','updatedAt'], idField: 'id' },
]

async function migrate() {
  console.log('Reading from SQLite...')
  const tableData: Record<string, any[]> = {}
  for (const { table, columns } of ALL_TABLES) {
    const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<string, any>[]
    tableData[table] = rows.map(mapRow)
    console.log(`  ${table}: ${rows.length} rows`)
  }
  sqlite.close()

  console.log('\nWriting to Supabase via raw SQL...')

  for (const { table, columns, idField } of ALL_TABLES) {
    const rows = tableData[table]
    if (rows.length === 0) { console.log(`  ${table}: 0 rows, skipped`); continue }

    const cols = columns.map(c => '"' + c + '"').join(', ')
    let inserted = 0
    let errors = 0

    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500)
      const values = batch.map(row => {
        const vals = columns.map(c => toPG(row[c]))
        return '(' + vals.join(', ') + ')'
      }).join(',\n')

      const sql = `INSERT INTO "${table}" (${cols}) VALUES ${values} ON CONFLICT ("${idField}") DO NOTHING`
      const singleSql = `INSERT INTO "${table}" (${cols}) VALUES (`

      try {
        await prisma.$executeRawUnsafe(sql)
        inserted += batch.length
      } catch (err: any) {
        if (inserted === 0 && errors === 0) console.error(`  Batch error in ${table}: ${err.message}`)
        // fallback to individual inserts
        for (const row of batch) {
          const singleVals = columns.map(c => toPG(row[c])).join(', ')
          try {
            await prisma.$executeRawUnsafe(`INSERT INTO "${table}" (${cols}) VALUES (${singleVals}) ON CONFLICT ("${idField}") DO NOTHING`)
            inserted++
      } catch (e2: any) {
        errors++
        if (errors <= 3) console.error(`    Error in ${table}: ${e2.message}`)
      }
        }
      }
    }
    console.log(`  ${table}: ${inserted} inserted, ${errors} errors`)
  }

  console.log('\nMigration complete!')
}

migrate()
  .catch(e => { console.error('Migration failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
