export type ActionStatus = {
  name: string
  routeUsedIn: string[]
  permissionRequired: string
  serverFunction: string
  dbTablesTouched: string[]
  auditLogRequired: boolean
  usageMeterRequired: boolean
  implemented: boolean
}

export const actionRegistry: ActionStatus[] = [
  {
    name: "loginDemoUser",
    routeUsedIn: ["/login"],
    permissionRequired: "none",
    serverFunction: "signIn",
    dbTablesTouched: ["Session"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: true
  },
  {
    name: "logoutUser",
    routeUsedIn: ["/app/profile", "Topbar"],
    permissionRequired: "none",
    serverFunction: "signOut",
    dbTablesTouched: ["Session"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "switchOrganization",
    routeUsedIn: ["Topbar"],
    permissionRequired: "none",
    serverFunction: "switchOrganization",
    dbTablesTouched: [],
    auditLogRequired: false,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "switchWorkspace",
    routeUsedIn: ["Topbar"],
    permissionRequired: "none",
    serverFunction: "switchWorkspace",
    dbTablesTouched: [],
    auditLogRequired: false,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "completeOnboardingStep",
    routeUsedIn: ["/onboarding"],
    permissionRequired: "none",
    serverFunction: "completeOnboarding",
    dbTablesTouched: ["Organization", "Workspace", "Membership"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "connectDataSource",
    routeUsedIn: ["/app/data-sources"],
    permissionRequired: "manage_data",
    serverFunction: "connectDataSource",
    dbTablesTouched: ["DataSource", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "testDataSourceConnection",
    routeUsedIn: ["/app/data-sources"],
    permissionRequired: "manage_data",
    serverFunction: "testDataSourceConnection",
    dbTablesTouched: ["DataSource"],
    auditLogRequired: false,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "syncDataSource",
    routeUsedIn: ["/app/data-sources"],
    permissionRequired: "manage_data",
    serverFunction: "syncDataSource",
    dbTablesTouched: ["DataSource", "UsageMeter", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: true,
    implemented: false
  },
  {
    name: "disconnectDataSource",
    routeUsedIn: ["/app/data-sources"],
    permissionRequired: "manage_data",
    serverFunction: "disconnectDataSource",
    dbTablesTouched: ["DataSource", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "searchCustomers",
    routeUsedIn: ["/app/customer-360"],
    permissionRequired: "view_customers",
    serverFunction: "searchCustomers",
    dbTablesTouched: ["CustomerProfile"],
    auditLogRequired: false,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "openCustomerProfile",
    routeUsedIn: ["/app/customer-360"],
    permissionRequired: "view_customers",
    serverFunction: "getCustomerProfile",
    dbTablesTouched: ["CustomerProfile", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "createSegment",
    routeUsedIn: ["/app/segments"],
    permissionRequired: "manage_segments",
    serverFunction: "createSegment",
    dbTablesTouched: ["Segment", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "updateSegment",
    routeUsedIn: ["/app/segments"],
    permissionRequired: "manage_segments",
    serverFunction: "updateSegment",
    dbTablesTouched: ["Segment", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "deleteSegment",
    routeUsedIn: ["/app/segments"],
    permissionRequired: "manage_segments",
    serverFunction: "deleteSegment",
    dbTablesTouched: ["Segment", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "createCampaign",
    routeUsedIn: ["/app/campaigns"],
    permissionRequired: "manage_campaigns",
    serverFunction: "createCampaign",
    dbTablesTouched: ["Campaign", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "updateCampaign",
    routeUsedIn: ["/app/campaigns"],
    permissionRequired: "manage_campaigns",
    serverFunction: "updateCampaign",
    dbTablesTouched: ["Campaign", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "sendCampaignForReview",
    routeUsedIn: ["/app/campaigns"],
    permissionRequired: "manage_campaigns",
    serverFunction: "sendCampaignForReview",
    dbTablesTouched: ["Campaign", "Notification", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "approveCampaign",
    routeUsedIn: ["/app/campaigns"],
    permissionRequired: "approve_campaigns",
    serverFunction: "approveCampaign",
    dbTablesTouched: ["Campaign", "Notification", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "launchCampaign",
    routeUsedIn: ["/app/campaigns"],
    permissionRequired: "manage_campaigns",
    serverFunction: "launchCampaign",
    dbTablesTouched: ["Campaign", "UsageMeter", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: true,
    implemented: false
  },
  {
    name: "pauseCampaign",
    routeUsedIn: ["/app/campaigns"],
    permissionRequired: "manage_campaigns",
    serverFunction: "pauseCampaign",
    dbTablesTouched: ["Campaign", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "archiveCampaign",
    routeUsedIn: ["/app/campaigns"],
    permissionRequired: "manage_campaigns",
    serverFunction: "archiveCampaign",
    dbTablesTouched: ["Campaign", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "generateCreativeVariants",
    routeUsedIn: ["/app/creative-studio"],
    permissionRequired: "manage_creatives",
    serverFunction: "generateCreativeVariants",
    dbTablesTouched: ["CreativeVariant", "UsageMeter", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: true,
    implemented: false
  },
  {
    name: "approveCreativeVariant",
    routeUsedIn: ["/app/creative-studio"],
    permissionRequired: "approve_campaigns",
    serverFunction: "approveCreativeVariant",
    dbTablesTouched: ["CreativeVariant", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "rejectCreativeVariant",
    routeUsedIn: ["/app/creative-studio"],
    permissionRequired: "approve_campaigns",
    serverFunction: "rejectCreativeVariant",
    dbTablesTouched: ["CreativeVariant", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "regenerateCreativeVariant",
    routeUsedIn: ["/app/creative-studio"],
    permissionRequired: "manage_creatives",
    serverFunction: "regenerateCreativeVariant",
    dbTablesTouched: ["CreativeVariant", "UsageMeter", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: true,
    implemented: false
  },
  {
    name: "createExperiment",
    routeUsedIn: ["/app/experiments"],
    permissionRequired: "manage_experiments",
    serverFunction: "createExperiment",
    dbTablesTouched: ["Experiment", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "startExperiment",
    routeUsedIn: ["/app/experiments"],
    permissionRequired: "manage_experiments",
    serverFunction: "startExperiment",
    dbTablesTouched: ["Experiment", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "simulateBanditStep",
    routeUsedIn: ["/app/experiments"],
    permissionRequired: "manage_experiments",
    serverFunction: "simulateBanditStep",
    dbTablesTouched: ["Experiment", "FeedbackEvent", "UsageMeter", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: true,
    implemented: false
  },
  {
    name: "declareExperimentWinner",
    routeUsedIn: ["/app/experiments"],
    permissionRequired: "manage_experiments",
    serverFunction: "declareExperimentWinner",
    dbTablesTouched: ["Experiment", "CreativeVariant", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "triggerModelRetraining",
    routeUsedIn: ["/app/model-ops"],
    permissionRequired: "manage_models",
    serverFunction: "triggerModelRetraining",
    dbTablesTouched: ["ModelVersion", "ModelEvent", "UsageMeter", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: true,
    implemented: false
  },
  {
    name: "promoteModelVersion",
    routeUsedIn: ["/app/model-ops"],
    permissionRequired: "manage_models",
    serverFunction: "promoteModelVersion",
    dbTablesTouched: ["ModelVersion", "ModelEvent", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "rollbackModelVersion",
    routeUsedIn: ["/app/model-ops"],
    permissionRequired: "manage_models",
    serverFunction: "rollbackModelVersion",
    dbTablesTouched: ["ModelVersion", "ModelEvent", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "inviteTeamMember",
    routeUsedIn: ["/app/team"],
    permissionRequired: "manage_users",
    serverFunction: "inviteTeamMember",
    dbTablesTouched: ["User", "Membership", "Notification", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "changeUserRole",
    routeUsedIn: ["/app/team"],
    permissionRequired: "manage_users",
    serverFunction: "changeUserRole",
    dbTablesTouched: ["Membership", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "removeTeamMember",
    routeUsedIn: ["/app/team"],
    permissionRequired: "manage_users",
    serverFunction: "removeTeamMember",
    dbTablesTouched: ["Membership", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "createApiKey",
    routeUsedIn: ["/app/settings"],
    permissionRequired: "manage_billing", // using as proxy for owner
    serverFunction: "createApiKey",
    dbTablesTouched: ["ApiKey", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "rotateApiKey",
    routeUsedIn: ["/app/settings"],
    permissionRequired: "manage_billing",
    serverFunction: "rotateApiKey",
    dbTablesTouched: ["ApiKey", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "deleteApiKey",
    routeUsedIn: ["/app/settings"],
    permissionRequired: "manage_billing",
    serverFunction: "deleteApiKey",
    dbTablesTouched: ["ApiKey", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "createWebhook",
    routeUsedIn: ["/app/settings"],
    permissionRequired: "manage_billing",
    serverFunction: "createWebhook",
    dbTablesTouched: ["WebhookEndpoint", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "testWebhook",
    routeUsedIn: ["/app/settings"],
    permissionRequired: "manage_billing",
    serverFunction: "testWebhook",
    dbTablesTouched: ["AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "updateBrandVoice",
    routeUsedIn: ["/app/settings"],
    permissionRequired: "manage_billing",
    serverFunction: "updateBrandVoice",
    dbTablesTouched: ["BrandVoice", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "updateGuardrails",
    routeUsedIn: ["/app/settings"],
    permissionRequired: "manage_billing",
    serverFunction: "updateGuardrails",
    dbTablesTouched: ["GuardrailRule", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "updateProfile",
    routeUsedIn: ["/app/profile"],
    permissionRequired: "none",
    serverFunction: "updateProfile",
    dbTablesTouched: ["User", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "markNotificationRead",
    routeUsedIn: ["Topbar"],
    permissionRequired: "none",
    serverFunction: "markNotificationRead",
    dbTablesTouched: ["Notification"],
    auditLogRequired: false,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "exportAuditLogs",
    routeUsedIn: ["/app/audit-logs"],
    permissionRequired: "manage_billing",
    serverFunction: "exportAuditLogs",
    dbTablesTouched: ["AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  },
  {
    name: "upgradePlanMock",
    routeUsedIn: ["/app/billing"],
    permissionRequired: "manage_billing",
    serverFunction: "upgradePlanMock",
    dbTablesTouched: ["BillingPlan", "AuditLog"],
    auditLogRequired: true,
    usageMeterRequired: false,
    implemented: false
  }
]
