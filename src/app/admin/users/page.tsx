'use client';

import { FormEvent, useState } from 'react';

type UserSessions = {
    id: string;
    name: string;
    email: string;
    activeSessions: number;
};

export default function AdminUsersPage() {
    const [email, setEmail] = useState('');
    const [user, setUser] = useState<UserSessions | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    async function findUser(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setUser(null);
        setMessage('');
        try {
            const response = await fetch(`/api/admin/users/sessions?email=${encodeURIComponent(email.trim())}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not look up user');
            setUser(data.user);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Could not look up user');
        } finally {
            setBusy(false);
        }
    }

    async function revokeSessions() {
        if (!user || !window.confirm(`Sign ${user.email} out of all active app sessions? They can sign in again.`)) return;
        setBusy(true);
        setMessage('');
        try {
            const response = await fetch('/api/admin/users/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not revoke sessions');
            setUser({ ...user, activeSessions: 0 });
            setMessage(`Signed out ${data.revoked} active session${data.revoked === 1 ? '' : 's'}.`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Could not revoke sessions');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-dark p-4 text-white md:p-8">
            <div className="mx-auto max-w-2xl space-y-6">
                <header>
                    <h1 className="font-display text-2xl font-bold md:text-3xl">User sessions</h1>
                    <p className="mt-2 text-sm text-gray-400">Find a registered user and revoke their app sessions on every device.</p>
                </header>
                <form onSubmit={findUser} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex-1 text-sm text-gray-300">
                        User email
                        <input
                            type="email"
                            required
                            disabled={busy}
                            value={email}
                            onChange={(event) => { setEmail(event.target.value); setUser(null); setMessage(''); }}
                            className="mt-1 block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-primary focus:outline-none"
                            placeholder="person@example.com"
                        />
                    </label>
                    <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 font-semibold text-black hover:bg-primary/80 disabled:opacity-50">
                        Find user
                    </button>
                </form>
                {message && <p role="status" className="text-sm text-gray-200">{message}</p>}
                {user && (
                    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-5">
                        <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                            <p className="mt-3 text-sm">Active app sessions: {user.activeSessions}</p>
                        </div>
                        <button
                            type="button"
                            onClick={revokeSessions}
                            disabled={busy || user.activeSessions === 0}
                            className="rounded-lg border border-red-400/50 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-400/10 disabled:opacity-50"
                        >
                            Sign out on all devices
                        </button>
                        <p className="text-xs text-gray-400">This does not suspend the account or remove paid access. The user can sign in again.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
