# Verification: Jay Context Awareness

## Overview
Implemented generic context injection for Jay, allowing him to be aware of the user's pricing tier, existing topic, and name. This improves the "Agency Onboarding" experience by skipping redundant discovery questions.

## 1. System Prompt (`src/features/bot/prompts/system.ts`)
- **New Function**: `buildJayPrompt(context)`
- **Logic**:
    - `tier`: Adds `<user_context>` block instructing Jay to focus on that tier + NO DIY PITCH.
    - `existingTopic`: Adds `<existing_topic>` block instructing Jay to skip topic generation.
    - `userName`: Adds `<personalization>` block.

## 2. API Route (`src/app/api/chat/route.ts`)
- **V6 Standard**: Refactored to use `convertToModelMessages` for robust tool history support.
- **Context Handling**: Extracts `tierContext`, `existingTopic`, `userName` from request body and builds dynamic prompt.
- **Sanitization**: Applied `sanitizeInput` to user message content while preserving V6 message structure.

## 3. Client Integration
- **`useChatFlow`**: Now accepts `userId` and `userName`.
- **Injection**: Reads `?tier=` from URL and `builderStore.data.topic`.
- **Fetch**: Injects these values into the `body` of every chat request.
- **UI**: `ChatInterface` passes the authenticated user's name.

## 4. Verification Steps

### Test A: Tier Context (Agency Flow)
1. URL: `/chat?tier=AGENCY_SOFT_LIFE`
2. Message: "Hi"
3. Expected Response: "Yo [Name]! I see you're interested in the Soft Life package. That's the premium stress-free route..." (Should NOT ask for department/topic if context is strong, or will tailor topic suggestions).

### Test B: Existing Topic (Builder Handoff)
1. User creates a topic in Builder: "Solar Powered Yam Pounder".
2. User goes to Chat.
3. Message: "What do you think?"
4. Expected Response: "Solar Powered Yam Pounder is a solid idea..." (Acknowledges topic immediately).

### Test C: Standard Flow
1. URL: `/chat` (No params)
2. Expected Response: Standard greeting, asks for department. (Fallback works).
