"use client"
import { usePermissions } from '@/hooks/use-permissions'
import { AccessDenied } from '@/components/rbac/AccessDenied'

import React, { useState, useEffect, useRef } from 'react'
import { FlaskConical, TrendingUp, PauseCircle, Activity, Zap, Scale, Play, CheckCircle, ToggleLeft, ToggleRight, Clock, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { getExperiments, simulateBanditStep, declareWinner, pauseLearning } from '@/lib/actions/experiments'

export default function Experiments() {
  const { can } = usePermissions()
  if (!can('view_experiments')) return <AccessDenied />

  const { currentOrg, currentWorkspace, setAiLoading } = useAppStore()
  const [experiments, setExperiments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [autoLearning, setAutoLearning] = useState(false)
  const [stepCount, setStepCount] = useState(0)
  const [error, setError] = useState('')
  const autoTimerRef = useRef<any>(null)
  const MAX_AUTO_STEPS = 10

  const fetchExperiments = async () => {
    if (!currentWorkspace) return
    try {
      const data = await getExperiments(currentWorkspace.id)
      setExperiments(data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  // Clear error on org/ws change
  useEffect(() => { setError('') }, [currentOrg?.id, currentWorkspace?.id])

  useEffect(() => {
    fetchExperiments()
  }, [currentWorkspace?.id])

  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current)
    }
  }, [])

  const handleSimulate = async (id: string) => {
    if (!currentOrg || !currentWorkspace) return
    setError('')
    setAiLoading(true)
    try {
      await simulateBanditStep(id, currentOrg.id, currentWorkspace.id)
      await fetchExperiments()
    } catch (err: any) {
      setError(err.message || 'Simulation failed')
    }
    setAiLoading(false)
  }

  const toggleAutoLearning = (id: string) => {
    if (autoLearning) {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current)
      setAutoLearning(false)
      setStepCount(0)
    } else {
      setAutoLearning(true)
      setStepCount(0)
      autoTimerRef.current = setInterval(async () => {
        setStepCount(prev => {
          if (prev >= MAX_AUTO_STEPS - 1) {
            if (autoTimerRef.current) clearInterval(autoTimerRef.current)
            setAutoLearning(false)
            return prev + 1
          }
          return prev + 1
        })
        setAiLoading(true)
        try {
          await simulateBanditStep(id, currentOrg!.id, currentWorkspace!.id)
          await fetchExperiments()
        } catch (err) {
          console.error(err)
          if (autoTimerRef.current) clearInterval(autoTimerRef.current)
          setAutoLearning(false)
        }
        setAiLoading(false)
      }, 2000)
    }
  }

  const handleDeclareWinner = async (experimentId: string, variantId: string) => {
    if (!currentOrg || !currentWorkspace) return
    setError('')
    setAiLoading(true)
    try {
      await declareWinner(experimentId, variantId, currentOrg.id, currentWorkspace.id)
      await fetchExperiments()
    } catch (err: any) {
      setError(err.message || 'Failed to declare winner')
    }
    setAiLoading(false)
  }

  const handlePauseLearning = async (experimentId: string) => {
    if (!currentOrg || !currentWorkspace) return
    setError('')
    setAiLoading(true)
    try {
      await pauseLearning(experimentId, currentOrg.id, currentWorkspace.id)
      await fetchExperiments()
    } catch (err: any) {
      setError(err.message || 'Failed to pause learning')
    }
    setAiLoading(false)
  }

  const activeExp = experiments[0] || null
  const isExpRunning = activeExp?.status === 'running'

  const activeBandits = experiments.filter(e => e.status === 'running').length
  const autoPaused = experiments.filter(e => e.status === 'paused' || e.status === 'completed').length
  
  // Calculate average lift of running experiments
  const running = experiments.filter(e => e.status === 'running' && e.totalLift > 0)
  let avgLiftStr = "+0.0%"
  if (running.length > 0) {
    const totalLiftNum = running.reduce((acc, e) => acc + e.totalLift, 0)
    const avg = totalLiftNum / running.length
    avgLiftStr = `+${avg.toFixed(1)}%`
  } else {
    const allWithLift = experiments.filter(e => e.totalLift > 0)
    if (allWithLift.length > 0) {
      const totalLiftNum = allWithLift.reduce((acc, e) => acc + e.totalLift, 0)
      const avg = totalLiftNum / allWithLift.length
      avgLiftStr = `+${avg.toFixed(1)}%`
    }
  }
  return (
    <div className="px-12 py-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="font-display text-title-xl font-bold tracking-tight mb-2 text-text-primary">Experiments & Bandits</h1>
          <p className="text-text-secondary font-medium">Live traffic allocation and contextual bandit rewards.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-6 py-4 bg-coral-pink/10 border border-coral-pink/20 rounded-2xl text-coral-pink font-bold text-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <AlertTriangle size={18} className="shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-coral-pink/60 hover:text-coral-pink">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="bg-white p-8 rounded-[32px] border border-border-subtle shadow-soft flex items-center gap-6 group hover:-translate-y-1 transition-transform">
           <div className="w-16 h-16 bg-sky-cyan/20 rounded-2xl flex items-center justify-center text-sky-cyan group-hover:scale-110 transition-transform">
             <FlaskConical size={32} />
           </div>
           <div>
             <p className="text-[10px] uppercase font-bold text-text-secondary tracking-widest mb-1">Active Bandits</p>
             <p className="font-display text-4xl font-bold text-deep-black">{activeBandits}</p>
           </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-border-subtle shadow-soft flex items-center gap-6 group hover:-translate-y-1 transition-transform">
           <div className="w-16 h-16 bg-electric-mint rounded-2xl flex items-center justify-center text-deep-black shadow-glow-mint group-hover:scale-110 transition-transform">
             <TrendingUp size={32} />
           </div>
           <div>
             <p className="text-[10px] uppercase font-bold text-text-secondary tracking-widest mb-1">Total Lift</p>
             <p className="font-display text-4xl font-bold text-deep-black">{avgLiftStr}</p>
           </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-border-subtle shadow-soft flex items-center gap-6 group hover:-translate-y-1 transition-transform">
           <div className="w-16 h-16 bg-coral-pink/20 rounded-2xl flex items-center justify-center text-coral-pink group-hover:scale-110 transition-transform">
             <PauseCircle size={32} />
           </div>
           <div>
             <p className="text-[10px] uppercase font-bold text-text-secondary tracking-widest mb-1">Auto-Paused</p>
             <p className="font-display text-4xl font-bold text-deep-black">{autoPaused}</p>
           </div>
        </div>
      </div>

      {/* Main Experiment Card */}
      {loading ? (
        <div className="h-64 bg-charcoal rounded-[40px] animate-pulse"></div>
      ) : activeExp ? (
      <div className="bg-charcoal rounded-[40px] p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-electric-mint/10 rounded-full blur-[100px]"></div>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 relative z-10 border-b border-border-inverse pb-10">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span className="px-4 py-1.5 bg-electric-mint text-deep-black text-xs font-bold uppercase tracking-widest rounded-full shadow-glow-mint flex items-center gap-2">
                <Zap size={14} /> Contextual Bandit
              </span>
              <span className="text-sm font-bold opacity-60">{activeExp.id.slice(0, 8)}</span>
            </div>
            <h2 className="font-display text-5xl font-bold tracking-tight">{activeExp.campaign?.name || `Experiment ${activeExp.id.slice(0, 8)}`}</h2>
          </div>
          <div className="text-right mt-6 lg:mt-0 flex flex-col items-end gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold opacity-60 tracking-widest mb-2">Algorithm Status</p>
              <p className="font-bold text-electric-mint flex items-center gap-2 text-lg">
                <span className={`w-3 h-3 rounded-full ${isExpRunning ? 'bg-electric-mint animate-pulse shadow-glow-mint' : 'bg-white/30'} `}></span> 
                {isExpRunning ? 'Exploring / Exploiting' : activeExp.status === 'completed' ? 'Completed' : 'Paused'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isExpRunning && (
                <>
                  <button 
                    onClick={() => toggleAutoLearning(activeExp.id)}
                    className={`px-4 py-2 border rounded-full text-xs font-bold flex items-center gap-2 transition-colors ${autoLearning ? 'bg-electric-mint/20 border-electric-mint text-electric-mint' : 'bg-white/10 border-white/20 text-white/70 hover:text-white'}`}
                  >
                    {autoLearning ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {autoLearning ? `Auto (${stepCount}/${MAX_AUTO_STEPS})` : 'Auto Learning'}
                  </button>
                  <button 
                    onClick={() => handleSimulate(activeExp.id)}
                    disabled={autoLearning}
                    className="px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-40"
                  >
                    <Play size={14} /> Simulate Step
                  </button>
                </>
              )}
              {activeExp.status === 'completed' && (
                <button onClick={() => alert(`Winner: ${activeExp.variants?.sort((a: any, b: any) => b.allocation - a.allocation)[0]?.name}`)}
                  className="px-5 py-2 bg-electric-mint/20 border border-electric-mint/30 text-electric-mint rounded-full text-sm font-bold flex items-center gap-2">
                  <CheckCircle size={14} /> View Results
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
          
          <div className="lg:col-span-5 flex flex-col gap-8 pr-12 lg:border-r border-border-inverse">
            <div>
              <h4 className="font-display text-2xl font-bold mb-8 flex items-center gap-3">
                <Scale className="text-electric-mint" /> Traffic Allocation
              </h4>
              <div className="space-y-8">
                {activeExp.variants?.sort((a: any, b: any) => b.allocation - a.allocation).map((v: any, i: number) => {
                  const allocPercent = (v.allocation * 100).toFixed(1) + '%'
                  const isWinner = i === 0 && v.allocation > 0.4
                  const colors = ['bg-electric-mint', 'bg-sky-cyan', 'bg-white/20']
                  const color = colors[i % colors.length]
                  
                  return (
                  <div key={v.id} className="relative">
                    <div className="flex justify-between items-end mb-3">
                      <span className="font-bold text-lg flex items-center gap-2">
                        {v.name}
                        {isWinner && <span className="text-[10px] bg-electric-mint/20 text-electric-mint px-2 py-0.5 rounded uppercase tracking-widest ml-2">Winner</span>}
                      </span>
                      <span className="font-display text-2xl font-bold">{allocPercent}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                      <div className={`h-full ${color} relative transition-all duration-500`} style={{width: allocPercent}}>
                        {isWinner && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-white/50 font-bold uppercase tracking-widest">
                      <span>Imps: {v.impressions}</span>
                      <span>Clicks: {v.clicks}</span>
                      <span>Convs: {v.conversions}</span>
                    </div>
                  </div>
                )})}
              </div>
            </div>

            {/* Learning controls for running experiments */}
            {isExpRunning && (
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={() => {
                    const winner = activeExp.variants?.sort((a: any, b: any) => b.allocation - a.allocation)[0]
                    if (winner) handleDeclareWinner(activeExp.id, winner.id)
                  }}
                  className="px-5 py-2 bg-electric-mint text-deep-black rounded-full text-xs font-bold flex items-center gap-2 hover:brightness-105 transition-all"
                >
                  <CheckCircle size={14} /> Declare Winner
                </button>
                <button
                  onClick={() => handlePauseLearning(activeExp.id)}
                  className="px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-xs font-bold flex items-center gap-2 transition-colors"
                >
                  <PauseCircle size={14} /> Pause Learning
                </button>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-7 flex flex-col">
            <h4 className="font-display text-2xl font-bold mb-8 flex items-center gap-3">
              <Activity className="text-sky-cyan" /> Reward Function Trajectory
            </h4>
            
            {/* Funky Area Chart Mock */}
            <div className="flex-1 h-64 flex items-end justify-between gap-1 relative pt-8">
              <div className="absolute inset-0 border-b border-border-inverse/50 flex flex-col justify-between pointer-events-none pb-1">
                <div className="w-full border-t border-dashed border-border-inverse/30 h-0"></div>
                <div className="w-full border-t border-dashed border-border-inverse/30 h-0"></div>
                <div className="w-full border-t border-dashed border-border-inverse/30 h-0"></div>
              </div>
              
              {[20,25,22,35,45,40,55,70,85,90,95,92,98].map((h, i) => (
                <div key={i} className="flex-1 h-full flex items-end">
                  <div className="w-full bg-gradient-to-t from-sky-cyan/5 to-sky-cyan/40 rounded-t-xl hover:from-electric-mint/20 hover:to-electric-mint relative group transition-all duration-500 cursor-crosshair" style={{height: `${h}%`}}>
                     <div className="absolute top-0 w-full h-1.5 bg-sky-cyan group-hover:bg-electric-mint rounded-t-xl"></div>
                     
                     {/* Tooltip */}
                     <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-deep-black px-3 py-1.5 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-soft z-50">
                       Reward: {h.toFixed(1)}
                     </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-white/5 p-6 rounded-2xl border border-border-inverse flex items-center gap-4">
              <div className="w-12 h-12 bg-butter-yellow/10 rounded-xl flex items-center justify-center text-butter-yellow shrink-0">
                <FlaskConical size={20} />
              </div>
              <p className="text-sm font-medium leading-relaxed opacity-80 font-mono">
                Reward = <span className="text-white">(Open * 0.2)</span> + <span className="text-electric-mint">(Click * 0.8)</span> + <span className="text-butter-yellow">(Purchase * 5.0)</span> - <span className="text-coral-pink">(Unsubscribe * 10.0)</span>
              </p>
            </div>
          </div>

        </div>
      </div>
      ) : (
        <div className="bg-white rounded-[40px] p-12 text-center text-text-secondary border-2 border-dashed border-border-subtle">
          No active experiments in this workspace. Create one from the Campaign Studio.
        </div>
      )}
    </div>
  )
}
