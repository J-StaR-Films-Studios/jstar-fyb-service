
import { NextResponse } from 'next/server';
import { getPartnerSession } from '@/lib/partner-auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    const influencer = await getPartnerSession();
    if (!influencer) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate live stats
    // Note: influencer.totalEarnings might be updated by webhooks, but we can also count directly if needed.
    // We'll trust the aggregate fields for now, or ensure they are kept in sync.

    const totalReferrals = await prisma.user.count({
        where: {
            referredById: influencer.id,
        },
    });

    return NextResponse.json({
        totalEarnings: influencer.totalEarnings,
        pendingPayout: influencer.pendingPayout,
        totalReferrals: totalReferrals,
        conversionRate: "N/A", // Placeholder for now
        name: influencer.name,
        referralCode: influencer.referralCode,
    });
}
