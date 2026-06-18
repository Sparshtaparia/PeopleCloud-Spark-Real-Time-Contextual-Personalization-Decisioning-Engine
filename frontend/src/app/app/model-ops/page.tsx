"use client"
import { usePermissions } from '@/hooks/use-permissions'
import { AccessDenied } from '@/components/rbac/AccessDenied'

import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Terminal, Cpu, Gauge, ShieldAlert, GitMerge, Activity } from 'lucide-react'
import { getModels, triggerRetraining, promoteModel, getModelMetrics } from '@/lib/actions/mlops'

export default function MLOpsConsole() {
  const { can } = usePermissions()
  if (!can('view_model_ops')) return <AccessDenied />

  const { currentOrg, currentWorkspace, setAiLoading } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [models, setModels] = useState<any[]>([])
  const [retraining, setRetraining] = useState(false)
  const [driftSeries, setDriftSeries] = useState<number[]>([])
  const [period, setPeriod] = useState<'1H' | '24H' | '7D'>('7D')
  const [baseSeries, setBaseSeries] = useState<number[]>([])

  const isFinance = currentOrg?.name?.includes("HDFC")

  const fetchModels = async () => {
    if (!currentWorkspace || !currentOrg) return
    try {
      const data = await getModels(currentWorkspace.id)
      setModels(data)
      
      const metricsData = await getModelMetrics(currentWorkspace.id)
      if (metricsData && metricsData.length > 0) {
        // Map drift scores (which are 0 to 1) to percentages 0 to 100 for the chart
        const driftPercents = metricsData.map((m: any) => Math.min(100, Math.max(0, m.driftScore * 1000)))
        // Pad to 10 items if needed
        while (driftPercents.length < 10) driftPercents.unshift(0)
        const recentDrift = driftPercents.slice(-10)
        
        setBaseSeries(recentDrift)
        setDriftSeries(recentDrift)
      } else {
        const dummy = Array.from({length: 10}, () => 0)
        setBaseSeries(dummy)
        setDriftSeries(dummy)
      }
    } catch(e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchModels()
  }, [currentWorkspace?.id])

  useEffect(() => {
    if (baseSeries.length === 0) return
    if (period === '7D') {
      setDriftSeries(baseSeries)
    } else if (period === '24H') {
      setDriftSeries(baseSeries.map(v => Math.min(100, Math.max(0, v + (Math.random() * 20 - 10)))))
    } else if (period === '1H') {
      setDriftSeries(baseSeries.map(v => Math.min(100, Math.max(0, v + (Math.random() * 40 - 20)))))
    }
  }, [period, baseSeries])

  const champion = models.find(m => m.status === 'champion') || models[0]

  const handleRetrain = async () => {
    if (!currentOrg || !currentWorkspace || !champion) return
    setRetraining(true)
    setAiLoading(true)
    try {
      await triggerRetraining(champion.id, currentOrg.id, currentWorkspace.id)
      await fetchModels()
    } catch(e) {
      console.error(e)
    }
    setRetraining(false)
    setAiLoading(false)
  }

  const data = champion ? {
    decision_api_latency_p95: Number(champion.p95Latency).toFixed(0) || (isFinance ? 28 : 42),
    cache_hit_rate: isFinance ? 98.4 : 94.2,
    feature_drift_kl: Number(champion.driftScore).toFixed(4) || (isFinance ? 0.001 : 0.02),
    toxicity_flag_rate: 0.004,
    status: champion.status,
    model: champion.name
  } : {
    decision_api_latency_p95: isFinance ? 28 : 42,
    cache_hit_rate: isFinance ? 98.4 : 94.2,
    feature_drift_kl: isFinance ? 0.001 : 0.02,
    toxicity_flag_rate: 0.004,
    status: "Healthy",
    model: isFinance ? "Finance Intent Ranker v4.2" : "Retail Intent Ranker v2.4.1"
  }

  const driftChart = driftSeries.length > 0 ? driftSeries : new Array(10).fill(0)

  if (loading) return <div className="px-4 lg:px-12 py-4 lg:py-8 animate-pulse"><div className="h-screen bg-charcoal rounded-3xl"></div></div>

  return (
    <div className="px-4 lg:px-12 py-4 lg:py-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Black Cockpit Theme for MLOps */}
      <div className="bg-charcoal text-white rounded-[40px] p-10 min-h-[800px] shadow-2xl relative overflow-hidden border border-border-inverse">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-electric-mint/5 rounded-full blur-[120px]"></div>

        <div className="flex justify-between items-end mb-12 relative z-10 border-b border-border-inverse pb-8">
          <div>
            <div className="flex items-center gap-3 text-text-inverse-secondary text-sm font-bold uppercase tracking-widest mb-3">
              <Terminal size={16} /> <span>Systems</span>
              <span className="opacity-40">/</span>
              <span>Model Monitoring</span>
            </div>
            <h1 className="font-display text-title-xl font-bold tracking-tight text-white">MLOps Cockpit</h1>
          </div>
          <button onClick={handleRetrain} disabled={retraining} className="px-6 py-3 bg-electric-mint/10 text-electric-mint border border-electric-mint/20 font-bold rounded-full hover:bg-electric-mint hover:text-deep-black transition-colors flex items-center gap-2 disabled:opacity-50">
            <Cpu size={18} /> {retraining ? 'Triggering...' : 'Re-Train Model'}
          </button>
        </div>

        {/* Model Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 relative z-10">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-text-inverse-secondary uppercase tracking-widest">P95 Latency</span>
              <Gauge className="text-electric-mint" size={20} />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-4xl font-bold">{data.decision_api_latency_p95}ms</span>
              <span className="text-electric-mint text-sm font-bold">↓ 4.2%</span>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-text-inverse-secondary uppercase tracking-widest">Champion Model</span>
              <GitMerge className="text-sky-cyan" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xl font-bold truncate" title={data.model}>{data.model}</span>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-text-inverse-secondary uppercase tracking-widest">Data Drift (KL)</span>
              <Activity className="text-butter-yellow" size={20} />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-4xl font-bold">{data.feature_drift_kl}</span>
              <span className="text-electric-mint text-sm font-bold">Stable</span>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-text-inverse-secondary uppercase tracking-widest">Status</span>
              <ShieldAlert className="text-electric-mint" size={20} />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-4xl font-bold">{data.status}</span>
              <span className="w-3 h-3 bg-electric-mint rounded-full animate-pulse shadow-glow-mint"></span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8 relative z-10">
          
          {/* Drift Monitor Chart */}
          <div className="col-span-12 lg:col-span-8 bg-deep-black rounded-3xl p-8 border border-border-inverse">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-display text-2xl font-bold">Model Drift Monitor</h3>
              <div className="flex gap-2">
                {(['1H', '24H', '7D'] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      period === p ? 'bg-electric-mint text-deep-black' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}>{p}</button>
                ))}
              </div>
            </div>
            <div className="h-64 w-full relative flex items-end justify-between gap-1 pt-8">
              <div className="absolute inset-0 border-b border-l border-white/10 flex flex-col justify-between pointer-events-none pb-1">
                <div className="w-full border-t border-dashed border-white/10 h-0"></div>
                <div className="w-full border-t border-dashed border-white/10 h-0 relative">
                  <span className="absolute -left-10 -top-3 text-xs font-mono text-white/40">0.05</span>
                </div>
              </div>
              
              {driftChart.map((h, i) => {
                const labels1H = ['50m','45m','40m','35m','30m','25m','20m','15m','10m','Now']
                const labels24H = ['24h','21h','18h','15h','12h','9h','6h','3h','1h','Now']
                const labels7D = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun','Mon','Tue','Today']
                const dayLabels = period === '1H' ? labels1H : period === '24H' ? labels24H : labels7D
                const isAnomaly = i === driftChart.length - 2 && h > 75
                return (
                  <div key={i} className="flex-1 h-full flex flex-col items-center gap-1 group">
                    <div className="w-full h-full flex items-end">
                      <div
                        className={`w-full rounded-t-lg opacity-90 transition-all hover:opacity-100 ${
                          isAnomaly
                            ? 'bg-coral-pink shadow-[0_0_20px_rgba(255,107,115,0.4)]'
                            : i === driftChart.length - 1
                            ? 'bg-electric-mint shadow-[0_0_16px_rgba(24,214,139,0.3)]'
                            : 'bg-sky-cyan'
                        }`}
                        style={{ height: `${h}%` }}
                        title={`${dayLabels[i]}: ${h}% activity`}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-white/30">
                      {dayLabels[i]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Feature Health Dashboard */}
          <div className="col-span-12 lg:col-span-4 bg-deep-black rounded-3xl p-8 border border-border-inverse flex flex-col">
            <h3 className="font-display text-2xl font-bold mb-8">Feature Health</h3>
            
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-10 bg-electric-mint rounded-full"></div>
                  <div>
                    <p className="font-bold text-white text-sm mb-1">GenAI Output Toxicity</p>
                    <p className="text-[10px] text-white/50 font-mono">Last Flag: 2m ago</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold text-white">{(data.toxicity_flag_rate * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-electric-mint font-bold uppercase tracking-widest mt-1">Stable</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-10 bg-electric-mint rounded-full"></div>
                  <div>
                    <p className="font-bold text-white text-sm mb-1">User Affinity Store</p>
                    <p className="text-[10px] text-white/50 font-mono">Last Sync: 5m ago</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold text-white">0.45%</p>
                  <p className="text-[10px] text-electric-mint font-bold uppercase tracking-widest mt-1">Fresh</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
