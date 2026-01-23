---
title: "[Feature] Rich WhatsApp Message with AI Data"
labels: backend, enhancement
---

## User Story

As an admin receiving WhatsApp leads, I want to see AI-analyzed data, so that I can quickly assess lead quality without asking follow-up questions.

## Proposed Solution

### New Message Format

```
*New Agency Signup*

*Lead Details:*
Name: John Doe
Email: test@gmail.com
WhatsApp: 2348152657812
Department: Computer Science
Package: The Soft Life
Price: NGN 320,000

*Project Analysis:*
Topic: AI-Powered Yam Detector
Complexity: 4/5 (Advanced)
Twist: Uses computer vision + IoT sensors
Notes: Requires ML model training

Hi! I just signed up. Looking forward to discussing my project!
```

### File to Modify
`src/features/agency/actions/agencySignup.ts`

### Implementation

1. Update schema to include new fields:
```typescript
const AgencySignupSchema = z.object({
  // ... existing
  complexity: z.number().min(1).max(5).default(3),
  twist: z.string().optional(),
  notes: z.string().optional(),
});
```

2. Update Lead creation:
```typescript
const lead = await prisma.lead.create({
  data: {
    // ... existing
    complexity: validated.complexity,
    twist: validated.twist || `Agency Signup - ${validated.tier}`,
    // notes doesn't exist in Lead model, goes to WhatsApp only
  }
});
```

3. Update message builder:
```typescript
const complexityLabels = ['Basic', 'Easy', 'Moderate', 'Advanced', 'Expert'];
const message = encodeURIComponent(
`*New Agency Signup*

*Lead Details:*
Name: ${validated.name}
Email: ${validated.email}
WhatsApp: ${validated.whatsapp}
Department: ${validated.department}
Package: ${tierName}
Price: NGN ${validated.price.toLocaleString()}

*Project Analysis:*
Topic: ${validated.topic || '(Needs suggestions)'}
Complexity: ${validated.complexity}/5 (${complexityLabels[validated.complexity - 1]})
Twist: ${validated.twist || '(Not specified)'}
${validated.notes ? `Notes: ${validated.notes}` : ''}

Hi! I just signed up. Looking forward to discussing my project!`
);
```

## Acceptance Criteria

- [x] Schema accepts complexity, twist, notes
- [x] WhatsApp message includes complexity with label
- [x] WhatsApp message includes twist
- [x] WhatsApp message includes notes (if provided)
- [x] Lead record stores complexity and twist
- [x] Message format is clean and readable

## Implementation Status
**Status:** ✅ Completed
**Method:** Implemented in `src/features/agency/actions/agencySignup.ts`. Schema updated to include new fields, and WhatsApp message builder now includes "Project Analysis" section with complexity and twist.

## Dependencies

- Issue #64 (Form AI Integration)
