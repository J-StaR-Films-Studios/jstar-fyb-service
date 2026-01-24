'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PartnerLoginPage() {
    const router = useRouter();

    useEffect(() => {
        // Automatically redirect to main login with callback
        router.push('/auth/login?callbackUrl=/partner');
    }, [router]);

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-xl shadow-xl max-w-md text-center space-y-6">
                <div className="flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold">Redirecting to Secure Login...</h1>
                    <p className="text-sm text-zinc-500 mt-2">
                        Partner accounts now use the main secure login system.
                    </p>
                </div>

                <Link
                    href="/auth/login?callbackUrl=/partner"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                    Click here if you are not redirected
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}
