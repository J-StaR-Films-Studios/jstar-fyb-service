---
title: "[Feature] AI Topic Analysis Endpoint"
labels: ai, backend, enhancement
---

## User Story

As the system, I want to analyze a topic and department, so that I can auto-generate complexity and twist suggestions for agency leads.

## Proposed Solution

### Endpoint

`POST /api/analyze-topic`

### Input
```json
{
  "topic": "AI-Powered Yam Detector",
  "department": "Computer Science"
}
```

### Output
```json
{
  "complexity": 4,
  "suggestedTwist": "Uses computer vision + IoT sensors for real-time detection",
  "category": "HARD_TECH",
  "notes": "Requires ML model training, hardware integration"
}
```

### File to Create
`src/app/api/analyze-topic/route.ts`

### Implementation

```typescript
import { streamText } from 'ai';
import { z } from 'zod';

const schema = z.object({
  topic: z.string().min(5),
  department: z.string().min(2),
});

const ANALYSIS_PROMPT = `
You are a Final Year Project analyst. Given a topic and department, analyze and return:

1. complexity (1-5): 1=Basic, 5=PhD-level
2. suggestedTwist: A unique angle that makes this project stand out
3. category: HARD_TECH | WET_SCIENCE | SOCIAL_SCIENCE
4. notes: Brief implementation notes

Respond in JSON only.
`;

export async function POST(req: Request) {
  const body = await req.json();
  const { topic, department } = schema.parse(body);
  
  const result = await generateObject({
    model: 'groq/llama-3.1-8b-instant', // Fast model
    schema: analysisSchema,
    prompt: `Department: ${department}\nTopic: ${topic}`,
    system: ANALYSIS_PROMPT,
  });
  
  return Response.json(result.object);
}
```

## Acceptance Criteria

- [x] POST `/api/analyze-topic` accepts topic + department
- [x] Returns complexity (1-5), twist, category, notes
- [x] Uses fast model (Groq Llama/GPT-OSS) for low latency (<2s)
- [x] Validates input with Zod
- [x] Returns 400 on invalid input
- [x] Returns 500 on AI failure with graceful message

## Implementation Status
**Status:** ✅ Completed
**Method:** Implemented at `src/app/api/analyze-topic/route.ts`. Uses `generateText` with `groq/llama-3.1-8b` (via `GPT_OSS_120B` constant) for compatibility.

## Testing

```bash
curl -X POST http://localhost:3000/api/analyze-topic \
  -H "Content-Type: application/json" \
  -d '{"topic": "AI Fraud Detection", "department": "Computer Science"}'
```

Expected: JSON with complexity, twist, category, notes.

## Dependencies

- Groq API key configured
- `ai` SDK installed
