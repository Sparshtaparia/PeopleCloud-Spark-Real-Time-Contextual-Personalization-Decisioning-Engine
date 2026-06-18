"use client"
import { usePermissions } from '@/hooks/use-permissions'
import { AccessDenied } from '@/components/rbac/AccessDenied'

import React, { useState, useEffect } from 'react'
import { Zap, Users, ShieldCheck, CreditCard, Activity, Box } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { getUsage } from '@/lib/actions/billing'

export default function Billing() {
  const { can } = usePermissions()
  if (!can('view_billing')) return <AccessDenied />

  const { currentOrg } = useAppStore()
  const [usage, setUsage] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [modalType, setModalType] = useState<'invoice' | 'stripe' | 'enterprise' | null>(null)

  useEffect(() => {
    if (currentOrg) {
      setLoading(true)
      getUsage(currentOrg.id)
        .then(data => setUsage(data))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [currentOrg?.id])

  // Map values
  const eventsIngested = usage['events_ingested'] || 0
  const genaiCreatives = usage['genai_creatives_generated'] || 0
  const profilesResolved = usage['profiles_resolved'] || 0
  const banditDecisions = usage['bandit_decisions'] || 0
  
  // Dynamic plan limits — scale to 2x the resolved count so meter feels meaningful
  const profilesLimit = Math.max(5000, Math.ceil(profilesResolved / 1000) * 1000 * 2)
  const banditLimit = Math.max(10000, Math.ceil(banditDecisions / 1000) * 1000 * 3)
  const eventsLimit = Math.max(50000, Math.ceil(eventsIngested / 10000) * 10000 * 2)
  const genaiLimit = Math.max(1000, Math.ceil(genaiCreatives / 100) * 100 * 3)
  
  const eventsPercent = Math.min((eventsIngested / eventsLimit) * 100, 100)
  const genaiPercent = Math.min((genaiCreatives / genaiLimit) * 100, 100)
  const profilesPercent = Math.min((profilesResolved / profilesLimit) * 100, 100)
  const banditPercent = Math.min((banditDecisions / banditLimit) * 100, 100)
  
  const eventsOverage = eventsIngested > eventsLimit

  // Current billing period
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const periodLabel = `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  const monthName = now.toLocaleString('en-US', { month: 'long' })

  // Format helper
  const fmtNum = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
    return n.toLocaleString()
  }
  return (
    <div className="px-4 lg:px-12 py-4 lg:py-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="font-display text-title-xl font-bold tracking-tight mb-2 text-text-primary">Billing & Usage</h1>
          <p className="text-text-secondary font-medium">Monitor your SaaS consumption and plan limits.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setModalType('invoice')} className="px-6 py-3 bg-white border border-border-subtle text-deep-black rounded-full font-bold shadow-soft hover:border-deep-black transition-colors">
            View Invoices
          </button>
          <button onClick={() => setModalType('stripe')} className="px-6 py-3 bg-electric-mint text-deep-black rounded-full font-bold shadow-glow-mint hover:scale-105 transition-transform flex items-center gap-2">
            <CreditCard size={18} /> Manage Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        
        {/* Current Plan Overview */}
        <div className="col-span-1 lg:col-span-4 bg-charcoal rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden border border-border-inverse">
          <div className="absolute top-0 right-0 bg-electric-mint text-deep-black px-4 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-widest shadow-glow-mint z-10">
            Active Plan
          </div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-electric-mint/10 rounded-full blur-[80px]"></div>

          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <p className="text-sm font-bold text-white/50 uppercase tracking-widest mb-2">Current Tier</p>
              <h2 className="font-display text-5xl font-bold mb-8">Growth</h2>
              <div className="flex items-baseline gap-2 mb-8 border-b border-white/10 pb-8">
                <span className="font-display text-4xl font-bold">$2,400</span>
                <span className="text-white/50">/mo</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Billing Period</span>
                <span className="font-bold">{periodLabel}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Payment Method</span>
                <span className="font-bold">Visa ···· 4242</span>
              </div>
            </div>
            
            <button onClick={() => setModalType('enterprise')} className="w-full mt-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full font-bold transition-colors">
              Upgrade to Enterprise
            </button>
          </div>
        </div>

        {/* Usage Metrics */}
        <div className="col-span-1 lg:col-span-8 bg-white rounded-[40px] p-10 shadow-soft border border-border-subtle flex flex-col">
          <h3 className="font-display text-2xl font-bold mb-2 text-deep-black">{monthName} Usage</h3>
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-8">{periodLabel}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 flex-1">
            
            <div>
              <div className="flex justify-between items-end mb-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-text-secondary" />
                  <span className="text-sm font-bold text-deep-black">Profiles Resolved</span>
                </div>
                <span className="text-xs font-bold text-text-secondary">{fmtNum(profilesResolved)} / {fmtNum(profilesLimit)}</span>
              </div>
              <div className="w-full h-3 bg-warm-cream rounded-full overflow-hidden">
                <div className="h-full bg-deep-black transition-all duration-1000" style={{ width: `${profilesPercent}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-text-secondary" />
                  <span className="text-sm font-bold text-deep-black">Bandit Decisions</span>
                </div>
                <span className="text-xs font-bold text-text-secondary">{fmtNum(banditDecisions)} / {fmtNum(banditLimit)}</span>
              </div>
              <div className="w-full h-3 bg-warm-cream rounded-full overflow-hidden">
                <div className="h-full bg-electric-mint transition-all duration-1000" style={{ width: `${banditPercent}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-3">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-text-secondary" />
                  <span className="text-sm font-bold text-deep-black">GenAI Creatives Generated</span>
                </div>
                <span className="text-xs font-bold text-text-secondary">{fmtNum(genaiCreatives)} / {fmtNum(genaiLimit)}</span>
              </div>
              <div className="w-full h-3 bg-warm-cream rounded-full overflow-hidden">
                <div className="h-full bg-sky-cyan" style={{ width: `${genaiPercent}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-3">
                <div className="flex items-center gap-2">
                  <Box size={16} className="text-text-secondary" />
                  <span className="text-sm font-bold text-deep-black">Events Ingested</span>
                </div>
                <span className={`text-xs font-bold ${eventsOverage ? 'text-coral-pink' : 'text-text-secondary'}`}>
                  {fmtNum(eventsIngested)} / {fmtNum(eventsLimit)} {eventsOverage ? '(Overage!)' : ''}
                </span>
              </div>
              <div className="w-full h-3 bg-warm-cream rounded-full overflow-hidden">
                <div className={`h-full ${eventsOverage ? 'bg-coral-pink' : 'bg-electric-mint'}`} style={{ width: `${eventsPercent}%` }}></div>
              </div>
            </div>

          </div>

          {eventsOverage && (
            <div className="mt-8 bg-coral-pink/10 border border-coral-pink/20 rounded-2xl p-4 flex items-center justify-between">
              <p className="text-sm font-bold text-coral-pink">You have exceeded your Event Ingestion limit by {(eventsIngested - eventsLimit).toLocaleString()} events.</p>
              <p className="text-sm font-bold text-deep-black font-mono">+${(((eventsIngested - eventsLimit) / 100) * 0.05).toFixed(2)}</p>
            </div>
          )}
        </div>

      </div>

      {/* Modals */}
      {modalType && (
        <>
          <div className="fixed inset-0 bg-deep-black/20 backdrop-blur-sm z-[200]" onClick={() => setModalType(null)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl p-8 z-[210] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <h3 className="font-display text-2xl font-bold mb-4">
              {modalType === 'invoice' && 'Invoices'}
              {modalType === 'stripe' && 'Stripe Integration'}
              {modalType === 'enterprise' && 'Enterprise Upgrade'}
            </h3>
            <p className="text-text-secondary mb-8 leading-relaxed">
              {modalType === 'invoice' && 'Your past invoices will appear here in the real application.'}
              {modalType === 'stripe' && 'This action redirects to the Stripe Customer Portal for managing payment methods and subscriptions.'}
              {modalType === 'enterprise' && 'Our sales team has been notified of your interest. A representative will contact you at your registered email address shortly.'}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModalType(null)} className="px-6 py-2 bg-deep-black text-white rounded-full font-bold hover:bg-charcoal transition-colors">
                Understood
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
