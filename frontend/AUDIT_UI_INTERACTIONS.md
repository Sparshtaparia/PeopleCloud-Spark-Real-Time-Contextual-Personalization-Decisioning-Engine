# AUDIT_UI_INTERACTIONS

## 1. Issue found
Various UI elements use dead links, placeholder modals, or mock actions.

## 2. Route/component affected
Across `src/app/app/` (Command Center, Campaigns, Segments, Landing Page).

## 3. Expected behavior
Every visible action must navigate to a real route, open a real modal, trigger a server action, or update DB state.

## 4. Actual behavior
Some buttons are missing `onClick` handlers or only trigger console logs. Modals might not submit to server actions.

## 5. Root cause
UI prototyping outpaced backend integration.

## 6. Files to change
- `src/app/page.tsx`
- Various page/component files

## 7. Fix implemented
[Pending]

## 8. Verification result
[Pending]
