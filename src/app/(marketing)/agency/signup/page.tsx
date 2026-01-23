import { AgencySignupForm } from '@/features/agency/components/AgencySignupForm';
import { PRICING_CONFIG } from '@/config/pricing';
import { Navbar } from '@/features/marketing/components/Navbar';
import { Check, Crown } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AgencySignupPage(props: {
    searchParams: Promise<{ tier?: string; price?: string; type?: string }>
}) {
    const searchParams = await props.searchParams;
    const tierId = searchParams.tier;
    const price = searchParams.price ? Number(searchParams.price) : undefined;
    const type = searchParams.type as 'paper' | 'software' | undefined;

    // Helper to find tier config
    const findTier = (id: string) => {
        const allTiers = [
            ...PRICING_CONFIG.AGENCY.PAPER,
            ...PRICING_CONFIG.AGENCY.SOFTWARE
        ];
        return allTiers.find(t => t.id === id);
    };

    const tierConfig = tierId ? findTier(tierId) : null;
    const displayLabel = tierConfig?.label || 'Agency Package';

    // Default features list (can be dynamic based on tier later)
    // Dynamic features list
    // @ts-ignore - Index signature issue with literal types
    const dynamicFeatures = tierId && PRICING_CONFIG.AGENCY.FEATURES[tierId]
        ? PRICING_CONFIG.AGENCY.FEATURES[tierId as keyof typeof PRICING_CONFIG.AGENCY.FEATURES]
        : [
            "Complete Source Code & Database",
            "Chapters 1-5 (Dossier Grade)",
            "2 Live Defense Mock Sessions",
            "Priority Support"
        ];

    return (
        <div className="min-h-screen bg-[#030014] text-white">
            <Navbar />

            {/* Ambient Background */}
            <div className="fixed top-0 -left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] -z-10" />
            <div className="fixed bottom-0 -right-40 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] -z-10" />

            <main className="pt-32 pb-20 px-6 container mx-auto max-w-7xl">
                <div className="flex flex-col lg:flex-row gap-16 items-start">

                    {/* Left: Context / Sales Pitch */}
                    <div className="flex-1 space-y-8 lg:sticky lg:top-32">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold uppercase tracking-wider">
                            <Crown className="w-3 h-3" />
                            Agency Access
                        </div>

                        <h1 className="text-4xl lg:text-5xl font-display font-bold leading-tight">
                            Let's Build Your <br />
                            <span className="bg-gradient-to-r from-purple-300 via-purple-400 to-cyan-300 bg-clip-text text-transparent">
                                Distinction Project.
                            </span>
                        </h1>

                        <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
                            {tierId ? (
                                <>
                                    You've chosen the <strong className="text-white">{displayLabel}</strong>.
                                    Our engineering team handles the code, the docs, and the defense coaching.
                                </>
                            ) : (
                                "Join the elite students who don't just pass—they dominate. Select a package to get started."
                            )}
                        </p>

                        <div className="space-y-4 pt-4">
                            {dynamicFeatures.map((feature: string, i: number) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-purple-400 shrink-0">
                                        <Check className="w-5 h-5" />
                                    </div>
                                    <span className="text-gray-300">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: The Form */}
                    <div className="flex-1 w-full max-w-lg mx-auto lg:mx-0">
                        {tierId ? (
                            <AgencySignupForm
                                tierId={tierId}
                                price={price}
                                type={type}
                                className="border border-white/10 backdrop-blur-xl shadow-2xl shadow-purple-900/10"
                            />
                        ) : (
                            <div className="glass-panel rounded-3xl p-8 text-center border border-white/10">
                                <h3 className="text-xl font-bold mb-4">Select a Package</h3>
                                <p className="text-gray-400 mb-6">Please visit our pricing page to select an agency plan.</p>
                                <a
                                    href="/"
                                    className="inline-flex px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors"
                                >
                                    View Pricing
                                </a>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
