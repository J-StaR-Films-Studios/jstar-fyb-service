'use client';

import { useState } from 'react';
import { ArrowRight, Phone, CheckCircle2, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { agencySignupAction, type AgencySignupData } from '../actions/agencySignup';
import { PRICING_CONFIG } from '@/config/pricing';
import { cn } from '@/lib/utils'; // Assuming this exists, standard in vibe projects
import { toast } from 'sonner';

interface AgencySignupFormProps {
    tierId?: string;
    price?: number;
    type?: 'paper' | 'software';
    className?: string;
    onSuccess?: () => void;
}

export function AgencySignupForm({ tierId, price, type, className, onSuccess }: AgencySignupFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [whatsappUrl, setWhatsappUrl] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        confirmEmail: '',
        whatsapp: '',
        department: '',
        topic: '',
    });

    // Resolve tier details
    // Resolve tier details
    const allTiers = [...PRICING_CONFIG.AGENCY.PAPER, ...PRICING_CONFIG.AGENCY.SOFTWARE];
    const tierConfig = tierId ? allTiers.find(t => t.id === tierId) : null;
    const displayLabel = tierConfig?.label || tierId?.replace('AGENCY_', '').replace(/_/g, ' ') || 'Agency Signup';
    const displayPrice = price || tierConfig?.price || 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Basic client validation
        if (formData.email !== formData.confirmEmail) {
            setError("Emails do not match");
            setIsLoading(false);
            return;
        }

        try {
            const payload: AgencySignupData = {
                ...formData,
                tier: tierId || 'UNKNOWN_TIER',
                price: displayPrice,
            };

            const result = await agencySignupAction(payload);

            if (result.success) {
                setWhatsappUrl(result.whatsappUrl);
                setIsSuccess(true);
                toast.success("Account created! Redirecting to WhatsApp...");
                onSuccess?.();
            } else {
                setError(result.error || "Something went wrong. Please try again.");
                if (result.error) toast.error(result.error);
            }
        } catch (err) {
            console.error("Signup error:", err);
            setError("An unexpected error occurred.");
            toast.error("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className={cn("w-full max-w-lg glass-panel rounded-3xl p-8 md:p-12 text-center relative overflow-hidden animate-in fade-in zoom-in duration-300", className)}>
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-400">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-display font-bold mb-4">You're In!</h2>
                <p className="text-gray-400 mb-8">
                    We've created your file. Click below to look confirm details with J Star on WhatsApp.
                </p>
                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-[#25D366] text-white font-display font-bold uppercase tracking-wider rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
                >
                    <MessageCircle className="w-5 h-5" />
                    Open WhatsApp
                </a>
            </div>
        );
    }

    return (
        <div className={cn("w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden", className)}>

            {/* Header / Tier Badge */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl md:text-2xl font-display font-bold">Fast-Track Agency</h2>
                {tierId && (
                    <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs font-bold text-purple-400 uppercase tracking-wide">
                        {displayLabel}
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Name */}
                <div className="relative group">
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        minLength={2}
                        placeholder=" "
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-primary transition-colors peer text-white placeholder-transparent"
                    />
                    <label className="absolute left-4 top-4 text-gray-500 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-[#030014] peer-focus:px-2 pointer-events-none">
                        Full Name
                    </label>
                </div>

                {/* Email Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative group">
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder=" "
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-primary transition-colors peer text-white placeholder-transparent"
                        />
                        <label className="absolute left-4 top-4 text-gray-500 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-[#030014] peer-focus:px-2 pointer-events-none">
                            Email Address
                        </label>
                    </div>
                    <div className="relative group">
                        <input
                            type="email"
                            name="confirmEmail"
                            value={formData.confirmEmail}
                            onChange={handleChange}
                            required
                            placeholder=" "
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-primary transition-colors peer text-white placeholder-transparent"
                        />
                        <label className="absolute left-4 top-4 text-gray-500 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-[#030014] peer-focus:px-2 pointer-events-none">
                            Confirm Email
                        </label>
                    </div>
                </div>

                {/* WhatsApp */}
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <Phone className="w-4 h-4" />
                    </div>
                    <input
                        type="tel"
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={(e) => {
                            // Only allow digits
                            const val = e.target.value.replace(/\D/g, '');
                            setFormData(prev => ({ ...prev, whatsapp: val }));
                        }}
                        required
                        minLength={10}
                        maxLength={15}
                        placeholder=" "
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-4 outline-none focus:border-primary transition-colors peer text-white placeholder-transparent"
                    />
                    <label className="absolute left-10 top-4 text-gray-500 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-[#030014] peer-focus:px-2 pointer-events-none">
                        WhatsApp Number
                    </label>
                </div>

                {/* Department */}
                <div className="relative group">
                    <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        required
                        placeholder=" "
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-primary transition-colors peer text-white placeholder-transparent"
                    />
                    <label className="absolute left-4 top-4 text-gray-500 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-[#030014] peer-focus:px-2 pointer-events-none">
                        Department / Course
                    </label>
                </div>

                {/* Topic (Optional) */}
                <div className="relative group">
                    <textarea
                        name="topic"
                        value={formData.topic}
                        onChange={handleChange}
                        rows={3}
                        placeholder=" "
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-primary transition-colors peer text-white placeholder-transparent resize-none"
                    ></textarea>
                    <label className="absolute left-4 top-4 text-gray-500 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-4 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-[#030014] peer-focus:px-2 pointer-events-none">
                        Project Topic (Optional)
                    </label>
                    <p className="text-xs text-gray-500 mt-2 text-right">Leave blank if you want suggestions</p>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-primary text-white font-display font-bold uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all glow-box flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Creating Account...
                        </>
                    ) : (
                        <>
                            Get Started
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>

                <p className="text-center text-xs text-gray-500 mt-4">
                    We'll create an account for you securely.
                </p>

            </form>
        </div>
    );
}
