# AUDIT_AI_PIPELINE

## 1. Issue found
AI/ML modules (Identity Resolution, Segmentation, Scoring) generate impossible or incorrectly formatted values.

## 2. Route/component affected
- `src/lib/ai/*.ts`
- Database storage types

## 3. Expected behavior
`churnRisk`, `identityConfidence`, `conversionProbability` must be stored as decimals (0-1). Formatted outputs should be clean.

## 4. Actual behavior
Values like `700%` churn risk appear. Segment values duplicate across all campaigns.

## 5. Root cause
Missing normalization algorithms and central formatters.

## 6. Files to change
- `src/lib/ai/scoring.ts`
- `src/lib/formatters.ts`

## 7. Fix implemented
[Pending]

## 8. Verification result
[Pending]
