
import { NextResponse } from 'next/server';
import { clearPartnerCookie } from '@/lib/partner-auth';

export async function POST() {
    await clearPartnerCookie();
    return NextResponse.json({ success: true });
}
