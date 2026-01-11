
'use server';

import { getPartnerSession, hashPassword, verifyPassword } from '@/lib/partner-auth';
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function updatePassword(formData: FormData) {
    const session = await getPartnerSession();
    if (!session) return { error: 'Unauthorized' };

    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;

    if (!currentPassword || !newPassword) {
        return { error: 'All fields are required' };
    }

    if (newPassword.length < 8) {
        return { error: 'New password must be at least 8 characters' };
    }

    const influencer = await prisma.influencer.findUnique({
        where: { id: session.id },
    });

    if (!influencer || !influencer.password) {
        return { error: 'Account error' };
    }

    const isValid = await verifyPassword(currentPassword, influencer.password);
    if (!isValid) {
        return { error: 'Current password is incorrect' };
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.influencer.update({
        where: { id: session.id },
        data: { password: hashedPassword },
    });

    revalidatePath('/partner/settings');
    return { success: 'Password updated successfully' };
}

export async function updateBankDetails(formData: FormData) {
    const session = await getPartnerSession();
    if (!session) return { error: 'Unauthorized' };

    const bankName = formData.get('bankName') as string;
    const accountNumber = formData.get('accountNumber') as string;
    const accountName = formData.get('accountName') as string;

    if (!bankName || !accountNumber || !accountName) {
        return { error: 'All fields are required' };
    }

    await prisma.influencer.update({
        where: { id: session.id },
        data: { bankName, accountNumber, accountName },
    });

    revalidatePath('/partner/settings');
    return { success: 'Bank details updated successfully' };
}
