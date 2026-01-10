
import Link from 'next/link';
import { LayoutDashboard, Users, FileText, BadgeDollarSign, Home, Megaphone, Percent } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser() as any;

    // Auth & RBAC Protection
    if (!user) redirect('/auth/login');
    if (user.role !== 'ADMIN') redirect('/dashboard');

    const navItems = [
        { href: '/admin', label: 'Overview', icon: Home },
        { href: '/admin/projects', label: 'Projects', icon: LayoutDashboard },
        { href: '/admin/leads', label: 'Leads', icon: Users },
        { href: '/admin/influencers', label: 'Influencers', icon: Megaphone },
        { href: '/admin/discounts', label: 'Discounts', icon: Percent },
        { href: '/admin/requests', label: 'Switch Requests', icon: FileText },
        { href: '/admin/settings', label: 'Settings', icon: BadgeDollarSign },
    ];

    return (
        <div className="min-h-screen bg-dark">
            {/* Top Navigation Bar - Desktop & Mobile */}
            <div className="bg-[#0F0F12] border-b border-white/5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-4 md:gap-8">
                            <div className="flex-shrink-0">
                                <Link href="/admin">
                                    <span className="font-display font-bold text-lg md:text-xl text-white">J-Star Admin</span>
                                </Link>
                            </div>

                            {/* Desktop Nav */}
                            <div className="hidden md:block">
                                <div className="ml-10 flex items-baseline space-x-4">
                                    {navItems.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className="text-gray-300 hover:bg-white/10 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                                        >
                                            <item.icon className="w-4 h-4" />
                                            {item.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="text-xs md:text-sm text-gray-500 hover:text-white whitespace-nowrap">
                                Back to App
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Mobile Scrollable Nav */}
                <div className="md:hidden flex overflow-x-auto no-scrollbar border-t border-white/5 bg-black/20">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex-shrink-0 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white flex items-center gap-2 whitespace-nowrap active:bg-white/5 border-b-2 border-transparent hover:border-primary active:border-primary transition-colors"
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <main>
                {children}
            </main>
        </div>
    );
}
