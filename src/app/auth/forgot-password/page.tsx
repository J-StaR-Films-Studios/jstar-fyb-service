"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authClient.signIn.magicLink({ email, callbackURL: "/dashboard" });
            setSubmitted(true);
            toast.success("If an account exists, a magic link has been sent!");
        } catch (error) {
            console.error("Magic link error:", error);
            toast.error("Failed to send magic link. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return <div className="margin-public flex min-h-screen items-center justify-center bg-paper px-4 py-24">
        <div className="w-full max-w-md rounded-md border border-rule bg-writing p-6 sm:p-8">
            <p className="mb-3 font-margin-mono text-xs font-semibold uppercase tracking-wider text-rust">J-Star Projects</p>
            {submitted ? <>
                <h1 className="text-3xl font-bold">Check your email</h1>
                <p className="mt-4 leading-relaxed text-ink-muted">We sent a magic login link to <span className="font-semibold text-ink break-all">{email}</span>. Click the link to sign in.</p>
                <Link href="/auth/login" className="mt-8 inline-flex min-h-11 items-center text-rust underline underline-offset-4">Back to login</Link>
            </> : <>
                <h1 className="text-3xl font-bold">Forgot password?</h1>
                <p className="mt-3 text-ink-muted">Enter your email to receive a magic login link. No password needed.</p>
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-semibold">Email address</label>
                        <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="min-h-11 w-full rounded-md border border-rule bg-writing px-3 text-ink placeholder:text-ink-muted" />
                    </div>
                    <button type="submit" disabled={loading} className="min-h-11 w-full rounded-md bg-rust px-4 font-semibold text-writing hover:bg-[#953D2C]">{loading ? 'Sending link…' : 'Send magic link'}</button>
                </form>
                <Link href="/auth/login" className="mt-6 inline-flex min-h-11 items-center text-rust underline underline-offset-4">Return to login</Link>
            </>}
        </div>
    </div>;
}
