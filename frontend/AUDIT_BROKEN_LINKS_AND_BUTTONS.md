# AUDIT_BROKEN_LINKS_AND_BUTTONS

## 1. Issue found
Multiple CTAs, navigation elements, and form buttons are disconnected from application state.

## 2. Route/component affected
- Landing page (`/`)
- Settings & Team pages
- Modals across the app

## 3. Expected behavior
Every interactive element must trigger a state change, a backend request, or intentional navigation. Modals must submit data. `href="#"` patterns must be eliminated.

## 4. Actual behavior
Many buttons log to console or perform no action, leaving the user trapped or confused.

## 5. Root cause
Rapid UI wireframing was not fully backfilled with Next.js navigation and server action bindings.

## 6. Files to change
- Across `src/components/ui/`
- Across `src/app/`

## 7. Fix implemented
[Pending]

## 8. Verification result
[Pending]
