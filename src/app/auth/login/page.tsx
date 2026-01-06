import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Login",
    description: "Sign in to your J-Star FYB account to access your projects and dashboard.",
};

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-dark">
            <Suspense fallback={<div className="text-white">Loading...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
