# AUDIT_MODEL_OPS

## 1. Issue found
The Model Drift Monitor graph relies on mock data or channel performance arrays instead of actual timeseries `ModelMetric` rows.

## 2. Route/component affected
- `src/app/app/model-ops/page.tsx`
- `src/lib/actions/mlops.ts`

## 3. Expected behavior
The UI must query the DB for `ModelMetric` and display real feature drift, P95 latency, and error rates. "Re-train Model" must append a new metric point reflecting improved performance.

## 4. Actual behavior
The graph derives its base series from random math or unrelated dashboard metrics.

## 5. Root cause
`ModelMetric` architecture wasn't fully piped into the charting component.

## 6. Files to change
- `src/app/app/model-ops/page.tsx`
- `src/lib/actions/mlops.ts`

## 7. Fix implemented
[Pending]

## 8. Verification result
[Pending]
