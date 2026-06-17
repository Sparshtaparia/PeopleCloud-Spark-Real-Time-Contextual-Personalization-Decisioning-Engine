import { useAppStore } from '@/lib/store'

export const rolePermissions: Record<string, string[]> = {
  owner: ["*", "delete_organization"],
  admin: ["*", "delete_organization"],
  data_scientist: ["view_dashboard", "view_customers", "view_segments", "view_experiments", "view_model_ops", "view_analytics", "trigger_retraining", "manage_models", "simulate_experiment"],
  marketer: ["view_dashboard", "view_campaigns", "view_creatives", "view_customers", "view_segments", "view_experiments", "view_analytics", "create_campaign", "edit_campaign", "generate_creative"],
  approver: ["view_dashboard", "view_campaigns", "view_creatives", "view_analytics", "approve_campaign", "approve_creative"],
  analyst: ["view_dashboard", "view_campaigns", "view_customers", "view_segments", "view_analytics"],
  viewer: ["view_dashboard", "view_analytics"]
}

export function usePermissions() {
  const { user } = useAppStore()

  const can = (permission: string) => {
    if (!user || !user.role) return false
    
    // Normalize role string (e.g., "Growth Marketer" -> "marketer")
    let role = user.role.toLowerCase()
    if (role === 'growth marketer') role = 'marketer'
    
    const permissions = rolePermissions[role] || []
    return permissions.includes("*") || permissions.includes(permission)
  }

  return { can }
}
