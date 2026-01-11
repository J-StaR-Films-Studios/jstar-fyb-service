
import { NextResponse } from 'next/server';
import { getPartnerSession } from '@/lib/partner-auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const influencer = await getPartnerSession();
    if (!influencer) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse pagination (stub for now, just fetch recent 50)

    const referrals = await prisma.user.findMany({
        where: {
            referredById: influencer.id,
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 50,
        include: {
            // We want to know if they generated any commissions
            // Since Commission is linked to Payment, we have to look for payments that have a commission for THIS influencer.
            payments: {
                where: {
                    commission: {
                        influencerId: influencer.id
                    }
                },
                include: {
                    commission: true
                }
            }
        }
    });

    const formattedReferrals = referrals.map(user => {
        // Redact Name: "John Doe" -> "John D."
        const nameParts = (user.name || 'Anonymous').split(' ');
        const redactedName = nameParts.length > 1
            ? `${nameParts[0]} ${nameParts[1][0]}.`
            : nameParts[0];

        // Calculate total earned from this user
        const totalEarned = user.payments.reduce((acc, curr) => {
            return acc + (curr.commission?.amount || 0);
        }, 0);

        const status = totalEarned > 0 ? 'Converted' : 'Joined';

        return {
            id: user.id, // Safe to expose internal ID? Maybe. Or leave it.
            name: redactedName,
            date: user.createdAt,
            status,
            earnings: totalEarned
        };
    });

    return NextResponse.json({ referrals: formattedReferrals });
}
