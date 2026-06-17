# AUDIT_GEMINI_PIPELINE

## 1. Issue found
Gemini API calls lack structural validation, PII scrubbing, and robust fallback handling.

## 2. Route/component affected
- `src/lib/ai/gemini-client.ts`
- `src/lib/actions/creatives.ts`

## 3. Expected behavior
GenAI calls must strip PII, enforce JSON schema validation via Zod, and elegantly fallback to a deterministic generator without breaking the UI if keys are missing or API fails.

## 4. Actual behavior
The UI sometimes returns blank canvases or fails silently if Gemini errors out.

## 5. Root cause
Fragile prompt construction and missing try-catch fallback structures.

## 6. Files to change
- `src/lib/ai/gemini-client.ts`
- `src/lib/ai/creative-generator.ts`

## 7. Fix implemented
[Pending]

## 8. Verification result
[Pending]
