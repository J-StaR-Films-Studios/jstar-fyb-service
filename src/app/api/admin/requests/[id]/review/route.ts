
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { TopicSwitchService } from "@/services/topic-switch.service";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } // Fix for Next.js 15+ async params
) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
        }

        const params = await context.params;
        const requestId = params.id;
        const body = await req.json();
        const { status } = body;

        if (!requestId || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!["approved", "denied"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const result = await TopicSwitchService.reviewRequest(requestId, status, admin.id);

        return NextResponse.json({ success: true, request: result });
    } catch (error: any) {
        console.error("Review Request Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
