import { NextResponse } from "next/server";
import { z } from "zod";
import { ReferralService } from "@/services/referral.service";

const validateSchema = z.object({
    code: z.string().min(1, "Referral code is required")
});

/**
 * POST /api/referral/validate
 * Validate a referral code and return influencer info if valid
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();

        const validation = validateSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                valid: false,
                error: validation.error.format()
            }, { status: 400 });
        }

        const { code } = validation.data;
        const influencer = await ReferralService.validateCode(code);

        if (!influencer) {
            return NextResponse.json({
                valid: false,
                error: "Invalid or inactive referral code"
            });
        }

        return NextResponse.json({
            valid: true,
            influencer: {
                name: influencer.name,
                code: influencer.referralCode
            }
        });

    } catch (error: any) {
        console.error("[ReferralValidate] Error:", error);
        return NextResponse.json({
            valid: false,
            error: error.message || "Failed to validate code"
        }, { status: 500 });
    }
}
