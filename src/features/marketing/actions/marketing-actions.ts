'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getLandingPageTimer() {
    const [startSetting, endSetting] = await Promise.all([
        prisma.systemSetting.findUnique({ where: { key: 'marketing_timer_start' } }),
        prisma.systemSetting.findUnique({ where: { key: 'marketing_timer_end' } })
    ]);

    return {
        startDate: startSetting?.value ? new Date(startSetting.value) : null,
        targetDate: endSetting?.value ? new Date(endSetting.value) : null,
    };
}

export async function updateSystemSetting(key: string, value: string) {
    await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });

    revalidatePath('/');
    revalidatePath('/admin/settings');
}
