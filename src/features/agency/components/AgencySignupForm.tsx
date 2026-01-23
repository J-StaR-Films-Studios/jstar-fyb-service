'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Phone, CheckCircle2, MessageCircle, AlertCircle, Loader2, Sparkles, User, Mail, MailCheck, GraduationCap, Lightbulb } from 'lucide-react';
import { agencySignupAction, type AgencySignupData } from '../actions/agencySignup';
import { PRICING_CONFIG } from '@/config/pricing';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';

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
        complexity: 3,
        twist: '',
        notes: '',
    });

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [debouncedTopic] = useDebounce(formData.topic, 800);

    // AI Analysis Effect
    useEffect(() => {
        const analyzeTopic = async () => {
            if (debouncedTopic.length < 5 || !formData.department) return;

            setIsAnalyzing(true);
            try {
                const res = await fetch('/api/analyze-topic', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topic: debouncedTopic,
                        department: formData.department
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.complexity) {
                        setFormData(prev => ({
                            ...prev,
                            complexity: data.complexity,
                            twist: data.suggestedTwist || prev.twist,
                        }));
                        toast.success("AI analyzed your topic!");
                    }
                }
            } catch (error) {
                console.error("Analysis failed", error);
            } finally {
                setIsAnalyzing(false);
            }
        };

        analyzeTopic();
    }, [debouncedTopic, formData.department]);

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

            <form onSubmit={handleSubmit} className="space-y-4">

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Name */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-purple-200 ml-1">Full Name</label>
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none">
                            <User className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            minLength={2}
                            placeholder="e.g. Bonsa Nemera"
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:bg-primary/10 focus:border-primary focus:outline-none focus:ring-0 transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Email Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-purple-200 ml-1">Email</label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none">
                                <Mail className="w-4 h-4" />
                            </div>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="john@example.com"
                                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:bg-primary/10 focus:border-primary focus:outline-none focus:ring-0 transition-all text-sm font-medium"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-purple-200 ml-1">Confirm</label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none">
                                <MailCheck className="w-4 h-4" />
                            </div>
                            <input
                                type="email"
                                name="confirmEmail"
                                value={formData.confirmEmail}
                                onChange={handleChange}
                                required
                                placeholder="Confirm email"
                                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:bg-primary/10 focus:border-primary focus:outline-none focus:ring-0 transition-all text-sm font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* WhatsApp */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-purple-200 ml-1">WhatsApp</label>
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none">
                            <Phone className="w-4 h-4" />
                        </div>
                        <input
                            type="tel"
                            name="whatsapp"
                            value={formData.whatsapp}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setFormData(prev => ({ ...prev, whatsapp: val }));
                            }}
                            required
                            minLength={10}
                            maxLength={15}
                            placeholder="e.g. 2348153353131"
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:bg-primary/10 focus:border-primary focus:outline-none focus:ring-0 transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-purple-200 ml-1">Department</label>
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none">
                            <GraduationCap className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Computer Science"
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:bg-primary/10 focus:border-primary focus:outline-none focus:ring-0 transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Topic (Optional) */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-purple-200 ml-1 flex justify-between items-center">
                        Project Topic
                        <span className="text-[10px] text-gray-400 font-normal bg-white/5 px-2 py-0.5 rounded-full">Optional</span>
                    </label>
                    <textarea
                        name="topic"
                        value={formData.topic}
                        onChange={handleChange}
                        rows={2}
                        placeholder="e.g. Design and implementation of..."
                        className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:bg-primary/10 focus:border-primary focus:outline-none focus:ring-0 transition-all text-sm font-medium resize-none"
                    ></textarea>
                </div>

                {/* AI Analysis Section */}
                {formData.topic.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                        {/* Header + Badge Row */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-primary">
                                <Sparkles className="w-4 h-4" />
                                <span className="font-display font-bold tracking-wide text-xs">AI ANALYSIS</span>
                                {isAnalyzing && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                            </div>

                            {/* Complexity Badge */}
                            {!isAnalyzing && (
                                <div className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border",
                                    formData.complexity <= 2
                                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                        : formData.complexity <= 4
                                            ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                                            : "border-red-500/20 bg-red-500/10 text-red-400"
                                )}>
                                    <span>COMPLEXITY: {formData.complexity}/5</span>
                                    <span className={cn("w-1 h-1 rounded-full",
                                        formData.complexity <= 2 ? "bg-emerald-400" : formData.complexity <= 4 ? "bg-yellow-400" : "bg-red-400"
                                    )}></span>
                                    <span>{formData.complexity <= 2 ? "BASIC" : formData.complexity <= 4 ? "MODERATE" : "EXPERT"}</span>
                                </div>
                            )}
                        </div>

                        {/* Twist Section */}
                        {formData.twist && (
                            <div className="bg-black/20 rounded-lg p-3 border border-white/5 mb-3">
                                <label className="block text-[10px] font-bold text-cyan-400 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                                    <Lightbulb className="w-3 h-3" />
                                    Proposed Twist
                                </label>
                                <input
                                    type="text"
                                    name="twist"
                                    value={formData.twist}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-none p-0 text-sm font-medium leading-relaxed font-display text-white/90 focus:ring-0 focus:outline-none placeholder:text-gray-600"
                                    placeholder="AI will generate a twist..."
                                />
                            </div>
                        )}

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <input
                                type="text"
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Additional Notes"
                                className="w-full px-3 py-2.5 rounded-lg bg-black/20 border border-white/10 text-white placeholder:text-gray-600 focus:bg-primary/10 focus:border-primary focus:outline-none focus:ring-0 transition-all text-sm font-medium"
                            />
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full mt-6 overflow-hidden rounded-xl bg-gradient-to-br from-primary to-cyan-500 p-[1px] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                >
                    <div className="relative flex items-center justify-center gap-2 rounded-xl bg-[#030014]/40 backdrop-blur-sm py-3 transition-all group-hover:bg-opacity-0">
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                <span className="font-display text-base font-bold tracking-wide text-white">CREATING...</span>
                            </>
                        ) : (
                            <>
                                <span className="font-display text-base font-bold tracking-wide text-white">GET STARTED</span>
                                <ArrowRight className="w-4 h-4 text-white transition-transform group-hover:translate-x-1" />
                            </>
                        )}
                    </div>
                </button>

                <p className="text-center text-[10px] text-gray-500 mt-4">
                    We'll create a generic password for you securely.
                </p>

            </form>
        </div>
    );
}
