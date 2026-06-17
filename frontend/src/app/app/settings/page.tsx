"use client"
import { usePermissions } from '@/hooks/use-permissions'
import { AccessDenied } from '@/components/rbac/AccessDenied'

import React, { useState, useEffect } from 'react'
import { Settings2, ShieldCheck, Key, Globe, Type, RefreshCw, Copy, Check, Webhook, Lock, Server, Zap, Bell, ToggleLeft, ToggleRight, Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { getSettings, updateBrandVoice, rotateApiKey, generateApiKey } from '@/lib/actions/settings'

function Toast({ msg, onClose }: { msg: string, onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return (
    <div className="fixed bottom-8 right-8 z-[200] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 bg-deep-black text-white px-6 py-4 rounded-2xl shadow-2xl">
        <Check size={16} className="text-electric-mint shrink-0" />
        <span className="text-sm font-bold">{msg}</span>
      </div>
    </div>
  )
}

export default function Settings() {
  const { can } = usePermissions()
  if (!can('manage_settings')) return <AccessDenied />

  const { currentOrg, currentWorkspace } = useAppStore()
  const [activeTab, setActiveTab] = useState('Workspace')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [brandVoice, setBrandVoice] = useState<any>({ coreTone: 'Professional', bannedPhrases: '', approvedClaims: '', strictness: 90 })
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [newRawKey, setNewRawKey] = useState<string | null>(null)
  const [webhooks, setWebhooks] = useState([
    { id: 'wh1', url: 'https://api.example.com/hooks/campaign-live', events: ['campaign.live', 'campaign.paused'], active: true },
    { id: 'wh2', url: 'https://analytics.example.com/events', events: ['decision.served', 'experiment.winner'], active: false },
  ])
  const [consentRules, setConsentRules] = useState([
    { id: 'c1', name: 'GDPR — EU Residents', channel: 'Email', enabled: true },
    { id: 'c2', name: 'CCPA — California Users', channel: 'SMS', enabled: true },
    { id: 'c3', name: 'DND — Push Suppression', channel: 'App Push', enabled: false },
    { id: 'c4', name: 'Opt-Out Honoring — All Channels', channel: 'All', enabled: true },
  ])

  const fetchSettings = async () => {
    if (!currentOrg) return
    try {
      const data = await getSettings(currentOrg.id)
      if (data.brandVoice) setBrandVoice(data.brandVoice)
      setApiKeys(data.apiKeys)
    } catch(e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => { fetchSettings() }, [currentOrg?.id])

  const handleSaveBrandVoice = async () => {
    if (!currentOrg || !currentWorkspace) return
    setSaving(true)
    try {
      await updateBrandVoice(currentOrg.id, currentWorkspace.id, brandVoice)
      setToast('Brand voice saved successfully')
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  const handleRotateKey = async (id: string) => {
    if (!currentOrg || !currentWorkspace) return
    try {
      await rotateApiKey(id, currentOrg.id, currentWorkspace.id)
      await fetchSettings()
      setToast('API key rotated — new key is now active')
    } catch (err) { console.error(err) }
  }

  const handleGenerateKey = async () => {
    if (!currentOrg || !currentWorkspace) return
    setSaving(true)
    try {
      const res = await generateApiKey(currentOrg.id, currentWorkspace.id)
      await fetchSettings()
      setNewRawKey(res.key)
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const tabs = [
    { name: 'Workspace', icon: Settings2 },
    { name: 'Brand Voice', icon: Type },
    { name: 'API Keys', icon: Key },
    { name: 'Webhooks', icon: Webhook },
    { name: 'Consent Rules', icon: Lock },
  ]

  return (
    <div className="px-12 py-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 h-[calc(100vh-80px)] flex flex-col">
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}

      <div className="flex justify-between items-end mb-12 shrink-0">
        <div>
          <h1 className="font-display text-title-xl font-bold tracking-tight mb-2 text-text-primary">Workspace Settings</h1>
          <p className="text-text-secondary font-medium">Configure AI parameters for <span className="font-bold text-text-primary">"{currentWorkspace?.name}"</span>.</p>
        </div>
        {activeTab === 'Brand Voice' && (
          <button onClick={handleSaveBrandVoice} disabled={saving} className="px-8 py-3 bg-deep-black text-white rounded-full font-bold shadow-2xl hover:-translate-y-1 transition-transform disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden pb-4">
        {/* Left Sidebar */}
        <div className="w-[240px] bg-white rounded-[32px] border border-border-subtle p-4 flex flex-col gap-1 shrink-0 h-fit shadow-soft">
          {tabs.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => setActiveTab(name)}
              className={`flex items-center gap-3 text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === name ? 'bg-deep-black text-white shadow-soft' : 'text-text-secondary hover:bg-warm-cream hover:text-deep-black'
              }`}
            >
              <Icon size={16} />
              {name}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-[40px] border border-border-subtle p-12 overflow-y-auto shadow-soft">

          {/* ── WORKSPACE ── */}
          {activeTab === 'Workspace' && (
            <div className="animate-in fade-in slide-in-from-right-8 space-y-8">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border-subtle">
                <div className="w-12 h-12 bg-deep-black text-white rounded-xl flex items-center justify-center">
                  <Settings2 size={24} />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold">Workspace Configuration</h2>
                  <p className="text-sm text-text-secondary">Core settings for this workspace environment.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">Workspace Name</label>
                  <input readOnly value={currentWorkspace?.name || ''} className="w-full px-5 py-4 bg-warm-cream border border-border-subtle rounded-2xl font-bold text-text-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">Environment</label>
                  <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border font-bold ${currentWorkspace?.environment === 'production' ? 'bg-electric-mint/10 border-electric-mint/30 text-deep-black' : 'bg-butter-yellow/10 border-butter-yellow/30 text-deep-black'}`}>
                    <span className={`w-2 h-2 rounded-full ${currentWorkspace?.environment === 'production' ? 'bg-electric-mint animate-pulse' : 'bg-butter-yellow'}`} />
                    {currentWorkspace?.environment === 'production' ? 'Production' : 'Staging'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">Organization</label>
                  <input readOnly value={currentOrg?.name || ''} className="w-full px-5 py-4 bg-warm-cream border border-border-subtle rounded-2xl font-bold text-text-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">Industry</label>
                  <input readOnly value={currentOrg?.industry || 'N/A'} className="w-full px-5 py-4 bg-warm-cream border border-border-subtle rounded-2xl font-bold text-text-primary outline-none" />
                </div>
              </div>

              <div className="p-6 bg-warm-cream rounded-3xl border border-border-subtle">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">Workspace ID</p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 font-mono text-sm text-text-primary">{currentWorkspace?.id}</code>
                  <button onClick={() => handleCopy(currentWorkspace?.id || '', 'wsid')} className="p-2 rounded-xl hover:bg-border-subtle transition-colors">
                    {copied === 'wsid' ? <Check size={16} className="text-electric-mint" /> : <Copy size={16} className="text-text-secondary" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Model Serving', status: 'Active', color: 'electric-mint' },
                  { label: 'Event Ingestion', status: 'Active', color: 'electric-mint' },
                  { label: 'Real-time Decisions', status: 'Active', color: 'electric-mint' },
                ].map(s => (
                  <div key={s.label} className="p-5 bg-white border border-border-subtle rounded-2xl flex items-center justify-between shadow-soft">
                    <span className="text-sm font-bold">{s.label}</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-electric-mint">
                      <span className="w-1.5 h-1.5 rounded-full bg-electric-mint animate-pulse" />
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BRAND VOICE ── */}
          {activeTab === 'Brand Voice' && (
            <div className="animate-in fade-in slide-in-from-right-8">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border-subtle">
                <div className="w-12 h-12 bg-butter-yellow/20 rounded-xl flex items-center justify-center text-butter-yellow"><Type size={24} /></div>
                <div>
                  <h2 className="font-display text-2xl font-bold">Brand Voice & Guardrails</h2>
                  <p className="text-sm text-text-secondary">LLM constraints applied during GenAI creative execution.</p>
                </div>
              </div>
              <div className="space-y-10">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Core Tone</label>
                  <div className="flex gap-4 flex-wrap">
                    {['Professional', 'Energetic', 'Minimal', 'Luxury'].map(t => (
                      <button key={t} onClick={() => setBrandVoice({ ...brandVoice, coreTone: t })}
                        className={`px-6 py-3 rounded-full text-sm font-bold border transition-colors ${brandVoice.coreTone === t ? 'bg-electric-mint border-electric-mint text-deep-black shadow-glow-mint' : 'bg-warm-cream border-border-subtle text-text-secondary hover:border-deep-black'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Banned Phrases</label>
                    <textarea rows={5} value={brandVoice.bannedPhrases}
                      onChange={e => setBrandVoice({ ...brandVoice, bannedPhrases: e.target.value })}
                      placeholder="Buy now, Cheap, Hurry up, Limited time..."
                      className="w-full p-5 bg-charcoal/5 border border-border-subtle rounded-2xl focus:border-deep-black outline-none font-mono text-sm text-deep-black resize-none" />
                    <p className="text-xs text-text-secondary mt-2">The model will reject any variant containing these.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Approved Claims</label>
                    <textarea rows={5} value={brandVoice.approvedClaims}
                      onChange={e => setBrandVoice({ ...brandVoice, approvedClaims: e.target.value })}
                      placeholder="Built for comfort, Premium materials, Award-winning..."
                      className="w-full p-5 bg-charcoal/5 border border-border-subtle rounded-2xl focus:border-deep-black outline-none font-mono text-sm text-deep-black resize-none" />
                    <p className="text-xs text-text-secondary mt-2">Model weaves these phrases into copy.</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Compliance Strictness</label>
                  <div className="flex items-center gap-6 p-6 bg-coral-pink/10 border border-coral-pink/20 rounded-3xl">
                    <ShieldCheck size={32} className="text-coral-pink" />
                    <div className="flex-1">
                      <input type="range" min="0" max="100" value={brandVoice.strictness}
                        onChange={e => setBrandVoice({ ...brandVoice, strictness: parseInt(e.target.value) })}
                        className="w-full accent-coral-pink mb-2" />
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-coral-pink/80">
                        <span>Lenient</span><span>Strict ({brandVoice.strictness})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── API KEYS ── */}
          {activeTab === 'API Keys' && (
            <div className="animate-in fade-in slide-in-from-right-8">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border-subtle">
                <div className="w-12 h-12 bg-deep-black text-white rounded-xl flex items-center justify-center"><Key size={24} /></div>
                <div>
                  <h2 className="font-display text-2xl font-bold">API Key Management</h2>
                  <p className="text-sm text-text-secondary">Secure credentials for server-side and SDK integration.</p>
                </div>
              </div>

              {apiKeys.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border-subtle rounded-3xl">
                  <Key size={40} className="mx-auto text-text-secondary opacity-30 mb-4" />
                  <p className="font-bold text-text-primary mb-2">No API keys yet</p>
                  <p className="text-sm text-text-secondary mb-6">Generate keys to start integrating with Spark.</p>
                  <button onClick={handleGenerateKey} disabled={saving}
                    className="px-6 py-3 bg-deep-black text-white rounded-full font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                    {saving ? 'Generating...' : 'Request Key Generation'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-end mb-4">
                    <button onClick={handleGenerateKey} disabled={saving}
                      className="px-6 py-2 bg-deep-black text-white rounded-full font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
                      <Plus size={16} /> {saving ? 'Generating...' : 'New Key'}
                    </button>
                  </div>
                  {apiKeys.map(key => (
                    <div key={key.id} className="p-6 bg-charcoal text-white rounded-3xl shadow-2xl relative overflow-hidden">
                      {!key.isActive && <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center font-bold uppercase tracking-widest text-white/50 text-sm">Rotated / Inactive</div>}
                      {key.type === 'secret_server' && <div className="absolute top-0 right-0 w-32 h-32 bg-coral-pink/10 rounded-full blur-[40px]" />}
                      <div className="flex justify-between items-center mb-6 relative z-10">
                        <div>
                          <h3 className={`font-bold text-lg ${key.type === 'secret_server' ? 'text-coral-pink' : ''}`}>{key.name}</h3>
                          <p className="text-xs text-white/50">{key.type === 'secret_server' ? 'Server-side. Keep secret.' : 'Client-side SDK key.'}</p>
                        </div>
                        {key.isActive ? (
                          key.type === 'secret_server' ? (
                            <button onClick={() => handleRotateKey(key.id)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors">
                              <RefreshCw size={14} /> Rotate Key
                            </button>
                          ) : (
                            <span className="px-3 py-1 bg-electric-mint/20 text-electric-mint rounded text-[10px] font-bold uppercase tracking-widest">Active</span>
                          )
                        ) : (
                          <span className="px-3 py-1 bg-white/10 text-white/50 rounded text-[10px] font-bold uppercase tracking-widest">Inactive</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 relative z-10">
                        <input readOnly type={key.type === 'secret_server' ? 'password' : 'text'} value={key.maskedKey}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm opacity-80 outline-none" />
                        <button onClick={() => handleCopy(key.maskedKey, key.id)}
                          className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                          {copied === key.id ? <Check size={18} className="text-electric-mint" /> : <Copy size={18} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="mt-12 p-8 bg-warm-cream border border-border-subtle rounded-3xl">
                    <h4 className="font-display text-xl font-bold mb-2">Integration Example</h4>
                    <p className="text-sm text-text-secondary mb-4">Use your API key to fetch real-time AI decisions for your application (e.g. Adidas website).</p>
                    <pre className="p-4 bg-deep-black text-white/80 rounded-2xl font-mono text-sm overflow-x-auto">
{`POST /api/decision
Authorization: Bearer spark_live_xxxxx

{
  "campaign": "Cart Recovery Campaign",
  "headline": "Your cart is ready",
  "offer": "15% off",
  "confidence": 0.84
}`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── WEBHOOKS ── */}
          {activeTab === 'Webhooks' && (
            <div className="animate-in fade-in slide-in-from-right-8">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-border-subtle">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-sky-cyan/20 rounded-xl flex items-center justify-center text-sky-cyan"><Webhook size={24} /></div>
                  <div>
                    <h2 className="font-display text-2xl font-bold">Webhooks</h2>
                    <p className="text-sm text-text-secondary">Push real-time events to your own endpoints.</p>
                  </div>
                </div>
                <button onClick={() => setToast('Webhook endpoint added (demo)')}
                  className="flex items-center gap-2 px-5 py-3 bg-deep-black text-white rounded-full font-bold text-sm hover:opacity-90 transition-opacity">
                  <Plus size={16} /> Add Endpoint
                </button>
              </div>
              <div className="space-y-4">
                {webhooks.map(wh => (
                  <div key={wh.id} className="p-6 bg-warm-cream border border-border-subtle rounded-3xl hover:border-deep-black transition-colors group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <code className="text-sm font-mono font-bold text-text-primary truncate">{wh.url}</code>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${wh.active ? 'bg-electric-mint/20 text-electric-mint' : 'bg-border-subtle text-text-secondary'}`}>
                            {wh.active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {wh.events.map(ev => (
                            <span key={ev} className="px-3 py-1 bg-white border border-border-subtle rounded-full text-xs font-mono font-bold text-text-secondary">{ev}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => {
                          setWebhooks(prev => prev.map(w => w.id === wh.id ? { ...w, active: !w.active } : w))
                          setToast(`Webhook ${wh.active ? 'paused' : 'activated'}`)
                        }} className="p-2 hover:bg-border-subtle rounded-xl transition-colors">
                          {wh.active ? <ToggleRight size={22} className="text-electric-mint" /> : <ToggleLeft size={22} className="text-text-secondary" />}
                        </button>
                        <button onClick={() => { setWebhooks(prev => prev.filter(w => w.id !== wh.id)); setToast('Webhook removed') }}
                          className="p-2 hover:bg-coral-pink/10 hover:text-coral-pink rounded-xl transition-colors text-text-secondary">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CONSENT RULES ── */}
          {activeTab === 'Consent Rules' && (
            <div className="animate-in fade-in slide-in-from-right-8">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border-subtle">
                <div className="w-12 h-12 bg-coral-pink/10 rounded-xl flex items-center justify-center text-coral-pink"><Lock size={24} /></div>
                <div>
                  <h2 className="font-display text-2xl font-bold">Consent & Privacy Rules</h2>
                  <p className="text-sm text-text-secondary">Enforce GDPR, CCPA, and opt-out compliance automatically.</p>
                </div>
              </div>
              <div className="space-y-4">
                {consentRules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-5 bg-warm-cream border border-border-subtle rounded-2xl hover:border-deep-black transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-10 rounded-full ${rule.enabled ? 'bg-electric-mint' : 'bg-border-subtle'}`} />
                      <div>
                        <p className="font-bold text-sm">{rule.name}</p>
                        <p className="text-xs text-text-secondary font-mono mt-0.5">Channel: {rule.channel}</p>
                      </div>
                    </div>
                    <button onClick={() => {
                      setConsentRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))
                      setToast(`${rule.name} ${rule.enabled ? 'disabled' : 'enabled'}`)
                    }} className="flex items-center gap-2 text-sm font-bold transition-colors">
                      {rule.enabled
                        ? <><ToggleRight size={26} className="text-electric-mint" /><span className="text-electric-mint">Enforced</span></>
                        : <><ToggleLeft size={26} className="text-text-secondary" /><span className="text-text-secondary">Off</span></>
                      }
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-5 bg-sky-cyan/10 border border-sky-cyan/30 rounded-2xl flex items-center gap-4">
                <ShieldCheck size={24} className="text-sky-cyan shrink-0" />
                <p className="text-sm font-medium text-text-primary">All consent rule changes are applied to the decisioning engine in real-time and logged to audit trails.</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {newRawKey && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-deep-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-electric-mint/20 text-electric-mint rounded-2xl flex items-center justify-center mb-6">
              <Key size={32} />
            </div>
            <h3 className="font-display text-2xl font-bold mb-2">Save your API Key</h3>
            <p className="text-text-secondary text-sm mb-6">Please copy this key now. For security reasons, you won't be able to see it again after closing this window.</p>
            <div className="flex items-center gap-2 p-4 bg-warm-cream border border-border-subtle rounded-xl mb-6">
              <code className="flex-1 font-mono text-deep-black text-sm break-all">{newRawKey}</code>
              <button onClick={() => handleCopy(newRawKey, 'raw')} className="p-2 bg-deep-black text-white rounded-lg hover:scale-105 transition-transform shrink-0">
                {copied === 'raw' ? <Check size={16} className="text-electric-mint" /> : <Copy size={16} />}
              </button>
            </div>
            <button onClick={() => setNewRawKey(null)} className="w-full py-4 bg-deep-black text-white rounded-full font-bold hover:opacity-90">
              I have copied this key
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
