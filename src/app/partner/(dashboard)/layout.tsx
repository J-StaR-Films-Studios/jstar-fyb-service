
import { getPartnerSession } from '@/lib/partner-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, Settings, LogOut } from 'lucide-react';

export default async function PartnerDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getPartnerSession();

    if (!session) {
        redirect('/partner/login');
    }

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 hidden md:flex flex-col">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <Link href="/partner" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                        Partner Portal
                    </Link>
                    <p className="text-xs text-zinc-500 mt-1">Welcome, {session.name.split(' ')[0]}</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <SidebarLink href="/partner" icon={LayoutDashboard} label="Overview" />
                    <SidebarLink href="/partner/referrals" icon={Users} label="Referrals" />
                    <SidebarLink href="/partner/settings" icon={Settings} label="Settings" />
                </nav>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                    <LogoutButton />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}

function SidebarLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
            <Icon className="w-4 h-4" />
            {label}
        </Link>
    );
}

import { LogoutButton } from './_components/logout-button'; // Helper client component for interactivity
