"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Database, ArrowRight, Loader2, CheckCircle2, Upload } from 'lucide-react'
import { createOrganization } from '@/lib/actions/organization'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [orgName, setOrgName] = useState("")
  const [industry, setIndustry] = useState("Retail")
  const [workspaceName, setWorkspaceName] = useState("")

  const [orgResult, setOrgResult] = useState<{
    organizationId: string
    workspaceId: string
    organizationName: string
    workspaceName: string
    correlationId?: string
  } | null>(null)

  const steps = [
    { title: "Create Organization", icon: Building2 },
    { title: "Connect Data Source", icon: Database },
    { title: "Launch", icon: CheckCircle2 },
  ]

  const handleCreateOrg = async () => {
    if (!orgName.trim() || !workspaceName.trim()) {
      setError("Organization name and workspace name are required")
      return
    }
    setLoading(true)
    setError("")
    try {
      const form = new FormData()
      form.append("name", orgName.trim())
      form.append("industry", industry)
      form.append("workspaceName", workspaceName.trim())
      const result = await createOrganization(form)
      setOrgResult(result)
      setStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create organization")
    } finally {
      setLoading(false)
    }
  }

  const handleLaunch = () => {
    router.push(`/app?orgId=${orgResult?.organizationId}&wsId=${orgResult?.workspaceId}`)
  }

  return (
    <div className="min-h-screen bg-warm-cream flex flex-col font-body selection:bg-electric-mint selection:text-deep-black">
      <header className="h-20 border-b border-border-subtle flex items-center justify-between px-12 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-deep-black rounded-[12px] flex items-center justify-center">
            <span className="font-display font-bold text-warm-cream text-lg">S</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tighter text-deep-black">Spark Engine</span>
        </div>
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step > i + 1 ? 'bg-electric-mint text-deep-black' : 
                step === i + 1 ? 'bg-deep-black text-warm-cream' : 
                'bg-border-subtle text-text-secondary'
              }`}>
                {step > i + 1 ? <CheckCircle2 size={16} /> : i + 1}
              </div>
              {i < 2 && <div className={`w-8 h-1 ${step > i + 1 ? 'bg-electric-mint' : 'bg-border-subtle'}`}></div>}
            </div>
          ))}
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-3xl bg-white rounded-[40px] shadow-soft p-12 relative overflow-hidden border border-border-subtle">
          
          <div className="flex items-center gap-6 mb-12">
            {React.createElement(steps[step-1].icon, { size: 40, className: "text-electric-mint" })}
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary mb-1">
                Step {step} of {steps.length}
              </p>
              <h1 className="font-display text-4xl font-bold text-deep-black">{steps[step-1].title}</h1>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-coral-pink/10 border border-coral-pink/20 rounded-3xl">
              <p className="text-sm font-bold text-coral-pink">{error}</p>
            </div>
          )}

          <div className="min-h-[250px]">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    placeholder="e.g. Demo Retail Brand"
                    className="w-full px-5 py-4 bg-warm-cream border border-border-subtle rounded-2xl focus:border-deep-black outline-none transition-colors font-bold text-deep-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                    Industry
                  </label>
                  <select
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full px-5 py-4 bg-warm-cream border border-border-subtle rounded-2xl focus:border-deep-black outline-none transition-colors font-bold text-deep-black appearance-none cursor-pointer"
                  >
                    <option value="Retail">Retail</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Finance">Financial Services</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Travel">Travel & Hospitality</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="Technology">Technology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={e => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Summer Sale 2026"
                    className="w-full px-5 py-4 bg-warm-cream border border-border-subtle rounded-2xl focus:border-deep-black outline-none transition-colors font-bold text-deep-black"
                  />
                </div>
              </div>
            )}

            {step === 2 && orgResult && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="bg-electric-mint/10 border border-electric-mint/20 rounded-3xl p-6">
                  <p className="font-bold text-deep-black flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-electric-mint" />
                    Organization Created Successfully
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-text-secondary">
                    <p><span className="font-bold text-deep-black">Organization:</span> {orgResult.organizationName}</p>
                    <p><span className="font-bold text-deep-black">Workspace:</span> {orgResult.workspaceName}</p>
                  </div>
                </div>

                <p className="font-bold text-deep-black text-lg">Connect your customer data</p>
                <p className="text-text-secondary">Upload a CSV or Excel file to populate your workspace with customers, events, and segments.</p>

                <button
                  onClick={() => router.push(`/onboarding/connect-data-source?orgId=${orgResult.organizationId}&wsId=${orgResult.workspaceId}${orgResult.correlationId ? `&cId=${orgResult.correlationId}` : ''}`)}
                  className="w-full flex items-center justify-center gap-3 p-8 border-2 border-dashed border-border-subtle rounded-3xl hover:border-deep-black transition-colors bg-warm-cream/50 group cursor-pointer"
                >
                  <Upload size={48} className="text-text-secondary group-hover:text-deep-black transition-colors" />
                  <div className="text-left">
                    <p className="font-bold text-deep-black text-lg">Upload CSV or Excel</p>
                    <p className="text-sm text-text-secondary">.csv or .xlsx files up to 5MB</p>
                  </div>
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="text-center animate-in zoom-in-95 duration-700 py-12">
                <div className="w-32 h-32 bg-electric-mint rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-glow-mint">
                  <CheckCircle2 size={64} className="text-deep-black" />
                </div>
                <h2 className="font-display text-5xl font-bold text-deep-black mb-4 tracking-tight">Ready to Go</h2>
                <p className="text-text-secondary font-medium max-w-sm mx-auto mb-8">
                  Your workspace is populated with imported data. Open the Command Center to start analyzing.
                </p>
              </div>
            )}
          </div>

          <div className="mt-12 flex items-center justify-between pt-8 border-t border-border-subtle">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} className="text-text-secondary font-bold hover:text-deep-black transition-colors px-6 py-4">
                Back
              </button>
            ) : <div></div>}
            
            <button
              onClick={step === 1 ? handleCreateOrg : step === 2 ? undefined : handleLaunch}
              disabled={loading || (step === 2)}
              className={`px-8 py-4 font-bold rounded-full shadow-soft transition-all flex items-center justify-center gap-3 ml-auto ${
                step === 3
                  ? 'bg-deep-black hover:bg-charcoal text-white text-lg hover:-translate-y-1'
                  : step === 1
                  ? 'bg-electric-mint hover:bg-emerald-400 text-deep-black shadow-glow-mint hover:scale-105'
                  : 'bg-border-subtle text-text-secondary cursor-not-allowed'
              }`}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : step === 3 ? (
                <>Go to Command Center <ArrowRight size={20} /></>
              ) : step === 1 ? (
                'Create Organization'
              ) : (
                'Upload file above'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
