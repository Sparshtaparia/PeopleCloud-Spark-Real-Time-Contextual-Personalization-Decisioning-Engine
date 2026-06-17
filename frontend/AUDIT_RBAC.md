# AUDIT_RBAC

## 1. Issue found
RBAC is currently only cosmetic. Server actions lack deep role enforcement.

## 2. Route/component affected
- `src/lib/server-utils.ts`
- `src/hooks/use-permissions.ts`
- Server action files (`actions/*.ts`)

## 3. Expected behavior
Actions like `generateCreativeVariants` must explicitly verify the actor's role against permissions (e.g. `marketer`, `admin`). Blocked actions should yield a `permission.denied` audit log.

## 4. Actual behavior
Most server actions either do a generic auth check or basic tenant check without validating the required permission tier.

## 5. Root cause
RBAC wasn't deeply integrated into the action layer.

## 6. Files to change
- `src/lib/rbac/permissions.ts`
- `src/lib/actions/*`

## 7. Fix implemented
[Pending]

## 8. Verification result
[Pending]
