
'use server';

import { getPartnerSession, hashPassword, verifyPassword } from '@/lib/partner-auth';
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function updatePassword(formData: FormData): Promise<{ error?: string; success?: string }> {
    return { error: 'Password updates are disabled. Use main account settings.' };
}

import { PaystackService } from '@/services/paystack.service';

export async function updateBankDetails(formData: FormData): Promise<{ error?: string; success?: string }> {
    const session = await getPartnerSession();
    if (!session) return { error: 'Unauthorized' };

    const bankCode = formData.get('bankCode') as string;
    const accountNumber = formData.get('accountNumber') as string;

    if (!bankCode || !accountNumber) {
        return { error: 'Please select a bank and enter account number' };
    }

    try {
        // 1. Resolve Account (Check if valid)
        const resolved = await PaystackService.resolveAccount(accountNumber, bankCode);

        // 2. Create Transfer Recipient
        // We use the resolved name to ensure accuracy
        const recipient = await PaystackService.createTransferRecipient(
            resolved.account_name,
            accountNumber,
            bankCode
        );

        // 3. Store SECURELY (Only the token)
        await prisma.influencerPayoutConfig.upsert({
            where: { influencerId: session.id },
            create: {
                influencerId: session.id,
                bankName: recipient.details?.bank_name || 'Unknown Bank',
                bankCode: bankCode,
                accountName: resolved.account_name,
                recipientCode: recipient.recipient_code, // RCP_xxxx
                last4Digits: accountNumber.slice(-4),
                currency: "NGN"
            },
            update: {
                bankName: recipient.details?.bank_name || 'Unknown Bank',
                bankCode: bankCode,
                accountName: resolved.account_name,
                recipientCode: recipient.recipient_code,
                last4Digits: accountNumber.slice(-4)
            }
        });

        revalidatePath('/partner/settings');
        return { success: `Bank details saved! Account verified: ${resolved.account_name}` };
    } catch (error: any) {
        console.error('Bank Update Error:', error);
        return { error: error.message || 'Failed to verify bank details' };
    }
}
