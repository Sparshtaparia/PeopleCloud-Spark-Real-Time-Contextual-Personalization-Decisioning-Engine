import React from 'react'
import { ShieldAlert } from 'lucide-react'

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] w-full">
      <div className="bg-coral-pink/10 border border-coral-pink/20 rounded-3xl p-10 flex flex-col items-center max-w-md text-center shadow-2xl">
        <div className="w-20 h-20 bg-coral-pink/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,107,115,0.4)]">
          <ShieldAlert size={40} className="text-coral-pink" />
        </div>
        <h2 className="font-display text-2xl font-bold text-deep-black mb-3">Access Denied</h2>
        <p className="text-text-secondary font-medium">
          You do not have the required permissions to view this dashboard. Please contact your workspace administrator to request access.
        </p>
      </div>
    </div>
  )
}
