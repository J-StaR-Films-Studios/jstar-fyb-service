'use client';

import { useState } from 'react';
import { signUp, signIn } from '@/lib/auth-client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Home } from 'lucide-react';

export function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/chat';

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const result = await signUp.email({
                name,
                email,
                password,
            });

            if (result.error) {
                setError(result.error.message || 'Registration failed');
            } else {
                // Determine user ID (hacky since auth-client might not return it directly, but signIn usually auto-logs in)
                // We'll rely on the server session.
                // Try to link referral code if present
                if (referralCode.trim()) {
                    try {
                        await fetch('/api/referral/link', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code: referralCode.trim() })
                        });
                        // We don't block registration on referral failure, but maybe log it
                    } catch (refError) {
                        console.error('Referral link error:', refError);
                    }
                }
                router.push(callbackUrl);
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        if (referralCode.trim()) {
            localStorage.setItem('jstar_pending_referral_code', referralCode.trim());
        }
        await signIn.social({
            provider: 'google',
            callbackURL: callbackUrl,
        });
    };

    const loginLink = callbackUrl !== '/chat'
        ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : '/auth/login';

    return (
        <div className="auth-card w-full max-w-md rounded-md border border-rule bg-writing p-6 sm:p-8">
            <div className="fixed top-6 left-6 z-50 flex items-center gap-2">
                <button
                    onClick={() => {
                        if (callbackUrl && callbackUrl.includes('/chat')) {
                            router.push('/chat');
                        } else {
                            router.push('/');
                        }
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-md border border-rule bg-writing text-ink"
                    aria-label="Go back"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <Link
                    href="/"
                    className="flex h-11 w-11 items-center justify-center rounded-md border border-rule bg-writing text-ink"
                    aria-label="Go home"
                >
                    <Home className="w-5 h-5" />
                </Link>
            </div>
            <div className="text-center mb-8">
                <p className="mb-3 font-margin-mono text-xs font-semibold uppercase tracking-wider text-rust">J-Star Projects</p>
                <h1 className="text-3xl font-margin font-bold text-ink mb-2">
                    Create account
                </h1>
                <p className="text-gray-400">
                    Start your final year project
                </p>
            </div>

            {/* Referral Code - Placed top/visible for all users */}
            <div className="mb-6">
                <div className="rounded-md border border-rule bg-paper p-3">
                    <label htmlFor="referralCode" className="block text-xs font-medium text-primary mb-1 uppercase tracking-wider">
                        Have a Referral Code?
                    </label>
                    <input
                        id="referralCode"
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="w-full rounded-md border border-rule bg-writing px-3 text-sm font-margin-mono uppercase text-ink placeholder:text-ink-muted"
                        placeholder="ENTER CODE HERE"
                    />
                </div>
            </div>

            {/* Google Login - Secondary Option for Signup too */}
            <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-xl transition-all disabled:opacity-50 mb-6"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                </svg>
                Sign up with Google
            </button>

            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-dark text-gray-500">or</span>
                </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                    <div role="alert" id="register-error" className="rounded-md border border-rule bg-paper p-3 text-sm text-ink">
                        {error}
                    </div>
                )}

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
                        Full Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        aria-describedby={error ? 'register-error' : undefined}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-all"
                        placeholder="John Doe"
                    />
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        aria-describedby={error ? 'register-error' : undefined}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-all"
                        placeholder="you@example.com"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        aria-describedby={error ? 'register-error' : undefined}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-all"
                        placeholder="••••••••"
                    />
                    <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                        {isLoading ? 'Creating account...' : 'Create Account'}
                    </button>
                </div>
            </form>

            <p className="mt-6 text-center text-gray-500 text-sm">
                Already have an account?{' '}
                <Link href={loginLink} className="text-primary hover:underline">
                    Sign in
                </Link>
            </p>
        </div>
    );
}
