"use client"
import { usePermissions } from '@/hooks/use-permissions'
import { AccessDenied } from '@/components/rbac/AccessDenied'

import React, { useState, useEffect } from 'react'
import { Plus, Megaphone, Target, Clock, ArrowRight, Zap, Play, Filter, CheckCircle, PauseCircle, BarChart3, Archive, Eye, FlaskConical } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { getCampaigns, createCampaign, updateCampaignStatus, enableAiLearning } from '@/lib/actions/campaigns'
import { getSegments } from '@/lib/actions/segments'
import { useRouter } from 'next/navigation'
import { routes } from '@/lib/routes'

export default function Campaigns() {
  const { can } = usePermissions()
  if (!can('view_campaigns')) return <AccessDenied />

  const router = useRouter()
  const { currentOrg, currentWorkspace, setAiLoading } = useAppStore()
  const [showCreate, setShowCreate] = useState(false)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [segments, setSegments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [error, setError] = useState('')

  const fetchCampaigns = async () => {
    if (!currentWorkspace) return
    setLoading(true)
    try {
      const data = await getCampaigns(currentWorkspace.id)
      setCampaigns(data)
      const segs = await getSegments(currentWorkspace.id)
      setSegments(segs)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCampaigns()
  }, [currentWorkspace?.id])

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!currentOrg || !currentWorkspace) return
    setSaving(true)
    
    const formData = new FormData(e.currentTarget)
    formData.append('organizationId', currentOrg.id)
    formData.append('workspaceId', currentWorkspace.id)
    
    try {
      await createCampaign(formData)
      setShowCreate(false)
      fetchCampaigns()
      router.push(routes.creativeStudio)
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign')
    }
    setSaving(false)
  }

  const handleStatusChange = async (campaignId: string, status: string) => {
    if (!currentOrg || !currentWorkspace) return
    setError('')
    setAiLoading(true)
    try {
      await updateCampaignStatus(campaignId, status, currentOrg.id, currentWorkspace.id)
      fetchCampaigns()
    } catch (e: any) {
      setError(e.message || 'Failed to update campaign status')
    }
    setAiLoading(false)
  }

  const handleEnableAiLearning = async (campaignId: string) => {
    if (!currentOrg || !currentWorkspace) return
    setError('')
    setAiLoading(true)
    try {
      await enableAiLearning(campaignId, currentOrg.id, currentWorkspace.id)
      fetchCampaigns()
    } catch (e: any) {
      setError(e.message || 'Failed to enable AI learning')
    }
    setAiLoading(false)
  }

  const filteredCampaigns = campaigns.filter(c => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Live' && c.status === 'live') return true
    if (activeFilter === 'Learning' && c.status === 'learning') return true
    if (activeFilter === 'Drafts' && c.status === 'draft') return true
    if (activeFilter === 'Review' && c.status === 'review') return true
    if (activeFilter === 'Approved' && c.status === 'approved') return true
    return false
  })

  return (
    <div className="px-4 lg:px-12 py-4 lg:py-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 h-[calc(100vh-80px)] flex flex-col">
      
      <div className="flex justify-between items-end mb-12 shrink-0">
        <div>
          <h1 className="font-display text-title-xl font-bold tracking-tight mb-2 text-text-primary">Campaign Activation</h1>
          <p className="text-text-secondary font-medium">Build, deploy, and monitor hyper-personalized 1:1 campaigns.</p>
        </div>
        <button 
          onClick={() => setShowCreate(!showCreate)}
          disabled={!can('create_campaign')}
          className="px-6 py-3 bg-electric-mint text-deep-black rounded-full font-bold shadow-glow-mint hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          {showCreate ? 'Close Builder' : <><Plus size={18} /> New Campaign</>}
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-6 py-4 bg-coral-pink/10 border border-coral-pink/20 rounded-2xl text-coral-pink font-bold text-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="w-6 h-6 rounded-full bg-coral-pink/20 flex items-center justify-center shrink-0">!</span>
          {error}
          <button onClick={() => setError('')} className="ml-auto text-coral-pink/60 hover:text-coral-pink">✕</button>
        </div>
      )}

      <div className="flex-1 flex gap-8 overflow-hidden pb-4">
        
        {/* Campaign List */}
        <div className={`flex flex-col transition-all duration-500 h-full ${showCreate ? 'w-full lg:w-[400px] lg:shrink-0' : 'w-full'}`}>
          {!showCreate && (
            <div className="flex justify-between items-center mb-4 shrink-0 overflow-x-auto custom-scrollbar pb-2">
              <div className="flex gap-2">
                {['All', 'Live', 'Learning', 'Drafts', 'Review', 'Approved'].map(f => (
                  <button key={f} onClick={() => setActiveFilter(f)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${f === activeFilter ? 'bg-deep-black text-warm-cream' : 'bg-white border border-border-subtle text-text-secondary hover:border-deep-black'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <button className="text-text-secondary hover:text-deep-black shrink-0 ml-4"><Filter size={18} /></button>
            </div>
          )}

          <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 flex-1 pb-12">
          {loading ? (
             <div className="animate-pulse space-y-4">
               <div className="h-32 bg-white rounded-[32px] opacity-50"></div>
               <div className="h-32 bg-white rounded-[32px] opacity-50"></div>
             </div>
          ) : filteredCampaigns.length === 0 ? (
             <div className="p-8 text-center text-text-secondary border-2 border-dashed border-border-subtle rounded-[32px]">
               No campaigns found in this workspace. Create one!
             </div>
          ) : filteredCampaigns.map((c, i) => (
            <div key={c.id} className={`bg-white rounded-[32px] p-8 border border-border-subtle shadow-soft group hover:border-deep-black transition-colors ${showCreate && i > 0 ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
              <div className="flex justify-between items-start mb-6">
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${
                  c.status === 'learning' ? 'bg-butter-yellow text-deep-black' : 
                  c.status === 'live' ? 'bg-electric-mint/20 text-emerald-800' : 
                  c.status === 'review' ? 'bg-coral-pink/20 text-coral-pink' :
                  c.status === 'approved' ? 'bg-sky-cyan/20 text-sky-cyan' :
                  'bg-warm-cream text-text-secondary'
                }`}>
                  {c.status === 'learning' && <Zap size={12} />}
                  {c.status === 'live' && <Play size={12} />}
                  {c.status === 'approved' && <CheckCircle size={12} />}
                  {c.status}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Lift</p>
                  <p className={`font-display text-2xl font-bold ${c.status === 'draft' || c.status === 'review' || c.status === 'approved' ? 'text-text-secondary' : 'text-electric-mint'}`}>
                    {c.lift && c.lift !== '-' ? `+${Number(String(c.lift).replace(/[+%]/g, '')).toFixed(1)}%` : '-'}
                  </p>
                </div>
              </div>

              <h3 className="font-display text-2xl font-bold text-deep-black mb-6">{c.name}</h3>

              <div className="grid grid-cols-2 gap-4 border-t border-border-subtle pt-6 mb-6">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary flex items-center gap-1 mb-1"><Target size={12}/> Audience</p>
                  <p className="text-sm font-bold text-deep-black truncate">{c.segment?.name || 'All Users'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary flex items-center gap-1 mb-1"><Megaphone size={12}/> Objective</p>
                  <p className="text-sm font-bold text-deep-black">{c.objective}</p>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end flex-wrap">
                {/* Draft → Send to Review */}
                {c.status === 'draft' && <>
                  <button onClick={() => router.push(`/app/creative-studio?segmentId=${c.segmentId}`)} className="px-4 py-2 border border-border-subtle text-deep-black rounded-lg text-xs font-bold hover:border-deep-black">Open Studio</button>
                  <button onClick={() => handleStatusChange(c.id, 'review')} disabled={!can('edit_campaign')} className="px-4 py-2 bg-charcoal text-white rounded-lg text-xs font-bold disabled:opacity-50">Send to Review</button>
                </>}

                {/* Review → Approve / Reject */}
                {c.status === 'review' && <>
                  <button disabled className="px-4 py-2 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold opacity-50 cursor-not-allowed">Waiting for Approval</button>
                  <button onClick={() => handleStatusChange(c.id, 'draft')} disabled={!can('edit_campaign')} className="px-4 py-2 border border-coral-pink/30 text-coral-pink rounded-lg text-xs font-bold hover:bg-coral-pink/10 disabled:opacity-50">Reject</button>
                  <button onClick={() => handleStatusChange(c.id, 'approved')} disabled={!can('approve_campaign')} className="px-4 py-2 bg-sky-cyan text-deep-black rounded-lg text-xs font-bold disabled:opacity-50 hover:brightness-110 hover:shadow-[0_0_20px_-5px_rgba(0,194,160,0.5)] hover:scale-105 transition-all">Approve</button>
                </>}

                {/* Approved → Launch */}
                {c.status === 'approved' && <>
                  <button onClick={() => handleStatusChange(c.id, 'live')} disabled={!can('edit_campaign')} className="px-4 py-2 bg-electric-mint text-deep-black rounded-lg text-xs font-bold disabled:opacity-50"><Play size={12} /> Launch</button>
                </>}

                {/* Live → Enable AI Learning / Pause / View Decisions */}
                {c.status === 'live' && <>
                  <button onClick={() => router.push(`/app/experiments`)} className="px-4 py-2 border border-border-subtle text-deep-black rounded-lg text-xs font-bold hover:border-deep-black"><Eye size={12} /> View Decisions</button>
                  <button onClick={() => handleStatusChange(c.id, 'paused')} disabled={!can('edit_campaign')} className="px-4 py-2 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-border-subtle disabled:opacity-50"><PauseCircle size={12} /> Pause</button>
                  <button onClick={() => handleEnableAiLearning(c.id)} disabled={!can('edit_campaign')} className="px-4 py-2 bg-butter-yellow text-deep-black rounded-lg text-xs font-bold disabled:opacity-50 hover:brightness-110 hover:shadow-[0_0_20px_-5px_rgba(255,215,0,0.5)] hover:scale-105 transition-all"><FlaskConical size={12} /> Enable AI Learning</button>
                </>}

                {/* Learning → Simulate Step / View Experiment / Declare Winner / Pause Learning */}
                {c.status === 'learning' && <>
                  <button onClick={() => router.push(`/app/experiments`)} className="px-4 py-2 border border-border-subtle text-deep-black rounded-lg text-xs font-bold hover:border-deep-black"><Eye size={12} /> View Experiment</button>
                  <button onClick={() => alert("Use the Experiments page to simulate a learning step")} className="px-4 py-2 bg-butter-yellow text-deep-black rounded-lg text-xs font-bold"><BarChart3 size={12} /> Simulate Step</button>
                  <button onClick={() => alert("Use the Experiments page to declare a winner")} className="px-4 py-2 bg-charcoal text-white rounded-lg text-xs font-bold"><CheckCircle size={12} /> Declare Winner</button>
                  <button onClick={() => alert("Pause learning from the Experiments page")} className="px-4 py-2 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-border-subtle"><PauseCircle size={12} /> Pause Learning</button>
                </>}

                {/* Completed → View Results / Archive */}
                {c.status === 'completed' && <>
                  <button onClick={() => router.push(`/app/experiments`)} className="px-4 py-2 border border-border-subtle text-deep-black rounded-lg text-xs font-bold hover:border-deep-black"><Eye size={12} /> View Results</button>
                  <button onClick={() => handleStatusChange(c.id, 'archived')} disabled={!can('edit_campaign')} className="px-4 py-2 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-border-subtle disabled:opacity-50"><Archive size={12} /> Archive</button>
                </>}

                {/* Fallback for other states - always show Open Studio */}
                {!['draft', 'review', 'approved', 'live', 'learning', 'completed'].includes(c.status) && (
                  <button onClick={() => router.push(`/app/creative-studio?segmentId=${c.segmentId}`)} className="px-4 py-2 border border-border-subtle text-deep-black rounded-lg text-xs font-bold hover:border-deep-black">Open Studio</button>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Campaign Builder Slider */}
        {showCreate && (
          <form onSubmit={handleCreate} className="flex-1 bg-white rounded-[40px] border border-border-subtle shadow-2xl p-10 flex flex-col animate-in slide-in-from-right-16 duration-500 overflow-y-auto custom-scrollbar relative">
            <div className="absolute top-0 right-0 bg-butter-yellow px-6 py-2 rounded-bl-[24px] text-xs font-bold uppercase tracking-widest text-deep-black">
              Campaign Builder
            </div>
            
            <h2 className="font-display text-3xl font-bold mb-8">Create Campaign</h2>
            
            <div className="space-y-8 flex-1">
              
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Campaign Name</label>
                  <input required name="name" type="text" placeholder="e.g. Summer Retention Push" className="w-full px-5 py-4 bg-warm-cream border border-border-subtle rounded-2xl focus:border-deep-black outline-none transition-colors font-bold text-deep-black text-lg" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Objective</label>
                  <select name="objective" className="w-full px-5 py-4 bg-warm-cream border border-border-subtle rounded-2xl focus:border-deep-black outline-none transition-colors font-bold text-deep-black appearance-none cursor-pointer">
                    <option value="Conversion">Increase Conversion</option>
                    <option value="Retention">Recover Carts</option>
                    <option value="Retention">Reduce Churn</option>
                    <option value="Loyalty">Upsell Premium</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Audience Segment</label>
                  <select name="segmentId" required className="w-full px-5 py-4 bg-warm-cream border border-border-subtle rounded-2xl focus:border-deep-black outline-none transition-colors font-bold text-deep-black appearance-none cursor-pointer">
                    <option value="" disabled>Select Segment</option>
                    {segments.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-border-subtle pt-8">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Activation Workflow</label>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-warm-cream p-4 rounded-2xl border-2 border-deep-black relative">
                    <span className="absolute -top-3 left-4 bg-deep-black text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">Step 1</span>
                    <p className="font-bold text-sm">Draft</p>
                  </div>
                  <ArrowRight className="text-text-secondary shrink-0" />
                  <div className="flex-1 bg-white p-4 rounded-2xl border border-border-subtle relative opacity-50">
                    <span className="absolute -top-3 left-4 bg-border-subtle text-text-secondary px-2 py-0.5 rounded text-[10px] font-bold uppercase">Step 2</span>
                    <p className="font-bold text-sm">AI Generate</p>
                  </div>
                  <ArrowRight className="text-text-secondary shrink-0" />
                  <div className="flex-1 bg-white p-4 rounded-2xl border border-border-subtle relative opacity-50">
                    <span className="absolute -top-3 left-4 bg-border-subtle text-text-secondary px-2 py-0.5 rounded text-[10px] font-bold uppercase">Step 3</span>
                    <p className="font-bold text-sm">Learning</p>
                  </div>
                </div>
              </div>

              <div className="bg-charcoal text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden mt-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-electric-mint/10 rounded-full blur-[60px] pointer-events-none"></div>
                <h3 className="font-display text-xl font-bold mb-2 flex items-center gap-2 relative z-10"><Zap className="text-electric-mint" /> Optimization Engine</h3>
                <p className="text-sm text-white/60 mb-6 relative z-10">Configure how the contextual bandit should learn during the live phase.</p>
                
                <div className="grid grid-cols-2 gap-6 relative z-10">
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Experiment Type</label>
                    <select className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-electric-mint outline-none transition-colors font-bold text-white appearance-none cursor-pointer">
                      <option>Contextual Bandit</option>
                      <option>Multi-Armed Bandit</option>
                      <option>A/B Test</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Approval Required?</label>
                    <div className="flex items-center gap-4 h-[56px]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="approval" className="w-4 h-4 accent-electric-mint" defaultChecked />
                        <span className="text-sm font-bold">Yes (Strict)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="approval" className="w-4 h-4 accent-electric-mint" />
                        <span className="text-sm font-bold">Auto-Deploy</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-8 flex items-center justify-end gap-4 border-t border-border-subtle pt-6">
              <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-4 text-text-secondary font-bold hover:text-deep-black">Cancel</button>
              <button disabled={saving} type="submit" className="px-8 py-4 bg-deep-black hover:bg-charcoal text-white font-bold rounded-full shadow-2xl transition-transform hover:-translate-y-1 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save & Continue to Studio'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
