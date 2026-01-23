# 🎯 Task: Chat History Integration

**Objective:** Replace mock data in ChatHistory component with real API integration to show user's past conversations.

**Branch:** `ux/chat-history`
**Priority:** High

---

## 📋 Requirements

### Functional Requirements
- **[REQ-001]** ChatHistory sidebar shows real conversations from database
- **[REQ-002]** Conversations are sorted by most recent
- **[REQ-003]** Clicking a conversation loads that chat
- **[REQ-004]** "New Chat" button creates a fresh conversation

### Technical Requirements
- **[TECH-001]** Use existing Prisma `Conversation` model
- **[TECH-002]** Create server action to fetch conversations
- **[TECH-003]** Handle both authenticated and anonymous users

---

## 🏗️ Implementation Plan

### Phase 1: Create Server Action
- [ ] Open `src/features/bot/actions/chat.ts`
- [ ] Add `getConversationHistory` server action

```typescript
'use server';

export async function getConversationHistory({
  userId,
  anonymousId,
  botType = 'jay',
  limit = 20,
}: {
  userId?: string;
  anonymousId?: string;
  botType?: string;
  limit?: number;
}) {
  // Query Conversation model
  // Return { id, title (first message), createdAt, messageCount }
}
```

### Phase 2: Update ChatHistory Component
- [ ] Open `src/features/bot/components/ChatHistory.tsx`
- [ ] Remove mock data
- [ ] Fetch real data using the server action
- [ ] Add loading state
- [ ] Add empty state

### Phase 3: Wire Up Navigation
- [ ] Clicking conversation should navigate to `/chat?id=[conversationId]`
- [ ] "New Chat" should clear current and create fresh conversation
- [ ] Show active conversation visually

### Phase 4: Handle Anonymous Users
- [ ] Read `jstar_anonymous_id` from localStorage
- [ ] Pass to server action for querying

---

## 📁 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/features/bot/actions/chat.ts` | Modify | Add `getConversationHistory` action |
| `src/features/bot/components/ChatHistory.tsx` | Modify | Real API integration |

---

## 🔍 Existing Code Reference

The current `ChatHistory.tsx` has this mock structure:
```typescript
const history = [
    { id: '1', title: 'AI Fraud Detection', date: 'Today' },
    { id: '2', title: 'SaaS Builder Platform', date: 'Yesterday' },
];
```

Replace with real data from Prisma. Check `prisma/schema.prisma` for the `Conversation` model structure.

---

## ✅ Success Criteria

### Code Quality
- [ ] TypeScript compliant (`npx tsc --noEmit` passes)
- [ ] Server action properly typed with Zod validation
- [ ] No `any` types

### Functionality
- [ ] Real conversations appear in sidebar
- [ ] Conversations load when clicked
- [ ] New Chat works
- [ ] Works for both logged-in and anonymous users

---

## 🚀 Getting Started

1. Run `pnpm install`
2. Run `npx prisma generate` to ensure client is up to date
3. Start dev server: `pnpm dev`
4. Check `prisma/schema.prisma` for Conversation model
5. Test with real conversation data
6. Run `npx tsc --noEmit` before marking complete
