"use client"
import React, { useEffect, useState, useRef } from 'react'
import NextLink from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { getUserContext } from '@/lib/actions/context'
import { routes } from '@/lib/routes'
import { 
  LayoutDashboard, Database, Users, PieChart, 
  Megaphone, Wand2, FlaskConical, Terminal, 
  ShieldCheck, UsersRound, CreditCard, Settings,
  Bell, Search, ChevronDown, Check, Building2, Layers, MoreVertical, Trash2, Edit2, AlertTriangle, CheckCheck,
  Menu, X
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { deleteOrganizationAction } from '@/lib/actions/organizations'
import { getNotifications, markAllRead } from '@/lib/actions/notifications'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isInitialized, currentOrg, currentWorkspace, user, organizations, workspaces, setCurrentOrg, setCurrentWorkspace, initialize, aiLoading, aiLoadingText } = useAppStore()
  const [loading, setLoading] = useState(!isInitialized)

  // Dropdown states
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showOrgMenu, setShowOrgMenu] = useState(false)
  const [showWsMenu, setShowWsMenu] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  
  // Org Deletion Modal State
  const { can } = usePermissions()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [orgToDelete, setOrgToDelete] = useState<any>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const orgMenuRef = useRef<HTMLDivElement>(null)
  const wsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getUserContext().then(context => {
      initialize(context)

      const params = new URLSearchParams(window.location.search)
      const orgId = params.get("orgId")
      const wsId = params.get("wsId")

      if (orgId) {
        const org = context.organizations.find((o: any) => o.id === orgId)
        if (org) {
          setCurrentOrg(org.id)
          localStorage.setItem('selectedOrgId', org.id)
          if (wsId) {
            setCurrentWorkspace(wsId)
            localStorage.setItem('selectedWsId', wsId)
          }
        }
      } else {
        const savedOrgId = localStorage.getItem('selectedOrgId')
        if (savedOrgId) {
          const org = context.organizations.find((o: any) => o.id === savedOrgId)
          if (org) {
            setCurrentOrg(org.id)
            const savedWsId = localStorage.getItem('selectedWsId')
            if (savedWsId) {
              const ws = context.workspaces.find((w: any) => w.id === savedWsId)
              if (ws) setCurrentWorkspace(ws.id)
            }
          }
        }
      }

      if (orgId || wsId) {
        const cleanPath = window.location.pathname + window.location.hash
        router.replace(cleanPath)
      }
      
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [initialize, setCurrentOrg, setCurrentWorkspace, router])

  useEffect(() => {
    if (showNotifications && currentWorkspace) {
      setNotifLoading(true)
      getNotifications(currentWorkspace.id).then(setNotifications).catch(console.error).finally(() => setNotifLoading(false))
    }
  }, [showNotifications, currentWorkspace?.id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSearch(false)
        setShowNotifications(false)
        setShowProfile(false)
        setShowOrgMenu(false)
        setShowWsMenu(false)
      }
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (orgMenuRef.current && !orgMenuRef.current.contains(e.target as Node)) setShowOrgMenu(false)
      if (wsMenuRef.current && !wsMenuRef.current.contains(e.target as Node)) setShowWsMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDeleteOrg = async () => {
    if (!orgToDelete) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      const res = await deleteOrganizationAction({
        organizationId: orgToDelete.id,
        confirmationText: deleteConfirmText
      })
      if (res.success) {
        setShowDeleteModal(false)
        setOrgToDelete(null)
        setDeleteConfirmText('')
        // Optionally redirect or refresh
        window.location.href = res.nextOrganizationId 
          ? `/app?orgId=${res.nextOrganizationId}${res.nextWorkspaceId ? `&wsId=${res.nextWorkspaceId}` : ''}`
          : '/onboarding'
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete organization')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading || !user || !currentOrg || !currentWorkspace) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center">
        <NextLink href="/" className="font-display font-bold text-2xl tracking-tighter text-deep-black animate-pulse">PeopleCloud <span className="inline-block px-3 py-0.5 bg-electric-mint rounded-[40px] -rotate-1 transform shadow-soft">Spark</span></NextLink>
      </div>
    )
  }

  const navItems = [
    { name: 'Command Center', icon: LayoutDashboard, path: routes.app },
    { name: 'Data Sources', icon: Database, path: routes.dataSources },
    { name: 'Customer 360', icon: Users, path: routes.customer360 },
    { name: 'Segments', icon: PieChart, path: routes.segments },
    { name: 'Campaigns', icon: Megaphone, path: routes.campaigns },
    { name: 'Creative Studio', icon: Wand2, path: routes.creativeStudio },
    { name: 'Experiments', icon: FlaskConical, path: routes.experiments },
    { name: 'Model Ops', icon: Terminal, path: routes.modelOps },
    { name: 'Audit Logs', icon: ShieldCheck, path: routes.auditLogs },
    { name: 'Team', icon: UsersRound, path: routes.team },
    { name: 'Billing', icon: CreditCard, path: routes.billing },
    { name: 'Settings', icon: Settings, path: routes.settings },
  ]

  const filteredWorkspaces = workspaces.filter(w => w.organizationId === currentOrg.id)

  return (
    <div className="flex min-h-screen w-full bg-warm-cream">
      
      {/* Mobile Hamburger */}
      <button onClick={() => setShowMobileNav(true)} className="lg:hidden fixed top-4 left-3 z-50 w-9 h-9 bg-deep-black rounded-xl flex items-center justify-center text-white shadow-2xl">
        <Menu size={16} />
      </button>

      {/* AppRail: Floating deep black vertical navigation */}
      <div className="hidden lg:flex w-[88px] h-screen bg-deep-black text-white flex-col items-center py-6 fixed left-0 top-0 z-50">
        
        {/* Logo */}
        <div className="w-12 h-12 bg-white rounded-[16px] flex items-center justify-center mb-8 shrink-0 relative group">
          <span className="font-display font-bold text-deep-black text-xl">{currentOrg.name ? currentOrg.name.charAt(0) : 'S'}</span>
          <div className="absolute left-14 bg-white text-deep-black text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-soft z-50">
            {currentOrg.name}
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-col gap-2 mb-4">
          <button onClick={() => setShowSearch(true)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-[12px] flex items-center justify-center transition-all group relative">
            <Search size={18} className="text-white group-hover:scale-110 transition-transform" />
            <div className="absolute left-14 bg-white text-deep-black text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-soft z-50">Search</div>
          </button>
        </div>

        {/* Primary Navigation */}
        <div className="flex-1 flex flex-col gap-2 w-full px-4 items-center overflow-visible">
          {navItems.map((item) => {
            const isActive = pathname === item.path
            const Icon = item.icon
            return (
              <NextLink 
                key={item.path}
                href={item.path}
                className={`w-10 h-10 rounded-[12px] flex items-center justify-center transition-all group relative ${
                  isActive ? 'bg-electric-mint text-deep-black shadow-[0_0_20px_rgba(24,214,139,0.3)]' : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={22} className={isActive ? 'animate-in zoom-in duration-300' : 'group-hover:scale-110 transition-transform'} />
                <div className="absolute left-16 bg-white text-deep-black text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-soft z-50">
                  {item.name}
                </div>
              </NextLink>
            )
          })}
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-2 mt-auto">
          <button onClick={() => setShowNotifications(true)} className="relative w-10 h-10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
            <Bell size={18} strokeWidth={2} />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-coral-pink rounded-full border-2 border-charcoal"></span>
          </button>
          
          <button onClick={() => setShowProfile(true)} className="w-10 h-10 rounded-[12px] overflow-hidden border-2 border-white/20 hover:border-electric-mint transition-colors cursor-pointer group relative">
            <img alt="Epsilon" className="w-full h-full object-cover" src="/logo-profile-pic.png" />
            <div className="absolute left-14 bg-white text-deep-black text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-soft z-50">Profile</div>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-0 lg:ml-[88px] w-full min-h-screen flex flex-col relative pb-16 lg:pb-0">
        
        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-warm-cream/80 backdrop-blur-xl border-b border-border-subtle h-16 lg:h-20 flex justify-between items-center px-4 lg:px-12 w-full">
          
          <div className="flex items-center gap-2 lg:gap-4 min-w-0">

            {/* Org Dropdown */}
            <div className="relative" ref={orgMenuRef}>
              <button
                id="org-switcher"
                onClick={() => { setShowOrgMenu(v => !v); setShowWsMenu(false) }}
                className={`flex items-center gap-1.5 lg:gap-2 px-2 lg:px-4 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl border transition-all duration-200 group ${showOrgMenu ? 'bg-deep-black text-white border-deep-black shadow-xl' : 'bg-white border-border-subtle text-text-primary hover:border-deep-black hover:shadow-md shadow-soft'}`}
              >
                <Building2 size={12} className={`lg:w-[14px] lg:h-[14px] ${showOrgMenu ? 'text-electric-mint' : 'text-text-secondary group-hover:text-deep-black'}`} />
                <span className="font-display font-bold text-xs lg:text-sm tracking-tight max-w-[80px] lg:max-w-[140px] truncate">{currentOrg.name}</span>
                <ChevronDown size={11} className={`lg:w-[13px] lg:h-[13px] transition-transform duration-200 shrink-0 ${showOrgMenu ? 'rotate-180 text-electric-mint' : 'text-text-secondary'}`} />
              </button>

              {showOrgMenu && (
                <div className="absolute top-full mt-2 left-0 w-72 bg-white rounded-2xl shadow-2xl border border-border-subtle overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 pt-4 pb-2 border-b border-border-subtle">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Switch Organization</p>
                  </div>
                  <div className="p-2 flex flex-col max-h-72 overflow-y-auto">
                    {organizations.map(org => (
                      <div key={org.id} className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all relative ${org.id === currentOrg.id ? 'bg-deep-black text-white' : 'hover:bg-warm-cream text-text-primary'}`}>
                        <button
                          onClick={() => { setCurrentOrg(org.id); setShowOrgMenu(false) }}
                          className="flex items-center gap-3 flex-1"
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${org.id === currentOrg.id ? 'bg-electric-mint text-deep-black' : 'bg-warm-cream text-text-primary'}`}>
                            {org.name.charAt(0)}
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-sm leading-tight">{org.name}</p>
                            <p className={`text-[10px] uppercase tracking-wide mt-0.5 ${org.id === currentOrg.id ? 'text-white/50' : 'text-text-secondary'}`}>{org.industry || 'Organization'}</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          {org.id === currentOrg.id && <Check size={14} className="text-electric-mint shrink-0" />}
                          
                          {/* Secondary Menu Hover Actions */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); /* Rename logic */ }}
                              className="p-1 hover:bg-white/20 hover:text-electric-mint rounded text-text-secondary transition-colors"
                              title="Rename Organization"
                            >
                              <Edit2 size={12} />
                            </button>
                            <div className="relative group/tooltip">
                              <button
                                disabled={!can('delete_organization')}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOrgToDelete(org)
                                  setDeleteError('')
                                  setDeleteConfirmText('')
                                  setShowDeleteModal(true)
                                  setShowOrgMenu(false)
                                }}
                                className={`p-1 rounded transition-colors ${can('delete_organization') ? 'hover:bg-coral-pink/20 hover:text-coral-pink text-text-secondary' : 'text-text-secondary/30 cursor-not-allowed'}`}
                                title={can('delete_organization') ? "Delete Organization" : "Only organization owners can delete organizations."}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {user?.canCreateOrganization && (
                      <div className="mt-2 pt-2 border-t border-border-subtle">
                        <NextLink
                          href="/onboarding"
                          onClick={() => setShowOrgMenu(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-warm-cream transition-all text-text-primary group"
                        >
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 bg-warm-cream border border-border-subtle group-hover:border-deep-black transition-colors">
                            +
                          </div>
                          <span className="font-bold text-sm">Create New Organization</span>
                        </NextLink>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Separator */}
            <span className="text-border-subtle select-none text-lg font-light">/</span>

            {/* Workspace Dropdown */}
            <div className="relative" ref={wsMenuRef}>
              <button
                id="workspace-switcher"
                onClick={() => { setShowWsMenu(v => !v); setShowOrgMenu(false) }}
                className={`flex items-center gap-1.5 lg:gap-2 px-2 lg:px-4 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl border transition-all duration-200 group ${showWsMenu ? 'bg-deep-black text-white border-deep-black shadow-xl' : 'bg-white border-border-subtle text-text-secondary hover:border-deep-black hover:text-text-primary hover:shadow-md shadow-soft'}`}
              >
                <Layers size={12} className={`lg:w-[14px] lg:h-[14px] ${showWsMenu ? 'text-electric-mint' : 'text-text-secondary group-hover:text-deep-black'}`} />
                <span className="font-display text-xs lg:text-sm font-semibold max-w-[80px] lg:max-w-[160px] truncate">{currentWorkspace.name}</span>
                <ChevronDown size={11} className={`lg:w-[13px] lg:h-[13px] transition-transform duration-200 shrink-0 ${showWsMenu ? 'rotate-180 text-electric-mint' : 'text-text-secondary'}`} />
              </button>

              {showWsMenu && (
                <div className="absolute top-full mt-2 left-0 w-72 bg-white rounded-2xl shadow-2xl border border-border-subtle overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 pt-4 pb-2 border-b border-border-subtle">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Workspaces · {currentOrg.name}</p>
                  </div>
                  <div className="p-2 flex flex-col max-h-72 overflow-y-auto">
                    {filteredWorkspaces.length === 0 && (
                      <p className="px-3 py-6 text-sm text-text-secondary text-center">No workspaces found.</p>
                    )}
                    {filteredWorkspaces.map(ws => (
                      <button
                        key={ws.id}
                        onClick={() => { setCurrentWorkspace(ws.id); setShowWsMenu(false) }}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${ws.id === currentWorkspace.id ? 'bg-deep-black text-white' : 'hover:bg-warm-cream text-text-primary'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${ws.environment === 'production' ? 'bg-electric-mint' : 'bg-butter-yellow'}`} />
                          <div>
                            <p className="font-bold text-sm leading-tight">{ws.name}</p>
                            <p className={`text-[10px] uppercase tracking-wide mt-0.5 ${ws.id === currentWorkspace.id ? 'text-white/50' : 'text-text-secondary'}`}>{ws.environment}</p>
                          </div>
                        </div>
                        {ws.id === currentWorkspace.id && <Check size={14} className="text-electric-mint shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Environment badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-border-subtle shadow-soft">
              <span className={`w-2 h-2 rounded-full shrink-0 ${currentWorkspace.environment === 'production' ? 'bg-electric-mint animate-pulse' : 'bg-butter-yellow'}`}></span>
              <span className="text-label-sm uppercase font-bold text-text-secondary">
                {currentWorkspace.environment}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <button onClick={() => setShowSearch(true)} className="hidden xl:flex items-center gap-3 px-4 py-2 bg-white border border-border-subtle rounded-full text-text-secondary hover:border-text-secondary transition-colors shadow-soft">
              <Search size={16} />
              <span className="text-sm font-medium">Search anything...</span>
              <span className="ml-8 text-xs font-bold border border-border-subtle px-1.5 py-0.5 rounded bg-warm-cream">⌘K</span>
            </button>
            
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-text-primary">{user.name}</p>
                <p className="text-label-sm text-text-secondary uppercase">{user.role.replace('_', ' ')}</p>
              </div>
              <button onClick={() => setShowProfile(true)} className="lg:hidden w-8 h-8 rounded-lg overflow-hidden border-2 border-white/20">
                <img alt="Epsilon" className="w-full h-full object-cover" src="/logo-profile-pic.png" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full bg-warm-cream pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Navigation Overlay */}
      {showMobileNav && (
        <div className="fixed inset-0 z-[300] lg:hidden">
          <div className="absolute inset-0 bg-deep-black/60 backdrop-blur-sm" onClick={() => setShowMobileNav(false)} />
          <div className="relative w-72 h-full bg-deep-black text-white flex flex-col py-6 animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between px-5 mb-6">
              <span className="font-display font-bold text-lg tracking-tighter">PeopleCloud <span className="inline-block px-2 py-0.5 bg-electric-mint rounded-[40px] -rotate-1 transform shadow-soft text-sm">Spark</span></span>
              <button onClick={() => setShowMobileNav(false)} className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-1 px-3 mb-6">
              {navItems.map((item) => {
                const isActive = pathname === item.path
                const Icon = item.icon
                return (
                  <NextLink
                    key={item.path}
                    href={item.path}
                    onClick={() => setShowMobileNav(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive ? 'bg-electric-mint/20 text-electric-mint font-bold' : 'text-white/70 hover:text-white hover:bg-white/10 font-medium'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm">{item.name}</span>
                  </NextLink>
                )
              })}
            </div>

            <div className="mt-auto px-3 pt-4 border-t border-white/10 mx-3">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
                  <img alt="Epsilon" className="w-full h-full object-cover" src="/logo-profile-pic.png" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{user.name}</p>
                  <p className="text-xs text-white/50 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-deep-black/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-around py-1.5 safe-area-bottom">
        {[
          { icon: LayoutDashboard, path: routes.app, label: 'Home' },
          { icon: Megaphone, path: routes.campaigns, label: 'Campaigns' },
          { icon: Users, path: routes.customer360, label: '360' },
          { icon: FlaskConical, path: routes.experiments, label: 'Experiments' },
          { icon: Settings, path: routes.settings, label: 'More' },
        ].map((item) => {
          const isActive = pathname === item.path || (item.path !== routes.app && pathname.startsWith(item.path))
          const Icon = item.icon
          return (
            <NextLink
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
                isActive ? 'text-electric-mint' : 'text-white/50'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
            </NextLink>
          )
        })}
      </nav>

      {/* AI Loading Overlay */}
      {aiLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-warm-cream/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-deep-black/80 text-white rounded-3xl px-8 py-6 shadow-2xl flex items-center gap-4">
            <div className="w-6 h-6 border-2 border-electric-mint border-t-transparent rounded-full animate-spin" />
            <span className="font-bold text-sm">{aiLoadingText}</span>
          </div>
        </div>
      )}

      {/* Modals and Overlays */}
      
      {/* Delete Organization Modal */}
      {showDeleteModal && orgToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-deep-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border-subtle bg-coral-pink/5">
              <h3 className="font-display text-xl font-bold text-coral-pink flex items-center gap-2">
                <Trash2 size={20} /> Delete Organization
              </h3>
            </div>
            
            <div className="p-6">
              <p className="text-text-primary font-medium mb-4">
                This action is <span className="font-bold text-coral-pink">permanent and cannot be undone</span>. 
                All workspaces, data sources, segments, campaigns, and customer data will be deleted.
              </p>

              {deleteError && (
                <div className="mb-4 p-3 bg-coral-pink/10 border border-coral-pink/20 rounded-xl flex items-start gap-2">
                  <AlertTriangle size={16} className="text-coral-pink shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-coral-pink">{deleteError}</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wide">
                  Type <span className="text-deep-black font-mono bg-warm-cream px-1 py-0.5 rounded">DELETE {orgToDelete.name}</span> to confirm
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={`DELETE ${orgToDelete.name}`}
                  className="w-full bg-white border border-border-subtle rounded-xl px-4 py-3 text-sm font-medium focus:border-coral-pink outline-none transition-colors text-deep-black"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-warm-cream hover:bg-border-subtle text-text-primary font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOrg}
                  disabled={isDeleting || deleteConfirmText.trim().toLowerCase() !== `delete ${orgToDelete.name.toLowerCase()}`}
                  className="flex-[2] bg-coral-pink hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Organization'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Search */}
      {showSearch && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 bg-deep-black/60 backdrop-blur-sm px-4" onClick={() => setShowSearch(false)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in fade-in slide-in-from-top-10 duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border-subtle flex items-center gap-4">
              <Search className="text-text-secondary" />
              <input type="text" placeholder="Search campaigns, users, segments..." autoFocus className="flex-1 text-lg font-bold text-deep-black outline-none" />
              <span className="text-xs font-bold text-text-secondary bg-warm-cream px-2 py-1 rounded">ESC</span>
            </div>
            <div className="p-4">
              <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Quick Links</p>
              <div className="flex flex-col">
                <NextLink href={routes.campaigns} onClick={() => setShowSearch(false)} className="px-4 py-3 rounded-xl hover:bg-warm-cream font-medium">Create new campaign</NextLink>
                <NextLink href={routes.dataSources} onClick={() => setShowSearch(false)} className="px-4 py-3 rounded-xl hover:bg-warm-cream font-medium">Connect data source</NextLink>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {showNotifications && (
        <div className="fixed top-0 bottom-0 right-0 w-[400px] bg-white shadow-2xl z-[100] border-l border-border-subtle animate-in slide-in-from-right-full duration-300 flex flex-col">
          <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-warm-cream">
            <h3 className="font-display text-xl font-bold text-deep-black">Notifications</h3>
            <div className="flex items-center gap-3">
              {notifications.some(n => !n.isRead) && (
                <button onClick={async () => { if (currentWorkspace) { await markAllRead(currentWorkspace.id); setNotifications(notifications.map(n => ({ ...n, isRead: true }))) } }} className="text-xs font-bold text-electric-mint hover:text-emerald-600 flex items-center gap-1">
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <button onClick={() => setShowNotifications(false)} className="text-text-secondary hover:text-deep-black">Close</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {notifLoading ? (
              <div className="p-4 text-center text-text-secondary">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-text-secondary">No notifications yet.</div>
            ) : notifications.map((n: any) => (
              <div key={n.id} className={`p-4 rounded-2xl border transition-colors ${n.isRead ? 'bg-white border-border-subtle' : 'bg-warm-cream border-electric-mint/20'}`}>
                <div className="flex gap-2 items-center mb-1">
                  <span className={`w-2 h-2 rounded-full ${n.type === 'error' ? 'bg-coral-pink' : n.type === 'warning' ? 'bg-butter-yellow' : n.type === 'success' ? 'bg-electric-mint' : 'bg-sky-cyan'}`}></span>
                  <p className="font-bold text-sm">{n.title}</p>
                  {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-electric-mint ml-auto"></span>}
                </div>
                <p className="text-sm text-text-secondary">{n.message}</p>
                <p className="text-xs text-text-secondary mt-2">{(() => { const s = Math.floor((Date.now() - new Date(n.createdAt).getTime()) / 1000); if (s < 60) return 'Just now'; if (s < 3600) return `${Math.floor(s / 60)}m ago`; return `${Math.floor(s / 3600)}h ago` })()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile Menu */}
      {showProfile && (
        <div className="fixed bottom-6 left-[104px] w-64 bg-deep-black text-white rounded-3xl shadow-2xl z-[100] border border-white/10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20">
              <img alt="Epsilon" className="w-full h-full object-cover" src="/logo-profile-pic.png" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm">{user.name}</p>
              <p className="text-xs text-white/50 truncate">{user.email}</p>
            </div>
          </div>
          <div className="p-2 flex flex-col gap-1">
            <NextLink href={routes.profile} onClick={() => setShowProfile(false)} className="px-4 py-2 rounded-xl hover:bg-white/10 text-sm font-medium">My Profile</NextLink>
            <NextLink href={routes.settings} onClick={() => setShowProfile(false)} className="px-4 py-2 rounded-xl hover:bg-white/10 text-sm font-medium">Workspace Settings</NextLink>
            <NextLink href={routes.billing} onClick={() => setShowProfile(false)} className="px-4 py-2 rounded-xl hover:bg-white/10 text-sm font-medium">Billing</NextLink>
          </div>
          <div className="p-2 border-t border-white/10">
            <button onClick={() => {
              setShowProfile(false)
              fetch('/api/auth/signout', { method: 'POST' }).then(() => window.location.href = routes.login)
            }} className="w-full text-left px-4 py-2 rounded-xl hover:bg-coral-pink/20 text-coral-pink text-sm font-medium">Log out</button>
          </div>
        </div>
      )}
    </div>
  )
}
