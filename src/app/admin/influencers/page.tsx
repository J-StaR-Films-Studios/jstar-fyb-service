'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Plus, CreditCard, ToggleLeft, ToggleRight, Gift, DollarSign, Key, Link as LinkIcon } from 'lucide-react';

interface Influencer {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    referralCode: string;
    isActive: boolean;
    commissionRate: number;
    totalEarnings: number;
    pendingPayout: number;
    freeCredits: number;
    creditsUsed: number;
    createdAt: string;
    _count: {
        referredUsers: number;
        commissions: number;
    };
    bankName?: string | null;
    accountNumber?: string | null;
    accountName?: string | null;
}

export default function AdminInfluencersPage() {
    const [influencers, setInfluencers] = useState<Influencer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showCreditsModal, setShowCreditsModal] = useState<string | null>(null);
    const [viewBankDetails, setViewBankDetails] = useState<Influencer | null>(null);
    const [creditsAmount, setCreditsAmount] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        referralCode: '',
        commissionRate: '0.10',
        freeCredits: '0'
    });

    useEffect(() => {
        fetchInfluencers();
    }, []);

    const fetchInfluencers = async () => {
        try {
            const res = await fetch('/api/admin/influencers');
            const data = await res.json();
            setInfluencers(data.influencers || []);
        } catch (err) {
            console.error('Failed to fetch influencers:', err);
        } finally {
            setLoading(false);
        }
    };

    const createInfluencer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/influencers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    commissionRate: parseFloat(formData.commissionRate),
                    freeCredits: parseFloat(formData.freeCredits)
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowCreateForm(false);
                setFormData({ name: '', email: '', phone: '', referralCode: '', commissionRate: '0.10', freeCredits: '0' });
                fetchInfluencers();
            } else {
                alert(data.error || 'Failed to create influencer');
            }
        } catch (err) {
            console.error('Create error:', err);
        }
    };

    const toggleActive = async (id: string) => {
        try {
            await fetch('/api/admin/influencers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_active', influencerId: id })
            });
            fetchInfluencers();
        } catch (err) {
            console.error('Toggle error:', err);
        }
    };

    const grantCredits = async (id: string) => {
        const amount = parseFloat(creditsAmount);
        if (!amount || amount <= 0) return alert('Enter a valid amount');

        try {
            const res = await fetch('/api/admin/influencers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'grant_credits', influencerId: id, amount })
            });
            const data = await res.json();
            if (data.success) {
                setShowCreditsModal(null);
                setCreditsAmount('');
                fetchInfluencers();
            }
        } catch (err) {
            console.error('Grant credits error:', err);
        }
    };

    const markPaid = async (id: string) => {
        if (!confirm('Mark all pending commissions as paid?')) return;

        try {
            await fetch('/api/admin/influencers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark_paid', influencerId: id })
            });
            fetchInfluencers();
        } catch (err) {
            console.error('Mark paid error:', err);
        }
    };

    const resetPassword = async (id: string, name: string) => {
        if (!confirm(`Reset password for ${name} to "ChangeMe123!"?`)) return;

        try {
            const res = await fetch('/api/admin/influencers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset_password', influencerId: id })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
            }
        } catch (err) {
            console.error('Reset password error:', err);
        }
    };

    const copyLoginLink = () => {
        const url = `${window.location.origin}/partner/login`;
        navigator.clipboard.writeText(url);
        alert('Partner Login Link copied to clipboard!');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark text-white p-8 flex items-center justify-center">
                <div className="animate-pulse">Loading influencers...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
                            <Megaphone className="w-7 h-7 text-primary" /> Influencer Management
                        </h1>
                        <p className="text-gray-400 text-sm">Manage referral partners and track commissions</p>
                    </div>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-black font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Influencer
                    </button>
                </header>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-xs text-gray-500 uppercase">Total Influencers</div>
                        <div className="text-2xl font-bold">{influencers.length}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-xs text-gray-500 uppercase">Total Referrals</div>
                        <div className="text-2xl font-bold">{influencers.reduce((a, i) => a + i._count.referredUsers, 0)}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-xs text-green-500 uppercase">Total Earnings</div>
                        <div className="text-2xl font-bold">₦{influencers.reduce((a, i) => a + i.totalEarnings, 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-xs text-yellow-500 uppercase">Pending Payouts</div>
                        <div className="text-2xl font-bold">₦{influencers.reduce((a, i) => a + i.pendingPayout, 0).toLocaleString()}</div>
                    </div>
                </div>

                {/* Influencers Table */}
                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="text-left p-4 font-medium text-gray-400">Name</th>
                                    <th className="text-left p-4 font-medium text-gray-400">Code</th>
                                    <th className="text-center p-4 font-medium text-gray-400">Referrals</th>
                                    <th className="text-right p-4 font-medium text-gray-400">Pending</th>
                                    <th className="text-right p-4 font-medium text-gray-400">Credits</th>
                                    <th className="text-center p-4 font-medium text-gray-400">Status</th>
                                    <th className="text-right p-4 font-medium text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {influencers.map((inf) => (
                                    <tr key={inf.id} className="hover:bg-white/5">
                                        <td className="p-4">
                                            <div className="font-medium">{inf.name}</div>
                                            <div className="text-xs text-gray-500">{inf.email}</div>
                                        </td>
                                        <td className="p-4">
                                            <code className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-mono">{inf.referralCode}</code>
                                        </td>
                                        <td className="text-center p-4">{inf._count.referredUsers}</td>
                                        <td className="text-right p-4 text-yellow-400">₦{inf.pendingPayout.toLocaleString()}</td>
                                        <td className="text-right p-4">
                                            <span className="text-green-400">₦{(inf.freeCredits - inf.creditsUsed).toLocaleString()}</span>
                                            <span className="text-gray-500 text-xs"> / {inf.freeCredits.toLocaleString()}</span>
                                        </td>
                                        <td className="text-center p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs ${inf.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {inf.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => copyLoginLink()}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-blue-400"
                                                    title="Copy Login Link"
                                                >
                                                    <LinkIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setViewBankDetails(inf)}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-cyan-400"
                                                    title="View Payout Details"
                                                >
                                                    <CreditCard className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => resetPassword(inf.id, inf.name)}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-purple-400"
                                                    title="Reset Password"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setShowCreditsModal(inf.id)}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-green-400"
                                                    title="Grant Credits"
                                                >
                                                    <Gift className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => markPaid(inf.id)}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-yellow-400"
                                                    title="Mark Paid"
                                                    disabled={inf.pendingPayout === 0}
                                                >
                                                    <DollarSign className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => toggleActive(inf.id)}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                    title={inf.isActive ? 'Deactivate' : 'Activate'}
                                                >
                                                    {inf.isActive ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4 text-red-400" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {influencers.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500">
                                            No influencers yet. Click "Add Influencer" to create one.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create Influencer Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1a1a1f] border border-white/10 rounded-xl p-6 w-full max-w-md">
                            <h2 className="text-xl font-bold mb-4">Add Influencer</h2>
                            <form onSubmit={createInfluencer} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Referral Code</label>
                                    <input
                                        type="text"
                                        value={formData.referralCode}
                                        onChange={(e) => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary font-mono"
                                        placeholder="e.g., JOHNGPT"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Commission Rate</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.commissionRate}
                                            onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">0.10 = 10%</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Free Credits (₦)</label>
                                        <input
                                            type="number"
                                            value={formData.freeCredits}
                                            onChange={(e) => setFormData({ ...formData, freeCredits: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowCreateForm(false)} className="flex-1 py-2 border border-white/10 rounded-lg hover:bg-white/5">
                                        Cancel
                                    </button>
                                    <button type="submit" className="flex-1 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/80">
                                        Create
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Grant Credits Modal */}
                {showCreditsModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1a1a1f] border border-white/10 rounded-xl p-6 w-full max-w-sm">
                            <h2 className="text-xl font-bold mb-4">Grant Free Credits</h2>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Amount (₦)</label>
                                <input
                                    type="number"
                                    value={creditsAmount}
                                    onChange={(e) => setCreditsAmount(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                    placeholder="e.g., 50000"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => { setShowCreditsModal(null); setCreditsAmount(''); }} className="flex-1 py-2 border border-white/10 rounded-lg hover:bg-white/5">
                                    Cancel
                                </button>
                                <button onClick={() => grantCredits(showCreditsModal)} className="flex-1 py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400">
                                    Grant Credits
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Bank Details Modal */}
                {viewBankDetails && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1a1a1f] border border-white/10 rounded-xl p-6 w-full max-w-sm">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-cyan-400" />
                                Payout Details
                            </h2>
                            <div className="space-y-4 bg-white/5 p-4 rounded-lg">
                                <div>
                                    <div className="text-xs text-gray-400 uppercase mb-1">Bank Name</div>
                                    <div className="font-medium text-lg">{viewBankDetails.bankName || 'Not Provided'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400 uppercase mb-1">Account Number</div>
                                    <div className="font-mono text-xl tracking-wider">{viewBankDetails.accountNumber || '---'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400 uppercase mb-1">Account Name</div>
                                    <div className="font-medium text-lg">{viewBankDetails.accountName || '---'}</div>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => markPaid(viewBankDetails.id)}
                                    className="flex-1 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 flex items-center justify-center gap-2"
                                    disabled={viewBankDetails.pendingPayout === 0}
                                >
                                    <DollarSign className="w-4 h-4" />
                                    Mark ₦{viewBankDetails.pendingPayout.toLocaleString()} Paid
                                </button>
                            </div>

                            <button
                                onClick={() => setViewBankDetails(null)}
                                className="mt-3 w-full py-2 border border-white/10 rounded-lg hover:bg-white/5"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
