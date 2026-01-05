import { Resend } from 'resend';
import { PaymentReceiptEmail } from '@/emails/PaymentReceipt';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'J-Star Projects <onboarding@resend.dev>';
const SUPPORT_EMAIL = 'hey@jstarstudios.com';

interface SendReceiptParams {
    email: string;
    name: string;
    amount: number;
    reference: string;
    projectTopic: string;
    date: Date;
}

interface SendSupportParams {
    name: string;
    email: string;
    message: string;
    userId?: string;
    page?: string;
    projectId?: string;
}

export const EmailService = {
    async sendPaymentReceipt({ email, name, amount, reference, projectTopic, date }: SendReceiptParams) {
        if (!process.env.RESEND_API_KEY) {
            console.warn('[EmailService] RESEND_API_KEY missing, skipping email');
            return false;
        }

        try {
            const data = await resend.emails.send({
                from: FROM_EMAIL,
                to: email,
                subject: 'Payment Receipt - J-Star Projects',
                react: PaymentReceiptEmail({
                    name,
                    amount,
                    reference,
                    projectTopic,
                    date
                }) as React.ReactElement,
            });

            if (data.error) {
                console.error('[EmailService] Resend error:', data.error);
                return false;
            }

            console.log('[EmailService] Email sent:', data.data?.id);
            return true;
        } catch (error) {
            console.error('[EmailService] Failed to send email:', error);
            return false;
        }
    },

    async sendSupportRequest({ name, email, message, userId, page, projectId }: SendSupportParams) {
        if (!process.env.RESEND_API_KEY) {
            console.warn('[EmailService] RESEND_API_KEY missing, skipping email');
            return false;
        }

        try {
            const context = [
                `From: ${name} (${email})`,
                userId ? `User ID: ${userId}` : null,
                page ? `Page: ${page}` : null,
                projectId ? `Project ID: ${projectId}` : null,
            ].filter(Boolean).join('\n');

            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0b; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="500" cellpadding="0" cellspacing="0" style="background-color: #111113; border-radius: 16px; border: 1px solid #222;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px 30px 20px 30px; text-align: center; border-bottom: 1px solid #222;">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 2px;">J-STAR FYB</h1>
                            <p style="margin: 4px 0 0 0; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Support Request</p>
                        </td>
                    </tr>
                    <!-- Icon -->
                    <tr>
                        <td style="padding: 30px 30px 10px 30px; text-align: center;">
                            <div style="display: inline-block; width: 50px; height: 50px; border-radius: 50%; background-color: rgba(139, 92, 246, 0.15); border: 2px solid #8b5cf6; color: #8b5cf6; font-size: 24px; line-height: 46px; text-align: center;">📩</div>
                        </td>
                    </tr>
                    <!-- Title -->
                    <tr>
                        <td style="padding: 10px 30px 20px 30px; text-align: center;">
                            <h2 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">New Support Request</h2>
                        </td>
                    </tr>
                    <!-- User Info Card -->
                    <tr>
                        <td style="padding: 0 30px 20px 30px;">
                            <table width="100%" style="background-color: #1a1a1d; border-radius: 12px; border: 1px solid #2a2a2d;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">FROM</p>
                                        <p style="margin: 0 0 4px 0; font-size: 15px; color: #ffffff; font-weight: 600;">${name}</p>
                                        <p style="margin: 0; font-size: 13px; color: #8b5cf6;">${email}</p>
                                    </td>
                                </tr>
                                ${userId ? `<tr><td style="padding: 0 16px 16px 16px;"><p style="margin: 0; font-size: 11px; color: #444;">User ID: ${userId}</p></td></tr>` : ''}
                            </table>
                        </td>
                    </tr>
                    <!-- Context Info -->
                    ${page || projectId ? `
                    <tr>
                        <td style="padding: 0 30px 20px 30px;">
                            <table width="100%" style="background-color: rgba(139, 92, 246, 0.1); border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.2);">
                                <tr>
                                    <td style="padding: 12px 16px;">
                                        <p style="margin: 0; font-size: 11px; color: #8b5cf6; text-transform: uppercase; letter-spacing: 1px;">📍 Context</p>
                                        ${page ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #a1a1aa;">Page: <span style="color: #e4e4e7;">${page}</span></p>` : ''}
                                        ${projectId ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #a1a1aa;">Project: <span style="color: #e4e4e7;">${projectId}</span></p>` : ''}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ` : ''}
                    <!-- Message -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <p style="margin: 0 0 12px 0; font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
                            <div style="background-color: #1a1a1d; border-radius: 12px; border: 1px solid #2a2a2d; padding: 20px;">
                                <p style="margin: 0; font-size: 14px; color: #e4e4e7; line-height: 1.7;">${message.replace(/\n/g, '<br>')}</p>
                            </div>
                        </td>
                    </tr>
                    <!-- Reply Button -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px; text-align: center;">
                            <a href="mailto:${email}" style="display: inline-block; background-color: #8b5cf6; border-radius: 8px; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px;">Reply to ${name.split(' ')[0]} →</a>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 30px; border-top: 1px solid #222; text-align: center;">
                            <p style="margin: 0; font-size: 11px; color: #444;">Sent from J-Star FYB Service App</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `;

            const data = await resend.emails.send({
                from: FROM_EMAIL,
                to: SUPPORT_EMAIL,
                replyTo: email,
                subject: `[FYB App Support] from ${name}`,
                html: htmlContent,
            });

            if (data.error) {
                console.error('[EmailService] Resend error:', data.error);
                return false;
            }

            console.log('[EmailService] Support email sent:', data.data?.id);
            return true;
        } catch (error) {
            console.error('[EmailService] Failed to send support email:', error);
            return false;
        }
    }
};
