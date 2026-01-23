# Escalation Handoff Report

> [!CHECK] **RESOLVED**
> **Fixed By:** Senior AI Orchestrator
> **Date:** 2026-01-23
> **Action:** Implemented "Shadow User" creation logic in `route.ts`. Now creates a stub user if `userId` is missing, preventing P2003 errors.

**Generated:** 2026-01-23 20:30:00
**Original Issue:** P2003 Foreign Key Constraint Violation in `/api/admin/leads/[id]/send-payment-link`

---

## PART 1: THE DAMAGE REPORT

### 1.1 Original Goal
The user (or admin) triggered a "Send Payment Link" action for a Lead (Agency Signup). The goal was to generate a Paystack payment link and record a pending payment in the database.

### 1.2 Observed Failure / Error
The Backend API crashed with a 500 error due to a Prisma Constraint Violation.

```text
[SendPaymentLink] Error: Error [PrismaClientKnownRequestError]:
Invalid `prisma.payment.create()` invocation in
C:\CreativeOS\...\send-payment-link\route.ts:596:168

Foreign key constraint violated: `Payment_userId_fkey (index)`
code: 'P2003'
```

### 1.3 Failed Approach
The code attempts to create a `Payment` record. Since Agency Leads often do not have a registered `User` account yet, the code falls back to a hardcoded string `"ADMIN_LINK_PENDING"` for the `userId` field.

```typescript
// src/app/api/admin/leads/[id]/send-payment-link/route.ts:87
userId: userId || project.userId || "ADMIN_LINK_PENDING", 
```

However, the Prisma Schema defines `Payment.userId` as a mandatory foreign key pointing to the `User` table. Since no user exists with ID `"ADMIN_LINK_PENDING"`, the database rejects the insert.

### 1.4 Key Files Involved
- `src/app/api/admin/leads/[id]/send-payment-link/route.ts`
- `prisma/schema.prisma`

### 1.5 Best-Guess Diagnosis
The `Payment` model requires a valid `User` reference. The developer assumed they could use a placeholder string like `"ADMIN_LINK_PENDING"`, but this violates referential integrity. 

**Fix Options:**
1.  **Schema Change:** Make `Payment.userId` nullable (`String?`) to allow anonymous payments.
2.  **Data Fix:** Create a rigid "System User" in the DB with ID `"ADMIN_LINK_PENDING"` to catch these orphan payments.
3.  **Logic Fix:** Create a shadow/stub User account for the Lead immediately before creating the payment.

---

## PART 2: FULL FILE CONTENTS (Self-Contained)

### File: `src/app/api/admin/leads/[id]/send-payment-link/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaystackService } from "@/services/paystack.service";
import { NotificationService } from "@/services/notification.service";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-server";

const sendPaymentBodySchema = z.object({
    amount: z.number().positive(),
    tier: z.string(), // "Basic", "Standard", "Premium"
});

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
        }
        const params = await props.params;
        const leadId = params.id;
        const body = await req.json();
        const { amount, tier } = sendPaymentBodySchema.parse(body);

        // 1. Fetch Lead
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
        });

        if (!lead) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        // 2. Determine Email
        let email = "hey@jstarstudios.com"; // Default Fallback
        const userId = lead.userId;

        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true },
            });
            if (user && user.email) {
                email = user.email;
            }
        }

        // 3. Generate Reference
        const timestamp = Date.now();
        // Sanitize characters: Only alphanumeric, dash, dot, =, _ allowed. 
        // We replace any other char with empty string, but IDs are usually safe.
        // Format: FYB-TIER-LEADIDSHORT-TIMESTAMP
        const safeTier = (tier || "UNKNOWN").toUpperCase().replace(/[^A-Z0-9]/g, '');
        const safeLeadId = (leadId || "UNKNOWN").slice(0, 8).replace(/[^a-zA-Z0-9]/g, '');
        // Use strictly alphanumeric reference to prevent "Invalid character" errors
        const reference = `FYB${safeTier}${safeLeadId}${timestamp}`;

        // 4. Create or Find a Project for this lead
        let project = await prisma.project.findFirst({
            where: {
                topic: lead.topic,
                OR: [
                    { userId: userId || undefined },
                    { anonymousId: lead.anonymousId || undefined }
                ].filter(o => Object.values(o).some(v => v !== undefined))
            }
        });

        if (!project) {
            project = await prisma.project.create({
                data: {
                    topic: lead.topic,
                    twist: lead.twist,
                    userId: userId || undefined,
                    anonymousId: lead.anonymousId || undefined,
                    mode: "CONCIERGE", // Admin links are for concierge service
                    status: "OUTLINE_GENERATED"
                }
            });
        }

        // 5. Create Payment Record (to track this link)
        const payment = await prisma.payment.create({
            data: {
                userId: userId || project.userId || "ADMIN_LINK_PENDING", // Use project's user or fallback
                projectId: project.id, // Now using a valid project ID
                reference: reference,
                amount: amount,
                status: 'PENDING',
                currency: 'NGN'
            }
        });

        // 5. Initialize Paystack
        const paymentData = await PaystackService.initializePayment({
            email,
            amount,
            reference,
            metadata: {
                leadId,
                tier,
                paymentId: payment.id,
                custom_fields: [
                    { display_name: "Project Topic", variable_name: "project_topic", value: lead.topic },
                    { display_name: "Tier", variable_name: "tier", value: tier }
                ]
            },
            callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/project/builder?projectId=${project.id}&payment_ref=${reference}` // Redirect back to builder with projectId
        });

        // 6. Notify (Optional - Internal Log)
        await NotificationService.notifyPaymentLinkSent(leadId, amount, tier);

        return NextResponse.json({
            success: true,
            authorizationUrl: paymentData.authorizationUrl,
            reference: paymentData.reference,
            emailUsed: email
        });

    } catch (error) {
        console.error("[SendPaymentLink] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
```

### File: `prisma/schema.prisma`
```prisma
// ... (User and Payment Models)

model User {
  id                     String                      @id
  name                   String
  email                  String                      @unique
  // ...
  payments               Payment[]
  // ...
}

model Payment {
  id              String        @id @default(cuid())
  amount          Float
  currency        String        @default("NGN")
  status          String        @default("PENDING")
  reference       String        @unique
  userId          String
  projectId       String
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  project         Project       @relation(fields: [projectId], references: [id])
  user            User          @relation(fields: [userId], references: [id])
  // ...
}
```

---

## PART 3: DIRECTIVE FOR ORCHESTRATOR

**Attention: Senior AI Orchestrator**

You have received this Escalation Handoff Report. A local agent has identified a critical database constraint violation preventing admins from sending payment links to new leads.

**Your Directive:**
1. **Choose the Strategy:**
   - **Option A (Proper):** Update `schema.prisma` to make `Payment.userId` optional (`String?`). This is creating technical debt otherwise.
   - **Option B (Fast):** Implement a "Shadow User" creation routine in the `route.ts`. Check if a user exists for the lead's email; if not, create a dormant User account and use that ID.
   - **Option C (Hack):** Seed the database with a user id `"ADMIN_LINK_PENDING"`.

2. **Recommendation:** Proceed with **Option B (Stub User)** or **Option A (Schema Change)**. Using magic strings like `"ADMIN_LINK_PENDING"` is fragile.

3. **Execute:**
   - Modify `src/app/api/admin/leads/[id]/send-payment-link/route.ts` to implement the chosen fix.
   - If changing schema, run `prisma migrate dev`.

**Begin your analysis now.**
