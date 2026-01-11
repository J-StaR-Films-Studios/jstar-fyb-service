import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-server";
import { ReferralService } from "@/services/referral.service";

const linkSchema = z.object({
    code: z.string().min(1, "Referral code is required")
});

/**
 * POST /api/referral/link
 * Link the current authenticated user to an influencer via referral code
 */
export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const validation = linkSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                success: false,
                error: validation.error.format()
            }, { status: 400 });
        }

        const { code } = validation.data;

        await ReferralService.linkUserToInfluencer(user.id, code);

        return NextResponse.json({
            success: true,
            message: "Successfully linked to referral program"
        });

    } catch (error: any) {
        console.error("[ReferralLink] Error:", error);

        // Handle specific errors
        if (error.message.includes("already linked")) {
            return NextResponse.json({
                success: false,
                error: "You are already part of a referral program"
            }, { status: 400 });
        }

        if (error.message.includes("Invalid")) {
            return NextResponse.json({
                success: false,
                error: error.message
            }, { status: 400 });
        }

        return NextResponse.json({
            success: false,
            error: error.message || "Failed to link referral"
        }, { status: 500 });
    }
}
