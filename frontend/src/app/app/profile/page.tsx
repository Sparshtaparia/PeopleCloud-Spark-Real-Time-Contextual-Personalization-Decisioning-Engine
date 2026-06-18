"use client"
import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { UserCircle2, Mail, ShieldCheck, Laptop, MapPin, Activity } from 'lucide-react'
import { getProfile } from '@/lib/actions/profile'
import { formatDistanceToNow } from 'date-fns'

export default function Profile() {
  const { user, currentOrg, currentWorkspace } = useAppStore()
  const [activity, setActivity] = useState<any[]>([])

  useEffect(() => {
    getProfile()
      .then(res => setActivity(res.recentActivity))
      .catch(console.error)
  }, [])

  if (!user || !currentOrg) return null

  return (
    <div className="px-4 lg:px-12 py-4 lg:py-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      
      <div className="mb-12">
        <h1 className="font-display text-title-xl font-bold tracking-tight mb-2 text-text-primary">Personal Profile</h1>
        <p className="text-text-secondary font-medium">Manage your identity and session security.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Identity Card */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-charcoal rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden text-center flex flex-col items-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-cyan/10 rounded-full blur-[60px] pointer-events-none"></div>
            
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 mb-6 relative z-10 bg-white">
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            </div>
            
            <h2 className="font-display text-3xl font-bold mb-2 relative z-10">{user.name}</h2>
            <p className="text-sky-cyan text-sm font-bold mb-6 relative z-10">{user.email}</p>
            
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 w-full text-left relative z-10">
              <p className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1">Current Role</p>
              <p className="font-bold text-lg mb-4">{user.role}</p>
              <div className="flex gap-2">
                <span className="bg-electric-mint text-deep-black text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest">{currentOrg.name}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-8 border border-border-subtle shadow-soft">
            <h3 className="font-bold text-lg mb-6 text-deep-black">Session Security</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-warm-cream rounded-2xl border border-border-subtle">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={20} className="text-electric-mint" />
                  <div>
                    <p className="font-bold text-sm">2-Factor Auth</p>
                    <p className="text-xs text-text-secondary">Enabled (Authenticator App)</p>
                  </div>
                </div>
                <button className="text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-deep-black">Manage</button>
              </div>
              <div className="flex items-center justify-between p-4 bg-warm-cream rounded-2xl border border-border-subtle">
                <div className="flex items-center gap-3">
                  <KeyIcon />
                  <div>
                    <p className="font-bold text-sm">Password</p>
                    <p className="text-xs text-text-secondary">Last changed 4 months ago</p>
                  </div>
                </div>
                <button className="text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-deep-black">Update</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Activity & Access */}
        <div className="lg:col-span-8 space-y-8">
          
          <div className="bg-white rounded-[40px] p-10 border border-border-subtle shadow-soft">
            <h3 className="font-display text-2xl font-bold mb-8 text-deep-black">Recent Activity</h3>
            <div className="space-y-6 relative">
              <div className="absolute left-6 top-2 bottom-2 w-px bg-border-subtle hidden sm:block"></div>
              
              {activity.length === 0 ? (
                <div className="text-text-secondary text-sm">No recent activity.</div>
              ) : activity.map((act, i) => (
                <div key={i} className="flex gap-6 items-start relative z-10">
                  <div className={`w-12 h-12 rounded-2xl bg-warm-cream border border-border-subtle flex items-center justify-center shrink-0`}>
                    <Activity size={20} className="text-text-secondary" />
                  </div>
                  <div className="pt-2">
                    <p className="font-bold text-deep-black text-sm">{act.action}</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[40px] p-10 border border-border-subtle shadow-soft">
            <h3 className="font-display text-2xl font-bold mb-8 text-deep-black">Active Sessions</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-6 border-2 border-deep-black rounded-3xl bg-warm-cream">
                <div className="flex items-center gap-4">
                  <Laptop size={24} className="text-deep-black" />
                  <div>
                    <p className="font-bold text-deep-black flex items-center gap-2">MacBook Pro 16" <span className="text-[10px] bg-electric-mint px-2 py-0.5 rounded uppercase tracking-widest text-deep-black">Current</span></p>
                    <p className="text-xs text-text-secondary flex items-center gap-2 mt-1"><MapPin size={12} /> Portland, Oregon (192.168.1.42)</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center p-6 border border-border-subtle rounded-3xl hover:border-deep-black transition-colors">
                <div className="flex items-center gap-4">
                  <Laptop size={24} className="text-text-secondary" />
                  <div>
                    <p className="font-bold text-deep-black">Windows 11 PC</p>
                    <p className="text-xs text-text-secondary flex items-center gap-2 mt-1"><MapPin size={12} /> Seattle, WA (10.0.0.8)</p>
                  </div>
                </div>
                <button className="text-xs font-bold text-coral-pink uppercase tracking-widest hover:underline">Revoke</button>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}

function KeyIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg> }
