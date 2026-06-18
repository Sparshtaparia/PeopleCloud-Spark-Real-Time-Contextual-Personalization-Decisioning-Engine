"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Play, CheckCircle2, ShieldCheck, Database, Target, BrainCircuit, Activity, LineChart, Key, Users, Settings, Zap } from 'lucide-react'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showDocsModal, setShowDocsModal] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-warm-cream selection:bg-electric-mint selection:text-deep-black overflow-hidden font-body">
      
      {/* Navbar */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-warm-cream/90 backdrop-blur-xl border-b border-border-subtle shadow-soft py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-[1440px] mx-auto px-6 flex justify-between items-center">
            <div className="flex items-center gap-10">
              <Link href="/" className="flex items-center gap-3">
                <span className="font-display font-bold text-2xl tracking-tighter text-deep-black hidden md:block">PeopleCloud <span className="inline-block px-3 py-0.5 bg-electric-mint rounded-[40px] -rotate-1 transform shadow-soft">Spark</span></span>
              </Link>
            
            <nav className="hidden lg:flex items-center gap-8">
              <a href="#platform" className="text-sm font-bold text-text-secondary hover:text-deep-black transition-colors uppercase tracking-widest">Platform</a>
              <a href="#solutions" className="text-sm font-bold text-text-secondary hover:text-deep-black transition-colors uppercase tracking-widest">Solutions</a>
              <a href="#customers" className="text-sm font-bold text-text-secondary hover:text-deep-black transition-colors uppercase tracking-widest">Customers</a>
              <a href="#pricing" className="text-sm font-bold text-text-secondary hover:text-deep-black transition-colors uppercase tracking-widest">Pricing</a>
              <button onClick={() => setShowDocsModal(true)} className="text-sm font-bold text-text-secondary hover:text-deep-black transition-colors uppercase tracking-widest">Docs</button>
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hidden md:block font-bold text-text-secondary hover:text-deep-black transition-colors text-sm uppercase tracking-widest">Log In</Link>
            <button onClick={() => setShowContactModal(true)} className="hidden md:block font-bold text-text-secondary hover:text-deep-black transition-colors text-sm uppercase tracking-widest">Contact Sales</button>
            <Link href="/login" className="bg-electric-mint text-deep-black px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-glow-mint uppercase tracking-widest">
              Enter Demo
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-40">
        
        {/* HERO SECTION */}
        <section className="px-6 max-w-[1440px] mx-auto relative z-10 text-center mb-32">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white border border-border-subtle shadow-soft mb-10 mx-auto">
              <span className="w-2.5 h-2.5 rounded-full bg-electric-mint animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-deep-black">Spark Engine 2.0 is Live</span>
            </div>

            <h1 className="font-display text-[64px] md:text-[96px] leading-[0.9] font-bold tracking-tighter text-deep-black mb-8">
              Personalization infrastructure for brands that <span className="inline-block px-6 py-2 bg-butter-yellow rounded-[40px] -rotate-2 transform shadow-soft mt-4">know every customer.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-text-secondary mb-12 max-w-4xl mx-auto leading-relaxed">
              Resolve identity, generate brand-safe AI creatives, activate 1:1 campaigns, and learn from every customer signal — all inside one enterprise AI marketing platform.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/login" className="w-full sm:w-auto px-10 py-5 bg-deep-black hover:bg-charcoal transition-colors text-warm-cream font-bold rounded-full text-lg flex items-center justify-center gap-3 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:-translate-y-1">
                Enter Demo Workspace
                <ArrowRight size={24} />
              </Link>
              <button onClick={() => setShowVideoModal(true)} className="w-full sm:w-auto px-10 py-5 bg-white hover:bg-warm-cream-dark transition-colors text-deep-black font-bold rounded-full text-lg flex items-center justify-center gap-3 shadow-soft border border-border-subtle hover:-translate-y-1">
                <Play size={24} />
                Watch Product Flow
              </button>
            </div>
          </div>

          {/* Floating Product Preview */}
          <div className="mt-24 relative mx-auto max-w-[1200px] aspect-[16/9] rounded-[40px] bg-charcoal shadow-2xl border-[8px] border-white overflow-hidden group">
            {/* Fake Topbar */}
            <div className="h-14 border-b border-white/10 flex items-center px-6 justify-between bg-charcoal relative z-20">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-coral-pink"></div>
                <div className="w-3 h-3 rounded-full bg-butter-yellow"></div>
                <div className="w-3 h-3 rounded-full bg-electric-mint"></div>
              </div>
              <div className="h-6 w-64 bg-white/5 rounded-full flex items-center justify-center px-4">
                <span className="text-[10px] font-mono text-white/40">spark.epsilon.com/app/command-center</span>
              </div>
              <div className="w-12"></div>
            </div>
            
            {/* Mock Content */}
            <div className="p-10 flex gap-8 h-full bg-charcoal relative z-10">
              {/* Left Nav */}
              <div className="w-20 rounded-[24px] bg-white/5 border border-white/10 flex flex-col items-center py-6 gap-4 shrink-0">
                <div className="w-10 h-10 bg-electric-mint rounded-xl mb-4"></div>
                {[1,2,3,4,5].map(i => <div key={i} className="w-10 h-10 rounded-xl bg-white/5"></div>)}
              </div>
              {/* Main Content */}
              <div className="flex-1 flex flex-col gap-8">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="w-48 h-10 bg-white/10 rounded-xl mb-2"></div>
                    <div className="w-64 h-4 bg-white/5 rounded-full"></div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-24 h-10 bg-white/10 rounded-full"></div>
                    <div className="w-32 h-10 bg-electric-mint rounded-full"></div>
                  </div>
                </div>
                <div className="flex gap-8 flex-1">
                  <div className="flex-[2] bg-white rounded-[32px] p-8 relative overflow-hidden">
                    <div className="w-32 h-8 bg-charcoal/10 rounded-full mb-12"></div>
                    <div className="text-[120px] font-display font-bold leading-none text-charcoal">+18.4%</div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-electric-mint/20 rounded-full blur-[60px]"></div>
                  </div>
                  <div className="flex-[1] bg-white/5 border border-white/10 rounded-[32px] p-8 flex flex-col justify-end">
                    <div className="w-full h-4 bg-white/10 rounded-full mb-4"></div>
                    <div className="w-2/3 h-4 bg-white/20 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW SPARK WORKS (Pipeline) */}
        <section id="architecture" className="py-32 bg-deep-black text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-electric-mint/5 rounded-full blur-[150px] pointer-events-none"></div>
          
          <div className="max-w-[1440px] mx-auto px-6">
            <div className="text-center mb-24 relative z-10">
              <h2 className="font-display text-[48px] md:text-[64px] font-bold tracking-tighter mb-6">How Spark Works</h2>
              <p className="text-xl text-white/60 max-w-2xl mx-auto">The complete end-to-end intelligence pipeline, operating in milliseconds.</p>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 relative z-10">
              {[
                { name: 'Ingest', desc: 'Connect CRM, website, app, POS', icon: Database, color: 'bg-white/10' },
                { name: 'Resolve', desc: 'Create 1:1 Customer 360 profiles', icon: Target, color: 'bg-sky-cyan text-deep-black' },
                { name: 'Predict', desc: 'Score intent, churn, and LTV', icon: BrainCircuit, color: 'bg-white/10' },
                { name: 'Generate', desc: 'Create personalized variants', icon: Zap, color: 'bg-butter-yellow text-deep-black' },
                { name: 'Activate', desc: 'Serve via Email, Web, SMS', icon: Activity, color: 'bg-white/10' },
                { name: 'Learn', desc: 'Optimize using bandits', icon: LineChart, color: 'bg-electric-mint text-deep-black' },
              ].map((step, i) => (
                <div key={i} className="flex-1 w-full relative">
                  {i !== 0 && (
                    <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 -left-4 w-8 border-t-2 border-dashed border-white/20"></div>
                  )}
                  <div className={`p-6 rounded-3xl border border-white/10 h-[200px] flex flex-col justify-between hover:-translate-y-2 transition-transform ${step.color.includes('bg-white/10') ? 'bg-white/5' : step.color}`}>
                    <step.icon size={32} className={step.color.includes('bg-white/10') ? 'text-white/50' : 'text-deep-black'} />
                    <div>
                      <h4 className="font-display text-xl font-bold mb-2">{step.name}</h4>
                      <p className={`text-sm ${step.color.includes('bg-white/10') ? 'text-white/50' : 'text-deep-black/70'} leading-snug`}>{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PLATFORM MODULES */}
        <section id="platform" className="py-32 bg-warm-cream">
          <div className="max-w-[1440px] mx-auto px-6">
            <h2 className="font-display text-[48px] md:text-[64px] font-bold tracking-tighter mb-20 text-center text-deep-black">Platform Modules</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: 'Customer 360', cat: 'Customer Intelligence', desc: 'Identity-resolved profiles and event timelines showing exactly who you are talking to.' },
                { title: 'AI Segments', cat: 'Audience Intelligence', desc: 'Auto-generated audience clusters grouped by predictive lifetime value and real-time intent.' },
                { title: 'Campaign Studio', cat: 'Activation Intelligence', desc: 'Create and launch personalized campaigns across email, push, and web instantly.' },
                { title: 'Creative Studio', cat: 'Creative Intelligence', desc: 'Generate brand-safe personalized variants constrained by strict enterprise tone guardrails.' },
                { title: 'Experiment Monitor', cat: 'Decision Intelligence', desc: 'Track contextual bandit optimization and traffic shifting as the AI learns what works.' },
                { title: 'Model Ops', cat: 'Model Intelligence', desc: 'Monitor drift, latency, and champion/challenger model versions in a serious engineering cockpit.' },
                { title: 'Audit & Governance', cat: 'Security Intelligence', desc: 'Track approvals, consent, and API usage across every workspace with deep RBAC.' },
              ].map((mod, i) => (
                <div key={i} className="bg-white rounded-[32px] p-10 border border-border-subtle hover:border-deep-black transition-colors shadow-soft">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-electric-mint mb-4">{mod.cat}</p>
                  <h3 className="font-display text-2xl font-bold mb-4 text-deep-black">{mod.title}</h3>
                  <p className="text-text-secondary leading-relaxed">{mod.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRODUCT PREVIEW STRIP */}
        <section className="py-32 bg-charcoal overflow-hidden relative">
          <div className="max-w-[1440px] mx-auto px-6 mb-16 relative z-10 text-center">
            <h2 className="font-display text-[48px] font-bold tracking-tighter text-white">This is not a dashboard.<br/>This is an AI operating system.</h2>
          </div>
          
          <div className="flex gap-8 overflow-x-auto pb-16 px-12 custom-scrollbar snap-x relative z-10">
            {/* Command Center */}
            <div className="w-[800px] shrink-0 snap-center group relative cursor-pointer">
              <div className="absolute top-4 left-4 bg-white text-deep-black px-4 py-2 rounded-full text-sm font-bold shadow-2xl z-20 transition-transform group-hover:-translate-y-2">Command Center</div>
              <div className="aspect-[16/10] bg-gradient-to-br from-white/5 to-white/[0.02] border-4 border-white/10 rounded-[40px] overflow-hidden relative transition-transform duration-500 group-hover:scale-[1.02] group-hover:border-white/30 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-coral-pink"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-butter-yellow"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-electric-mint"></div>
                  </div>
                  <div className="h-5 w-56 bg-white/10 rounded-full"></div>
                </div>
                <div className="flex gap-3 mb-4">
                  <div className="h-7 px-4 bg-white/15 rounded-full flex items-center"><span className="text-[10px] text-white/70 font-bold">All Channels</span></div>
                  <div className="h-7 px-4 bg-electric-mint/30 rounded-full flex items-center"><span className="text-[10px] text-white/90 font-bold">Email</span></div>
                  <div className="h-7 px-4 bg-white/15 rounded-full flex items-center"><span className="text-[10px] text-white/70 font-bold">Web</span></div>
                  <div className="h-7 px-4 bg-white/15 rounded-full flex items-center"><span className="text-[10px] text-white/70 font-bold">SMS</span></div>
                </div>
                <div className="flex gap-4 h-[calc(100%-100px)]">
                  <div className="flex-[3] bg-white/10 rounded-3xl p-5 flex flex-col justify-between">
                    <div className="text-[56px] font-display font-bold leading-none text-white/90">+18.4%</div>
                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Personalization Lift</div>
                    <div className="flex gap-3">
                      <div className="flex-1 h-16 bg-white/5 rounded-2xl p-3"><div className="text-xs text-white/70 font-bold">$2.4M</div><div className="text-[9px] text-white/40">Revenue</div></div>
                      <div className="flex-1 h-16 bg-white/5 rounded-2xl p-3"><div className="text-xs text-white/70 font-bold">892K</div><div className="text-[9px] text-white/40">Profiles</div></div>
                    </div>
                  </div>
                  <div className="flex-[2] flex flex-col gap-3">
                    <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/10"><div className="h-full flex flex-col justify-end"><div className="h-3/4 w-full bg-gradient-to-t from-electric-mint/40 to-transparent rounded-lg"></div></div></div>
                    <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/10"><div className="h-full flex flex-col justify-end"><div className="h-1/2 w-full bg-gradient-to-t from-sky-cyan/40 to-transparent rounded-lg"></div></div></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer 360 */}
            <div className="w-[800px] shrink-0 snap-center group relative cursor-pointer">
              <div className="absolute top-4 left-4 bg-white text-deep-black px-4 py-2 rounded-full text-sm font-bold shadow-2xl z-20 transition-transform group-hover:-translate-y-2">Customer 360</div>
              <div className="aspect-[16/10] bg-gradient-to-br from-white/5 to-white/[0.02] border-4 border-white/10 rounded-[40px] overflow-hidden relative transition-transform duration-500 group-hover:scale-[1.02] group-hover:border-white/30 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-coral-pink"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-butter-yellow"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-electric-mint"></div>
                  </div>
                  <div className="h-5 w-48 bg-white/10 rounded-full"></div>
                </div>
                <div className="flex gap-4 h-[calc(100%-50px)]">
                  <div className="flex-[2] bg-white/10 rounded-3xl p-5 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-electric-mint to-sky-cyan flex items-center justify-center text-2xl font-bold text-deep-black">JD</div>
                    <div className="w-24 h-3 bg-white/20 rounded-full"></div>
                    <div className="w-32 h-2 bg-white/10 rounded-full"></div>
                    <div className="w-28 h-2 bg-white/10 rounded-full"></div>
                    <div className="mt-3 w-full border-t border-white/10 pt-3 space-y-2">
                      <div className="flex justify-between"><span className="text-[9px] text-white/40 uppercase">LTV</span><span className="text-[10px] text-white/80 font-bold">$1,240</span></div>
                      <div className="flex justify-between"><span className="text-[9px] text-white/40 uppercase">Risk</span><span className="text-[10px] text-coral-pink font-bold">At Risk</span></div>
                      <div className="flex justify-between"><span className="text-[9px] text-white/40 uppercase">Sessions</span><span className="text-[10px] text-white/80 font-bold">42</span></div>
                    </div>
                  </div>
                  <div className="flex-[3] flex flex-col gap-3">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-electric-mint"></div><div className="w-40 h-3 bg-white/10 rounded-full"></div><span className="text-[8px] text-white/30">2h ago</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-sky-cyan"></div><div className="w-52 h-3 bg-white/10 rounded-full"></div><span className="text-[8px] text-white/30">1d ago</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-butter-yellow"></div><div className="w-36 h-3 bg-white/10 rounded-full"></div><span className="text-[8px] text-white/30">3d ago</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-coral-pink"></div><div className="w-44 h-3 bg-white/10 rounded-full"></div><span className="text-[8px] text-white/30">5d ago</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-electric-mint"></div><div className="w-28 h-3 bg-white/10 rounded-full"></div><span className="text-[8px] text-white/30">1w ago</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Creative Studio */}
            <div className="w-[800px] shrink-0 snap-center group relative cursor-pointer">
              <div className="absolute top-4 left-4 bg-white text-deep-black px-4 py-2 rounded-full text-sm font-bold shadow-2xl z-20 transition-transform group-hover:-translate-y-2">Creative Studio</div>
              <div className="aspect-[16/10] bg-gradient-to-br from-white/5 to-white/[0.02] border-4 border-white/10 rounded-[40px] overflow-hidden relative transition-transform duration-500 group-hover:scale-[1.02] group-hover:border-white/30 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-coral-pink"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-butter-yellow"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-electric-mint"></div>
                  </div>
                  <div className="h-5 w-44 bg-white/10 rounded-full"></div>
                  <div className="ml-auto h-6 px-3 bg-butter-yellow/30 rounded-full flex items-center"><span className="text-[9px] text-white/90 font-bold uppercase">Guardrails Active</span></div>
                </div>
                <div className="flex gap-4 h-[calc(100%-50px)]">
                  <div className="flex-[2] bg-white/10 rounded-3xl p-5 border border-white/10">
                    <div className="w-20 h-3 bg-white/20 rounded-full mb-4"></div>
                    <div className="space-y-3">
                      <div className="w-full h-10 bg-white/10 rounded-xl"></div>
                      <div className="w-full h-10 bg-electric-mint/20 rounded-xl border border-electric-mint/30"></div>
                      <div className="w-full h-10 bg-white/10 rounded-xl"></div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="w-full h-2 bg-white/10 rounded-full mb-2"></div>
                      <div className="w-3/4 h-2 bg-white/10 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex-[3] flex flex-col gap-3">
                    <div className="flex-1 bg-white/10 rounded-2xl p-4 border border-white/10">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral-pink/30 to-transparent"></div>
                        <div><div className="w-28 h-3 bg-white/20 rounded-full mb-2"></div><div className="w-20 h-2 bg-white/10 rounded-full"></div></div>
                      </div>
                    </div>
                    <div className="flex-1 bg-white/10 rounded-2xl p-4 border border-white/10">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-butter-yellow/30 to-transparent"></div>
                        <div><div className="w-28 h-3 bg-white/20 rounded-full mb-2"></div><div className="w-20 h-2 bg-white/10 rounded-full"></div></div>
                      </div>
                    </div>
                    <div className="flex-1 bg-white/10 rounded-2xl p-4 border border-white/10">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-cyan/30 to-transparent"></div>
                        <div><div className="w-28 h-3 bg-white/20 rounded-full mb-2"></div><div className="w-20 h-2 bg-white/10 rounded-full"></div></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Experiments */}
            <div className="w-[800px] shrink-0 snap-center group relative cursor-pointer">
              <div className="absolute top-4 left-4 bg-white text-deep-black px-4 py-2 rounded-full text-sm font-bold shadow-2xl z-20 transition-transform group-hover:-translate-y-2">Experiments</div>
              <div className="aspect-[16/10] bg-gradient-to-br from-white/5 to-white/[0.02] border-4 border-white/10 rounded-[40px] overflow-hidden relative transition-transform duration-500 group-hover:scale-[1.02] group-hover:border-white/30 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-coral-pink"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-butter-yellow"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-electric-mint"></div>
                  </div>
                  <div className="h-5 w-40 bg-white/10 rounded-full"></div>
                  <div className="ml-auto h-6 px-3 bg-electric-mint/30 rounded-full flex items-center"><span className="text-[9px] text-white/90 font-bold uppercase">Learning Active</span></div>
                </div>
                <div className="flex gap-4 h-[calc(100%-50px)]">
                  <div className="flex-[2] bg-white/10 rounded-3xl p-5 flex flex-col justify-center gap-6">
                    <div>
                      <div className="flex justify-between mb-1"><span className="text-[9px] text-white/50 uppercase">Control</span><span className="text-[10px] text-white/80 font-bold">42.3%</span></div>
                      <div className="h-3 bg-white/10 rounded-full overflow-hidden"><div className="h-full w-[42%] bg-white/30 rounded-full"></div></div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1"><span className="text-[9px] text-white/50 uppercase">Variant A</span><span className="text-[10px] text-electric-mint font-bold">58.7%</span></div>
                      <div className="h-3 bg-white/10 rounded-full overflow-hidden"><div className="h-full w-[59%] bg-electric-mint/60 rounded-full"></div></div>
                    </div>
                    <div className="pt-4 border-t border-white/10 flex justify-between">
                      <div><div className="text-[9px] text-white/40 uppercase">Lift</div><div className="text-lg font-bold text-electric-mint">+16.4%</div></div>
                      <div><div className="text-[9px] text-white/40 uppercase">Confidence</div><div className="text-lg font-bold text-white/90">99.2%</div></div>
                    </div>
                  </div>
                  <div className="flex-[1] bg-white/5 rounded-3xl p-4 border border-white/10 flex flex-col gap-3">
                    <div className="text-[9px] text-white/40 uppercase font-bold">Steps</div>
                    {[7, 15, 22, 28, 35, 42, 48].map((v, j) => (
                      <div key={j} className={`w-full h-1.5 rounded-full ${j < 5 ? 'bg-electric-mint/40' : 'bg-white/10'}`}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Model Ops */}
            <div className="w-[800px] shrink-0 snap-center group relative cursor-pointer">
              <div className="absolute top-4 left-4 bg-white text-deep-black px-4 py-2 rounded-full text-sm font-bold shadow-2xl z-20 transition-transform group-hover:-translate-y-2">Model Ops</div>
              <div className="aspect-[16/10] bg-gradient-to-br from-white/5 to-white/[0.02] border-4 border-white/10 rounded-[40px] overflow-hidden relative transition-transform duration-500 group-hover:scale-[1.02] group-hover:border-white/30 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-coral-pink"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-butter-yellow"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-electric-mint"></div>
                  </div>
                  <div className="h-5 w-36 bg-white/10 rounded-full"></div>
                  <div className="ml-auto h-6 px-3 bg-electric-mint/30 rounded-full flex items-center"><span className="text-[9px] text-white/90 font-bold uppercase">Champion: v2.4</span></div>
                </div>
                <div className="flex gap-4 h-[calc(100%-50px)]">
                  <div className="flex-[2] grid grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/10"><div className="text-[9px] text-white/40 uppercase">Latency</div><div className="text-xl font-bold text-white/90">142ms</div><div className="text-[9px] text-electric-mint">-12% vs last week</div></div>
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/10"><div className="text-[9px] text-white/40 uppercase">Throughput</div><div className="text-xl font-bold text-white/90">2.4K/s</div><div className="text-[9px] text-sky-cyan">Stable</div></div>
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/10"><div className="text-[9px] text-white/40 uppercase">Drift Score</div><div className="text-xl font-bold text-coral-pink">0.08</div><div className="text-[9px] text-coral-pink">Monitoring</div></div>
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/10"><div className="text-[9px] text-white/40 uppercase">Retraining</div><div className="text-xl font-bold text-white/90">Auto</div><div className="text-[9px] text-white/50">Last: 2h ago</div></div>
                  </div>
                  <div className="flex-[1] bg-white/5 rounded-3xl p-4 border border-white/10 flex flex-col justify-center gap-2">
                    <div className="text-[9px] text-white/40 uppercase mb-2">Versions</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-electric-mint"></div><span className="text-[10px] text-white/80">v2.4 (live)</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-white/30"></div><span className="text-[10px] text-white/50">v2.3</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-white/30"></div><span className="text-[10px] text-white/50">v2.2</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* USE CASES */}
        <section id="solutions" className="py-32 bg-warm-cream">
          <div className="max-w-[1440px] mx-auto px-6">
            <h2 className="font-display text-[48px] md:text-[64px] font-bold tracking-tighter mb-20 text-center text-deep-black">Enterprise Use Cases</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {[
                { title: 'Cart Abandonment', pre: 'Viewed Shoes → Added Protein Bars → Left Cart', post: '“Complete your fitness kit and save 10%.”', color: 'bg-electric-mint' },
                { title: 'Loyalty Upsell', pre: 'High LTV → Frequent Buyer → Basic Tier', post: '“Upgrade to Platinum today with zero fees.”', color: 'bg-butter-yellow' },
                { title: 'Churn Prevention', pre: 'Low Engagement → High Value → Support Ticket', post: '[Suppressed marketing] → Sent retention gift.', color: 'bg-coral-pink' },
                { title: 'Creative Fatigue', pre: 'Ignored 5 Emails → Active on App', post: '[Shifted budget to Push] → “We miss you!”', color: 'bg-sky-cyan' },
              ].map((uc, i) => (
                <div key={i} className="bg-white rounded-[40px] p-10 border border-border-subtle shadow-soft hover:-translate-y-2 transition-transform">
                  <div className="flex items-center gap-4 mb-8">
                    <div className={`w-4 h-8 rounded-full ${uc.color}`}></div>
                    <h3 className="font-display text-3xl font-bold text-deep-black">{uc.title}</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-charcoal/5 rounded-2xl p-6 border border-border-subtle">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Customer Signal</p>
                      <p className="font-medium text-deep-black font-mono text-sm">{uc.pre}</p>
                    </div>
                    <div className="flex justify-center text-text-secondary"><ArrowRight /></div>
                    <div className="bg-charcoal text-white rounded-2xl p-6 shadow-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-electric-mint mb-2">Spark Decision</p>
                      <p className="font-display text-xl font-bold">{uc.post}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CUSTOMERS */}
        <section id="customers" className="py-32 bg-warm-cream">
          <div className="max-w-[1440px] mx-auto px-6">
            <h2 className="font-display text-[48px] md:text-[64px] font-bold tracking-tighter mb-6 text-center text-deep-black">Trusted by leading brands.</h2>
            <p className="text-xl text-text-secondary mb-16 text-center max-w-2xl mx-auto">Revenue operations, CRM, and marketing teams at forward-looking brands power personalization with PeopleCloud Spark.</p>

            {/* Logo Strip */}
            <div className="flex flex-wrap justify-center gap-8 mb-24">
              {['Vitality', 'Northwell', 'Ally', 'USAA', 'Chili\'s', 'Enterprise', 'Marriott', 'Delta'].map((brand, i) => (
                <div key={i} className="px-8 py-4 bg-white rounded-2xl border border-border-subtle shadow-soft hover:-translate-y-1 transition-transform">
                  <span className="font-display font-bold text-xl text-deep-black/70 tracking-tight">{brand}</span>
                </div>
              ))}
            </div>

            {/* Testimonial Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-deep-black text-white rounded-[40px] p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-electric-mint/10 rounded-full blur-[80px]"></div>
                <div className="relative z-10">
                  <div className="flex gap-1 mb-8">
                    {[1,2,3,4,5].map(i => <div key={i} className="w-5 h-5 rounded-full bg-butter-yellow"></div>)}
                  </div>
                  <p className="font-display text-2xl font-bold leading-snug mb-8">&ldquo;Spark&rsquo;s identity resolution is the only thing that made sense of our fragmented customer data. Our campaign ROI went up 34% in the first quarter.&rdquo;</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-cyan to-electric-mint flex items-center justify-center font-bold text-deep-black text-sm">SK</div>
                    <div>
                      <p className="font-bold">Sarah Kim</p>
                      <p className="text-sm text-white/50">VP of Marketing, Vitality</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-[40px] p-12 border border-border-subtle shadow-soft">
                <div className="flex gap-1 mb-8">
                  {[1,2,3,4,5].map(i => <div key={i} className="w-5 h-5 rounded-full bg-butter-yellow"></div>)}
                </div>
                <p className="font-display text-2xl font-bold leading-snug mb-8 text-deep-black">&ldquo;We generate 200+ personalized creative variants per campaign and Spark&rsquo;s guardrails catch every brand violation before it goes live. Game changer for compliance.&rdquo;</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-coral-pink to-butter-yellow flex items-center justify-center font-bold text-deep-black text-sm">MC</div>
                  <div>
                    <p className="font-bold text-deep-black">Marcus Chen</p>
                    <p className="text-sm text-text-secondary">Director of Growth, Northwell</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-20">
              {[
                { stat: '250M+', label: 'Profiles Resolved' },
                { stat: '4.2B', label: 'Real-time Decisions' },
                { stat: '99.97%', label: 'Platform Uptime' },
                { stat: '18.4%', label: 'Avg. Lift' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="font-display text-5xl font-bold text-deep-black tracking-tighter">{s.stat}</div>
                  <div className="text-sm text-text-secondary font-medium mt-2">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ENTERPRISE TRUST */}
        <section className="py-32 bg-deep-black text-white relative overflow-hidden">
          <div className="max-w-[1440px] mx-auto px-6 text-center relative z-10">
            <h2 className="font-display text-[48px] md:text-[64px] font-bold tracking-tighter mb-6">Built for Enterprise Marketing.</h2>
            <p className="text-xl text-white/60 mb-20 max-w-2xl mx-auto">Secure by design. Explainable by default.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
              {[
                { name: 'Multi-tenant Isolation', desc: 'Each brand and workspace has separate data boundaries.', icon: Database },
                { name: 'Strict RBAC', desc: 'Marketers, Analysts, Admins, and Approvers with granular access.', icon: Users },
                { name: 'Audit Logs', desc: 'Every AI decision and human action is recorded immutably.', icon: ShieldCheck },
                { name: 'Brand Safety Guardrails', desc: 'Strict negative-prompting prevents risky AI copy generation.', icon: Key },
                { name: 'Model Monitoring', desc: 'Real-time drift tracking and automated retraining triggers.', icon: Activity },
                { name: 'Consent-Aware', desc: 'Respects opt-outs before ever scoring a profile for personalization.', icon: Settings },
              ].map((trust, i) => (
                <div key={i} className="p-8 border border-white/10 rounded-[32px] bg-white/5 hover:bg-white/10 transition-colors">
                  <trust.icon size={24} className="text-electric-mint mb-6" />
                  <h4 className="font-display text-xl font-bold mb-3">{trust.name}</h4>
                  <p className="text-white/60 text-sm leading-relaxed">{trust.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING PREVIEW */}
        <section id="pricing" className="py-32 bg-warm-cream">
          <div className="max-w-[1440px] mx-auto px-6">
            <h2 className="font-display text-[48px] md:text-[64px] font-bold tracking-tighter mb-20 text-center text-deep-black">SaaS Pricing Plans</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: 'Starter', target: 'Small D2C Brand', price: '$999', profiles: '100K', decisions: '1M' },
                { name: 'Growth', target: 'Scaling E-commerce', price: '$2,400', profiles: '5M', decisions: '100M', pop: true },
                { name: 'Enterprise', target: 'Banks, Airlines, Retail', price: 'Custom', profiles: 'Unlimited', decisions: 'Unlimited' },
              ].map((plan, i) => (
                <div key={i} className={`rounded-[40px] p-10 relative ${plan.pop ? 'bg-charcoal text-white shadow-2xl scale-105 z-10' : 'bg-white text-deep-black border border-border-subtle'}`}>
                  {plan.pop && <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-butter-yellow text-deep-black px-4 py-1 rounded-b-xl text-[10px] font-bold uppercase tracking-widest">Most Popular</div>}
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${plan.pop ? 'text-electric-mint' : 'text-text-secondary'}`}>{plan.target}</p>
                  <h3 className="font-display text-4xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-2 mb-8 border-b border-border-subtle/20 pb-8">
                    <span className="font-display text-5xl font-bold tracking-tighter">{plan.price}</span>
                    <span className={plan.pop ? 'text-white/50' : 'text-text-secondary'}>/mo</span>
                  </div>
                  <ul className="space-y-4 mb-10">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 size={18} className={plan.pop ? 'text-electric-mint' : 'text-deep-black'} /> 
                      <span className="font-bold">{plan.profiles}</span> <span className="opacity-70">Profiles Resolved</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 size={18} className={plan.pop ? 'text-electric-mint' : 'text-deep-black'} /> 
                      <span className="font-bold">{plan.decisions}</span> <span className="opacity-70">Bandit Decisions</span>
                    </li>
                  </ul>
                  <button onClick={() => setShowContactModal(true)} className={`w-full py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 ${plan.pop ? 'bg-electric-mint text-deep-black shadow-glow-mint' : 'bg-warm-cream hover:bg-border-subtle'}`}>
                    Choose Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-40 bg-electric-mint text-deep-black text-center px-6 relative overflow-hidden">
          <div className="max-w-4xl mx-auto relative z-10">
            <h2 className="font-display text-[64px] md:text-[96px] leading-[0.9] font-bold tracking-tighter mb-12">
              Turn every signal into a personalized experience.
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/login" className="w-full sm:w-auto px-12 py-6 bg-deep-black hover:bg-charcoal transition-transform hover:scale-105 text-warm-cream font-bold rounded-full text-xl shadow-2xl">
                Enter Demo Workspace
              </Link>
              <button onClick={() => setShowContactModal(true)} className="w-full sm:w-auto px-12 py-6 bg-white hover:bg-warm-cream transition-colors text-deep-black font-bold rounded-full text-xl shadow-soft">
                Contact Sales
              </button>
            </div>
          </div>
        </section>
        
      </main>

      <footer className="bg-charcoal text-white/50 py-12 text-center text-sm font-medium">
        <p>© 2026 PeopleCloud Spark by Epsilon. All rights reserved.</p>
      </footer>

      {/* Modals */}
      {showContactModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-deep-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <h3 className="font-display text-2xl font-bold mb-2">Contact Enterprise Sales</h3>
            <p className="text-text-secondary mb-6">Enter your email and an account executive will be in touch shortly.</p>
            <input type="email" placeholder="work@company.com" className="w-full p-4 border border-border-subtle rounded-xl mb-4 font-medium outline-none focus:border-deep-black" />
            <div className="flex gap-4">
              <button onClick={() => setShowContactModal(false)} className="flex-1 py-4 font-bold text-text-secondary hover:text-deep-black">Cancel</button>
              <button onClick={() => {
                alert("Sales request received!")
                setShowContactModal(false)
              }} className="flex-1 py-4 bg-deep-black text-warm-cream rounded-xl font-bold">Submit</button>
            </div>
          </div>
        </div>
      )}

      {showDocsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-deep-black/60 backdrop-blur-sm">
          <div className="bg-charcoal text-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <Database className="text-electric-mint" />
              <h3 className="font-display text-2xl font-bold">API Documentation</h3>
            </div>
            <p className="text-white/70 mb-6">The PeopleCloud Spark API documentation is restricted to active tenants. Please login to your workspace to view developer keys and endpoints.</p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowDocsModal(false)} className="px-6 py-3 font-bold text-white/50 hover:text-white">Close</button>
              <Link href="/login" className="px-6 py-3 bg-electric-mint text-deep-black rounded-xl font-bold">Login to Workspace</Link>
            </div>
          </div>
        </div>
      )}

      {/* Product Flow Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-deep-black/80 backdrop-blur-sm" onClick={() => setShowVideoModal(false)}>
          <div className="relative animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute -top-14 right-0 text-white/60 hover:text-white font-bold text-sm flex items-center gap-2 z-10"
            >
              Close <span className="text-lg">✕</span>
            </button>
            <div className="relative overflow-hidden bg-black rounded-[24px] shadow-2xl border border-white/10 aspect-[9/16]"
              style={{ width: 'min(65vw, 380px)' }}
            >
              <iframe
                className="absolute pointer-events-auto"
                src="https://www.youtube-nocookie.com/embed/unaCc579IBo?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3"
                title="PeopleCloud Spark - Product Flow"
                allow="autoplay; encrypted-media"
                allowFullScreen
                style={{
                  top: '50%',
                  left: '50%',
                  width: 'calc(100% * 16/9)',
                  height: 'calc(100% * 9/16)',
                  transform: 'translate(-50%, -50%) rotate(-90deg)',
                }}
              />
            </div>
            <p className="text-white/50 text-xs text-center mt-4">PeopleCloud Spark — AI Decisioning Engine</p>
          </div>
        </div>
      )}
    </div>
  )
}
