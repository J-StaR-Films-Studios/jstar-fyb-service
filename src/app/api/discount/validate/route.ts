import { NextResponse } from "next/server";
import { z } from "zod";
import { DiscountService } from "@/services/discount.service";

const validateSchema = z.object({
    code: z.string().min(1, "Discount code is required"),
    amount: z.number().positive("Amount must be positive")
});

/**
 * POST /api/discount/validate
 * Validate a discount code and return discount details
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

        const { code, amount } = validation.data;
        const result = await DiscountService.validateCode(code, amount);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("[DiscountValidate] Error:", error);
        return NextResponse.json({
            valid: false,
            error: error.message || "Failed to validate discount code"
        }, { status: 500 });
    }
}
