import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const models = ['User','Organization','Workspace','Membership','Customer','CustomerEvent','Segment','Campaign','CreativeVariant','Experiment','ExperimentVariant','PersonalizationDecision','FeedbackEvent','ModelVersion','ModelMetric','AuditLog','UsageMeter','BrandVoice','GuardrailRule']
  for (const m of models) {
    const key = m[0].toLowerCase() + m.slice(1)
    try { const c = await (p as any)[key].count(); console.log(m + ': ' + c) } catch(e) { console.log(m + ': ERROR') }
  }
}
main().catch(e => console.error(e.message)).finally(() => process.exit(0))
