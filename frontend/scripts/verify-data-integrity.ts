import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function verify() {
  console.log("🔍 Running Data Integrity Verification...")
  
  let errors = 0
  const assert = (condition: boolean, message: string) => {
    if (!condition) {
      console.error(`❌ [FAIL] ${message}`)
      errors++
    } else {
      console.log(`✅ [PASS] ${message}`)
    }
  }

  const campaigns = await prisma.campaign.findMany({ include: { creativeVariants: true, experiments: true } })
  assert(campaigns.every(c => c.workspaceId), "No campaigns without workspaceId")
  assert(campaigns.every(c => c.creativeVariants.length > 0 || c.status === 'draft'), "No live campaigns without creatives")

  const experiments = await prisma.experiment.findMany({ include: { variants: true } })
  assert(experiments.every(e => e.campaignId), "No experiments without campaign")
  assert(experiments.every(e => e.variants.length > 0), "No experiment variants without creative variant logic")

  const decisions = await prisma.personalizationDecision.findMany()
  assert(decisions.every(d => d.customerId && d.campaignId), "No decisions without customer/campaign")

  const feedback = await prisma.feedbackEvent.findMany()
  assert(feedback.every(f => f.decisionId === null || decisions.find(d => d.id === f.decisionId)), "No feedback event with invalid decision reference")

  const audits = await prisma.auditLog.findMany()
  assert(audits.every(a => !isNaN(a.timestamp.getTime())), "No audit log with invalid timestamp")

  const models = await prisma.modelMetric.findMany()
  assert(models.length > 0, "Model drift chart has ModelMetric rows")

  const usage = await prisma.usageMeter.findMany()
  assert(usage.length > 0, "Billing page has UsageMeter rows")

  if (errors > 0) {
    console.error(`\n❌ Verification failed with ${errors} errors.`)
    process.exit(1)
  } else {
    console.log(`\n✅ All data integrity checks passed!`)
    process.exit(0)
  }
}

verify().catch(console.error)
