import { Suspense } from 'react';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Create Account",
    description: "Create your J-Star Projects account to start your final year project.",
};

export default function RegisterPage() {
    return (
        <div className="margin-public min-h-screen flex items-center justify-center bg-paper px-4 py-24">
            <Suspense fallback={<div className="text-ink">Loading registration…</div>}>
                <RegisterForm />
            </Suspense>
        </div>
    );
}
