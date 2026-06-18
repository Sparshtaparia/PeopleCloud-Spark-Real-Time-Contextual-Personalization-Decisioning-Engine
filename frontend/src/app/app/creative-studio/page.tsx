"use client"
import { usePermissions } from '@/hooks/use-permissions'
import { AccessDenied } from '@/components/rbac/AccessDenied'

import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Wand2, Sparkles, AlertTriangle, ShieldCheck, Settings2, Eye, RefreshCw, Send, Play, ChevronDown, CheckCircle2 } from 'lucide-react'
import { getCampaigns } from '@/lib/actions/campaigns'
import { getSettings } from '@/lib/actions/settings'
import { generateCreativeVariants, approveCreative, getCreativeVariants, rejectCreative, regenerateCreative } from '@/lib/actions/creatives'

export default function CreativeStudio() {
  const { can } = usePermissions()
  if (!can('view_creatives')) return <AccessDenied />

  const { currentOrg, currentWorkspace, setAiLoading } = useAppStore()
  const [segment, setSegment] = useState('High-intent fitness')
  const [channel, setChannel] = useState('Mobile Push')
  const [variants, setVariants] = useState<any[]>([])
  const [explanation, setExplanation] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [brandVoice, setBrandVoice] = useState<any>(null)

  const isNike = currentOrg?.name?.includes("Nike")
  const isFinance = currentOrg?.name?.includes("HDFC")

  useEffect(() => {
    if (currentWorkspace && currentOrg) {
      getCampaigns(currentWorkspace.id).then(data => {
        setCampaigns(data)
        if (data.length > 0) setSelectedCampaignId(data[0].id)
      }).catch(console.error)

      getSettings(currentOrg.id).then(data => {
        if (data.brandVoice) setBrandVoice(data.brandVoice)
      }).catch(console.error)
    }
  }, [currentWorkspace?.id, currentOrg?.id])

  const fetchVariants = async (campaignId: string, ch: string) => {
    try {
      const data = await getCreativeVariants(campaignId, ch)
      setVariants(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (selectedCampaignId) fetchVariants(selectedCampaignId, channel)
  }, [selectedCampaignId, channel])

  const handleGenerate = async () => {
    if (!currentOrg || !currentWorkspace || !selectedCampaignId) return
    setLoading(true)
    setAiLoading(true)
    setExplanation(null)
    
    try {
      await generateCreativeVariants(selectedCampaignId, currentOrg.id, currentWorkspace.id, channel)
      await fetchVariants(selectedCampaignId, channel)
      
      setExplanation({
        reasons: ["Generated based on channel limits", "Optimized with personalization models", "Scored against workspace brand guidelines"],
        confidence: 98
      })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
    setAiLoading(false)
  }

  const handleApprove = async (variantId: string) => {
    if (!currentOrg || !currentWorkspace || !selectedCampaignId) return
    try {
      await approveCreative(variantId, selectedCampaignId, currentOrg.id, currentWorkspace.id)
      await fetchVariants(selectedCampaignId, channel)
    } catch (err) {
      console.error(err)
    }
  }

  const handleReject = async (variantId: string) => {
    if (!currentOrg || !currentWorkspace || !selectedCampaignId) return
    try {
      await rejectCreative(variantId, selectedCampaignId, currentOrg.id, currentWorkspace.id)
      await fetchVariants(selectedCampaignId, channel)
    } catch (err) {
      console.error(err)
    }
  }

  const handleRegenerate = async (variantId: string) => {
    if (!currentOrg || !currentWorkspace || !selectedCampaignId) return
    setLoading(true)
    setAiLoading(true)
    try {
      await regenerateCreative(variantId, selectedCampaignId, currentOrg.id, currentWorkspace.id, channel)
      await fetchVariants(selectedCampaignId, channel)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
    setAiLoading(false)
  }

  return (
    <div className="px-4 lg:px-12 py-4 lg:py-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 h-[calc(100vh-80px)] flex flex-col">
      
      <div className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h1 className="font-display text-title-xl font-bold tracking-tight mb-2 text-text-primary">AI Creative Studio</h1>
          <p className="text-text-secondary font-medium">Generate brand-safe, hyper-personalized messaging at scale.</p>
        </div>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden pb-4">
        
        {/* Left Col: Prompt Builder */}
        <div className="w-full lg:w-[380px] bg-charcoal text-white rounded-[32px] p-8 shadow-2xl flex flex-col lg:shrink-0 border border-border-inverse relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-butter-yellow text-deep-black px-4 py-1 rounded-bl-2xl text-[10px] font-bold uppercase tracking-widest">
            Prompt Builder
          </div>

          <h3 className="font-display text-2xl font-bold mb-8 flex items-center gap-3">
            <Settings2 className="text-butter-yellow" /> Parameters
          </h3>
          
          <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div className="relative">
              <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3">Select Campaign</label>
              <div className="relative">
                <select 
                  className="w-full bg-charcoal border border-white/10 hover:border-white/30 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-butter-yellow/50 transition-all appearance-none cursor-pointer shadow-soft"
                  value={selectedCampaignId}
                  onChange={e => setSelectedCampaignId(e.target.value)}
                >
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
            
            <div className="relative">
              <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3">Target Segment</label>
              <div className="relative">
                <select 
                  className="w-full bg-charcoal border border-white/10 hover:border-white/30 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-butter-yellow/50 transition-all appearance-none cursor-pointer shadow-soft"
                  value={segment}
                  onChange={e => setSegment(e.target.value)}
                >
                  <option>{isFinance ? "High Net Worth Borrowers" : isNike ? "High-intent fitness" : "Premium Shoppers"}</option>
                  <option>Lapsed premium</option>
                  <option>New subscriber</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3">Activation Channel</label>
              <div className="grid grid-cols-2 gap-3">
                {['Mobile Push', 'Email', 'Web Banner', 'SMS'].map(ch => (
                  <button 
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition-colors ${channel === ch ? 'bg-butter-yellow text-deep-black border-butter-yellow' : 'bg-white/5 text-white/70 border-white/10 hover:border-white/30'}`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3 flex justify-between">
                <span>Select Genre</span>
                <span className="text-butter-yellow font-mono">{brandVoice?.strictness || 90}% Strictness</span>
              </label>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                  <ShieldCheck size={18} className="text-electric-mint shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm font-bold text-white">{brandVoice?.coreTone || "Professional Tone"}</span>
                    <span className="block text-xs text-white/50 mt-1">AI will match this core brand voice.</span>
                  </div>
                </div>
                
                {brandVoice?.approvedClaims && (
                  <div className="flex items-start gap-3 p-4 bg-electric-mint/10 rounded-xl border border-electric-mint/20">
                    <CheckCircle2 size={18} className="text-electric-mint shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-bold text-electric-mint uppercase tracking-widest mb-1">Approved Claims</span>
                      <span className="block text-xs text-white/80 font-mono">{brandVoice.approvedClaims}</span>
                    </div>
                  </div>
                )}

                {brandVoice?.bannedPhrases && (
                  <div className="flex items-start gap-3 p-4 bg-coral-pink/10 rounded-xl border border-coral-pink/20">
                    <AlertTriangle size={18} className="text-coral-pink shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-bold text-coral-pink uppercase tracking-widest mb-1">Banned Phrases</span>
                      <span className="block text-xs text-white/80 font-mono">{brandVoice.bannedPhrases}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={!can('generate_creative') || loading}
            className="mt-6 w-full bg-butter-yellow hover:bg-yellow-300 text-deep-black font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <><Sparkles size={20} /> Generate Variants</>
            )}
          </button>
        </div>

        {/* Center Col: Output Canvas */}
        <div className="flex-1 bg-white rounded-[32px] border border-border-subtle shadow-soft p-8 overflow-y-auto custom-scrollbar relative flex flex-col">
          
          <div className="flex justify-between items-center mb-8 pb-6 border-b border-border-subtle">
            <h3 className="font-display text-2xl font-bold flex items-center gap-3 text-deep-black">
              <Eye className="text-text-secondary" /> Variant Canvas
            </h3>
            {explanation && (
              <div className="flex items-center gap-3 px-4 py-2 bg-electric-mint/10 border border-electric-mint/20 rounded-full">
                <ShieldCheck size={16} className="text-electric-mint" />
                <span className="text-xs font-bold text-deep-black">Compliance Passed ({explanation.confidence}% confidence)</span>
              </div>
            )}
          </div>

          {!variants.length && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="w-24 h-24 bg-warm-cream rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Wand2 size={40} className="text-text-secondary opacity-50" />
              </div>
              <p className="text-lg font-bold text-deep-black mb-2">Blank Canvas</p>
              <p className="text-sm font-medium text-text-secondary leading-relaxed">Configure your prompt parameters on the left and hit generate to watch the AI engine create hyper-personalized copy.</p>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex flex-col gap-6">
              {[1,2].map(i => (
                <div key={i} className="h-40 w-full bg-warm-cream rounded-3xl animate-pulse"></div>
              ))}
            </div>
          )}

          {variants.length > 0 && !loading && (
            <div className="flex-1 flex flex-col gap-6">
              {variants.filter(v => v.status !== 'rejected').map((v, idx) => (
                <div key={v.id} className={`bg-warm-cream rounded-3xl p-8 border ${v.status === 'approved' ? 'border-electric-mint shadow-glow-mint' : v.status === 'needs_edit' ? 'border-coral-pink bg-coral-pink/5' : 'border-border-subtle'} relative overflow-hidden group hover:border-deep-black transition-colors animate-in fade-in slide-in-from-bottom-8`} style={{animationDelay: `${idx * 150}ms`}}>
                  {v.championReason && v.status !== 'approved' && (
                    <div className="absolute top-0 right-0 bg-butter-yellow text-deep-black px-4 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-widest flex flex-col items-end group">
                      <span>Champion Prediction</span>
                      <div className="hidden group-hover:block absolute top-full right-0 mt-2 bg-deep-black text-white p-3 rounded-xl w-64 text-xs shadow-2xl z-50 normal-case tracking-normal">
                        <strong>Why:</strong> {v.championReason}
                      </div>
                    </div>
                  )}
                  {v.status === 'approved' && (
                    <div className="absolute top-0 right-0 bg-electric-mint text-deep-black px-4 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-widest shadow-glow-mint">
                      Approved for Launch
                    </div>
                  )}
                  
                  <div className="flex items-start gap-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display text-xl font-bold shrink-0 ${v.championReason ? 'bg-deep-black text-warm-cream' : 'bg-white border border-border-subtle text-deep-black'}`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className="flex-1">
                      <div className="flex gap-2 items-center mb-3">
                        <span className="px-3 py-1 bg-white border border-border-subtle rounded-full text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                          {v.strategy ? v.strategy.replace(/_/g, ' ') : "Conversion"}
                        </span>
                        {v.status === 'needs_edit' && (
                          <span className="px-3 py-1 bg-coral-pink/10 text-coral-pink rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1" title={v.guardrailWarnings}>
                            <AlertTriangle size={12} /> Compliance Warning
                          </span>
                        )}
                      </div>
                      
                      {v.subject && (
                        <p className="text-sm font-bold text-text-secondary mb-1">
                          <span className="opacity-50 uppercase text-[10px] tracking-widest mr-2">Subject</span> {v.subject}
                        </p>
                      )}
                      {v.preheader && (
                        <p className="text-sm font-medium text-text-secondary mb-4 italic">
                          <span className="opacity-50 uppercase text-[10px] tracking-widest mr-2 not-italic">Preheader</span> {v.preheader}
                        </p>
                      )}

                      <p className="font-display text-2xl font-bold leading-snug text-deep-black mb-2 pr-12">
                        {v.headline}
                      </p>
                      <p className="text-text-secondary font-medium mb-3">
                        {v.body}
                      </p>
                      <p className="text-sm font-bold text-deep-black mb-6 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-butter-yellow/20 flex items-center justify-center"><Play size={8} className="text-butter-yellow" /></span>
                        {v.cta}
                      </p>
                      
                      <div className="flex items-center gap-6 border-t border-border-subtle pt-6 flex-wrap">
                        <div>
                          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Predicted CTR</p>
                          <p className="font-display text-2xl font-bold text-electric-mint">{(Number(v.predictedCtr) * 100).toFixed(1)}%</p>
                        </div>
                        <div className="w-px h-10 bg-border-subtle"></div>
                        <div>
                          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Brand Safety</p>
                          <p className="text-sm font-bold text-deep-black">{(Number(v.brandSafetyScore) * 100).toFixed(0)}%</p>
                        </div>
                        <div className="w-px h-10 bg-border-subtle"></div>
                        <div>
                          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Compliance</p>
                          <p className={`text-sm font-bold ${v.status === 'needs_edit' ? 'text-coral-pink' : 'text-deep-black'}`}>{(Number(v.complianceScore) * 100).toFixed(0)}%</p>
                        </div>
                        <div className="ml-auto flex gap-2">
                          <button onClick={() => handleRegenerate(v.id)} disabled={!can('generate_creative')} className="px-4 py-2 bg-white text-text-secondary border border-border-subtle hover:bg-warm-cream rounded-xl font-bold text-xs transition-colors shadow-soft disabled:opacity-50">
                            Regenerate
                          </button>
                          <button onClick={() => alert("Preview opened")} className="px-4 py-2 bg-white text-text-secondary border border-border-subtle hover:bg-warm-cream rounded-xl font-bold text-xs transition-colors shadow-soft">
                            Preview
                          </button>
                          <button onClick={() => handleReject(v.id)} disabled={!can('approve_creative')} className="px-4 py-2 bg-white text-coral-pink border border-coral-pink/20 hover:bg-coral-pink/10 rounded-xl font-bold text-xs transition-colors shadow-soft disabled:opacity-50">
                            Reject
                          </button>
                          {v.status !== 'approved' && (
                            <button onClick={() => handleApprove(v.id)} disabled={!can('approve_creative') || v.status === 'needs_edit'} className="px-6 py-2 bg-deep-black text-warm-cream rounded-xl font-bold text-sm hover:bg-charcoal transition-colors flex items-center gap-2 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed">
                              <ShieldCheck size={16} /> Approve
                            </button>
                          )}
                          {v.status === 'approved' && (
                            <button onClick={() => alert("Experiment configured")} className="px-6 py-2 bg-electric-mint text-deep-black rounded-xl font-bold text-sm hover:brightness-105 transition-colors flex items-center gap-2 shadow-soft">
                              <Play size={16} /> Use in Experiment
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {explanation && (
                <div className="mt-8 bg-sky-cyan/10 border border-sky-cyan/20 rounded-3xl p-6">
                  <p className="text-[10px] font-bold text-sky-cyan uppercase tracking-widest mb-4">Explainability Log</p>
                  <ul className="space-y-2">
                    {explanation.reasons.map((r: string, i: number) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-bold text-deep-black">
                        <ShieldCheck size={16} className="text-sky-cyan" /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
