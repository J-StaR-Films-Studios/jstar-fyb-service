# 🎯 Task: Smart Asset Insertion Workflow

**Objective:** Enable a seamless workflow where the Agent can either (A) generated an asset and let the user insert it at their cursor, or (B) directly "write" the asset into the chapter content (e.g. via Markdown) upon request.
**Priority:** High
**Scope:** Frontend Editor (Novel/Tiptap), Agent Tools (AcademicTools), Chat UI (AcademicCopilot).

---

## 📋 Requirements

### Functional Requirements
- **[REQ-001]** **Manual Insertion:** User can place cursor in editor, click "Insert" on a Diagram/Image card in chat, and have it appear at the cursor. (Already partially implemented, needs verification).
- **[REQ-002]** **Agentic Insertion:** User can ask "Insert this diagram after paragraph 1", and Agent can execute this modification directly on the chapter content.
- **[REQ-003]** **Markdown Support:** The Editor must render Mermaid diagrams when they are written as Markdown code blocks (e.g. \`\`\`mermaid\`) in the content. This allows the Agent to "write" diagrams naturally.

### Technical Requirements
- **[TECH-001]** Verify `NovelEditor` / Tiptap configuration supports Mermaid code block extensions or custom nodes from Markdown.
- **[TECH-002]** If Markdown support works, update Agent System Prompt to know it can "write" diagrams using Markdown.
- **[TECH-003]** If Client-side tool call is needed for "Insert at Cursor" (without knowing exact text position), implement `interceptToolCall` in `AcademicCopilot` to handle `insert_diagram` action using `editorRef`.

---

## 🏗️ Implementation Plan

### Phase 1: Editor & Markdown Audit
- [x] Check `NovelEditor.tsx` extensions.
- [x] Verify if pasting \`\`\`mermaid ... \`\`\` into the editor renders a diagram.
- [x] If not, add a Tiptap extension for Mermaid hydration from Markdown.

### Phase 2: Agent Tools Update
- [x] Add `insertDiagram` tool (or update `generateDiagram`) to allow an "auto-insert" flag? 
- [x] OR: Teach Agent (System Prompt) that it can use `editChapter` to insert diagrams as Markdown.

### Phase 3: Client-Side Insertion (The "Hybrid" Flow)
- [x] Ensure `AcademicCopilot` exposes `onInsertDiagram` (Done).
- [x] Connect `ToolResultCard` buttons to this handler (if not already).
- [x] (Optional) Implement a client-side tool `insertAtCursor` if the Agent needs to trigger insertion without editing text directly.

---

## 📁 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/features/builder/components/v2/NovelEditor.tsx` | Modify | Add/Verify Mermaid Markdown support |
| `src/features/bot/prompts/system.ts` | Modify | Instruct Agent on how to insert diagrams |
| `src/lib/ai/academicTools.ts` | Check | Checked but no changes needed (used strict Agent protocols instead) |

---

## ✅ Success Criteria

### Functionality
- [x] Typing \`\`\`mermaid graph TD; A-->B; \`\`\` in the editor renders a diagram.
- [x] Agent responding with a mermaid code block in `editChapter` results in a rendered diagram.
- [x] "Insert" button in Chat UI correctly inserts at specific cursor position.

---

## 🚀 Getting Started

1. **Test the Editor:** Try manually typing a mermaid block in the editor.
2. **If it works:** Update Agent prompt.
3. **If it fails:** Add the extension to `NovelEditor`.
