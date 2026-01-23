---
title: "[Feature] Integrate Modal into Consult Page"
labels: MUS, enhancement, frontend, agency-onboarding
---

## User Story

As a user clicking an agency tier from the pricing page, I want to be presented with options when I land on the consult page, so that I can choose the fastest path.

## Proposed Solution

Modify the existing consult page to show the signup modal when tier params are present.

### File to Modify
`src/app/(marketing)/project/consult/page.tsx`

### Current Behavior
- Page renders one of 4 random variant components
- No awareness of URL params

### New Behavior
- Read `tier`, `price`, `type` from URL params
- If params present, show `AgencySignupModal` on mount
- Modal can be dismissed to continue to variant content
- Variant content unchanged otherwise

### Implementation

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AgencySignupModal } from '@/features/agency/components/AgencySignupModal';
// ... existing imports

export default function ConsultPage() {
    const searchParams = useSearchParams();
    const tier = searchParams.get('tier');
    const price = searchParams.get('price');
    const type = searchParams.get('type');
    
    const [showModal, setShowModal] = useState(false);
    
    useEffect(() => {
        if (tier && price) {
            setShowModal(true);
        }
    }, [tier, price]);
    
    // ... existing variant logic
    
    return (
        <>
            {showModal && (
                <AgencySignupModal 
                    open={showModal} 
                    onClose={() => setShowModal(false)}
                    tier={{
                        id: tier,
                        label: decodeURIComponent(tier),
                        price: Number(price),
                        type: (type as 'paper' | 'software') || 'software'
                    }}
                />
            )}
            <VariantComponent />
        </>
    );
}
```

## Acceptance Criteria

- [x] Modal appears when `?tier=` param is present
- [x] Modal does NOT appear for direct `/project/consult` visits
- [x] Modal closes on dismiss, variant content visible
- [x] Variant rotation logic unchanged
- [x] No layout shift when modal appears
- [x] Works with all 4 existing variants

## Dependencies

- Depends on: ISSUE-004 (AgencySignupModal component)

## Testing

1. Visit `/project/consult` → No modal, variant shows
2. Visit `/project/consult?tier=Test&price=100000` → Modal shows
3. Click "Chat with Jay" → Modal closes, variant visible
4. Click "Yes" → Form appears in modal
