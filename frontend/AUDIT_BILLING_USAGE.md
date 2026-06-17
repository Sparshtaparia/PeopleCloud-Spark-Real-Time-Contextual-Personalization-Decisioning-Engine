# AUDIT_BILLING_USAGE

## 1. Issue found
Billing metrics are statically mocked. Action buttons are non-functional placeholders.

## 2. Route/component affected
- `src/app/app/settings/billing/page.tsx` (or similar)
- Core service pipeline

## 3. Expected behavior
Billing usage must aggregate dynamically from `UsageMeter` tables. "Upgrade Plan", "Download Invoice", and "Manage Seats" must perform actual routing or server actions.

## 4. Actual behavior
Usage is disconnected from real system throughput (events ingested, decisions served).

## 5. Root cause
`UsageMeter` records weren't systematically updated by the corresponding operational pipelines.

## 6. Files to change
- Relevant UI and action files.

## 7. Fix implemented
[Pending]

## 8. Verification result
[Pending]
