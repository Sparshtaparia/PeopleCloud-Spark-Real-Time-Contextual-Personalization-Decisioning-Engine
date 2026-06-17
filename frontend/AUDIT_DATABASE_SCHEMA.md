# AUDIT_DATABASE_SCHEMA

## 1. Issue found
Missing key models and missing tenant-scoping fields in some tables.

## 2. Route/component affected
`prisma/schema.prisma`

## 3. Expected behavior
All models (including `FeedbackEvent`, `WebhookEndpoint`, `WorkspaceSetting`, `SegmentCustomer`) exist and all workspace-owned models have `organizationId` and `workspaceId`.

## 4. Actual behavior
Some models like `FeedbackEvent` and `WorkspaceSetting` are missing from the schema. Some models might lack proper cascading deletions or tenant scoping.

## 5. Root cause
Rapid prototyping left schema incomplete compared to the requested architecture.

## 6. Files to change
- `prisma/schema.prisma`

## 7. Fix implemented
[Pending]

## 8. Verification result
[Pending]
