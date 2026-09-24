'use client';

import { FormEvent, useState } from 'react';

type Project = {
    id: string;
    topic: string;
    isUnlocked: boolean;
    testerAccess: boolean;
};

type UserProjects = {
    name: string;
    email: string;
    projects: Project[];
};

export default function AdminTesterAccessPage() {
    const [email, setEmail] = useState('');
    const [user, setUser] = useState<UserProjects | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    async function lookup(address: string) {
        const response = await fetch(`/api/admin/tester-access?email=${encodeURIComponent(address)}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not look up projects');
        setUser(data.user);
    }

    async function findUser(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setUser(null);
        setMessage('');
        try {
            await lookup(email.trim());
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Could not look up projects');
        } finally {
            setBusy(false);
        }
    }

    async function updateAccess(project: Project) {
        if (!user) return;
        const action = project.testerAccess ? 'revoke' : 'grant';
        if (!window.confirm(`${action === 'grant' ? 'Grant' : 'Revoke'} tester access to "${project.topic}" for ${user.email}?`)) return;
        setBusy(true);
        setMessage('');
        try {
            const response = await fetch('/api/admin/tester-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: project.id, action })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not update access');
            await lookup(user.email);
            setMessage(`Tester access ${action === 'grant' ? 'granted' : 'revoked'} for "${project.topic}".`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Could not update access');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-dark p-4 text-white md:p-8">
            <div className="mx-auto max-w-3xl space-y-6">
                <header>
                    <h1 className="font-display text-2xl font-bold md:text-3xl">Tester access</h1>
                    <p className="mt-2 text-sm text-gray-400">Grant or revoke free workspace access to a registered user&apos;s DIY project. Paid access stays unchanged.</p>
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
                        Find projects
                    </button>
                </form>
                {message && <p role="status" className="text-sm text-gray-200">{message}</p>}
                {user && (
                    <section className="space-y-4">
                        <div>
                            <h2 className="font-semibold">{user.name}</h2>
                            <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                        {user.projects.length === 0 ? (
                            <p className="text-sm text-gray-400">No DIY projects yet. Ask the tester to sign up and create a project first.</p>
                        ) : (
                            <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/5">
                                {user.projects.map((project) => (
                                    <li key={project.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="break-words font-medium">{project.topic}</p>
                                            <p className="text-xs text-gray-400">
                                                {project.isUnlocked ? 'Paid/unlocked' : project.testerAccess ? 'Tester pass active' : 'Locked'}
                                            </p>
                                        </div>
                                        {project.testerAccess ? (
                                            <button type="button" disabled={busy} onClick={() => updateAccess(project)} className="rounded-lg border border-red-400/50 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-400/10 disabled:opacity-50">
                                                Revoke pass
                                            </button>
                                        ) : (
                                            <button type="button" disabled={busy || project.isUnlocked} onClick={() => updateAccess(project)} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-50">
                                                Grant pass
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="text-xs text-gray-400">Revoking a pass does not sign the user out. They can still use any project they paid to unlock.</p>
                    </section>
                )}
            </div>
        </div>
    );
}
