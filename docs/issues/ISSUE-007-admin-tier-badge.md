---
title: "[Feature] Admin Leads Dashboard - Show Tier Badge"
labels: MUS, enhancement, frontend, admin, agency-onboarding
---

## User Story

As an admin, I want to see the tier each lead signed up for, so that I can send the correct payment link.

## Proposed Solution

Update the admin leads page to display tier information when available.

### File to Modify
`src/app/admin/leads/page.tsx`

### Changes

1. **Table Column**: Add "Tier" column to desktop table
2. **Mobile Card**: Show tier badge on lead cards
3. **Tier Badge Styling**: Color-coded by tier value

### Tier Badge Component

```tsx
function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-gray-500 text-xs">Via Jay</span>;
  
  const colors = {
    'AGENCY_SOFT_LIFE': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'AGENCY_DEFENSE_READY': 'bg-primary/20 text-primary border-primary/30',
    'AGENCY_CODE_GO': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'AGENCY_PAPER_PREMIUM': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'AGENCY_PAPER_DEFENSE': 'bg-green-500/20 text-green-400 border-green-500/30',
    'AGENCY_PAPER_EXPRESS': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  
  const tierLabel = tier.replace('AGENCY_', '').replace(/_/g, ' ');
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-bold border ${colors[tier] || 'bg-gray-500/20'}`}>
      {tierLabel}
    </span>
  );
}
```

### Table Update

Add column after "Complexity":

```tsx
<th className="p-4">Tier</th>
// ...
<td className="p-4">
  <TierBadge tier={lead.tier} />
</td>
```

## Acceptance Criteria

- [ ] Tier column visible in desktop table
- [ ] Tier badge visible on mobile cards
- [ ] Leads without tier show "Via Jay" or similar
- [ ] Color coding matches tier hierarchy
- [ ] Badge text is human-readable (not raw ID)

## Dependencies

- Depends on: ISSUE-001 (Lead schema with tier field)

## Visual Reference

| Lead | Tier Badge |
|------|------------|
| Lead from form signup | `[SOFT LIFE]` (purple) |
| Lead from Jay chat | `Via Jay` (gray) |
| Lead from form (Paper) | `[PAPER DEFENSE]` (green) |
