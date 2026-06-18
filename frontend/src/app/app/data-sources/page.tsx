"use client"
import { usePermissions } from '@/hooks/use-permissions'
import { AccessDenied } from '@/components/rbac/AccessDenied'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Database, Link2, RefreshCw, CheckCircle2, Share2, Server, Globe2, Smartphone, FileSpreadsheet, Upload, Trash2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { getDataSources, connectDataSource, syncDataSource, removeDataSource } from '@/lib/actions/data-sources'

interface DataSourceItem {
  id: string; name: string; type: string; status: string; eventsReceived?: number
}

export default function DataSources() {
  const { can } = usePermissions()
  if (!can('manage_data_sources')) return <AccessDenied />

  const router = useRouter()
  const { currentOrg, currentWorkspace } = useAppStore()
  const [sources, setSources] = useState<DataSourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalStep, setModalStep] = useState(1)
  const [newSourceName, setNewSourceName] = useState('')
  const [newSourceType, setNewSourceType] = useState('CRM')
  const [newProvider, setNewProvider] = useState('Salesforce')
  const [testing, setTesting] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)
  const [adding, setAdding] = useState(false)

  const fetchSources = async () => {
    if (!currentWorkspace) return
    setLoading(true)
    try {
      const data = await getDataSources(currentWorkspace.id)
      setSources(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!currentWorkspace) return
    const id = currentWorkspace.id
    queueMicrotask(() => setLoading(true))
    getDataSources(id).then(data => {
      queueMicrotask(() => { setSources(data); setLoading(false) })
    }).catch(() => queueMicrotask(() => setLoading(false)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id])

  const handleTestConnection = () => {
    setTesting(true)
    setTimeout(() => {
      setTesting(false)
      setTestSuccess(true)
    }, 1500)
  }

  const handleConnect = async () => {
    if (!currentOrg || !currentWorkspace || !newSourceName) return
    setAdding(true)
    try {
      await connectDataSource(currentWorkspace.id, currentOrg.id, newSourceName, newProvider)
      setShowAddModal(false)
      setModalStep(1)
      setNewSourceName('')
      setTestSuccess(false)
      await fetchSources()
    } catch (e) {
      console.error(e)
    }
    setAdding(false)
  }

  const handleSync = async (sourceId: string) => {
    if (!currentOrg || !currentWorkspace) return
    try {
      await syncDataSource(sourceId, currentOrg.id, currentWorkspace.id)
      await fetchSources()
    } catch(e) {
      console.error(e)
    }
  }

  const handleRemove = async (sourceId: string) => {
    if (!currentOrg || !currentWorkspace) return
    const confirmDelete = window.confirm("Are you sure you want to remove this data source? This will stop all incoming data.")
    if (!confirmDelete) return
    try {
      await removeDataSource(sourceId, currentOrg.id, currentWorkspace.id)
      await fetchSources()
    } catch (e) {
      console.error(e)
    }
  }

  const getIcon = (type: string) => {
    if (type === 'csv_upload') return FileSpreadsheet
    if (type.includes('Mobile')) return Smartphone
    if (type.includes('Salesforce')) return UsersIcon
    if (type.includes('Shopify')) return ShoppingBagIcon
    if (type.includes('Ads')) return MegaphoneIcon
    return Globe2
  }

  return (
    <div className="px-4 lg:px-12 py-4 lg:py-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 md:mb-12 gap-4">
        <div>
          <h1 className="font-display text-title-xl font-bold tracking-tight mb-2 text-text-primary">Data Intelligence Pipeline</h1>
          <p className="text-text-secondary font-medium">Connect and monitor all customer signal sources flowing into the Identity Graph.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-deep-black text-white rounded-full font-bold shadow-2xl hover:scale-105 transition-transform flex items-center gap-2 self-start md:self-auto">
          <Link2 size={18} /> Add Source
        </button>
      </div>

      {/* The Intelligence Pipeline Visual */}
      <div className="bg-charcoal text-white rounded-[32px] lg:rounded-[40px] p-6 lg:p-10 mb-8 lg:mb-12 relative overflow-hidden shadow-2xl border border-border-inverse">
        <div className="absolute top-0 right-0 w-96 h-96 bg-electric-mint/10 rounded-full blur-[100px] pointer-events-none"></div>
        <h3 className="font-display text-xl font-bold mb-10 flex items-center gap-3 relative z-10"><Server className="text-sky-cyan" /> Live Pipeline Architecture</h3>
        
        <div className="overflow-x-auto pb-4 -mx-10 px-10">
        <div className="flex justify-between items-center relative z-10 gap-4 min-w-[700px]">
          {[
            { label: 'Data Sources', icon: Database, color: 'text-white' },
            { label: 'Ingestion Layer', icon: RefreshCw, color: 'text-white' },
            { label: 'Validation', icon: CheckCircle2, color: 'text-electric-mint' },
            { label: 'Identity Graph', icon: Share2, color: 'text-sky-cyan' },
            { label: 'Feature Store', icon: Server, color: 'text-butter-yellow' },
            { label: 'Decision API', icon: ZapIcon, color: 'text-electric-mint' }
          ].map((stage, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-white/10 group-hover:scale-110 transition-all shadow-soft">
                  <stage.icon size={24} className={stage.color} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/60">{stage.label}</span>
                <span className="text-xs text-electric-mint mt-1 font-mono">Healthy</span>
              </div>
              {i < 5 && (
                <div className="flex-1 border-t-2 border-dashed border-white/20 relative">
                  <div className="absolute w-2 h-2 bg-white rounded-full -top-1 animate-[ping_2s_linear_infinite]" style={{animationDelay: `${i * 0.5}s`}}></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        </div>
      </div>

      <h3 className="font-display text-xl lg:text-2xl font-bold mb-6 text-deep-black">Connected Integrations</h3>
      {loading ? (
        <div className="animate-pulse flex gap-6">
          <div className="h-[200px] w-1/4 bg-white rounded-3xl opacity-50"></div>
          <div className="h-[200px] w-1/4 bg-white rounded-3xl opacity-50"></div>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sources.map((int: DataSourceItem) => {
          const Icon = getIcon(int.type)
          return (
          <div key={int.id} className="bg-white rounded-[32px] p-8 border border-border-subtle shadow-soft hover:border-deep-black transition-colors group relative">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-warm-cream rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon size={24} className="text-deep-black" />
              </div>
              <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${
                int.status === 'healthy' ? 'bg-electric-mint/20 text-emerald-700' :
                int.status === 'warning' ? 'bg-coral-pink/20 text-coral-pink' :
                'bg-border-subtle text-text-secondary'
              }`}>{int.status}</span>
            </div>
            <h4 className="font-display text-xl font-bold text-deep-black mb-1">{int.name}</h4>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-6">{int.type}</p>
            
            <div className="flex items-center justify-between border-t border-border-subtle pt-4">
              <div>
                <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Events (30d)</p>
                <p className="font-display text-lg font-bold">{int.eventsReceived?.toLocaleString() || 0}</p>
              </div>
              <div className="flex gap-2">
                {int.type === 'csv_upload' ? (
                  <button onClick={() => router.push('/onboarding/connect-data-source')} title="Re-upload" className="w-8 h-8 rounded-full bg-warm-cream hover:bg-deep-black hover:text-white flex items-center justify-center transition-colors">
                    <Upload size={14} />
                  </button>
                ) : (
                  <button onClick={() => handleSync(int.id)} title="Manual Sync" className="w-8 h-8 rounded-full bg-warm-cream hover:bg-deep-black hover:text-white flex items-center justify-center transition-colors">
                    <RefreshCw size={14} />
                  </button>
                )}
                <button onClick={() => handleRemove(int.id)} title="Remove Source" className="w-8 h-8 rounded-full bg-warm-cream hover:bg-coral-pink hover:text-white flex items-center justify-center transition-colors text-coral-pink">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
          )
        })}

        {/* Add New Ghost Card */}
        <div onClick={() => setShowAddModal(true)} className="bg-warm-cream rounded-[32px] p-8 border-2 border-dashed border-border-subtle flex flex-col items-center justify-center text-text-secondary hover:text-deep-black hover:border-deep-black transition-colors cursor-pointer min-h-[220px]">
          <Link2 size={32} className="mb-4" />
          <p className="font-bold text-lg">Connect New Source</p>
          <p className="text-sm font-medium mt-2 text-center px-4">Browse 50+ pre-built connectors for CDP, POS, and Marketing channels.</p>
        </div>
      </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-deep-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] p-8 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-2xl font-bold">Connect Data Source</h3>
              <div className="flex gap-2">
                {[1, 2, 3].map(step => (
                  <div key={step} className={`w-3 h-3 rounded-full ${modalStep >= step ? 'bg-electric-mint' : 'bg-border-subtle'}`}></div>
                ))}
              </div>
            </div>
            
            {modalStep === 1 && (
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Connection Name</label>
                  <input 
                    type="text" 
                    value={newSourceName}
                    onChange={e => setNewSourceName(e.target.value)}
                    placeholder="e.g. EU Region Salesforce"
                    className="w-full px-4 py-3 bg-warm-cream border border-border-subtle rounded-xl focus:outline-none focus:border-deep-black font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Source Type</label>
                  <select 
                    value={newSourceType}
                    onChange={e => setNewSourceType(e.target.value)}
                    className="w-full px-4 py-3 bg-warm-cream border border-border-subtle rounded-xl focus:outline-none focus:border-deep-black font-bold appearance-none"
                  >
                    <option>CRM</option>
                    <option>Commerce</option>
                    <option>Website SDK</option>
                    <option>Mobile SDK</option>
                    <option>Ads Platform</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Provider</label>
                  <select 
                    value={newProvider}
                    onChange={e => setNewProvider(e.target.value)}
                    className="w-full px-4 py-3 bg-warm-cream border border-border-subtle rounded-xl focus:outline-none focus:border-deep-black font-bold appearance-none"
                  >
                    {newSourceType === 'CRM' && <><option>Salesforce</option><option>HubSpot</option><option>Zoho</option></>}
                    {newSourceType === 'Commerce' && <><option>Shopify</option><option>WooCommerce</option></>}
                    {newSourceType === 'Website SDK' && <><option>Custom Web SDK</option></>}
                    {newSourceType === 'Mobile SDK' && <><option>iOS SDK</option><option>Android SDK</option></>}
                    {newSourceType === 'Ads Platform' && <><option>Google Ads</option><option>Meta Ads</option></>}
                  </select>
                </div>
              </div>
            )}

            {modalStep === 2 && (
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Authentication Method</label>
                  <select className="w-full px-4 py-3 bg-warm-cream border border-border-subtle rounded-xl focus:outline-none focus:border-deep-black font-bold appearance-none">
                    <option>OAuth 2.0</option>
                    <option>API Key</option>
                    <option>Basic Auth</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">API Key / Token</label>
                  <input type="password" placeholder="••••••••••••••••" className="w-full px-4 py-3 bg-warm-cream border border-border-subtle rounded-xl focus:outline-none focus:border-deep-black font-bold" />
                </div>
                <div className="p-4 bg-warm-cream rounded-xl border border-border-subtle flex justify-between items-center mt-6">
                   <span className="font-bold text-sm">Test Connection</span>
                   <button onClick={handleTestConnection} disabled={testing || testSuccess} className={`px-4 py-2 rounded-lg font-bold text-xs ${testSuccess ? 'bg-electric-mint text-deep-black' : testing ? 'bg-border-subtle text-text-secondary' : 'bg-deep-black text-white hover:scale-105'}`}>
                     {testSuccess ? 'Success' : testing ? 'Testing...' : 'Test Now'}
                   </button>
                </div>
              </div>
            )}

            {modalStep === 3 && (
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Sync Frequency</label>
                  <select className="w-full px-4 py-3 bg-warm-cream border border-border-subtle rounded-xl focus:outline-none focus:border-deep-black font-bold appearance-none">
                    <option>Real-time (Webhook)</option>
                    <option>Every 5 minutes</option>
                    <option>Hourly</option>
                    <option>Daily</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Event Types to Sync</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Identify', 'Page View', 'Screen View', 'Track Event', 'Purchase', 'AddToCart'].map(ev => (
                       <label key={ev} className="flex items-center gap-2 text-sm font-bold p-2 bg-warm-cream rounded border border-border-subtle cursor-pointer hover:border-deep-black">
                         <input type="checkbox" defaultChecked className="accent-deep-black" /> {ev}
                       </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button onClick={() => { setShowAddModal(false); setModalStep(1); setTestSuccess(false); }} className="py-4 px-6 font-bold text-text-secondary hover:text-deep-black">Cancel</button>
              
              <div className="flex-1 flex justify-end gap-4">
                {modalStep > 1 && (
                  <button onClick={() => setModalStep(m => m - 1)} className="py-4 px-8 font-bold border border-border-subtle rounded-xl hover:border-deep-black">Back</button>
                )}
                {modalStep < 3 ? (
                  <button onClick={() => setModalStep(m => m + 1)} disabled={modalStep === 1 && !newSourceName} className="py-4 px-8 bg-electric-mint text-deep-black rounded-xl font-bold shadow-glow-mint disabled:opacity-50">Next</button>
                ) : (
                  <button onClick={handleConnect} disabled={adding || !testSuccess} className="py-4 px-8 bg-deep-black text-white rounded-xl font-bold hover:scale-105 disabled:opacity-50 transition-all">
                    {adding ? 'Saving...' : 'Save Connection'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function UsersIcon(props: React.SVGProps<SVGSVGElement>) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function ShoppingBagIcon(props: React.SVGProps<SVGSVGElement>) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> }
function MegaphoneIcon(props: React.SVGProps<SVGSVGElement>) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg> }
function ZapIcon(props: React.SVGProps<SVGSVGElement>) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> }
