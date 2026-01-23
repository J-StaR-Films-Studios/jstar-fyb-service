---
title: "[Feature] Jay Context Awareness - Tier and Topic Injection"
labels: future-scope, enhancement, ai, agency-onboarding
---

## User Story

As a user who clicked an agency tier, I want Jay to know my intent so that he doesn't ask irrelevant discovery questions.

As a user who already has a topic, I want Jay to skip topic discovery so that the conversation is more efficient.

## Proposed Solution

Enhance Jay's system prompt to accept context parameters and adjust behavior accordingly.

### Files to Modify

1. `src/features/bot/prompts/system.ts` - Add context builder
2. `src/app/api/chat/route.ts` - Pass context from request
3. Chat client component - Send context from URL params

### System Prompt Enhancement

```typescript
// src/features/bot/prompts/system.ts

export function buildJayPrompt(context?: { 
  tier?: string; 
  existingTopic?: string;
  userName?: string;
}) {
  let contextBlock = '';
  
  if (context?.tier) {
    contextBlock += `
<user_context>
This user clicked on the "${context.tier}" agency package.
They are interested in AGENCY SERVICES, not DIY.
DO NOT pitch DIY. Focus on closing them on their selected tier.
Tailor topic suggestions to match this tier's scope and deliverables.
</user_context>
`;
  }
  
  if (context?.existingTopic) {
    contextBlock += `
<existing_topic>
The user ALREADY HAS a topic: "${context.existingTopic}"
DO NOT ask them what department they're in.
DO NOT suggest new topics unless they explicitly ask.
Instead, confirm this topic is great and move directly to requestContactInfo.
</existing_topic>
`;
  }
  
  if (context?.userName) {
    contextBlock += `
<personalization>
The user's name is ${context.userName}. Use it naturally in conversation.
</personalization>
`;
  }
  
  return CORE_IDENTITY + contextBlock;
}
```

### Chat API Enhancement

```typescript
// src/app/api/chat/route.ts

const chatSchema = z.object({
  messages: z.array(...),
  // NEW: Context fields
  tierContext: z.string().optional(),
  existingTopic: z.string().optional(),
  userName: z.string().optional(),
});

// In POST handler:
const dynamicSystemPrompt = buildJayPrompt({ 
  tier: validation.data.tierContext, 
  existingTopic: validation.data.existingTopic,
  userName: validation.data.userName,
});

const result = streamText({
  system: dynamicSystemPrompt,
  // ...
});
```

### Client-Side Context Passing

```typescript
// In chat hook or component
const searchParams = useSearchParams();
const tierContext = searchParams.get('tier');
const savedProject = useProjectStore(s => s.currentProject);

// Include in API request body
body: JSON.stringify({
  messages,
  tierContext,
  existingTopic: savedProject?.topic,
  userName: user?.name,
})
```

## Acceptance Criteria

- [ ] `buildJayPrompt` function accepts context object
- [ ] Tier context injected when present
- [ ] Topic context injected when user has existing project
- [ ] Jay skips department discovery if tier known
- [ ] Jay skips topic suggestions if topic provided
- [ ] Jay uses user's name if available
- [ ] Fallback to standard prompt if no context

## Testing Scenarios

1. **New user, agency tier clicked**
   - Visit `/chat?tier=AGENCY_SOFT_LIFE`
   - Jay should NOT ask "what department are you in"
   - Jay should acknowledge agency interest

2. **Returning user with existing topic**
   - User has project with topic "AI Fraud Detection"
   - Jay should say "Great topic! Let me get your WhatsApp..."
   - Jay should NOT suggest new topics

3. **New user, no context**
   - Visit `/chat` directly
   - Jay behaves as normal (current flow)

## Dependencies

- None (can be built independently)

## Notes

This is marked as `future-scope` because the core onboarding flow works without it. However, it significantly improves UX for agency leads.
