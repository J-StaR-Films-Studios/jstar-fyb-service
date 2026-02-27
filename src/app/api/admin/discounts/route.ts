import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-server";
import { DiscountService } from "@/services/discount.service";
import { logger } from "@/lib/logger";

const createDiscountSchema = z.object({
    code: z.string().min(2, "Code must be at least 2 characters"),
    discountType: z.enum(["PERCENTAGE", "FIXED"]),
    discountValue: z.number().positive("Value must be positive"),
    maxUses: z.number().positive().optional(),
    minAmount: z.number().positive().optional(),
    expiresAt: z.string().datetime().optional()
});

/**
 * GET /api/admin/discounts
 * List all discount codes with usage stats
 */
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || (user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const codes = await DiscountService.getAllCodes();
        return NextResponse.json({ codes });

    } catch (error: unknown) {
        logger.error("GET Error", "[AdminDiscounts]");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * POST /api/admin/discounts
 * Create or manage discount codes
 */
export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Handle deactivation
        if (body.action === "deactivate") {
            const code = await DiscountService.deactivateCode(body.codeId);
            return NextResponse.json({
                success: true,
                message: `Deactivated code: ${code.code}`,
                code
            });
        }

        // Default: Create new discount code
        const validation = createDiscountSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.format() }, { status: 400 });
        }

        const data = validation.data;
        const code = await DiscountService.createCode({
            ...data,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
        });

        return NextResponse.json({
            success: true,
            message: `Created discount code: ${code.code}`,
            code
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`POST Error: ${errorMessage}`, "[AdminDiscounts]");

        if (errorMessage.includes("already exists")) {
            return NextResponse.json({ error: errorMessage }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
