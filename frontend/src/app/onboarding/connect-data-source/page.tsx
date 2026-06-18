"use client"
import React, { Suspense, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, ArrowLeft, Upload, CheckCircle2, AlertTriangle, Loader2, Download, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

const SPARK_FIELDS = [
  { field: "customer_name", required: true, aliases: ["name", "full_name", "customer", "user_name"] },
  { field: "email", required: false, aliases: ["email_address", "user_email", "e-mail", "mail"] },
  { field: "phone", required: false, aliases: ["mobile", "phone_number", "contact"] },
  { field: "city", required: false, aliases: ["location", "town", "metro"] },
  { field: "age_group", required: false, aliases: ["age", "age_range", "demographic"] },
  { field: "product_category", required: false, aliases: ["category", "item_category", "product_type"] },
  { field: "product_name", required: false, aliases: ["product", "item_name", "sku_name"] },
  { field: "event_type", required: true, aliases: ["event", "action", "activity", "type"] },
  { field: "channel", required: true, aliases: ["source_channel", "marketing_channel", "source", "medium"] },
  { field: "event_value", required: false, aliases: ["value", "amount", "order_value", "revenue"] },
  { field: "timestamp", required: true, aliases: ["date", "event_time", "created_at", "time", "datetime"] },
]

type Step = "upload" | "preview" | "mapping" | "validate" | "importing" | "complete"

export default function Page() {
  return <Suspense fallback={<div className="px-12 py-8 animate-pulse"><div className="h-[600px] bg-white/50 rounded-3xl"></div></div>}><ConnectDataSourcePage /></Suspense>
}

function ConnectDataSourcePage() {
  const router = useRouter()
  const params = useSearchParams()
  const orgId = params.get("orgId") || ""
  const wsId = params.get("wsId") || ""
  const correlationId = params.get("cId") || ""

  const [step, setStep] = useState<Step>("upload")
  const [fileName, setFileName] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [allRows, setAllRows] = useState<Record<string, string>[]>([])
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [validation, setValidation] = useState<{
    valid: boolean
    validRows: number
    invalidRows: number
    totalRows: number
    errors: string[]
    warnings: string[]
    estimatedCustomers: number
    estimatedEvents: number
    columnStats: Record<string, { filled: number; empty: number; sampleValues: string[] }>
  } | null>(null)
  const [importResult, setImportResult] = useState<{
    rowsProcessed: number
    customersCreated: number
    eventsCreated: number
    segmentsGenerated: number
    campaignsSuggested: number
    invalidRows: number
    duplicatesMerged: number
    warnings: string[]
    durationMs: number
  } | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Please upload a file below 5MB.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const buffer = await file.arrayBuffer()
      const name = file.name.toLowerCase()

      let parsedHeaders: string[] = []
      let parsedRows: Record<string, string>[] = []

      if (name.endsWith(".csv")) {
        const text = new TextDecoder("utf-8").decode(buffer)
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
        })
        if (result.errors.length > 0) {
          const critical = result.errors.filter(e => e.type === "FieldMismatch" || e.type === "Quotes")
          if (critical.length > 0) throw new Error(`CSV error: ${critical[0].message}`)
        }
        parsedHeaders = result.meta.fields || []
        parsedRows = result.data as Record<string, string>[]
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const workbook = XLSX.read(buffer, { type: "buffer" })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) throw new Error("Excel file has no sheets")
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" })
        parsedHeaders = jsonData.length > 0 ? Object.keys(jsonData[0]) : []
        parsedRows = jsonData
      } else {
        throw new Error("Unsupported file type. Please upload CSV or Excel.")
      }

      if (parsedRows.length === 0) {
        throw new Error("File appears to be empty. No data rows found.")
      }

      setFileName(file.name)
      setHeaders(parsedHeaders)
      setAllRows(parsedRows)
      setTotalRows(parsedRows.length)
      setPreviewRows(parsedRows.slice(0, 20))

      const autoMap: Record<string, string> = {}
      for (const sf of SPARK_FIELDS) {
        const lowerHeaders = parsedHeaders.map(h => h.toLowerCase().trim())
        const fieldLower = sf.field.toLowerCase()

        const exact = lowerHeaders.indexOf(fieldLower)
        if (exact >= 0) { autoMap[sf.field] = parsedHeaders[exact]; continue }

        const alias = lowerHeaders.findIndex(h => sf.aliases.map(a => a.toLowerCase()).includes(h))
        if (alias >= 0) { autoMap[sf.field] = parsedHeaders[alias]; continue }

        const contains = lowerHeaders.findIndex(h =>
          sf.aliases.some(a => h.includes(a.toLowerCase()) || a.toLowerCase().includes(h))
        )
        if (contains >= 0) { autoMap[sf.field] = parsedHeaders[contains]; continue }

        if (!sf.required) autoMap[sf.field] = ""
      }
      setMapping(autoMap)
      setStep("preview")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse file")
    } finally {
      setLoading(false)
    }
  }, [])

  const runValidation = useCallback(() => {
    const errors: string[] = []
    const warnings: string[] = []
    let validRows = 0
    let invalidRows = 0

    const mappedFields = SPARK_FIELDS.filter(sf => mapping[sf.field]).map(sf => ({
      ...sf,
      fileColumn: mapping[sf.field],
    }))

    const missingReq = SPARK_FIELDS.filter(sf => sf.required && !mapping[sf.field])
    if (missingReq.length > 0) {
      errors.push(`Missing required fields: ${missingReq.map(m => m.field).join(", ")}`)
      setValidation({
        valid: false, validRows: 0, invalidRows: allRows.length, totalRows: allRows.length,
        errors, warnings, estimatedCustomers: 0, estimatedEvents: 0, columnStats: {},
      })
      setStep("validate")
      return
    }

    const columnStats: Record<string, { filled: number; empty: number; sampleValues: string[] }> = {}
    for (const mf of mappedFields) {
      columnStats[mf.field] = { filled: 0, empty: 0, sampleValues: [] }
    }

    let hasEmailOrPhone = false
    const uniqueEmails = new Set<string>()

    for (const row of allRows) {
      let rowValid = true

      for (const mf of mappedFields) {
        const val = (row[mf.fileColumn] || "").trim()
        if (val) {
          columnStats[mf.field].filled++
          if (columnStats[mf.field].sampleValues.length < 3) {
            columnStats[mf.field].sampleValues.push(val.substring(0, 50))
          }
        } else {
          columnStats[mf.field].empty++
          if (mf.required && mf.field !== "customer_name") rowValid = false
        }
      }

      const email = row[mappedFields.find(m => m.field === "email")?.fileColumn || ""]?.trim() || ""
      const phone = row[mappedFields.find(m => m.field === "phone")?.fileColumn || ""]?.trim() || ""
      const eventType = row[mappedFields.find(m => m.field === "event_type")?.fileColumn || ""]?.trim() || ""
      const channel = row[mappedFields.find(m => m.field === "channel")?.fileColumn || ""]?.trim() || ""
      const timestamp = row[mappedFields.find(m => m.field === "timestamp")?.fileColumn || ""]?.trim() || ""
      const eventValue = row[mappedFields.find(m => m.field === "event_value")?.fileColumn || ""]?.trim() || ""

      if (email || phone) hasEmailOrPhone = true
      if (email) uniqueEmails.add(email.toLowerCase())

      if (!eventType) rowValid = false
      if (!channel) rowValid = false
      if (!timestamp) rowValid = false

      if (timestamp && isNaN(Date.parse(timestamp))) {
        warnings.push(`Invalid timestamp format: "${timestamp.substring(0, 30)}"`)
      }
      if (eventValue && isNaN(Number(eventValue))) {
        warnings.push(`Non-numeric event_value: "${eventValue}"`)
      }
      if (rowValid) validRows++
      else invalidRows++
    }

    if (!hasEmailOrPhone) {
      errors.push("No email or phone column — at least one identifier required")
    }

    const deduped = [...new Set(warnings)]
    setValidation({
      valid: errors.length === 0,
      validRows,
      invalidRows,
      totalRows: allRows.length,
      errors,
      warnings: deduped,
      estimatedCustomers: uniqueEmails.size || Math.ceil(validRows / 3),
      estimatedEvents: validRows,
      columnStats,
    })
    setStep("validate")
  }, [mapping, allRows])

  const handleImport = useCallback(async () => {
    setLoading(true)
    setError("")
    setStep("importing")
    try {
      const res = await fetch("/onboarding/connect-data-source/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          workspaceId: wsId,
          correlationId,
          mapping,
          rows: allRows,
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || "Import failed")
      }
      const result = await res.json()
      setImportResult(result)
      setStep("complete")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed")
      setStep("validate")
    } finally {
      setLoading(false)
    }
  }, [orgId, wsId, mapping, allRows])

  const handleFinish = () => {
    router.push(`/app?orgId=${orgId}&wsId=${wsId}`)
  }

  const statusBadge = (field: string) => {
    const col = mapping[field]
    if (col) return <span className="text-[10px] uppercase tracking-widest font-bold text-electric-mint">Mapped &mdash; {col}</span>
    const sf = SPARK_FIELDS.find(f => f.field === field)
    if (sf?.required) return <span className="text-[10px] uppercase tracking-widest font-bold text-coral-pink">Required &mdash; Missing</span>
    return <span className="text-[10px] uppercase tracking-widest font-bold text-text-secondary">Optional</span>
  }

  return (
    <div className="min-h-screen bg-warm-cream flex flex-col font-body">
      <header className="h-20 border-b border-border-subtle flex items-center justify-between px-12 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-deep-black rounded-[12px] flex items-center justify-center">
            <span className="font-display font-bold text-warm-cream text-lg">S</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tighter text-deep-black">Spark Engine</span>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center p-6 lg:p-12">
        <div className="w-full max-w-5xl bg-white rounded-[40px] shadow-soft p-10 border border-border-subtle">
          <div className="flex items-center gap-4 mb-8">
            <FileSpreadsheet size={32} className="text-electric-mint" />
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary mb-1">
                {step === "upload" ? "Step 2 of 3" : step === "complete" ? "Complete" : "Column Mapping"}
              </p>
              <h1 className="font-display text-3xl font-bold text-deep-black">
                {step === "upload" && "Upload Data Source"}
                {step === "preview" && `Preview: ${fileName}`}
                {step === "mapping" && "Map Columns"}
                {step === "validate" && "Validation Results"}
                {step === "importing" && "Importing Data..."}
                {step === "complete" && "Import Complete"}
              </h1>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-coral-pink/10 border border-coral-pink/20 rounded-3xl">
              <p className="text-sm font-bold text-coral-pink">{error}</p>
            </div>
          )}

          {step === "upload" && (
            <div className="space-y-6">
              <p className="text-text-secondary">Upload a CSV or Excel file with your customer event data.</p>

              <div className="flex gap-4">
                <label className="flex-1 flex flex-col items-center justify-center gap-4 p-16 border-2 border-dashed border-border-subtle rounded-3xl cursor-pointer hover:border-deep-black transition-colors bg-warm-cream/50 group">
                  <Upload size={56} className="text-text-secondary group-hover:text-deep-black transition-colors" />
                  <div className="text-center">
                    <p className="font-bold text-deep-black text-lg">{loading ? "Parsing..." : "Click to upload"}</p>
                    <p className="text-sm text-text-secondary mt-1">CSV or Excel (.csv, .xlsx, .xls)</p>
                    <p className="text-xs text-text-secondary mt-2">Max 5MB</p>
                  </div>
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} disabled={loading} />
                </label>
              </div>

              <div className="bg-soft-lime/10 border border-soft-lime/20 rounded-3xl p-5">
                <p className="text-sm font-bold text-deep-black flex items-center gap-2">
                  <Download size={16} /> Need a template?
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  <a href="/template.csv" download className="underline hover:text-deep-black">
                    Download sample CSV template
                  </a>
                  &nbsp;with the correct column format.
                </p>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  <span className="font-bold text-deep-black">{totalRows.toLocaleString()}</span> rows detected
                  &middot; <span className="font-bold text-deep-black">{headers.length}</span> columns
                  &middot; Showing first {Math.min(20, totalRows)} rows
                </p>
              </div>

              <div className="overflow-x-auto border border-border-subtle rounded-3xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-warm-cream border-b border-border-subtle">
                      <th className="text-left p-3 text-[10px] uppercase font-bold tracking-widest text-text-secondary">#</th>
                      {headers.map(h => (
                        <th key={h} className="text-left p-3 text-[10px] uppercase font-bold tracking-widest text-text-secondary whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b border-border-subtle last:border-0 hover:bg-warm-cream/50">
                        <td className="p-3 text-text-secondary font-mono text-xs">{i + 1}</td>
                        {headers.map(h => (
                          <td key={h} className="p-3 text-deep-black max-w-[200px] truncate">{row[h] || <span className="text-text-secondary italic">empty</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep("upload")} className="flex items-center gap-2 text-text-secondary font-bold hover:text-deep-black transition-colors px-4 py-3">
                  <ArrowLeft size={18} /> Upload different file
                </button>
                <button onClick={() => setStep("mapping")} className="flex items-center gap-2 bg-deep-black text-white font-bold px-6 py-3 rounded-full hover:bg-charcoal transition-colors">
                  Continue to Mapping <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === "mapping" && (
            <div className="space-y-6">
              <p className="text-text-secondary">Map your file columns to Spark fields. Required fields are marked.</p>

              <div className="space-y-3">
                {SPARK_FIELDS.map(sf => (
                  <div key={sf.field} className="flex items-center gap-4 p-4 bg-warm-cream rounded-2xl border border-border-subtle">
                    <div className="w-40 flex-shrink-0">
                      <p className="font-bold text-sm text-deep-black">{sf.field}</p>
                      {statusBadge(sf.field)}
                    </div>
                    <div className="flex-1">
                      <select
                        value={mapping[sf.field] || ""}
                        onChange={e => setMapping(prev => ({ ...prev, [sf.field]: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border border-border-subtle rounded-xl focus:border-deep-black outline-none transition-colors text-sm font-bold text-deep-black appearance-none cursor-pointer"
                      >
                        <option value="">— {sf.required ? "Required" : "Optional"} —</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep("preview")} className="flex items-center gap-2 text-text-secondary font-bold hover:text-deep-black transition-colors px-4 py-3">
                  <ArrowLeft size={18} /> Back to Preview
                </button>
                <button onClick={runValidation} className="flex items-center gap-2 bg-deep-black text-white font-bold px-6 py-3 rounded-full hover:bg-charcoal transition-colors">
                  Validate & Continue <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === "validate" && validation && (
            <div className="space-y-6">
              {validation.errors.length > 0 ? (
                <div className="bg-coral-pink/10 border border-coral-pink/20 rounded-3xl p-6">
                  <h3 className="font-bold text-coral-pink flex items-center gap-2 mb-3"><AlertTriangle size={20} /> Validation Errors</h3>
                  <ul className="space-y-1">
                    {validation.errors.map((err, i) => (
                      <li key={i} className="text-sm text-coral-pink">• {err}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-electric-mint/10 border border-electric-mint/20 rounded-3xl p-6">
                  <h3 className="font-bold text-deep-black flex items-center gap-2 mb-3"><CheckCircle2 size={20} className="text-electric-mint" /> Validation Passed</h3>
                  <p className="text-sm text-text-secondary">{validation.validRows} of {validation.totalRows} rows are valid</p>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-warm-cream rounded-2xl p-5 border border-border-subtle">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Total Rows</p>
                  <p className="font-display text-3xl font-bold text-deep-black mt-1">{validation.totalRows.toLocaleString()}</p>
                </div>
                <div className="bg-warm-cream rounded-2xl p-5 border border-border-subtle">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Valid Rows</p>
                  <p className="font-display text-3xl font-bold text-electric-mint mt-1">{validation.validRows.toLocaleString()}</p>
                </div>
                <div className="bg-warm-cream rounded-2xl p-5 border border-border-subtle">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Estimated Customers</p>
                  <p className="font-display text-3xl font-bold text-deep-black mt-1">{validation.estimatedCustomers.toLocaleString()}</p>
                </div>
                <div className="bg-warm-cream rounded-2xl p-5 border border-border-subtle">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Estimated Events</p>
                  <p className="font-display text-3xl font-bold text-deep-black mt-1">{validation.estimatedEvents.toLocaleString()}</p>
                </div>
              </div>

              {validation.warnings.length > 0 && (
                <div className="bg-butter-yellow/10 border border-butter-yellow/20 rounded-3xl p-5">
                  <p className="font-bold text-deep-black text-sm mb-2">Warnings ({validation.warnings.length})</p>
                  <ul className="space-y-1">
                    {validation.warnings.slice(0, 5).map((w, i) => (
                      <li key={i} className="text-xs text-text-secondary">• {w}</li>
                    ))}
                    {validation.warnings.length > 5 && (
                      <li className="text-xs text-text-secondary">...and {validation.warnings.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex justify-between">
                <button onClick={() => setStep("mapping")} className="flex items-center gap-2 text-text-secondary font-bold hover:text-deep-black transition-colors px-4 py-3">
                  <ArrowLeft size={18} /> Adjust Mapping
                </button>
                <button
                  onClick={handleImport}
                  disabled={!validation.valid || loading}
                  className={`flex items-center gap-2 font-bold px-8 py-4 rounded-full transition-all ${
                    validation.valid && !loading
                      ? 'bg-electric-mint hover:bg-emerald-400 text-deep-black shadow-glow-mint hover:scale-105'
                      : 'bg-border-subtle text-text-secondary cursor-not-allowed'
                  }`}
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <><Upload size={20} /> Import {validation.validRows.toLocaleString()} Rows</>}
                </button>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={48} className="animate-spin text-electric-mint mb-6" />
              <p className="font-display text-2xl font-bold text-deep-black">Importing your data...</p>
              <p className="text-text-secondary mt-2">Creating customer profiles, events, and segments</p>
            </div>
          )}

          {step === "complete" && importResult && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-electric-mint rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-glow-mint">
                  <CheckCircle2 size={40} className="text-deep-black" />
                </div>
                <h2 className="font-display text-3xl font-bold text-deep-black mb-2">Import Complete</h2>
                <p className="text-text-secondary">Your data has been imported successfully.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-warm-cream rounded-2xl p-5 border border-border-subtle">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Rows Processed</p>
                  <p className="font-display text-3xl font-bold text-deep-black mt-1">{importResult.rowsProcessed.toLocaleString()}</p>
                </div>
                <div className="bg-warm-cream rounded-2xl p-5 border border-border-subtle">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Customers Created</p>
                  <p className="font-display text-3xl font-bold text-deep-black mt-1">{importResult.customersCreated.toLocaleString()}</p>
                </div>
                <div className="bg-warm-cream rounded-2xl p-5 border border-border-subtle">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Events Created</p>
                  <p className="font-display text-3xl font-bold text-deep-black mt-1">{importResult.eventsCreated.toLocaleString()}</p>
                </div>
                <div className="bg-warm-cream rounded-2xl p-5 border border-border-subtle">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Segments Generated</p>
                  <p className="font-display text-3xl font-bold text-deep-black mt-1">{importResult.segmentsGenerated}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-warm-cream rounded-2xl p-5 border border-border-subtle">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Campaigns Suggested</p>
                  <p className="font-display text-3xl font-bold text-deep-black mt-1">{importResult.campaignsSuggested}</p>
                </div>
                <div className="bg-warm-cream rounded-2xl p-5 border border-border-subtle">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Duplicates Merged</p>
                  <p className="font-display text-3xl font-bold text-deep-black mt-1">{importResult.duplicatesMerged}</p>
                </div>
                <div className="bg-warm-cream rounded-2xl p-5 border border-border-subtle">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Invalid Rows</p>
                  <p className="font-display text-3xl font-bold text-coral-pink mt-1">{importResult.invalidRows}</p>
                </div>
                <div className="bg-warm-cream rounded-2xl p-5 border border-border-subtle">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Import Duration</p>
                  <p className="font-display text-3xl font-bold text-deep-black mt-1">{(importResult.durationMs / 1000).toFixed(1)}s</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push(`/app?orgId=${orgId}&wsId=${wsId}`)}
                  className="w-full bg-deep-black hover:bg-charcoal text-white font-bold py-5 rounded-full transition-colors flex items-center justify-center gap-3 text-lg hover:-translate-y-1 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]"
                >
                  Go to Command Center <ArrowRight size={22} />
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/app/audit-logs?orgId=${orgId}&wsId=${wsId}&correlationId=${correlationId}`)}
                    className="flex-1 bg-white border border-border-subtle hover:border-deep-black text-deep-black font-bold py-4 rounded-full transition-colors flex items-center justify-center gap-2 shadow-soft"
                  >
                    View Import Audit Trail
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
