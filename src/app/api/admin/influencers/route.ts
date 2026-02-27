import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-server";
import { ReferralService } from "@/services/referral.service";
import { logger } from "@/lib/logger";


const createInfluencerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().optional(),
    referralCode: z.string().min(2, "Referral code must be at least 2 characters"),
    commissionRate: z.number().min(0).max(1).optional(),
    referralDiscount: z.number().min(0).max(1).optional(),
    freeCredits: z.number().min(0).optional()
});

const grantCreditsSchema = z.object({
    influencerId: z.string().min(1),
    amount: z.number().positive("Amount must be positive")
});

/**
 * GET /api/admin/influencers
 * List all influencers with stats
 */
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || (user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const influencers = await ReferralService.getAllInfluencers();
        return NextResponse.json({ influencers });

    } catch (error: unknown) {
        logger.error("GET Error", "[AdminInfluencers]");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * POST /api/admin/influencers
 * Create a new influencer
 */
export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Check action type
        if (body.action === "grant_credits") {
            const validation = grantCreditsSchema.safeParse(body);
            if (!validation.success) {
                return NextResponse.json({ error: validation.error.format() }, { status: 400 });
            }
            const { influencerId, amount } = validation.data;
            const influencer = await ReferralService.grantFreeCredits(influencerId, amount);
            return NextResponse.json({
                success: true,
                message: `Granted ₦${amount.toLocaleString()} credits`,
                influencer
            });
        }

        if (body.action === "toggle_active") {
            const influencer = await ReferralService.toggleActive(body.influencerId);
            return NextResponse.json({
                success: true,
                message: `Influencer ${influencer.isActive ? 'activated' : 'deactivated'}`,
                influencer
            });
        }

        if (body.action === "mark_paid") {
            const amount = await ReferralService.markCommissionsPaid(body.influencerId);
            return NextResponse.json({
                success: true,
            });
        }

        // if (body.action === "reset_password") { ... removed ... }

        // Default: Create new influencer
        const validation = createInfluencerSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.format() }, { status: 400 });
        }

        const influencer = await ReferralService.createInfluencer(validation.data);
        return NextResponse.json({
            success: true,
            message: `Created influencer with code: ${influencer.referralCode}`,
            influencer
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`POST Error: ${errorMessage}`, "[AdminInfluencers]");

        if (errorMessage.includes("already exists")) {
            return NextResponse.json({ error: errorMessage }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
