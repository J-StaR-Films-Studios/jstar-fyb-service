'use client';

import { useState, useEffect } from 'react';
import { Percent, Plus, Ban, Calendar, Users } from 'lucide-react';

interface DiscountCode {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    maxUses: number | null;
    currentUses: number;
    minAmount: number | null;
    expiresAt: string | null;
    isActive: boolean;
    createdAt: string;
    _count: {
        payments: number;
    };
}

export default function AdminDiscountsPage() {
    const [codes, setCodes] = useState<DiscountCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        discountType: 'PERCENTAGE',
        discountValue: '',
        maxUses: '',
        minAmount: '',
        expiresAt: ''
    });

    useEffect(() => {
        fetchCodes();
    }, []);

    const fetchCodes = async () => {
        try {
            const res = await fetch('/api/admin/discounts');
            const data = await res.json();
            setCodes(data.codes || []);
        } catch (err) {
            console.error('Failed to fetch codes:', err);
        } finally {
            setLoading(false);
        }
    };

    const createCode = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/discounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: formData.code,
                    discountType: formData.discountType,
                    discountValue: parseFloat(formData.discountValue),
                    maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
                    minAmount: formData.minAmount ? parseFloat(formData.minAmount) : undefined,
                    expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowCreateForm(false);
                setFormData({ code: '', discountType: 'PERCENTAGE', discountValue: '', maxUses: '', minAmount: '', expiresAt: '' });
                fetchCodes();
            } else {
                let errorMessage = 'Failed to create code';
                if (typeof data.error === 'string') {
                    errorMessage = data.error;
                } else if (data.error && typeof data.error === 'object') {
                    // Start extracting messages, prioritizing global errors then field errors
                    const parts = [];
                    if (data.error._errors?.length) parts.push(data.error._errors.join(', '));

                    // Add field-specific errors
                    Object.entries(data.error).forEach(([key, val]: [string, any]) => {
                        if (key !== '_errors' && val?._errors?.length) {
                            parts.push(`${key}: ${val._errors.join(', ')}`);
                        }
                    });

                    if (parts.length > 0) errorMessage = parts.join(' | ');
                }
                alert(errorMessage);
            }
        } catch (err) {
            console.error('Create error:', err);
            alert('An unexpected error occurred');
        }
    };

    const deactivateCode = async (id: string) => {
        if (!confirm('Deactivate this discount code?')) return;

        try {
            await fetch('/api/admin/discounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deactivate', codeId: id })
            });
            fetchCodes();
        } catch (err) {
            console.error('Deactivate error:', err);
        }
    };

    const formatDiscount = (code: DiscountCode) => {
        if (code.discountType === 'PERCENTAGE') {
            return `${code.discountValue}%`;
        }
        return `₦${code.discountValue.toLocaleString()}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark text-white p-8 flex items-center justify-center">
                <div className="animate-pulse">Loading discount codes...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
                            <Percent className="w-7 h-7 text-primary" /> Discount Codes
                        </h1>
                        <p className="text-gray-400 text-sm">Create and manage promotional discount codes</p>
                    </div>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-black font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Create Code
                    </button>
                </header>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-xs text-gray-500 uppercase">Total Codes</div>
                        <div className="text-2xl font-bold">{codes.length}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-xs text-green-500 uppercase">Active</div>
                        <div className="text-2xl font-bold">{codes.filter(c => c.isActive).length}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-xs text-blue-500 uppercase">Total Uses</div>
                        <div className="text-2xl font-bold">{codes.reduce((a, c) => a + c.currentUses, 0)}</div>
                    </div>
                </div>

                {/* Codes Table */}
                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="text-left p-4 font-medium text-gray-400">Code</th>
                                    <th className="text-center p-4 font-medium text-gray-400">Discount</th>
                                    <th className="text-center p-4 font-medium text-gray-400">Uses</th>
                                    <th className="text-center p-4 font-medium text-gray-400">Min Amount</th>
                                    <th className="text-center p-4 font-medium text-gray-400">Expires</th>
                                    <th className="text-center p-4 font-medium text-gray-400">Status</th>
                                    <th className="text-right p-4 font-medium text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {codes.map((code) => (
                                    <tr key={code.id} className="hover:bg-white/5">
                                        <td className="p-4">
                                            <code className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-mono">{code.code}</code>
                                        </td>
                                        <td className="text-center p-4 font-bold text-green-400">{formatDiscount(code)}</td>
                                        <td className="text-center p-4">
                                            {code.currentUses}{code.maxUses ? ` / ${code.maxUses}` : ''}
                                        </td>
                                        <td className="text-center p-4 text-gray-400">
                                            {code.minAmount ? `₦${code.minAmount.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="text-center p-4 text-gray-400">
                                            {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="text-center p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs ${code.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {code.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {code.isActive && (
                                                    <button
                                                        onClick={() => deactivateCode(code.id)}
                                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400"
                                                        title="Deactivate"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {codes.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500">
                                            No discount codes yet. Click "Create Code" to add one.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create Code Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1a1a1f] border border-white/10 rounded-xl p-6 w-full max-w-md">
                            <h2 className="text-xl font-bold mb-4">Create Discount Code</h2>
                            <form onSubmit={createCode} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Code</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary font-mono"
                                        placeholder="e.g., NEWYEAR25"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Type</label>
                                        <select
                                            value={formData.discountType}
                                            onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                        >
                                            <option value="PERCENTAGE">Percentage</option>
                                            <option value="FIXED">Fixed Amount</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">
                                            {formData.discountType === 'PERCENTAGE' ? 'Percent (%)' : 'Amount (₦)'}
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.discountValue}
                                            onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                            placeholder={formData.discountType === 'PERCENTAGE' ? '15' : '5000'}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Max Uses (optional)</label>
                                        <input
                                            type="number"
                                            value={formData.maxUses}
                                            onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                            placeholder="Unlimited"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Min Amount (₦)</label>
                                        <input
                                            type="number"
                                            value={formData.minAmount}
                                            onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                            placeholder="No minimum"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Expiry Date (optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.expiresAt}
                                        onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowCreateForm(false)} className="flex-1 py-2 border border-white/10 rounded-lg hover:bg-white/5">
                                        Cancel
                                    </button>
                                    <button type="submit" className="flex-1 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/80">
                                        Create Code
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
