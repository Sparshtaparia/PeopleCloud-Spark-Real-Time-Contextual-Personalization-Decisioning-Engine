"use client"
import { usePermissions } from '@/hooks/use-permissions'
import { AccessDenied } from '@/components/rbac/AccessDenied'

import React, { useState, useEffect } from 'react'
import { Sparkles, Users, Search, Filter, TrendingUp, AlertTriangle, X, Play, Image as ImageIcon } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { getSegments, generateSegment, refreshSegmentStats } from '@/lib/actions/segments'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatPercentDecimal } from '@/lib/formatters'

export default function Segments() {
  const { can } = usePermissions()
  if (!can('view_segments')) return <AccessDenied />

  const { currentWorkspace, setAiLoading } = useAppStore()
  const router = useRouter()
  const [segments, setSegments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSegment, setSelectedSegment] = useState<any>(null)
  const [generating, setGenerating] = useState(false)

  const fetchSegments = async () => {
    if (!currentWorkspace) return
    setLoading(true)
    try {
      const data = await getSegments(currentWorkspace.id)
      setSegments(data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (currentWorkspace) {
      refreshSegmentStats(currentWorkspace.id).catch(console.error)
    }
    fetchSegments()
  }, [currentWorkspace?.id])

  const handleGenerate = async () => {
    if (!currentWorkspace || !currentWorkspace.organizationId) return
    setGenerating(true)
    setAiLoading(true)
    try {
      await generateSegment(currentWorkspace.id, currentWorkspace.organizationId)
      await fetchSegments()
    } catch (err) {
      console.error(err)
    }
    setGenerating(false)
    setAiLoading(false)
  }

  return (
    <div className="px-4 lg:px-12 py-4 lg:py-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 md:mb-12 gap-4">
        <div>
          <h1 className="font-display text-title-xl font-bold tracking-tight mb-2 text-text-primary">Audience Intelligence</h1>
          <p className="text-text-secondary font-medium">AI-generated customer clusters based on predictive LTV and intent scoring.</p>
        </div>
        <div className="flex gap-3 md:gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input 
              type="text" 
              placeholder="Search segments..." 
              className="pl-9 md:pl-11 pr-3 md:pr-4 py-2.5 md:py-3 bg-white border border-border-subtle rounded-full text-sm focus:outline-none focus:border-deep-black transition-colors font-bold w-full md:w-64 shadow-soft"
            />
          </div>
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 md:px-6 py-2.5 md:py-3 bg-electric-mint text-deep-black rounded-full font-bold shadow-glow-mint hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100 whitespace-nowrap"
          >
            <Sparkles size={16} className={generating ? "animate-pulse" : ""} /> 
            {generating ? "Generating..." : "Generate Segment"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="h-64 bg-white rounded-[40px] opacity-50 animate-pulse"></div>
          <div className="h-64 bg-white rounded-[40px] opacity-50 animate-pulse"></div>
          <div className="h-64 bg-white rounded-[40px] opacity-50 animate-pulse"></div>
        </div>
      ) : (

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {segments.map((seg, i) => {
          const colors = ['bg-electric-mint', 'bg-butter-yellow', 'bg-sky-cyan', 'bg-charcoal', 'bg-white', 'bg-coral-pink']
          const color = colors[i % colors.length]
          return (
          <div key={seg.id} onClick={() => setSelectedSegment(seg)} className={`rounded-[32px] lg:rounded-[40px] p-6 lg:p-8 border transition-all hover:-translate-y-1 cursor-pointer relative overflow-hidden group ${
            color === 'bg-charcoal' ? 'bg-charcoal text-white border-border-inverse shadow-2xl' :
            color === 'bg-electric-mint' ? 'bg-electric-mint text-deep-black border-transparent shadow-[0_20px_40px_-15px_rgba(24,214,139,0.3)]' :
            'bg-white text-deep-black border-border-subtle shadow-soft'
          }`}>
            
            {i === 2 && (
              <div className="absolute top-0 right-0 bg-coral-pink text-white px-4 py-1.5 rounded-bl-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(255,107,115,0.5)]">
                <AlertTriangle size={12} /> Fatigue Risk
              </div>
            )}

            <div className="flex justify-between items-start mb-12 mt-4">
              <h3 className={`font-display text-2xl font-bold pr-8 ${color === 'bg-charcoal' ? 'text-white' : 'text-deep-black'}`}>
                {seg.name}
              </h3>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${color === 'bg-charcoal' ? 'bg-white/10' : 'bg-black/5'}`}>
                <Users size={20} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <p className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${color === 'bg-charcoal' ? 'text-white/50' : 'text-black/50'}`}>Audience Size</p>
                <p className="font-display text-3xl font-bold">{seg.audienceSize?.toLocaleString() || "1,200"}</p>
              </div>
              <div>
                <p className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${color === 'bg-charcoal' ? 'text-white/50' : 'text-black/50'}`}>Avg LTV</p>
                <p className="font-display text-3xl font-bold">{formatCurrency(seg.avgLtv || 0)}</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl flex items-center justify-between ${color === 'bg-charcoal' ? 'bg-white/5' : 'bg-black/5'}`}>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className={color === 'bg-charcoal' ? 'text-electric-mint' : 'text-deep-black'} />
                <span className="text-xs font-bold uppercase tracking-widest">Pred. Conversion</span>
              </div>
              <span className="font-display text-xl font-bold">{formatPercentDecimal(seg.convProb || 0)}</span>
            </div>
          </div>
          )
        })}
      </div>
      )}

      {/* Segment Detail Drawer */}
      {selectedSegment && (
        <>
          <div className="fixed inset-0 bg-deep-black/20 backdrop-blur-sm z-[90]" onClick={() => setSelectedSegment(null)}></div>
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-[600px] bg-white z-[100] shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="p-8 border-b border-border-subtle flex justify-between items-center bg-warm-cream">
              <h2 className="font-display text-3xl font-bold text-deep-black">{selectedSegment.name}</h2>
              <button onClick={() => setSelectedSegment(null)} className="w-10 h-10 rounded-full bg-white border border-border-subtle flex items-center justify-center hover:bg-deep-black hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-charcoal text-white rounded-3xl">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-2">Audience Size</p>
                  <p className="font-display text-4xl font-bold">{selectedSegment.audienceSize?.toLocaleString() || "1,200"}</p>
                </div>
                <div className="p-6 bg-warm-cream text-deep-black rounded-3xl border border-border-subtle">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary mb-2">Conv. Probability</p>
                  <p className="font-display text-4xl font-bold">{formatPercentDecimal(selectedSegment.convProb || 0)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4">Top Affinities</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm"><span className="font-bold">Premium Products</span> <span className="font-bold text-electric-mint">88%</span></div>
                  <div className="w-full bg-warm-cream h-2 rounded-full overflow-hidden"><div className="bg-electric-mint h-full w-[88%]"></div></div>
                  
                  <div className="flex justify-between items-center text-sm"><span className="font-bold">Apparel</span> <span className="font-bold text-sky-cyan">74%</span></div>
                  <div className="w-full bg-warm-cream h-2 rounded-full overflow-hidden"><div className="bg-sky-cyan h-full w-[74%]"></div></div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-border-subtle bg-white flex gap-4">
              <button 
                onClick={() => router.push(`/app/campaigns?segmentId=${selectedSegment.id}`)}
                className="flex-1 py-4 bg-white border-2 border-deep-black text-deep-black rounded-xl font-bold hover:bg-deep-black hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <Play size={18} /> Create Campaign
              </button>
              <button 
                onClick={() => router.push(`/app/creative-studio?segmentId=${selectedSegment.id}`)}
                className="flex-1 py-4 bg-electric-mint text-deep-black rounded-xl font-bold shadow-glow-mint flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors"
              >
                <ImageIcon size={18} /> Generate Creative
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
