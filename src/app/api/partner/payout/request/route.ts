
import { NextResponse } from 'next/server';
import { getPartnerSession } from '@/lib/partner-auth';
// import { sendEmail } from '@/lib/email'; // Assuming we have this, or just log for now

export async function POST(request: Request) {
    const influencer = await getPartnerSession();
    if (!influencer) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Logic: 
    // 1. Check if they have enough balance (optional validation here or trusted admin review)
    // 2. Send email to admin

    const payoutAmount = influencer.pendingPayout;

    if (payoutAmount < 1000) { // e.g., minimum threshold
        return NextResponse.json({ error: 'Minimum payout is ₦1,000' }, { status: 400 });
    }

    console.log(`💰 Payout Requested by ${influencer.name} (${influencer.email}): ₦${payoutAmount}`);

    // TODO: Send actual email using Resend or existing mailer
    // await sendEmail({ to: 'admin@example.com', subject: 'Payout Request', ... })

    return NextResponse.json({ success: true, message: 'Payout request submitted.' });
}
