"use client"
import { usePermissions } from '@/hooks/use-permissions'
import { AccessDenied } from '@/components/rbac/AccessDenied'

import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { UserPlus, ShieldCheck, Mail, Building, MoreVertical } from 'lucide-react'
import { getTeam, inviteMember } from '@/lib/actions/team'

export default function Team() {
  const { can } = usePermissions()
  if (!can('manage_team')) return <AccessDenied />

  const { currentOrg } = useAppStore()
  const [showInvite, setShowInvite] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Form State
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [workspaceAccess, setWorkspaceAccess] = useState('all')
  const [inviting, setInviting] = useState(false)

  const fetchTeam = async () => {
    if (!currentOrg) return
    try {
      const data = await getTeam(currentOrg.id)
      setMembers(data)
    } catch(e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTeam()
  }, [currentOrg?.id])

  const handleInvite = async () => {
    if (!currentOrg || !email) return
    setInviting(true)
    try {
      await inviteMember(currentOrg.id, email, role, workspaceAccess)
      setEmail('')
      setShowInvite(false)
      await fetchTeam()
    } catch (err) {
      console.error(err)
    }
    setInviting(false)
  }

  return (
    <div className="px-12 py-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 h-[calc(100vh-80px)] flex flex-col">
      
      <div className="flex justify-between items-end mb-12 shrink-0">
        <div>
          <h1 className="font-display text-title-xl font-bold tracking-tight mb-2 text-text-primary">Team Management</h1>
          <p className="text-text-secondary font-medium">Manage access, roles, and workspace permissions for {currentOrg?.name}.</p>
        </div>
        <button 
          onClick={() => setShowInvite(!showInvite)}
          className="px-6 py-3 bg-electric-mint text-deep-black rounded-full font-bold shadow-glow-mint hover:scale-105 transition-transform flex items-center gap-2"
        >
          {showInvite ? 'Close Form' : <><UserPlus size={18} /> Invite Member</>}
        </button>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden pb-4">
        
        {/* Members List */}
        <div className="flex-1 bg-white rounded-[40px] border border-border-subtle shadow-soft p-12 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-12 gap-4 mb-6 pb-4 border-b border-border-subtle">
            <div className="col-span-4 text-[10px] uppercase font-bold tracking-widest text-text-secondary">Member</div>
            <div className="col-span-3 text-[10px] uppercase font-bold tracking-widest text-text-secondary">Role</div>
            <div className="col-span-3 text-[10px] uppercase font-bold tracking-widest text-text-secondary">Workspace Access</div>
            <div className="col-span-2 text-[10px] uppercase font-bold tracking-widest text-text-secondary text-right">Status</div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-warm-cream rounded-2xl"></div>)}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">No members found.</div>
            ) : members.map((m, i) => {
              const u = m.user || {}
              return (
              <div key={m.id || i} className="grid grid-cols-12 gap-4 items-center p-4 hover:bg-warm-cream rounded-2xl transition-colors group">
                <div className="col-span-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-charcoal text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-soft">
                    {u.name?.charAt(0) || u.email?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-deep-black">{u.name}</p>
                    <p className="text-xs font-medium text-text-secondary">{u.email}</p>
                  </div>
                </div>
                
                <div className="col-span-3">
                  <span className="px-3 py-1 bg-white border border-border-subtle rounded-lg text-xs font-bold text-deep-black inline-flex items-center gap-1 shadow-soft uppercase">
                    {m.role === 'owner' && <ShieldCheck size={12} className="text-electric-mint"/>}
                    {m.role}
                  </span>
                </div>
                
                <div className="col-span-3">
                  <span className="text-xs font-medium text-text-secondary bg-warm-cream px-2 py-1 rounded">{m.workspaceAccess}</span>
                </div>
                
                <div className="col-span-2 flex items-center justify-end gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                    Active
                  </span>
                  <button className="text-text-secondary hover:text-deep-black opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* Invite Form Slider */}
        {showInvite && (
          <div className="w-[480px] bg-white rounded-[40px] border border-border-subtle shadow-2xl p-10 flex flex-col animate-in slide-in-from-right-16 duration-500 overflow-y-auto custom-scrollbar relative shrink-0">
            <h2 className="font-display text-3xl font-bold mb-8">Invite to Organization</h2>
            
            <div className="space-y-6 flex-1">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Email Addresses</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-4 text-text-secondary" size={18} />
                  <textarea 
                    rows={3} 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@company.com" 
                    className="w-full pl-12 pr-5 py-4 bg-warm-cream border border-border-subtle rounded-2xl focus:border-deep-black outline-none transition-colors font-medium text-deep-black text-sm" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Role Assignment</label>
                <div className="space-y-3">
                  {[
                    { r: 'admin', desc: 'Full access to all workspaces and billing.' },
                    { r: 'marketer', desc: 'Can create and launch campaigns.' },
                    { r: 'data_scientist', desc: 'Can manage models and data sources.' },
                    { r: 'approver', desc: 'Can approve or reject AI generated variants.' },
                  ].map((ro, i) => (
                    <label key={i} className="flex items-start gap-4 p-4 border border-border-subtle rounded-2xl cursor-pointer hover:border-deep-black transition-colors has-[:checked]:border-deep-black has-[:checked]:bg-warm-cream">
                      <input 
                        type="radio" 
                        name="role" 
                        value={ro.r}
                        checked={role === ro.r}
                        onChange={(e) => setRole(e.target.value)}
                        className="mt-1 w-4 h-4 accent-deep-black" 
                      />
                      <div>
                        <p className="font-bold text-sm text-deep-black capitalize">{ro.r.replace('_', ' ')}</p>
                        <p className="text-xs text-text-secondary">{ro.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Workspace Access</label>
                <select 
                  value={workspaceAccess}
                  onChange={e => setWorkspaceAccess(e.target.value)}
                  className="w-full px-5 py-4 bg-warm-cream border border-border-subtle rounded-2xl focus:border-deep-black outline-none transition-colors font-bold text-deep-black appearance-none cursor-pointer"
                >
                  <option value="all">All Workspaces</option>
                  <option value="running_shoes_q3">Running Shoes Q3</option>
                  <option value="apparel_q4">Apparel Q4 (Sandbox)</option>
                </select>
              </div>

            </div>

            <div className="mt-8 flex gap-4 pt-6 border-t border-border-subtle">
              <button onClick={() => setShowInvite(false)} className="px-6 py-4 text-text-secondary font-bold hover:text-deep-black transition-colors">Cancel</button>
              <button disabled={inviting || !email} onClick={handleInvite} className="flex-1 py-4 bg-deep-black hover:bg-charcoal text-white font-bold rounded-full shadow-2xl transition-transform hover:-translate-y-1 disabled:opacity-50">
                {inviting ? 'Sending...' : 'Send Invites'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
