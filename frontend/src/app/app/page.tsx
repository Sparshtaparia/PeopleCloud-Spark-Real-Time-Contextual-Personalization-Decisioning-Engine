"use client"
import { usePermissions } from '@/hooks/use-permissions'
import { AccessDenied } from '@/components/rbac/AccessDenied'

import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { ArrowUpRight, Target, Activity, Zap, Users, BrainCircuit } from 'lucide-react'
import { getDashboardMetrics } from '@/lib/actions/dashboard'

// Format helpers
const fmt = {
  /** e.g. 1500 → 1.5K, 1200000 → 1.2M */
  compact: (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(Math.round(n))
  },
  /** Currency compact: $1.2M */
  currency: (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
    return `$${Math.round(n).toLocaleString()}`
  },
  /** Percentage with 1 decimal */
  pct: (n: number | string) => {
    const v = parseFloat(String(n))
    return isNaN(v) ? 'N/A' : `${v.toFixed(1)}%`
  },
  /** Integer with commas */
  int: (n: number) => Math.round(n).toLocaleString(),
}

export default function CommandCenter() {
  const { can } = usePermissions()
  if (!can('view_dashboard')) return <AccessDenied />

  const { currentOrg, currentWorkspace } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All Channels')
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (currentOrg?.id && currentWorkspace?.id) {
      setLoading(true)
      getDashboardMetrics(currentOrg.id, currentWorkspace.id, filter)
        .then(res => {
          setData(res)
          setLoading(false)
        })
        .catch(err => {
          console.error(err)
          setLoading(false)
        })
    }
  }, [currentOrg?.id, currentWorkspace?.id, filter])

  const exportCsv = () => {
    if (!data) return
    const csvData = [
      ["--- COMMAND CENTER EXECUTIVE SUMMARY ---"],
      ["Workspace", currentWorkspace?.name || "Unknown"],
      ["Generated At", new Date().toISOString()],
      [],
      ["Metric", "Value"],
      ["Active Profiles", data.activeProfiles],
      ["Identity Match Rate", data.identityMatchRate + "%"],
      ["Revenue Influenced", "$" + data.revenueInfluenced],
      ["Active Campaigns", data.activeCampaigns],
      ["Generated Creatives", data.generatedCreatives],
      ["Model Latency (ms)", Number(data.modelLatency).toFixed(0)],
      ["Model Drift", data.modelDrift],
      ["Fatigue Alerts", data.fatigueAlerts],
      [],
      ["--- ACTIVE CAMPAIGNS ---"],
      ["Campaign Name", "Objective", "Status", "Lift"],
      ...(data.campaigns || []).map((c: any) => [
        `"${c.name}"`,
        c.objective,
        c.status,
        c.lift || "0%"
      ]),
      [],
      ["--- RECENT BANDIT DECISIONS ---"],
      ["Decision ID", "Action", "Segment", "Time"],
      ...(data.decisions || []).map((d: any) => [
        d.id,
        `"${d.action}"`,
        `"${d.segment}"`,
        d.time
      ])
    ]
    const csvContent = "data:text/csv;charset=utf-8," + csvData.map(e => e.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "peoplecloud-spark-command-center.csv")
    document.body.appendChild(link)
    link.click()
  }

  if (loading || !data) {
    return (
      <div className="px-12 py-8 max-w-[1600px] mx-auto animate-pulse flex flex-col gap-8">
        <div className="h-16 w-1/3 bg-white rounded-3xl opacity-50"></div>
        <div className="flex gap-8">
          <div className="h-[400px] flex-1 bg-white rounded-3xl opacity-50"></div>
          <div className="h-[400px] w-1/3 bg-charcoal rounded-3xl opacity-50"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-12 py-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Header & Pill Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 gap-6">
        <div>
          <h1 className="font-display text-title-xl font-bold tracking-tight mb-4 text-text-primary">Command Center</h1>
          <div className="flex flex-wrap gap-3">
            {['All Channels', 'Email', 'Web', 'App Push', 'SMS', 'Ads'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 border ${
                  filter === f 
                    ? 'bg-deep-black text-warm-cream border-deep-black' 
                    : 'bg-white text-text-secondary border-border-subtle hover:border-deep-black hover:text-text-primary shadow-soft'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCsv} className="px-6 py-3 bg-white border border-border-subtle rounded-full font-bold text-sm hover:border-deep-black transition-colors shadow-soft flex items-center gap-2">
            <Activity size={18} /> Export
          </button>
          <button className="px-6 py-3 bg-electric-mint text-deep-black rounded-full font-bold text-sm hover:bg-emerald-400 transition-colors shadow-glow-mint flex items-center gap-2">
            <Zap size={18} /> New Campaign
          </button>
        </div>
      </div>

      {/* Asymmetrical Grid Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        
        {/* Massive Hero Metric Card */}
        <div className="lg:col-span-8 glass-card rounded-[40px] p-10 flex flex-col justify-between relative overflow-hidden group border-0 bg-white shadow-soft">
          <div className="absolute top-0 right-0 p-8">
            <div className="w-16 h-16 rounded-full bg-electric-mint/20 flex items-center justify-center text-electric-mint group-hover:scale-110 transition-transform duration-500">
              <ArrowUpRight size={32} strokeWidth={3} />
            </div>
          </div>
          
          <div>
            <p className="text-label-sm text-text-secondary uppercase mb-6 flex items-center gap-2">
              <Target size={14} className="text-electric-mint" /> 
              Personalization Lift
            </p>
            <div className="flex items-baseline gap-4 mb-4">
              <h2 className="font-display text-[120px] leading-[1] font-bold tracking-tighter text-deep-black">
                {data.personalizationLift > 0 ? `+${data.personalizationLift}%` : 'N/A'}
              </h2>
            </div>
            <p className="text-sm text-text-secondary font-medium">
              Avg. lift across {data.activeCampaigns} active {filter !== 'All Channels' ? filter.toLowerCase() : ''} campaigns
            </p>
          </div>

          <div className="flex items-center gap-8 border-t border-border-subtle pt-8 mt-12">
            <div>
              <p className="text-label-sm text-text-secondary uppercase mb-1">Revenue Influenced</p>
              <p className="font-display text-title-lg font-bold">{fmt.currency(Number(data.revenueInfluenced))}</p>
            </div>
            <div className="w-px h-12 bg-border-subtle"></div>
            <div>
              <p className="text-label-sm text-text-secondary uppercase mb-1">Active Profiles</p>
              <p className="font-display text-title-lg font-bold">{fmt.compact(data.activeProfiles)}</p>
            </div>
            <div className="w-px h-12 bg-border-subtle"></div>
            <div>
              <p className="text-label-sm text-text-secondary uppercase mb-1">Identity Match</p>
              <p className="font-display text-title-lg font-bold">{fmt.pct(data.identityMatchRate)}</p>
            </div>
          </div>
        </div>

        {/* Deep Black AI Cockpit Card */}
        <div className="lg:col-span-4 bg-charcoal rounded-[40px] p-10 text-text-inverse flex flex-col justify-between relative overflow-hidden shadow-2xl">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-electric-mint/10 blur-[80px] rounded-full"></div>
          
          <div>
            <p className="text-label-sm text-text-inverse-secondary uppercase mb-8 flex items-center gap-2">
              <BrainCircuit size={14} className="text-electric-mint" /> 
              AI Decision Engine
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="font-bold">Bandit Decisions</p>
                <span className="font-display text-xl text-electric-mint">{(data.banditDecisions || 0).toLocaleString()}</span>
              </div>
              <div className="w-full bg-border-inverse rounded-full h-1.5 overflow-hidden">
                <div className="bg-electric-mint h-full w-[85%]"></div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-border-inverse">
                <p className="font-bold">Creative Generation</p>
                <span className="font-display text-xl text-butter-yellow">{data.generatedCreatives > 0 ? "Active" : "Idle"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-inverse-secondary mt-2">
                <div className={`w-2 h-2 rounded-full ${data.generatedCreatives > 0 ? 'bg-butter-yellow animate-pulse' : 'bg-border-inverse'}`}></div>
                {data.generatedCreatives} variants ready
              </div>
            </div>
          </div>

          <div className="mt-12 bg-border-inverse/30 p-4 rounded-2xl border border-border-inverse flex items-center justify-between backdrop-blur-md">
            <div>
              <p className="text-label-sm uppercase text-text-inverse-secondary mb-1">Model Health</p>
              <p className="font-bold text-electric-mint text-sm">Optimal (p95: {Math.round(Number(data.modelLatency))}ms)</p>
            </div>
            <Zap size={20} className="text-electric-mint" />
          </div>
        </div>
      </div>

      {/* Asymmetrical Grid Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Horizontal Insight Strip */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Creative Fatigue Alert */}
          {data.fatigueAlerts > 0 && (
            <div className="bg-coral-pink rounded-[32px] p-8 flex items-center justify-between shadow-[0_20px_40px_-15px_rgba(255,107,115,0.4)] hover:-translate-y-1 transition-transform cursor-pointer">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
                  <Activity size={28} />
                </div>
                <div>
                  <h3 className="font-display text-title-lg font-bold text-deep-black mb-1">Creative Fatigue Detected</h3>
                  <p className="text-deep-black/80 font-medium">Segment "Premium Loyalists" showing -12% CTR drop in Email channel.</p>
                </div>
              </div>
              <button className="px-6 py-3 bg-deep-black text-white rounded-full font-bold text-sm hover:scale-105 transition-transform">
                Regenerate Variants
              </button>
            </div>
          )}

          {/* Chart Block */}
          <div className="bg-white rounded-[32px] p-8 border-0 shadow-soft">
             <div className="flex justify-between items-center mb-8">
               <h3 className="font-display text-title-lg font-bold">Audience Growth</h3>
               <div className="flex gap-2">
                 <span className="w-3 h-3 rounded-full bg-electric-mint"></span>
                 <span className="text-xs font-bold text-text-secondary uppercase">Resolved ({fmt.compact(data.audienceResolved || 0)})</span>
                 <span className="w-3 h-3 rounded-full bg-border-subtle ml-4"></span>
                 <span className="text-xs font-bold text-text-secondary uppercase">Anonymous ({fmt.compact(data.audienceAnonymous || 0)})</span>
               </div>
             </div>
             <div className="h-[200px] flex items-end justify-between gap-2">
               {data.channelPerf?.map((h: number, i: number) => (
                 <div key={i} className="flex-1 h-full flex flex-col justify-end gap-1 group cursor-pointer relative">
                    <div className="w-full bg-electric-mint rounded-t-xl hover:bg-emerald-400 transition-colors" style={{height: `${h}%`}}></div>
                    <div className="w-full bg-border-subtle rounded-b-xl" style={{height: `${100 - h}%`}}></div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Live Decision Feed */}
        <div className="lg:col-span-4 bg-white rounded-[32px] p-8 shadow-soft flex flex-col border-0">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display text-title-lg font-bold flex items-center gap-3">
              Live Decisions
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-cyan"></span>
              </span>
            </h3>
          </div>
          
          <div className="flex-1 space-y-6 overflow-hidden">
            {data.decisions?.map((feed: any, i: number) => (
              <div key={i} className="flex gap-4 items-start">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${feed.alert ? 'bg-coral-pink/20 text-coral-pink' : 'bg-warm-cream text-text-secondary'}`}>
                  <Users size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-deep-black">{feed.action}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-secondary">{feed.id}</span>
                    <span className="w-1 h-1 bg-border-subtle rounded-full"></span>
                    <span className="text-xs font-medium text-electric-mint">{feed.segment}</span>
                  </div>
                </div>
                <div className="ml-auto text-xs text-text-secondary font-medium">
                  {feed.time}
                </div>
              </div>
            ))}
            {data.decisions?.length === 0 && (
              <p className="text-sm text-text-secondary">No recent decisions.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
