import { Suspense } from 'react';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Create Account",
    description: "Join J-Star FYB today and start dominating your final year project.",
};

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-dark">
            <Suspense fallback={<div className="text-white">Loading...</div>}>
                <RegisterForm />
            </Suspense>
        </div>
    );
}
