"use server"

import { PrismaClient } from "@prisma/client"
import { requireAuth, createAuditLog, incrementUsage } from "../server-utils"
import { revalidatePath } from "next/cache"
import * as XLSX from "xlsx"
import Papa from "papaparse"

const prisma = new PrismaClient()

export interface ParsedFileResult {
  headers: string[]
  rows: Record<string, string>[]
  totalRows: number
  fileName: string
  fileType: "csv" | "excel"
}

export interface ColumnMapping {
  sparkField: string
  fileColumn: string | null
  required: boolean
  status: "mapped" | "missing" | "optional"
}

export interface ImportValidationResult {
  valid: boolean
  totalRows: number
  validRows: number
  invalidRows: number
  errors: string[]
  warnings: string[]
  estimatedCustomers: number
  estimatedEvents: number
  columnStats: Record<string, { filled: number; empty: number; sampleValues: string[] }>
}

export interface ImportSummary {
  rowsProcessed: number
  customersCreated: number
  eventsCreated: number
  segmentsGenerated: number
  campaignsSuggested: number
  invalidRows: number
  duplicatesMerged: number
  warnings: string[]
  durationMs: number
}

const SPARK_FIELDS = [
  { field: "customer_name", required: true, aliases: ["name", "full_name", "customer", "user_name", "first_name", "last_name"] },
  { field: "email", required: false, aliases: ["email_address", "user_email", "e-mail", "mail"] },
  { field: "phone", required: false, aliases: ["mobile", "phone_number", "contact", "telephone"] },
  { field: "city", required: false, aliases: ["location", "town", "metro"] },
  { field: "age_group", required: false, aliases: ["age", "age_range", "demographic"] },
  { field: "product_category", required: false, aliases: ["category", "item_category", "product_type", "department"] },
  { field: "product_name", required: false, aliases: ["product", "item_name", "sku_name", "item"] },
  { field: "event_type", required: true, aliases: ["event", "action", "activity", "type"] },
  { field: "channel", required: true, aliases: ["source_channel", "marketing_channel", "source", "medium"] },
  { field: "event_value", required: false, aliases: ["value", "amount", "order_value", "revenue", "price"] },
  { field: "timestamp", required: true, aliases: ["date", "event_time", "created_at", "time", "datetime"] },
]

const KNOWN_EVENT_TYPES = [
  "page_view", "product_view", "search", "add_to_cart", "purchase",
  "email_open", "email_click", "push_open", "sms_click",
  "ad_impression", "ad_click", "wishlist_add", "coupon_apply", "unsubscribe",
]

const KNOWN_CHANNELS = ["email", "web", "app_push", "sms", "ads", "push", "mobile_app"]

function getFieldMatch(fileHeaders: string[], sparkField: { field: string; aliases: string[] }): string | null {
  const lowerHeaders = fileHeaders.map(h => h.toLowerCase().trim())
  const fieldLower = sparkField.field.toLowerCase()

  const exactMatch = lowerHeaders.findIndex(h => h === fieldLower)
  if (exactMatch >= 0) return fileHeaders[exactMatch]

  const aliasMatch = lowerHeaders.findIndex(h => sparkField.aliases.map(a => a.toLowerCase()).includes(h))
  if (aliasMatch >= 0) return fileHeaders[aliasMatch]

  const containsMatch = lowerHeaders.findIndex(h =>
    sparkField.aliases.map(a => a.toLowerCase()).some(a => h.includes(a) || a.includes(h))
  )
  if (containsMatch >= 0) return fileHeaders[containsMatch]

  return null
}

export async function parseUploadedFile(
  formData: FormData
): Promise<ParsedFileResult> {
  await requireAuth()

  const file = formData.get("file") as File
  if (!file) throw new Error("No file provided")

  const fileName = file.name.toLowerCase()
  const buffer = Buffer.from(await file.arrayBuffer())

  if (fileName.endsWith(".csv")) {
    const text = buffer.toString("utf-8")
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    })

    if (result.errors.length > 0) {
      const criticalErrors = result.errors.filter(e => e.type === "FieldMismatch" || e.type === "Quotes")
      if (criticalErrors.length > 0) {
        throw new Error(`CSV parse error: ${criticalErrors[0].message}`)
      }
    }

    const rows = result.data as Record<string, string>[]
    return {
      headers: result.meta.fields || [],
      rows: rows.slice(0, 20),
      totalRows: rows.length,
      fileName: file.name,
      fileType: "csv",
    }
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) throw new Error("Excel file has no sheets")

    const sheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" })
    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : []

    return {
      headers,
      rows: jsonData.slice(0, 20),
      totalRows: jsonData.length,
      fileName: file.name,
      fileType: "excel",
    }
  } else {
    throw new Error("Unsupported file type. Please upload a CSV or Excel (.xlsx/.xls) file.")
  }
}

export async function suggestColumnMapping(headers: string[]): Promise<ColumnMapping[]> {
  await requireAuth()

  return SPARK_FIELDS.map(sf => {
    const match = getFieldMatch(headers, sf)
    return {
      sparkField: sf.field,
      fileColumn: match,
      required: sf.required,
      status: match ? "mapped" : sf.required ? "missing" : "optional",
    }
  })
}

export async function validateImportData(
  rows: Record<string, string>[],
  mapping: ColumnMapping[]
): Promise<ImportValidationResult> {
  await requireAuth()

  const errors: string[] = []
  const warnings: string[] = []
  let validRows = 0
  let invalidRows = 0

  const mappedFields = mapping.filter(m => m.fileColumn).map(m => ({
    sparkField: m.sparkField,
    fileColumn: m.fileColumn!,
    required: m.required,
  }))

  const missingRequired = mapping.filter(m => m.required && !m.fileColumn)
  if (missingRequired.length > 0) {
    errors.push(`Missing required fields: ${missingRequired.map(m => m.sparkField).join(", ")}`)
    return {
      valid: false, totalRows: rows.length, validRows: 0, invalidRows: rows.length,
      errors, warnings, estimatedCustomers: 0, estimatedEvents: 0, columnStats: {},
    }
  }

  const columnStats: Record<string, { filled: number; empty: number; sampleValues: string[] }> = {}
  for (const mf of mappedFields) {
    columnStats[mf.sparkField] = { filled: 0, empty: 0, sampleValues: [] }
  }

  let hasCustomerName = false
  let hasEmailOrPhone = false
  let uniqueEmails = new Set<string>()

  for (const row of rows) {
    let rowValid = true

    for (const mf of mappedFields) {
      const val = (row[mf.fileColumn] || "").trim()
      if (val) {
        columnStats[mf.sparkField].filled++
        if (columnStats[mf.sparkField].sampleValues.length < 3) {
          columnStats[mf.sparkField].sampleValues.push(val.substring(0, 50))
        }
      } else {
        columnStats[mf.sparkField].empty++
        if (mf.required && mf.sparkField !== "customer_name") {
          rowValid = false
        }
      }
    }

    const customerName = row[mappedFields.find(m => m.sparkField === "customer_name")?.fileColumn || ""]?.trim()
    const email = row[mappedFields.find(m => m.sparkField === "email")?.fileColumn || ""]?.trim()
    const phone = row[mappedFields.find(m => m.sparkField === "phone")?.fileColumn || ""]?.trim()
    const eventType = row[mappedFields.find(m => m.sparkField === "event_type")?.fileColumn || ""]?.trim()
    const channel = row[mappedFields.find(m => m.sparkField === "channel")?.fileColumn || ""]?.trim()
    const timestamp = row[mappedFields.find(m => m.sparkField === "timestamp")?.fileColumn || ""]?.trim()
    const eventValue = row[mappedFields.find(m => m.sparkField === "event_value")?.fileColumn || ""]?.trim()

    if (customerName) hasCustomerName = true
    if (email || phone) hasEmailOrPhone = true
    if (email) uniqueEmails.add(email.toLowerCase())

    if (!eventType) {
      if (mappedFields.find(m => m.sparkField === "event_type")?.required) {
        rowValid = false
      }
    }

    if (!channel) {
      if (mappedFields.find(m => m.sparkField === "channel")?.required) {
        rowValid = false
      }
    }

    if (!timestamp) {
      if (mappedFields.find(m => m.sparkField === "timestamp")?.required) {
        rowValid = false
      }
    } else if (isNaN(Date.parse(timestamp))) {
      warnings.push(`Invalid timestamp in row: ${timestamp}`)
    }

    if (eventValue && isNaN(Number(eventValue))) {
      warnings.push(`Non-numeric event_value: "${eventValue}"`)
    }

    if (eventType && !KNOWN_EVENT_TYPES.includes(eventType.toLowerCase())) {
      warnings.push(`Unknown event type "${eventType}" — will be mapped to custom_event`)
    }

    if (channel && !KNOWN_CHANNELS.includes(channel.toLowerCase()) && !channel.toLowerCase().includes("other")) {
      warnings.push(`Unknown channel "${channel}"`)
    }

    if (rowValid) validRows++
    else invalidRows++
  }

  if (!hasCustomerName) {
    warnings.push("No customer_name column — customers will be created without names")
  }

  if (!hasEmailOrPhone) {
    errors.push("No email or phone column found — at least one identifier is required for identity resolution")
    return {
      valid: false, totalRows: rows.length, validRows: 0, invalidRows: rows.length,
      errors, warnings, estimatedCustomers: 0, estimatedEvents: 0, columnStats,
    }
  }

  const dedupedWarnings = [...new Set(warnings)]
  return {
    valid: errors.length === 0,
    totalRows: rows.length,
    validRows,
    invalidRows,
    errors,
    warnings: dedupedWarnings,
    estimatedCustomers: uniqueEmails.size || Math.ceil(validRows / 3),
    estimatedEvents: validRows,
    columnStats,
  }
}

function mapChannel(channel: string): string {
  const lower = channel.toLowerCase().trim()
  const channelMap: Record<string, string> = {
    email: "email", "e mail": "email", "e-mail": "email", mail: "email",
    web: "web", website: "web", site: "web", browser: "web",
    push: "push", app_push: "push", "app push": "push", notification: "push", mobile_push: "push",
    sms: "sms", text: "sms", message: "sms",
    ads: "ads", ad: "ads", social_ads: "ads", display: "ads", paid: "ads",
    mobile_app: "push", app: "push", in_app: "push", "in-app": "push",
  }
  return channelMap[lower] || "other"
}

function mapEventType(eventType: string): string {
  const lower = eventType.toLowerCase().trim()
  if (KNOWN_EVENT_TYPES.includes(lower)) return lower
  return "custom_event"
}

function computeIdentityConfidence(email: string, phone: string, name: string): number {
  const hasEmail = email.length > 0
  const hasPhone = phone.length > 0
  const hasName = name.length > 0

  if (hasEmail && hasPhone) return 0.95
  if (hasEmail) return 0.85
  if (hasPhone) return 0.75
  if (hasName) return 0.45
  return 0.3
}

function computeLifecycleStage(events: Array<{ eventType: string; daysSince: number }>): string {
  const purchaseCount = events.filter(e => e.eventType === "purchase").length
  const cartAddCount = events.filter(e => e.eventType === "add_to_cart").length
  const viewCount = events.filter(e => ["page_view", "product_view", "search"].includes(e.eventType)).length
  const maxDays = events.length > 0 ? Math.max(...events.map(e => e.daysSince)) : 0
  const recentActivity = events.some(e => e.daysSince <= 20)

  if (purchaseCount >= 3) return "loyal_customer"
  if (cartAddCount > 0 && purchaseCount === 0) return "cart_abandoner"
  if (viewCount >= 5 && purchaseCount === 0) return "high_intent"
  if (!recentActivity && maxDays > 20) return "churn_risk"
  if (events.length <= 1) return "new_visitor"
  return "active_browser"
}

function computeCategoryAffinities(events: Array<{ productCategory: string }>): Record<string, number> {
  const counts: Record<string, number> = {}
  let total = 0

  for (const e of events) {
    if (e.productCategory) {
      counts[e.productCategory] = (counts[e.productCategory] || 0) + 1
      total++
    }
  }

  if (total === 0) return {}

  const affinities: Record<string, number> = {}
  for (const [cat, count] of Object.entries(counts)) {
    affinities[cat] = Math.round((count / total) * 100) / 100
  }
  return affinities
}

function computePredictedLTV(events: Array<{ eventType: string; value: number }>): number {
  const totalPurchaseValue = events
    .filter(e => e.eventType === "purchase")
    .reduce((sum, e) => sum + e.value, 0)

  const viewCount = events.filter(e => ["page_view", "product_view"].includes(e.eventType)).length
  const clickCount = events.filter(e => ["email_click", "ad_click", "sms_click"].includes(e.eventType)).length

  return Math.round((totalPurchaseValue * 3) + (viewCount * 100) + (clickCount * 50))
}

function computeChurnRisk(events: Array<{ eventType: string; daysSince: number }>, hasUnsubscribe: boolean): number {
  if (hasUnsubscribe) return 0.95

  const maxDays = events.length > 0 ? Math.max(...events.map(e => e.daysSince)) : 999

  if (maxDays > 30) return 0.8
  if (maxDays > 15) return 0.5
  if (maxDays > 7) return 0.3
  return 0.1
}

function computePreferredChannel(events: Array<{ channel: string; eventType: string }>): string {
  const weights: Record<string, number> = { purchase: 4, click: 3, open: 2, view: 1 }
  const scores: Record<string, number> = {}

  for (const e of events) {
    const weight = Object.entries(weights).find(([key]) =>
      e.eventType.toLowerCase().includes(key)
    )?.[1] ?? 0.5

    scores[e.channel] = (scores[e.channel] || 0) + weight
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  return sorted.length > 0 ? sorted[0][0] : "email"
}

export async function importData(
  organizationId: string,
  workspaceId: string,
  mappingJson: string,
  rowsJson: string
): Promise<ImportSummary> {
  const start = Date.now()
  const sessionUser = await requireAuth()
  const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } })
  if (!dbUser) throw new Error("User not found")

  const mapping: ColumnMapping[] = JSON.parse(mappingJson)
  const allRows: Record<string, string>[] = JSON.parse(rowsJson)

  const mappedFields = mapping.filter(m => m.fileColumn).map(m => ({
    sparkField: m.sparkField,
    fileColumn: m.fileColumn!,
  }))

  const dataSource = await prisma.dataSource.create({
    data: {
      workspaceId,
      name: `${allRows.length} rows — CSV Import`,
      type: "csv_upload",
      status: "healthy",
      eventsReceived: allRows.length,
      lastSyncAt: new Date(),
    },
  })

  const customerMap = new Map<string, {
    name: string
    email: string
    phone: string
    city: string
    ageGroup: string
    events: Array<{ eventType: string; channel: string; productCategory: string; productName: string; value: number; timestamp: Date; daysSince: number }>
    hasUnsubscribe: boolean
  }>()

  let invalidRows = 0
  const errors: string[] = []

  for (const row of allRows) {
    const email = (row[mappedFields.find(m => m.sparkField === "email")?.fileColumn || ""] || "").trim().toLowerCase()
    const phone = (row[mappedFields.find(m => m.sparkField === "phone")?.fileColumn || ""] || "").trim()
    const customerName = (row[mappedFields.find(m => m.sparkField === "customer_name")?.fileColumn || ""] || "").trim()
    const city = (row[mappedFields.find(m => m.sparkField === "city")?.fileColumn || ""] || "").trim()
    const ageGroup = (row[mappedFields.find(m => m.sparkField === "age_group")?.fileColumn || ""] || "").trim()
    const productCategory = (row[mappedFields.find(m => m.sparkField === "product_category")?.fileColumn || ""] || "").trim()
    const productName = (row[mappedFields.find(m => m.sparkField === "product_name")?.fileColumn || ""] || "").trim()
    const eventTypeRaw = (row[mappedFields.find(m => m.sparkField === "event_type")?.fileColumn || ""] || "").trim()
    const channelRaw = (row[mappedFields.find(m => m.sparkField === "channel")?.fileColumn || ""] || "").trim()
    const eventValueRaw = (row[mappedFields.find(m => m.sparkField === "event_value")?.fileColumn || ""] || "").trim()
    const timestampRaw = (row[mappedFields.find(m => m.sparkField === "timestamp")?.fileColumn || ""] || "").trim()

    if (!eventTypeRaw || !channelRaw || !timestampRaw) {
      invalidRows++
      continue
    }

    const eventType = mapEventType(eventTypeRaw)
    const channel = mapChannel(channelRaw)
    const eventValue = eventValueRaw ? parseFloat(eventValueRaw) || 0 : 0
    const timestamp = new Date(timestampRaw)
    if (isNaN(timestamp.getTime())) {
      invalidRows++
      continue
    }

    const key = email || phone || `${customerName}_${Math.random()}`
    const now = Date.now()
    const daysSince = (now - timestamp.getTime()) / (1000 * 60 * 60 * 24)

    if (!customerMap.has(key)) {
      customerMap.set(key, {
        name: customerName,
        email,
        phone,
        city,
        ageGroup,
        events: [],
        hasUnsubscribe: false,
      })
    }

    const entry = customerMap.get(key)!
    entry.events.push({
      eventType,
      channel,
      productCategory,
      productName,
      value: eventValue,
      timestamp,
      daysSince,
    })

    if (eventType === "unsubscribe") entry.hasUnsubscribe = true
  }

  const now = new Date()
  let customersCreated = 0
  let eventsCreated = 0
  let duplicatesMerged = 0

  for (const [, entry] of customerMap) {
    const identityConfidence = computeIdentityConfidence(entry.email, entry.phone, entry.name)
    const lifecycleStage = computeLifecycleStage(entry.events)
    const categoryAffinities = computeCategoryAffinities(entry.events)
    const predictedLtv = computePredictedLTV(entry.events)
    const churnRisk = computeChurnRisk(entry.events, entry.hasUnsubscribe)
    const preferredChannel = computePreferredChannel(entry.events)

    const existingByEmail = entry.email
      ? await prisma.customer.findFirst({
          where: { workspaceId, emailHash: entry.email },
        })
      : null

    let customer
    if (existingByEmail) {
      customer = await prisma.customer.update({
        where: { id: existingByEmail.id },
        data: {
          name: entry.name || existingByEmail.name,
          lifecycleStage,
          identityConfidence: Math.max(existingByEmail.identityConfidence, identityConfidence),
          predictedLtv: Math.max(existingByEmail.predictedLtv, predictedLtv),
          churnRisk: Math.max(existingByEmail.churnRisk, churnRisk),
          categoryAffinities: JSON.stringify(categoryAffinities),
        },
      })
      duplicatesMerged++
    } else {
      customer = await prisma.customer.create({
        data: {
          workspaceId,
          corePersonId: `import_${crypto.randomUUID().substring(0, 8)}`,
          name: entry.name || null,
          emailHash: entry.email || null,
          lifecycleStage,
          identityConfidence,
          consentStatus: true,
          predictedLtv,
          churnRisk,
          categoryAffinities: JSON.stringify(categoryAffinities),
        },
      })
      customersCreated++
    }

    for (const ev of entry.events) {
      await prisma.customerEvent.create({
        data: {
          workspaceId,
          customerId: customer.id,
          eventType: ev.eventType,
          channel: ev.channel,
          metadata: JSON.stringify({
            productCategory: ev.productCategory || undefined,
            productName: ev.productName || undefined,
            value: ev.value || undefined,
            source: "csv_import",
          }),
          timestamp: ev.timestamp,
        },
      })
      eventsCreated++
    }
  }

  const segmentNames = [
    { name: "High Intent Buyers", convProb: 0.65, desc: "Customers with high product interest" },
    { name: "Cart Abandoners", convProb: 0.45, desc: "Added to cart but haven't purchased" },
    { name: "Loyal Customers", convProb: 0.75, desc: "Repeat purchasers" },
    { name: "Churn Risk Customers", convProb: 0.15, desc: "No recent activity" },
    { name: "Premium Value Customers", convProb: 0.55, desc: "High predicted LTV" },
  ]

  let segmentsGenerated = 0
  const customers = await prisma.customer.findMany({ where: { workspaceId } })

  for (const segDef of segmentNames) {
    const exists = await prisma.segment.findFirst({
      where: { workspaceId, name: `${workspaceId.substring(0, 6)} — ${segDef.name}` },
    })
    if (!exists && customers.length >= 3) {
      await prisma.segment.create({
        data: {
          workspaceId,
          name: `${segDef.name}`,
          audienceSize: Math.max(1, Math.floor(customers.length * (segDef.convProb * 0.5 + 0.1))),
          avgLtv: Math.round(customers.reduce((s, c) => s + c.predictedLtv, 0) / customers.length * segDef.convProb),
          convProb: segDef.convProb,
        },
      })
      segmentsGenerated++
    }
  }

  const segments = await prisma.segment.findMany({ where: { workspaceId } })
  let campaignsSuggested = 0

  const campaignDefs = [
    { name: "Cart Recovery Campaign", objective: "Conversion", channel: "email", offer: "abandoned_cart" },
    { name: "High Intent Conversion Push", objective: "Conversion", channel: "web", offer: "browse_retarget" },
    { name: "Loyal Customer Upsell", objective: "Loyalty", channel: "email", offer: "cross_sell" },
    { name: "Churn Prevention Campaign", objective: "Retention", channel: "sms", offer: "win_back" },
  ]

  const segmentsWithCustomers = segments.filter(s => s.audienceSize > 0)
  for (const cDef of campaignDefs) {
    const targetSeg = segmentsWithCustomers.length > 0
      ? segmentsWithCustomers[Math.floor(Math.random() * segmentsWithCustomers.length)]
      : null

    if (targetSeg) {
      await prisma.campaign.create({
        data: {
          workspaceId,
          segmentId: targetSeg.id,
          name: cDef.name,
          objective: cDef.objective,
          status: "draft",
          channel: cDef.channel,
        },
      })
      campaignsSuggested++
    }
  }

  await prisma.dataSource.update({
    where: { id: dataSource.id },
    data: {
      eventsReceived: eventsCreated,
      status: "healthy",
      lastSyncAt: new Date(),
    },
  })

  await createAuditLog({
    organizationId,
    workspaceId,
    actorId: dbUser.id,
    actorName: dbUser.name || "Unknown",
    actorRole: "owner",
    action: "data_source.uploaded",
    resourceType: "DataSource",
    resourceId: dataSource.id,
    severity: "Info",
    metadata: { fileName: "imported_file", rows: allRows.length, customers: customersCreated, events: eventsCreated },
  })

  await createAuditLog({
    organizationId,
    workspaceId,
    actorId: dbUser.id,
    actorName: dbUser.name || "Unknown",
    actorRole: "owner",
    action: "data_source.imported",
    resourceType: "DataSource",
    resourceId: dataSource.id,
    severity: "Info",
    metadata: { customersCreated, eventsCreated, segmentsGenerated, campaignsSuggested },
  })

  await incrementUsage({ organizationId, metric: "events_ingested", amount: eventsCreated })
  await incrementUsage({ organizationId, metric: "profiles_resolved", amount: customersCreated })
  await incrementUsage({ organizationId, metric: "data_source_syncs", amount: 1 })
  await incrementUsage({ organizationId, metric: "campaigns_created", amount: campaignsSuggested })

  revalidatePath("/app")
  revalidatePath("/app/data-sources")
  revalidatePath("/app/customer-360")
  revalidatePath("/app/segments")
  revalidatePath("/app/campaigns")

  return {
    rowsProcessed: allRows.length,
    customersCreated,
    eventsCreated,
    segmentsGenerated,
    campaignsSuggested,
    invalidRows,
    duplicatesMerged,
    warnings: errors,
    durationMs: Date.now() - start,
  }
}

export async function getImportSummary(dataSourceId: string) {
  await requireAuth()
  const source = await prisma.dataSource.findUnique({
    where: { id: dataSourceId },
  })
  if (!source) throw new Error("Data source not found")

  const syncLogs = await prisma.dataSourceSyncLog.findMany({
    where: { dataSourceId },
    orderBy: { startedAt: "desc" },
    take: 5,
  })

  return { source, syncLogs }
}
