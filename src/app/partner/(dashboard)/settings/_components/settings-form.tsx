
'use client';

import { useState } from 'react';
import { Copy, Check, User, Landmark, Key, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updatePassword, updateBankDetails } from '../actions';

export default function SettingsForm({ influencer, banks = [] }: { influencer: any, banks?: any[] }) {
    const [copied, setCopied] = useState(false);
    const [isBankLoading, setIsBankLoading] = useState(false);

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
    const copyCode = () => {
        navigator.clipboard.writeText(influencer.referralCode);
        setCopied(true);
        toast.success('Referral code copied!');
        setTimeout(() => setCopied(false), 2000);
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
                    Payout Details & Verification
                </h3>

                {/* Current Status Card */}
                {influencer.payoutConfig ? (
                    <div className="mb-6 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 rounded-lg p-4 flex justify-between items-center">
                        <div>
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wider mb-1">Active Account</p>
                            <p className="text-zinc-900 dark:text-zinc-100 font-medium">{influencer.payoutConfig.bankName}</p>
                            <p className="text-zinc-500 text-sm">•••• {influencer.payoutConfig.last4Digits} | {influencer.payoutConfig.accountName}</p>
                        </div>
                        <Check className="w-5 h-5 text-green-500" />
                    </div>
                ) : (
                    <div className="mb-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-lg p-4">
                        <p className="text-amber-800 dark:text-amber-200 text-sm">
                            Please verify your details to receive payouts. The name on your account must match your registration.
                        </p>
                    </div>
                )}

                <form action={handleBankSubmit} className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-zinc-500 mb-1">Select Bank</label>
                        <select
                            name="bankCode"
                            required
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        >
                            <option value="">-- Choose a Bank --</option>
                            {/* Banks are passed as props or fetched in client component if needed. For simplicity in this edit, we assume props or use a fixed list if props unavailable, but best practice is props */}
                            {banks.map((bank: any) => (
                                <option key={bank.code} value={bank.code}>{bank.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-500 mb-1">Account Number</label>
                        <input
                            name="accountNumber"
                            type="text"
                            placeholder="0123456789"
                            required
                            maxLength={10}
                            minLength={10}
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isBankLoading}
                        className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        {isBankLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Verify & Save Details
                    </button>
                    <p className="text-xs text-zinc-400">
                        We automatically verify your name with the bank.
                    </p>
                </form>
            </div>

            {/* Security Section */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Security
                </h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-lg text-sm border border-blue-100 dark:border-blue-800">
                    <p className="font-medium">Account Security is managed globally.</p>
                    <p className="mt-1 opacity-90">
                        Since you now log in with your main J-Star account, please update your password in your main account settings.
                    </p>
                </div>
            </div>
        </div>
    );
}
