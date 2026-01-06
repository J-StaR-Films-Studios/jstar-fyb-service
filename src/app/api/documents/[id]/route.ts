import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Delete the document
        await prisma.researchDocument.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[DeleteDocument] Error:", error);
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }
}
