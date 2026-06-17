# AUDIT_COMMAND_CENTER_METRICS

## 1. Issue found
Dashboard metrics contradict each other, show impossible numbers, or ignore channel filters.

## 2. Route/component affected
- `src/lib/services/dashboard-metrics.service.ts`
- `src/app/app/page.tsx`

## 3. Expected behavior
All metrics (Revenue Influenced, Bandit Decisions, Identity Match, etc.) must aggregate dynamically from the database based on the selected channel filter.

## 4. Actual behavior
Metrics are sometimes populated from static arrays or loosely aggregated without respect to the `channelMap`.

## 5. Root cause
`dashboard.service.ts` uses pseudo-random static generators or partial DB aggregations.

## 6. Files to change
- `src/lib/services/dashboard.service.ts` (to become `dashboard-metrics.service.ts`)

## 7. Fix implemented
[Pending]

## 8. Verification result
[Pending]
