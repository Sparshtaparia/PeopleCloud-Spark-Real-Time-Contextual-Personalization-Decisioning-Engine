"use client"
import { usePermissions } from '@/hooks/use-permissions'
import { AccessDenied } from '@/components/rbac/AccessDenied'

import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Search, Filter, ShieldCheck, Mail, Smartphone, MapPin, Target, ChevronRight, Activity } from 'lucide-react'
import { getCustomers, getCustomerDetails } from '@/lib/actions/customers'
import { formatRisk } from '@/lib/formatters'
import { useRouter } from 'next/navigation'

export default function Customer360() {
  const { can } = usePermissions()
  if (!can('view_customers')) return <AccessDenied />

  const { currentOrg, currentWorkspace, setAiLoading } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    if (!currentWorkspace) return
    setLoading(true)
    setAiLoading(true, 'collecting data...')
    getCustomers(currentWorkspace.id).then(data => {
      setCustomers(data)
      if (data.length > 0) {
        setSelectedCustomer(data[0])
      } else {
        setLoading(false)
        setAiLoading(false)
      }
    }).catch(() => {
      setLoading(false)
      setAiLoading(false)
    })
  }, [currentWorkspace?.id])

  useEffect(() => {
    if (!selectedCustomer) return
    setLoading(true)
    setAiLoading(true, 'generating recommendation...')
    getCustomerDetails(selectedCustomer.id).then(data => {
      setProfile(data)
      setLoading(false)
      setAiLoading(false)
    }).catch(() => {
      setLoading(false)
      setAiLoading(false)
    })
  }, [selectedCustomer])

  if (loading && !profile) return <div className="px-4 lg:px-12 py-4 lg:py-8 animate-pulse"><div className="h-[800px] bg-white/50 rounded-3xl"></div></div>

  const topAffinities = profile ? Object.entries(profile.parsedAffinities) : []

  return (
    <div className="px-4 lg:px-12 py-4 lg:py-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 h-[calc(100vh-80px)] overflow-hidden flex flex-col">
      
      <div className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h1 className="font-display text-title-xl font-bold tracking-tight mb-2 text-text-primary">Identity Explorer</h1>
          <p className="text-text-secondary font-medium">Resolving signals into actionable 1:1 profiles.</p>
        </div>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden pb-4">
        
        {/* Left Col: Customer List - hidden on mobile, toggled via mobile list button */}
        <div className="hidden lg:flex w-[340px] bg-white rounded-[32px] p-6 shadow-soft flex-col h-full border border-border-subtle shrink-0">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
            <input 
              type="text" 
              placeholder="Search COREid, email, phone..." 
              className="w-full bg-warm-cream border border-border-subtle rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-deep-black transition-colors font-medium"
            />
          </div>
          <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-xs font-bold uppercase text-text-secondary tracking-widest">Recent Resolutions</span>
            <button className="text-electric-mint p-1 hover:bg-electric-mint/10 rounded-lg transition-colors"><Filter size={16} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {customers.map((c) => (
              <div 
                key={c.id} 
                onClick={() => setSelectedCustomer(c)}
                className={`rounded-2xl p-4 cursor-pointer transition-colors group border ${
                  selectedCustomer?.id === c.id 
                    ? 'bg-charcoal text-white shadow-2xl border-transparent' 
                    : 'bg-warm-cream hover:bg-warm-cream-dark border-border-subtle'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    selectedCustomer?.id === c.id ? 'bg-white text-deep-black' : 'bg-white border border-border-subtle text-deep-black'
                  }`}>
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{c.name}</p>
                    <p className={`text-xs ${selectedCustomer?.id === c.id ? 'text-white/60' : 'text-text-secondary'}`}>{c.corePersonId}</p>
                  </div>
                  {selectedCustomer?.id === c.id && <div className="ml-auto w-2 h-2 rounded-full bg-electric-mint"></div>}
                </div>
              </div>
            ))}
            {customers.length === 0 && (
              <p className="text-sm text-text-secondary text-center py-4">No customers found.</p>
            )}
          </div>
        </div>

        {/* Center/Right Col: Profile Details */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
          
          {/* Mobile: Customer List Toggle */}
          <div className="lg:hidden mb-4">
            <div className="bg-white rounded-2xl border border-border-subtle p-3 shadow-soft">
              <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar">
                {customers.slice(0, 10).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                      selectedCustomer?.id === c.id
                        ? 'bg-deep-black text-white'
                        : 'bg-warm-cream text-text-secondary hover:bg-warm-cream-dark'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hero Profile Block */}
          {profile && (
          <div className="bg-white rounded-[32px] lg:rounded-[40px] p-6 lg:p-10 mb-8 border border-border-subtle shadow-soft relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-sky-cyan text-deep-black px-6 py-2 rounded-bl-3xl font-bold text-sm tracking-wider flex items-center gap-2">
              <ShieldCheck size={16} /> Identity Resolved
            </div>
            
            <div className="flex flex-col lg:flex-row gap-12 items-start lg:items-center">
              {/* Identity Ring */}
              <div className="relative shrink-0 w-28 lg:w-40 h-28 lg:h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-border-subtle)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-electric-mint)" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * Math.round((profile.identityConfidence || 0) * 100)) / 100} className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-2xl lg:text-4xl font-bold text-deep-black">{Math.round((profile.identityConfidence || 0) * 100)}%</span>
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Confidence</span>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="font-display text-2xl lg:text-5xl font-bold tracking-tight text-deep-black">{profile.name}</h2>
                  <span className="px-3 py-1 rounded-full bg-butter-yellow text-deep-black text-xs font-bold uppercase tracking-wider">{profile.lifecycleStage || "Gold"} Member</span>
                </div>
                
                <div className="flex flex-wrap gap-6 mt-6">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Mail size={16} /> <span className="font-medium text-sm">{profile.emailHash || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Smartphone size={16} /> <span className="font-medium text-sm">{profile.phoneHash || "+1 (555) XXX-XXXX"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <MapPin size={16} /> <span className="font-medium text-sm">{profile.city || "Unknown Location"}</span>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-48 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-border-subtle pt-6 lg:pt-0 lg:pl-8">
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Pred. 2Y LTV</p>
                  <p className="font-display text-3xl font-bold text-deep-black">
                    ${Number(profile.predictedLtv || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Churn Risk</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-warm-cream rounded-full overflow-hidden">
                      <div className="h-full bg-coral-pink" style={{width: formatRisk(profile.churnRisk)}}></div>
                    </div>
                    <span className="font-bold text-sm text-coral-pink">{formatRisk(profile.churnRisk)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {profile && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* Affinity Map */}
            <div className="bg-charcoal text-white rounded-[32px] p-6 lg:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-cyan/10 rounded-full blur-[40px]"></div>
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h3 className="font-display text-2xl font-bold flex items-center gap-3">
                  <Target className="text-sky-cyan" /> Affinity Map
                </h3>
              </div>

              <div className="space-y-6 relative z-10">
                {topAffinities.map(([category, score]: any, idx: number) => {
                  const colors = ['bg-electric-mint', 'bg-sky-cyan', 'bg-butter-yellow']
                  const textColors = ['text-electric-mint', 'text-sky-cyan', 'text-butter-yellow']
                  const normalizedScore = score * 100
                  return (
                    <div key={category}>
                      <div className="flex justify-between items-end mb-2">
                        <span className="font-bold text-sm tracking-wide">{category}</span>
                        <span className={`font-display text-xl font-bold ${textColors[idx % 3]}`}>{normalizedScore.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full ${colors[idx % 3]} transition-all duration-1000 ease-out`} style={{width: `${normalizedScore}%`}}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Next Best Action (AI Engine) */}
            <div className="bg-electric-mint rounded-[32px] p-6 lg:p-8 shadow-[0_20px_40px_-15px_rgba(24,214,139,0.3)] text-deep-black flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-deep-black text-warm-cream text-[10px] font-bold uppercase tracking-widest rounded-full">AI Recommendation</span>
                  <span className="text-xs font-bold opacity-70">Next Best Action</span>
                </div>
                <h3 className="font-display text-2xl lg:text-4xl leading-tight font-bold tracking-tight mb-4">{profile.nextBestAction}</h3>
                <p className="font-medium opacity-80 leading-relaxed max-w-md">
                  {profile.aiExplanation}
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-4">
                <button 
                  onClick={() => router.push('/app/campaigns')}
                  className="w-full bg-deep-black text-white px-6 py-4 rounded-xl font-bold shadow-2xl hover:scale-[1.02] transition-transform flex justify-between items-center"
                >
                  Deploy to Push Channel <ChevronRight />
                </button>
                <div className="bg-white/40 border border-deep-black/10 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2 flex items-center gap-2">
                    <Activity size={12}/> Explainability Trace
                  </p>
                  <p className="text-sm font-bold opacity-80">Recommendation based on lifecycle stage (<span className="font-mono">{profile.lifecycleStage || "Unknown"}</span>), predicted LTV (<span className="font-mono">${Number(profile.predictedLtv || 0).toLocaleString()}</span>), and top affinity signals.</p>
                </div>
              </div>
            </div>

          </div>
          )}
        </div>
      </div>
    </div>
  )
}
