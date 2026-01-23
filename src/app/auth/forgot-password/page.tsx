"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // First check if user exists
            const { checkEmailExists } = await import("@/features/auth/actions/checkEmail");
            const exists = await checkEmailExists(email);

            if (!exists) {
                toast.error("No account found with this email");
                setLoading(false);
                return;
            }

            await authClient.signIn.magicLink({
                email,
                callbackURL: "/dashboard", // Redirect to dashboard after login
            });
            setSubmitted(true);
            toast.success("Magic link sent!");
        } catch (error) {
            console.error("Magic link error:", error);
            toast.error("Failed to send magic link. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
                <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Mail className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
                        <p className="text-gray-500">
                            We sent a magic login link to <span className="font-medium text-gray-900">{email}</span>.
                            Click the link to sign in instantly.
                        </p>
                    </div>
                    <div className="pt-4">
                        <Link
                            href="/auth/login"
                            className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <div className="space-y-2 text-center mb-8">
                    <h1 className="text-2xl font-bold tracking-tight">Forgot Password?</h1>
                    <p className="text-sm text-gray-500">
                        Enter your email to receive a magic login link. No password needed.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-gray-700">
                            Email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending Link...
                            </>
                        ) : (
                            "Send Magic Link"
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link
                        href="/auth/login"
                        className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                        Return to login
                    </Link>
                </div>
            </div>
        </div>
    );
}
