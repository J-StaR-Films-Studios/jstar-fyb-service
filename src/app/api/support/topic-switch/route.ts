
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { TopicSwitchService } from "@/services/topic-switch.service";
import { prisma } from "@/lib/prisma"; // Need prisma to find project ID if not passed? 
// Actually TopicSwitchRequest needs projectId.
// The form should probably pass projectId or the backend finds the locked project.

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { projectId, reason, explanation, proofUrl, fee } = body;

        if (!projectId || !reason || !explanation) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const result = await TopicSwitchService.createRequest({
            userId: user.id,
            projectId,
            reason,
            explanation,
            proofUrl,
            fee // Pass fee to service
        });

        return NextResponse.json({ success: true, request: result });
    } catch (error: any) {
        console.error("Topic Switch Request Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
