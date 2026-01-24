import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json(
        { error: 'Influencer direct login is deprecated. Please use the main user login.' },
        { status: 410 }
    );
}
