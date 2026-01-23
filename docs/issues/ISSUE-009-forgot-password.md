---
title: "[Feature] Forgot Password / Magic Link Recovery"
labels: auth, enhancement, MUS
---

## User Story

As a user who signed up via Agency Form, I want to reset my password, so that I can access my account.

## Background

Agency form auto-creates accounts with temp passwords like `Temppass_x8f2k9m!`. Users need a way to recover access if they lose this or want to set their own password.

## Proposed Solution

### Files to Create/Modify

1. `src/app/(auth)/forgot-password/page.tsx` - New page
2. `src/features/auth/actions/forgotPassword.ts` - Server action (optional, Better-Auth may handle)

### Implementation

Better-Auth already supports magic link flow. We just need the UI.

```tsx
// Basic page structure
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  
  const handleSubmit = async () => {
    await auth.api.sendMagicLink({ email });
    setSent(true);
  };
  
  return sent ? <SuccessMessage /> : <EmailForm />;
}
```

## Acceptance Criteria

- [ ] `/forgot-password` page exists with email input
- [ ] Submit triggers magic link email via Better-Auth
- [ ] Success state shows "Check your email" message
- [ ] Error state handles invalid emails
- [ ] Link from login page to forgot password
- [ ] Magic link logs user in and redirects to dashboard

## Testing

1. Go to `/forgot-password`
2. Enter registered email
3. Check email for magic link
4. Click link → Should log in

## Dependencies

- Better-Auth configuration (likely already set up)
