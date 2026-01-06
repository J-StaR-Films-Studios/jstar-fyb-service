# 🔧 AGENT TASK: Fix LocalStorage vs Database Race Condition

## Task ID: RACE-001
## Priority: 🔴 CRITICAL
## Estimated Complexity: Low-Medium (30-50 LOC changes)

---

## 📋 Executive Summary

You are fixing a **race condition** in the J Star FYB Service where localStorage state can incorrectly override fresh database data, causing users to appear "unpaid" when they've actually paid.

**The Core Problem:**
1. Zustand's `persist` middleware hydrates from localStorage **synchronously** (INSTANT)
2. Server component fetches `isUnlocked` from database **asynchronously** (DELAYED)
3. The `hasServerHydrated` flag can block fresh server data from being applied
4. Result: Stale localStorage wins → User sees "you haven't paid" even when DB shows paid

---

## 📚 Required Reading

Before making ANY changes, you MUST read and understand these files:

1. **Research Document** (SOURCE OF TRUTH): 
   `docs/research/RaceCondition_LocalStorage_vs_Database.md`

2. **Files You Will Modify**:
   - `src/features/builder/store/useBuilderStore.ts` (main state store)
   - `src/app/(saas)/project/builder/BuilderClient.tsx` (hydration orchestrator)

3. **Related Files** (read-only, for context):
   - `src/app/(saas)/project/builder/page.tsx` (server component that fetches DB data)
   - `src/features/builder/hooks/usePaymentVerification.ts` (payment callback hook)

---

## 🎯 Specific Changes Required

### Change 1: Remove `hasServerHydrated` Gate from `loadProject()`

**File**: `src/features/builder/store/useBuilderStore.ts`

**Current Code (around line 240-264)**:
```typescript
loadProject: (projectData, isPaid = false) => {
    console.log('[Builder] Hydrating from server project', { id: projectData.projectId, isPaid, outlineLen: projectData.outline?.length });
    
    set((state) => ({
        step: (projectData.outline && projectData.outline.length > 0) ? 'OUTLINE'
            : projectData.abstract ? 'ABSTRACT'
                : projectData.topic ? 'ABSTRACT'
                    : 'TOPIC',
        data: {
            ...state.data,
            ...projectData
        },
        isPaid: isPaid ?? false,
        isFromChat: false,
        hasServerHydrated: true
    }));
}
```

**Required Change**:
The function currently doesn't check `hasServerHydrated` before setting state, which is CORRECT behavior. However, we need to ensure that `isPaid` is ALWAYS set from server regardless of any prior state. The current implementation is actually fine for `loadProject()` itself.

The REAL issue is in the hydration flow order. See Change 2.

---

### Change 2: Reset `hasServerHydrated` at the START of Each Navigation

**File**: `src/app/(saas)/project/builder/BuilderClient.tsx`

**Current Code (around line 37-65)**:
```typescript
// ========== CONSOLIDATED HYDRATION LOGIC ==========
useEffect(() => {
    if (isPending) return;

    const hasFreshHandoff = hydrateFromChat(session?.user?.id, serverProject, serverIsPaid);

    if (hasFreshHandoff) {
        console.log('[BuilderClient] Fresh chat handoff applied. Skipping server load.');
        return;
    }

    if (serverProject) {
        loadProject(serverProject, serverIsPaid);
        console.log('[BuilderClient] Hydrated from server', { projectId: serverProject.projectId, isPaid: serverIsPaid });
    }

    syncWithUser(session?.user?.id || null);

}, [isPending, serverProject, serverIsPaid, session?.user?.id, loadProject, syncWithUser, hydrateFromChat]);
```

**Required Change**:
Add a reset of `hasServerHydrated` at the VERY START of the effect to ensure fresh server data can always be applied:

```typescript
// ========== CONSOLIDATED HYDRATION LOGIC ==========
useEffect(() => {
    if (isPending) return;

    // 🔧 FIX: Reset hasServerHydrated to allow fresh data on each navigation/tab
    // This ensures that server data (especially isPaid) can always override stale localStorage
    useBuilderStore.setState({ hasServerHydrated: false });

    const hasFreshHandoff = hydrateFromChat(session?.user?.id, serverProject, serverIsPaid);

    if (hasFreshHandoff) {
        console.log('[BuilderClient] Fresh chat handoff applied. Skipping server load.');
        return;
    }

    if (serverProject) {
        loadProject(serverProject, serverIsPaid);
        console.log('[BuilderClient] Hydrated from server', { projectId: serverProject.projectId, isPaid: serverIsPaid });
    }

    syncWithUser(session?.user?.id || null);

}, [isPending, serverProject, serverIsPaid, session?.user?.id, loadProject, syncWithUser, hydrateFromChat]);
```

**Import Required** (if not already present at top of file):
```typescript
import { useBuilderStore } from "@/features/builder/store/useBuilderStore";
```

> [!WARNING]
> Make sure you're calling `useBuilderStore.setState()` (the static method), NOT `set()` from inside a hook. This is external state mutation which is intentional here.

---

### Change 3: Ensure `syncWithUser()` Respects Fresh Server Data

**File**: `src/features/builder/store/useBuilderStore.ts`

**Current Code (around line 172-180)**:
```typescript
syncWithUser: (userId) => {
    const { data: currentData, hasServerHydrated } = get();

    // If server has already hydrated, don't let localStorage-based logic overwrite
    if (hasServerHydrated) {
        console.log('[Builder] Server already hydrated, skipping syncWithUser reset');
        return;
    }
    // ... rest of the function
```

**Analysis**: This check is NOW SAFE because we reset `hasServerHydrated` to `false` at the start of each navigation (Change 2). After `loadProject()` is called, `hasServerHydrated` becomes `true`, which correctly prevents `syncWithUser()` from overwriting the just-loaded server data.

**No change needed here** - the logic is correct once Change 2 is applied.

---

### Change 4: Add Comment Clarification for Future Maintainers

**File**: `src/features/builder/store/useBuilderStore.ts`

Add a clarifying comment near the top of the store (after imports, before the interface definitions):

```typescript
/**
 * IMPORTANT: State Hydration Priority
 * 
 * This store uses Zustand's persist middleware with localStorage.
 * The hydration order is CRITICAL to prevent race conditions:
 * 
 * 1. Zustand instantly hydrates `data` from localStorage (SYNC)
 * 2. Server component fetches fresh data from DB (ASYNC)
 * 3. BuilderClient.tsx calls loadProject() with server data
 * 
 * The `hasServerHydrated` flag prevents localStorage from overwriting
 * server data AFTER loadProject() is called. It is reset on each
 * navigation in BuilderClient.tsx to allow fresh data.
 * 
 * NEVER persist `isPaid` to localStorage - server is ALWAYS source of truth.
 */
```

---

## ✅ Verification Checklist

After making changes, verify the fix works:

### Test 1: Multi-Tab Sync
1. Open the project builder in Tab A
2. Complete payment flow (or manually set `isUnlocked: true` in DB via Prisma Studio)
3. Open a NEW Tab B at the same URL
4. **Expected**: Tab B should show `isPaid: true` (no "you need to pay" message)

### Test 2: Cross-Device Simulation
1. Open Chrome DevTools → Application → Local Storage
2. Find `jstar-builder-storage` key
3. Manually edit the stored JSON to have an old `projectId` or different `userId`
4. Refresh the page
5. **Expected**: Server data should override the manipulated localStorage

### Test 3: Payment Status Consistency
1. In Admin Portal, verify a project shows `isUnlocked: true`
2. Open the user-facing builder for that project
3. **Expected**: User should NOT see paywall/upgrade prompts

### Build Verification
Run these commands and ensure no errors:
```powershell
pnpm build
pnpm lint
```

---

## 📝 Self-Review Template

After completing the fix, fill out this review and include it in your response:

```markdown
## Agent Self-Review: RACE-001

### Changes Made
- [ ] Reset `hasServerHydrated` in BuilderClient.tsx useEffect
- [ ] Added clarifying comments in useBuilderStore.ts
- [ ] (Optional) Any additional changes made: ___

### Files Modified
1. `src/app/(saas)/project/builder/BuilderClient.tsx`
   - Lines changed: ___
   - Nature of change: ___

2. `src/features/builder/store/useBuilderStore.ts`
   - Lines changed: ___
   - Nature of change: ___

### Testing Performed
- [ ] Multi-Tab Sync test passed
- [ ] Cross-Device Simulation test passed
- [ ] Payment Status Consistency test passed
- [ ] `pnpm build` succeeded
- [ ] `pnpm lint` passed (or list any pre-existing lint issues)

### Potential Risks
- Risk 1: ___
- Mitigation: ___

### Confidence Level
- [ ] ✅ High - This is a surgical fix with minimal blast radius
- [ ] ⚠️ Medium - There are some edge cases I'm unsure about
- [ ] ❌ Low - More investigation needed

### Questions for Review Agent
1. ___
2. ___
```

---

## 🚫 Out of Scope

Do NOT implement these in this task (they are Phase 2 enhancements):
- Server refresh API on tab focus (Fix 2 from research doc)
- BroadcastChannel for multi-tab sync (Fix 3 from research doc)
- Any changes to the payment webhook or billing service

---

## 📂 Project Context

- **Framework**: Next.js 14 (App Router)
- **State Management**: Zustand with persist middleware
- **Database**: PostgreSQL via Prisma
- **Package Manager**: pnpm

**Key Commands**:
```powershell
pnpm dev      # Start dev server
pnpm build    # Production build
pnpm lint     # Run ESLint
```

---

## 🏁 Definition of Done

- [ ] All changes from the "Specific Changes Required" section are implemented
- [ ] All "Verification Checklist" items pass
- [ ] Self-Review Template is completed
- [ ] No new lint errors introduced
- [ ] Build succeeds

---

*Task created: 2026-01-02*
*Research source: docs/research/RaceCondition_LocalStorage_vs_Database.md*
