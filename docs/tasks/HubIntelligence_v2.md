# Hub Intelligence v2 - Future Enhancements

## Priority Queue

### 1. Navigation Fix
- [ ] Add header nav or back button to `/hub` page
- [ ] Consider adding to the main SaasShell layout

### 2. Chat History Persistence
- [ ] Load previous messages on page load (from `Conversation` table)
- [ ] Add conversation list/sidebar to switch between chats
- [ ] "New Chat" button that creates fresh conversation

### 3. Smart Initial Messages
- [ ] Replace hardcoded welcome with dynamic greeting
- [ ] Base on: last activity, project progress, time of day
- [ ] Example: "You left off working on Chapter 3 yesterday. Ready to pick it back up?"

### 4. Memory Layer Evaluation
**Options to consider:**
| Option | Pros | Cons |
|--------|------|------|
| **DIY (Prisma + pgvector)** | Already have infra, full control | More work |
| **Mem0** | Easy setup, automatic summarization | External dependency |
| **Zep** | Best for chat memory, entity extraction | Paid for production |
| **LangMem** | LangChain integration | Overkill if not using LC |

**Recommendation:** Start with DIY using existing `Conversation` model, upgrade later if needed.

---

*Logged: 2026-01-05*
