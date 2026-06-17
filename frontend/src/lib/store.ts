import { create } from 'zustand'

export type Organization = {
  id: string
  name: string
  industry: string
  plan: "Starter" | "Growth" | "Enterprise" | string
}

export type Workspace = {
  id: string
  organizationId: string
  name: string
  environment: "sandbox" | "production" | string
}

export type User = {
  id: string
  name: string
  email: string
  avatarUrl: string
  role: string
  canCreateOrganization?: boolean
}

type InitializeContext = {
  user: User
  organizations: Organization[]
  workspaces: Workspace[]
  defaultOrg: Organization | null
  defaultWorkspace: Workspace | null
}

type AppState = {
  isInitialized: boolean
  user: User | null
  organizations: Organization[]
  workspaces: Workspace[]
  currentOrg: Organization | null
  currentWorkspace: Workspace | null
  aiLoading: boolean
  aiLoadingText: string

  initialize: (context: InitializeContext) => void
  setCurrentOrg: (orgId: string) => void
  setCurrentWorkspace: (wsId: string) => void
  setAiLoading: (loading: boolean, text?: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  isInitialized: false,
  user: null,
  organizations: [],
  workspaces: [],
  currentOrg: null,
  currentWorkspace: null,
  aiLoading: false,
  aiLoadingText: 'collecting data...',

  initialize: (context) => {
    set({
      isInitialized: true,
      user: context.user,
      organizations: context.organizations,
      workspaces: context.workspaces,
      currentOrg: context.defaultOrg,
      currentWorkspace: context.defaultWorkspace,
    })
  },

  setCurrentOrg: (orgId: string) => {
    const org = get().organizations.find(o => o.id === orgId)
    if (org) {
      const ws = get().workspaces.find(w => w.organizationId === org.id)
      set({ currentOrg: org, currentWorkspace: ws || null })
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedOrgId', org.id)
        if (ws) localStorage.setItem('selectedWsId', ws.id)
      }
    }
  },

  setCurrentWorkspace: (wsId: string) => {
    const ws = get().workspaces.find(w => w.id === wsId)
    if (ws) {
      set({ currentWorkspace: ws })
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedWsId', ws.id)
      }
    }
  },

  setAiLoading: (loading: boolean, text?: string) => {
    set({ aiLoading: loading, aiLoadingText: text || (loading ? 'collecting data...' : '') })
  },
}))
