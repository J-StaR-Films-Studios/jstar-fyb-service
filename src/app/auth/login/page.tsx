import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Login",
    description: "Sign in to J-Star Projects to continue your work.",
};

export default function LoginPage() {
    return (
        <div className="margin-public min-h-screen flex items-center justify-center bg-paper px-4 py-24">
            <Suspense fallback={<div className="text-ink">Loading sign-in…</div>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
