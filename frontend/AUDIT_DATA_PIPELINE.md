# AUDIT_DATA_PIPELINE

## 1. Issue found
CSV import creates customers and events but fails to recursively generate the full downstream intelligence artifacts required for the demo to feel complete.

## 2. Route/component affected
- `src/lib/services/post-import-intelligence.service.ts`
- `scripts/verify-data-integrity.ts`

## 3. Expected behavior
Importing 60 customers and 310 events should automatically yield minimums of 6 segments, 5 campaigns, 15 creative variants, 2 experiments, 150 decisions, 100 feedback events, and >35 metric points.

## 4. Actual behavior
The downstream generation crashes or is skipped due to schema and logic constraints.

## 5. Root cause
`post-import-intelligence.service.ts` lacks comprehensive transaction blocks to scaffold all interrelated models safely.

## 6. Files to change
- `src/lib/services/post-import-intelligence.service.ts`

## 7. Fix implemented
[Pending]

## 8. Verification result
[Pending]
