import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentUser } from '@/lib/auth-server';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const deleted = await prisma.researchDocument.deleteMany({ where: { id, project: { userId: user.id } } });
        if (!deleted.count) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[DeleteDocument] Error:", error);
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }
}
