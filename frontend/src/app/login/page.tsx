"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppStore } from '@/lib/store'
import { ArrowRight, Sparkles, ShieldCheck, Users, Eye, BarChart3, BrainCircuit, Zap, Activity, LineChart } from 'lucide-react'
import { signIn } from "next-auth/react"

const roles = [
  { id: 'Growth Marketer', icon: Zap, color: 'bg-butter-yellow', desc: 'Campaigns & Creative' },
  { id: 'Data Scientist', icon: BrainCircuit, color: 'bg-sky-cyan', desc: 'Model Ops & Experiments' },
  { id: 'Approver', icon: ShieldCheck, color: 'bg-coral-pink', desc: 'Approvals & Governance' },
  { id: 'Analyst', icon: BarChart3, color: 'bg-electric-mint', desc: 'Audiences & Analytics' },
  { id: 'Owner', icon: Sparkles, color: 'bg-electric-mint', desc: 'Full Access' },
]

const demoAccounts: Record<string, { email: string; name: string }> = {
  'Growth Marketer': { email: 'maya@nike.demo', name: 'Maya Sharma' },
  'Data Scientist': { email: 'arjun@nike.demo', name: 'Arjun Patel' },
  'Approver': { email: 'kavya@nike.demo', name: 'Kavya Singh' },
  'Analyst': { email: 'riya@nike.demo', name: 'Riya Gupta' },
  'Owner': { email: 'admin@demo.com', name: 'Admin User' },
}

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('Growth Marketer')

  const account = demoAccounts[role]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await signIn("credentials", {
        email: account.email,
        password: "password",
        redirect: false
      })
      if (res?.ok) {
        if (role === 'Data Scientist') {
          router.push('/app/model-ops')
        } else if (role === 'Approver') {
          router.push('/app/campaigns')
        } else {
          router.push('/app')
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const selected = roles.find(r => r.id === role)!

  return (
    <div className="min-h-screen bg-warm-cream flex font-body">
      
      {/* Left side: Login Form */}
      <div className="w-full lg:w-[540px] bg-white flex flex-col justify-center px-14 py-14 shadow-[20px_0_60px_rgba(0,0,0,0.03)] z-10 relative">
        <div className="mb-12">
          <Link href="/" className="font-display font-bold text-2xl tracking-tighter text-deep-black inline-block mb-12">PeopleCloud <span className="inline-block px-3 py-0.5 bg-electric-mint rounded-[40px] -rotate-1 transform shadow-soft">Spark</span></Link>
          <h1 className="font-display text-4xl font-bold text-deep-black mb-3">Welcome back</h1>
          <p className="text-text-secondary text-lg">Choose your demo persona to continue.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          
          <div className="grid grid-cols-2 gap-3">
            {roles.map(r => {
              const active = role === r.id
              const Icon = r.icon
              return (
                <button 
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`p-4 rounded-2xl font-bold text-left border transition-all ${
                    active 
                      ? 'bg-deep-black text-warm-cream border-deep-black shadow-soft ring-2 ring-electric-mint/40' 
                      : 'bg-warm-cream text-text-secondary border-border-subtle hover:border-deep-black hover:shadow-soft'
                  }`}
                >
                  <Icon size={20} className={active ? 'text-warm-cream mb-2' : 'text-text-secondary mb-2'} />
                  <div className="text-sm leading-tight">{r.id === 'Growth Marketer' ? 'Marketer' : r.id}</div>
                  <div className={`text-[10px] uppercase tracking-wider mt-0.5 ${active ? 'text-white/50' : 'text-text-secondary/60'}`}>{r.desc}</div>
                </button>
              )
            })}
          </div>

          <div className="pt-3 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Email</label>
              <input 
                readOnly
                type="email" 
                value={account.email}
                className="w-full px-5 py-4 bg-warm-cream border border-border-subtle rounded-2xl text-deep-black font-bold opacity-70 cursor-not-allowed text-base"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Password</label>
              <input 
                required
                type="password" 
                defaultValue="••••••••••••"
                className="w-full px-5 py-4 bg-white border border-border-subtle rounded-2xl focus:outline-none focus:border-deep-black transition-colors text-deep-black font-bold text-base"
              />
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-deep-black hover:bg-charcoal text-warm-cream font-bold rounded-full transition-all flex justify-center items-center gap-3 text-lg shadow-soft"
          >
            {loading ? <span className="w-6 h-6 border-2 border-warm-cream border-t-transparent rounded-full animate-spin"></span> : <>Enter Workspace <ArrowRight size={20} /></>}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-text-secondary">Not a demo user? <a href="mailto:sales@epsilon.com" className="text-deep-black font-bold hover:underline">Contact Sales</a></p>
        </div>
      </div>

      {/* Right side: Product Preview (consistent with landing page) */}
      <div className="hidden lg:flex flex-1 bg-charcoal relative overflow-hidden items-center justify-center p-16">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-electric-mint/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-sky-cyan/8 blur-[120px] rounded-full"></div>
        
        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-10">
          
          {/* Platform Mockup (like landing page hero) */}
          <div className="w-full aspect-[16/10] rounded-[32px] bg-charcoal shadow-2xl border border-white/10 overflow-hidden">
            <div className="h-12 border-b border-white/10 flex items-center px-5 justify-between bg-charcoal">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-coral-pink"></div>
                <div className="w-3 h-3 rounded-full bg-butter-yellow"></div>
                <div className="w-3 h-3 rounded-full bg-electric-mint"></div>
              </div>
              <div className="h-5 w-56 bg-white/5 rounded-full flex items-center justify-center px-3">
                <span className="text-[9px] font-mono text-white/30">spark.epsilon.com/app/command-center</span>
              </div>
              <div className="w-12"></div>
            </div>
            
            <div className="p-8 flex gap-6 h-[calc(100%-48px)] bg-gradient-to-br from-white/[0.03] to-transparent">
              <div className="w-16 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center py-5 gap-3 shrink-0">
                <div className="w-8 h-8 bg-electric-mint rounded-xl mb-2"></div>
                {[1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-xl bg-white/5"></div>)}
              </div>
              <div className="flex-1 flex flex-col gap-5">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="w-40 h-8 bg-white/10 rounded-xl mb-2"></div>
                    <div className="w-56 h-3 bg-white/5 rounded-full"></div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-20 h-8 bg-white/10 rounded-full"></div>
                    <div className="w-28 h-8 bg-electric-mint rounded-full"></div>
                  </div>
                </div>
                <div className="flex gap-6 flex-1">
                  <div className="flex-[2] bg-white/5 rounded-3xl p-6 relative overflow-hidden">
                    <div className="w-24 h-6 bg-white/10 rounded-full mb-8"></div>
                    <div className="text-7xl font-display font-bold leading-none text-white/80">+18.4%</div>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-electric-mint/20 rounded-full blur-[60px]"></div>
                  </div>
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-end">
                    <div className="w-full h-3 bg-white/10 rounded-full mb-3"></div>
                    <div className="w-2/3 h-3 bg-white/20 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Organization context bar at bottom */}
          <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-electric-mint to-sky-cyan flex items-center justify-center font-bold text-deep-black text-lg">N</div>
              <div>
                <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest">Organization</p>
                <p className="text-white font-display text-lg font-bold">Nike India</p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div>
                <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest">Workspace</p>
                <p className="text-electric-mint font-display text-lg font-bold">Running Shoes Q3</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <ShieldCheck size={14} /> <span>Encrypted</span>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center gap-8 text-white/25 text-xs">
            <span>Multi-tenant</span>
            <span>·</span>
            <span>RBAC</span>
            <span>·</span>
            <span>Audit Logs</span>
            <span>·</span>
            <span>GDPR Compliant</span>
          </div>
        </div>
      </div>
    </div>
  )
}
