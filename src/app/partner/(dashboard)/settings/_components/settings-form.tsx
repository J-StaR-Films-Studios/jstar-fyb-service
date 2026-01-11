
'use client';

import { useState } from 'react';
import { updatePassword, updateBankDetails } from '../actions';
import { Copy, Check, Loader2, Key, User, Landmark } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsForm({ influencer }: { influencer: any }) {
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isBankLoading, setIsBankLoading] = useState(false);

    const copyCode = () => {
        navigator.clipboard.writeText(influencer.referralCode);
        setCopied(true);
        toast.success('Referral code copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        const result = await updatePassword(formData);
        setIsLoading(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(result.success);
            (document.getElementById('password-form') as HTMLFormElement)?.reset();
        }
    };

    const handleBankSubmit = async (formData: FormData) => {
        setIsBankLoading(true);
        const result = await updateBankDetails(formData);
        setIsBankLoading(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(result.success);
        }
    };

    return (
        <div className="space-y-8">
            {/* Profile Section */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Profile & Referral
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-zinc-500 mb-1">Name</label>
                        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 text-sm">
                            {influencer.name}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-500 mb-1">Email</label>
                        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 text-sm">
                            {influencer.email}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-zinc-500 mb-1">Your Referral Code</label>
                        <div className="flex gap-2">
                            <div className="flex-1 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg text-blue-700 dark:text-blue-300 font-mono text-sm tracking-wider">
                                {influencer.referralCode}
                            </div>
                            <button
                                onClick={copyCode}
                                className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payout Details Section */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <Landmark className="w-5 h-5" />
                    Payout Details
                </h3>
                <p className="text-sm text-zinc-500 mb-6">
                    Enter your bank account details to receive your commission payouts.
                </p>
                <form action={handleBankSubmit} className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-zinc-500 mb-1">Bank Name</label>
                        <input
                            name="bankName"
                            type="text"
                            defaultValue={influencer.bankName || ''}
                            placeholder="e.g. Guarantee Trust Bank"
                            required
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-500 mb-1">Account Number</label>
                        <input
                            name="accountNumber"
                            type="text"
                            defaultValue={influencer.accountNumber || ''}
                            placeholder="e.g. 0123456789"
                            required
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-500 mb-1">Account Name</label>
                        <input
                            name="accountName"
                            type="text"
                            defaultValue={influencer.accountName || ''}
                            placeholder="e.g. John Doe"
                            required
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isBankLoading}
                        className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        {isBankLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Bank Details
                    </button>
                </form>
            </div>

            {/* Security Section */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Security
                </h3>
                <form id="password-form" action={handleSubmit} className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-zinc-500 mb-1">Current Password</label>
                        <input
                            name="currentPassword"
                            type="password"
                            required
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-500 mb-1">New Password</label>
                        <input
                            name="newPassword"
                            type="password"
                            required
                            minLength={8}
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    );
}
