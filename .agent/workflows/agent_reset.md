---
description: Mid-conversation reset to prevent hallucination and malformed edits in long context
---

# 🧠 Agent Reset Protocol

> **TRIGGER THIS WORKFLOW** when the conversation gets long, the agent starts making mistakes, or before critical edits.

---

## 🛑 HARD STOP - READ THIS FIRST

You are exhibiting context degradation. Before doing ANYTHING:

1. **STOP THINKING. START DOING.** If you've written "Submit" or "Done" more than once without actually outputting, you're in a loop.
2. **ONE ACTION PER TURN.** Pick ONE thing to do. Do it. Wait for feedback.
3. **NO INTERNAL MONOLOGUE.** If you catch yourself writing "(Wait, I should...)" - STOP. That's a loop symptom.
4. **READ BEFORE EDIT. ALWAYS.**

You are exhibiting signs of context degradation. Before continuing:

### 1. Mandatory Pre-Edit Checklist

```
□ Did I READ the target file with `view_file` BEFORE editing?
□ Did I copy the EXACT target content, including whitespace?
□ Am I editing LESS than 50 lines at a time?
□ Did I verify all variable names I'm using actually exist in scope?
□ Did I check that all props I'm using are destructured in the function signature?
```

### 2. Common Hallucination Patterns to Avoid

| Pattern | What Goes Wrong | Fix |
|---------|-----------------|-----|
| **Duplicate lines** | Pasting same useState twice | Read file first, count state declarations |
| **Missing destructuring** | Using `onInsert` without extracting from props | Check function(props) signature matches usage |
| **Broken JSX** | Mismatched tags, random `</Card >` | Always close tags in same edit block |
| **Phantom variables** | Using variables that don't exist | Ctrl+F in file before using any name |
| **Edit offset drift** | Line numbers shift after edits | Re-read file after each edit |

### 3. File Edit Protocol

**BEFORE ANY EDIT:**
```
1. view_file_outline → Understand structure
2. view_file (exact line range) → Copy PRECISE target content
3. Make edit with MINIMAL scope
4. Re-check file if making another edit
```

**NEVER:**
- Edit multiple non-contiguous sections without re-reading
- Guess at indentation or whitespace
- Add variables without checking they exist
- Declare "done" without verifying lint errors are gone

### 4. Panic Recovery

If you made a mistake:

1. **DO NOT PANIC.** Errors are fixable.
2. **STOP making more edits.** Each edit on broken code makes it worse.
3. **Read the current file state** with `view_file`
4. **Identify the EXACT problem** (duplicate line? missing import? wrong scope?)
5. **Fix ONE thing at a time**

### 5. Completion Checklist

Before saying "I'm done":

```
□ All lint errors resolved (check @[current_problems])
□ All files I edited still parse correctly
□ I verified the code with my own eyes, not assumed
□ Build/dev server is not throwing errors
□ I documented what I changed
```

---

## 📋 Quick Copy-Paste Reminder

Add this to your prompts when the agent is misbehaving:

```
MANDATORY: 
1. Use view_file BEFORE every edit to get EXACT current content
2. Fix ONE error at a time, then re-read the file
3. Verify all variables/props exist before using them
4. Check @[current_problems] before declaring done
5. DO NOT PANIC if you make errors - read, understand, fix methodically
```

---

## 🎯 Why This Happens

Long conversations cause:
- **Attention drift** - Agent forgets earlier code structure
- **Token pressure** - Summarization loses exact details
- **Confirmation bias** - Agent "remembers" code that doesn't exist
- **Panic loops** - Error triggers more hasty edits

**The fix is always: SLOW DOWN, READ FIRST, EDIT SMALL.**
