
'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/partner/auth/logout', { method: 'POST' });
        router.push('/partner/login');
        router.refresh();
    };

    return (
        <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
        >
            <LogOut className="w-4 h-4" />
            Sign Out
        </button>
    );
}
