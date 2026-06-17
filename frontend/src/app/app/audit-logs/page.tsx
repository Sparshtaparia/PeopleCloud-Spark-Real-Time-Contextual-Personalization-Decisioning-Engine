"use client"
import { usePermissions } from '@/hooks/use-permissions'
import { AccessDenied } from '@/components/rbac/AccessDenied'

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ShieldCheck, UserPlus, Megaphone, Zap, GitMerge, Key, AlertTriangle, Database, XCircle } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { getAuditLogs } from '@/lib/actions/audit'
import { formatDateTime } from '@/lib/formatters'

export default function AuditLogs() {
  const { can } = usePermissions()
  const searchParams = useSearchParams()
  const router = useRouter()
  const correlationId = searchParams.get('correlationId')
  
  if (!can('view_audit_logs')) return <AccessDenied />

  const { currentWorkspace } = useAppStore()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentWorkspace) {
      setLoading(true)
      getAuditLogs(currentWorkspace.id, correlationId || undefined)
        .then(data => setLogs(data))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [currentWorkspace?.id, correlationId])

  const getIcon = (action: string) => {
    const a = action.toLowerCase()
    if (a.includes('campaign')) return Megaphone
    if (a.includes('creative')) return a.includes('approve') ? ShieldCheck : Zap
    if (a.includes('model')) return GitMerge
    if (a.includes('key')) return Key
    if (a.includes('data')) return Database
    if (a.includes('user') || a.includes('invit')) return UserPlus
    if (a.includes('block') || a.includes('violat')) return AlertTriangle
    return ShieldCheck
  }

  const getColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'info': return 'text-sky-cyan'
      case 'warning': return 'text-butter-yellow'
      case 'high': return 'text-coral-pink'
      case 'critical': return 'text-coral-pink'
      default: return 'text-text-secondary'
    }
  }

  const handleExport = () => {
    if (logs.length === 0) return
    const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Resource Type', 'Resource ID', 'Severity', 'IP Address']
    const rows = logs.map(log => [
      log.timestamp,
      log.actorName || 'System',
      log.actorRole || 'SYSTEM',
      log.action,
      log.resourceType,
      log.resourceId,
      log.severity,
      log.ipAddress || 'Internal'
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `audit_logs_${currentWorkspace?.id || 'workspace'}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="px-12 py-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      
      <div className="flex justify-between items-end mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display text-title-xl font-bold tracking-tight text-text-primary">Governance & Audit Logs</h1>
            {correlationId && (
              <div className="flex items-center gap-2 px-3 py-1 bg-electric-mint/10 border border-electric-mint/20 rounded-full">
                <span className="text-xs font-bold text-electric-mint">Filtered by Import Event</span>
                <button 
                  onClick={() => router.push('/app/audit-logs')}
                  className="text-electric-mint/60 hover:text-electric-mint"
                >
                  <XCircle size={14} />
                </button>
              </div>
            )}
          </div>
          <p className="text-text-secondary font-medium">Immutable record of every human and AI action across the workspace.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleExport}
            disabled={logs.length === 0 || loading}
            className="px-6 py-3 bg-white border border-border-subtle text-deep-black rounded-full font-bold shadow-soft hover:border-deep-black transition-colors disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-border-subtle shadow-soft p-12">
        
        <div className="flex gap-4 mb-10 pb-6 border-b border-border-subtle">
          <div className="flex-1 text-[10px] uppercase font-bold tracking-widest text-text-secondary">Time</div>
          <div className="flex-[2] text-[10px] uppercase font-bold tracking-widest text-text-secondary">Actor</div>
          <div className="flex-[3] text-[10px] uppercase font-bold tracking-widest text-text-secondary">Action & Resource</div>
          <div className="flex-1 text-[10px] uppercase font-bold tracking-widest text-text-secondary">IP Address</div>
        </div>

        <div className="relative">
          {/* Vertical Timeline Line */}
          <div className="absolute left-[8px] top-4 bottom-4 w-px bg-border-subtle hidden md:block"></div>

          <div className="space-y-10">
            {loading ? (
              <div className="animate-pulse space-y-6">
                {[1,2,3,4].map(i => <div key={i} className="h-12 bg-warm-cream rounded-xl"></div>)}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-text-secondary">No audit logs found.</div>
            ) : logs.map((log, i) => {
              const Icon = getIcon(log.action)
              const color = getColor(log.severity)
              return (
              <div key={log.id || i} className="flex gap-4 items-start relative group">
                
                <div className="flex-1 pt-1">
                  <span className="text-sm font-bold text-text-secondary">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>

                {/* Actor */}
                <div className="flex-[2] flex items-center gap-4">
                  {/* Timeline Dot */}
                  <div className="hidden md:flex absolute left-[-6px] w-4 h-4 rounded-full bg-warm-cream border-2 border-border-subtle items-center justify-center group-hover:border-deep-black transition-colors z-10">
                    <div className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`}></div>
                  </div>
                  
                  <div className="w-10 h-10 rounded-xl bg-warm-cream flex items-center justify-center shrink-0 border border-border-subtle">
                    <span className="font-bold text-sm text-deep-black">{log.actorName?.charAt(0) || 'S'}</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-deep-black">{log.actorName || 'System'}</p>
                    <p className="text-xs font-medium text-text-secondary uppercase">{log.actorRole?.replace('_', ' ') || 'SYSTEM'}</p>
                  </div>
                </div>

                {/* Action */}
                <div className="flex-[3]">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 text-xs font-bold ${
                    log.severity === 'Warning' ? 'bg-coral-pink/10 text-coral-pink border border-coral-pink/20' :
                    log.severity === 'High' ? 'bg-deep-black text-warm-cream' :
                    'bg-warm-cream border border-border-subtle text-deep-black'
                  }`}>
                    <Icon size={14} /> {log.action}
                  </div>
                  <p className="text-sm font-medium text-text-secondary ml-1">
                    Target: <span className="font-bold text-deep-black">{log.resourceType} {log.resourceId}</span>
                  </p>
                </div>

                {/* IP */}
                <div className="flex-1 pt-2">
                  <span className="text-xs font-mono font-medium text-text-secondary bg-warm-cream px-2 py-1 rounded">{log.ipAddress || 'Internal'}</span>
                </div>

              </div>
            )})}
          </div>
        </div>

      </div>
    </div>
  )
}
