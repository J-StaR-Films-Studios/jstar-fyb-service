'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const AgencySignupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    confirmEmail: z.string().email("Invalid email address"),
    whatsapp: z.string().regex(/^\d{10,15}$/, "WhatsApp number must be 10-15 digits"),
    department: z.string().min(2, "Department is required"),
    topic: z.string().optional(),
    tier: z.string(),
    price: z.number(),
    password: z.string().optional(),
}).refine((data) => data.email === data.confirmEmail, {
    message: "Emails do not match",
    path: ["confirmEmail"],
});

export type AgencySignupData = z.infer<typeof AgencySignupSchema>;

export type SignupResponse =
    | { success: true; whatsappUrl: string; leadId: string }
    | { success: false; error: string };

export async function agencySignupAction(data: AgencySignupData): Promise<SignupResponse> {
    try {
        const validated = AgencySignupSchema.parse(data);

        // 1. Check if user exists
        let user = await prisma.user.findUnique({
            where: { email: validated.email }
        });

        let userId = user?.id;

        // 2. Create user if not exists
        if (!user) {
            try {
                // Generate a random password if not provided
                // Note: In a real app we might send a magic link or welcome email
                // For now we create the account so we can link the lead
                const password = validated.password || `Temppass_${Math.random().toString(36).slice(-8)}!`;

                const newUser = await auth.api.signUpEmail({
                    body: {
                        name: validated.name,
                        email: validated.email,
                        password: password,
                    },
                    headers: await headers()
                });

                if (newUser?.user) {
                    userId = newUser.user.id;
                }
            } catch (authError) {
                console.error("Auth creation failed:", authError);
                // Proceed without user ID if auth fails, but log it
                // We still want to capture the lead
            }
        }

        // 3. Create Lead Record
        // Get anonymous ID from cookies if available
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        const anonymousId = cookieStore.get('anonymous_id')?.value;

        const lead = await prisma.lead.create({
            data: {
                whatsapp: validated.whatsapp,
                department: validated.department,
                topic: validated.topic || 'TBD (Agency Signup)',
                twist: `Agency Signup - ${validated.tier}`,
                complexity: 3, // Default for agency
                userId: userId,
                anonymousId: anonymousId,
                status: 'NEW',
                // New fields
                tier: validated.tier,
                source: 'AGENCY_FORM',
                name: validated.name,
                email: validated.email
            }
        });

        // 4. Generate WhatsApp Link
        const adminNumber = "2348152657887"; // J Star Admin
        const tierName = validated.tier.replace('AGENCY_', '').replace(/_/g, ' ');
        const message = encodeURIComponent(
            `*New Agency Signup*

*Details:*
Name: ${validated.name}
Email: ${validated.email}
WhatsApp: ${validated.whatsapp}
Department: ${validated.department}
Package: ${tierName}
Price: NGN ${validated.price.toLocaleString()}

*Topic Idea:*
${validated.topic || "(Needs suggestions)"}

Hi! I just signed up for the ${tierName} package. Looking forward to discussing my project!`
        );

        const whatsappUrl = `https://wa.me/${adminNumber}?text=${message}`;

        return { success: true, whatsappUrl, leadId: lead.id };

    } catch (error: any) {
        console.error("Agency signup error:", error);

        if (error instanceof z.ZodError) {
            // Safe access for Zod types
            const firstError = (error as any).errors?.[0]?.message || error.message;
            return { success: false, error: firstError };
        }

        // Unique constraint on WhatsApp in Lead table could cause this
        if (error.code === 'P2002' && error.meta?.target?.includes('whatsapp')) {
            return { success: false, error: "This WhatsApp number is already registered. Please contact support." };
        }

        return { success: false, error: "Failed to process signup. Please try again." };
    }
}
