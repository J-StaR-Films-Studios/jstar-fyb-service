import { NextResponse } from 'next/server';
import { EmailService } from '@/services/email.service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, message, userId, page, projectId } = body;

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Send email via EmailService
        const success = await EmailService.sendSupportRequest({
            name: name || 'Anonymous',
            email: email || 'No email provided',
            message,
            userId,
            page,
            projectId,
        });

        if (!success) {
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Support Contact API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
