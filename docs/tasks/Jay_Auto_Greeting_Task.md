# 🎯 Task: Jay Auto-Greeting & J Star Collective Tooltip

**Objective:** Implement Jay's auto-greeting when users first open the chat, and add a clickable "J Star Collective" tooltip/popup explaining the AI team.
**Priority:** High (Critical UX fix for onboarding)
**Scope:** `src/features/bot/components/ChatInterface.tsx` and related bot components.

---

## 📋 Requirements

### Functional Requirements
- **[REQ-001]** When a user opens `/chat` with no message history, Jay should auto-send a greeting message (not just display it client-side, but actually trigger the AI to respond).
- **[REQ-002]** Add a clickable badge/button in the chat header showing "Jay + 2 Specialists" that opens a popup explaining:
  - **Jay** (Phase 1: Onboarding Expert – Finds your killer topic)
  - **Monji** (Phase 2: Academic Copilot – Writes with precision & style)
  - **Nengi** (Always On: General Assistant – Brain dump & support)
- **[REQ-003]** The greeting should feel natural and match Jay's personality (energetic, Nigerian slang).

### Technical Requirements
- **[TECH-001]** Review existing `ChatInterface.tsx` to understand current message handling.
- **[TECH-002]** The auto-greeting should trigger on component mount when `messages.length === 0`.
- **[TECH-003]** May need to call `/api/chat` or `/api/hub/chat` endpoint to initiate Jay's response.
- **[TECH-004]** J Star Collective popup should be a reusable component.

---

## 🏗️ Implementation Plan

### Phase 1: Discovery
- [ ] View `src/features/bot/components/ChatInterface.tsx` to understand current implementation
- [ ] Check `/api/chat/route.ts` or `/api/hub/chat/route.ts` for message handling
- [ ] Identify where initial messages are rendered

### Phase 2: Core Implementation
- [ ] Add `JStarCollectivePopup` component (can copy from `CustomerChat.tsx` implementation)
- [ ] Add clickable badge in chat header
- [ ] Implement auto-greeting logic:
  - On mount, if no messages exist, trigger a "system" message or call the AI endpoint with a greeting prompt

### Phase 3: Testing
- [ ] Test new user experience (no messages → sees Jay's greeting)
- [ ] Test popup opens/closes correctly
- [ ] Verify mobile responsiveness

---

## 📁 Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/features/bot/components/ChatInterface.tsx` | Modify | Add auto-greeting logic + popup badge |
| `src/features/bot/components/JStarCollectivePopup.tsx` | Create | Reusable popup component |
| `src/features/builder/components/CustomerChat.tsx` | Reference | Has working popup implementation |

---

## ✅ Success Criteria

- [ ] New users see Jay's greeting immediately when opening `/chat`
- [ ] Clicking "Jay + 2 Specialists" badge opens the J Star Collective popup
- [ ] Popup displays all 3 agents (Jay, Monji, Nengi) with their roles
- [ ] Matches the approved V4 mockup design

---

## 🔗 References

- **Approved Mockup:** `ux_mockup.html` (in brain artifacts)
- **Agent Info Source:** `docs/mockups/consult_morphing_vibe.html`
- **Working Popup Example:** `src/features/builder/components/CustomerChat.tsx`

---

## 🚀 Getting Started

1. Read `src/features/bot/components/ChatInterface.tsx`
2. Copy `JStarCollectivePopup` from `CustomerChat.tsx`
3. Add badge to chat header
4. Implement auto-greeting logic
