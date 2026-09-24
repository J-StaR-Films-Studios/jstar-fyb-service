'use client';

import { Check, FileText, Code2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PRICING_CONFIG, WORKSPACE_UNLOCK_PRICE } from '@/config/pricing';

const PRICING = {
    saas: {
        paperOnly: { price: WORKSPACE_UNLOCK_PRICE, features: ['AI-Generated Abstract', 'Full Chapter 1-5 Outline', 'Formatting Templates', 'Unlimited Revisions'] },
        software: { price: PRICING_CONFIG.SAAS.SOFTWARE.price, features: ['Everything in Paper-Only', 'Code Snippets & Boilerplate', 'Database Schema Generator', 'Tech Stack Recommendations'] }
    },
    agency: {
        paperOnly: PRICING_CONFIG.AGENCY.PAPER.map(tier => ({
            name: tier.label, price: tier.price, id: tier.id,
            features: tier.id === 'AGENCY_PAPER_EXPRESS' ? ['Chapters 1-5 Written', 'APA/IEEE Formatting', 'Plagiarism Check'] : tier.id === 'AGENCY_PAPER_DEFENSE' ? ['Everything in Express', 'Mock Defense Session', 'Presentation Slides'] : ['Everything in Defense', 'Priority Support', 'Unlimited Revisions'],
            popular: tier.popular || false
        })),
        software: PRICING_CONFIG.AGENCY.SOFTWARE.map(tier => ({
            name: tier.label, price: tier.price, id: tier.id,
            features: tier.id === 'AGENCY_CODE_GO' ? ['Complete Source Code', 'Database Setup Script', 'Installation Guide'] : tier.id === 'AGENCY_DEFENSE_READY' ? ['Everything in Code & Go', 'Chapter 3 & 4 Write-up', 'Mock Defense Session'] : ['Full Documentation (Ch 1-5)', 'Presentation Slides', 'Priority Support'],
            popular: tier.popular || false
        }))
    }
};

export function Pricing() {
    const [projectType, setProjectType] = useState<'paper' | 'software'>('software');
    const formatPrice = (price: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(price);
    const diy = projectType === 'paper' ? PRICING.saas.paperOnly : PRICING.saas.software;
    const agency = projectType === 'paper' ? PRICING.agency.paperOnly : PRICING.agency.software;

    return (
        <section id="pricing" className="border-t border-rule py-16 md:py-20">
            <div className="mx-auto max-w-[1200px] px-5 md:px-8">
                <p className="font-margin-mono text-xs font-semibold uppercase tracking-wider text-rust">Choose your path</p>
                <h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl">Pricing for the way you work</h2>
                <p className="mt-4 max-w-[65ch] text-ink-muted">Build your own project with the AI builder, or talk to the team about agency help.</p>
                <div className="mt-8 inline-flex flex-wrap gap-2 rounded-md border border-rule bg-writing p-1" role="group" aria-label="Project type">
                    <button type="button" aria-pressed={projectType === 'paper'} onClick={() => setProjectType('paper')} className={`flex min-h-11 items-center gap-2 rounded px-4 text-sm font-semibold ${projectType === 'paper' ? 'bg-ink text-writing' : 'text-ink hover:bg-selection'}`}><FileText size={16} /> Paper only</button>
                    <button type="button" aria-pressed={projectType === 'software'} onClick={() => setProjectType('software')} className={`flex min-h-11 items-center gap-2 rounded px-4 text-sm font-semibold ${projectType === 'software' ? 'bg-ink text-writing' : 'text-ink hover:bg-selection'}`}><Code2 size={16} /> Software + paper</button>
                </div>
                <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.5fr]">
                    <div>
                        <h3 className="mb-4 text-xl font-bold">Self-service builder</h3>
                        <div className="rounded-md border border-rule bg-writing p-6">
                            <p className="text-3xl font-bold">{formatPrice(diy.price)}</p>
                            <p className="mt-1 text-sm text-ink-muted">One-time payment</p>
                            <ul className="mt-6 space-y-3">{diy.features.map(feature => <li key={feature} className="flex gap-3 text-sm leading-relaxed"><Check className="h-5 w-5 shrink-0 text-ink" />{feature}</li>)}</ul>
                            <Link href="/project/builder" className="mt-7 flex min-h-11 items-center justify-center rounded-md bg-rust px-4 font-semibold text-writing hover:bg-[#953D2C]">Start building free</Link>
                            <p className="mt-3 text-sm text-ink-muted">Pay only when you&apos;re ready to unlock</p>
                        </div>
                    </div>
                    <div>
                        <h3 className="mb-4 text-xl font-bold">Agency assistance</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                            {agency.map(tier => <div key={tier.id} className={`rounded-md border bg-writing p-5 ${tier.popular ? 'border-rust' : 'border-rule'}`}>
                                {tier.popular && <p className="mb-3 font-margin-mono text-xs font-semibold uppercase text-rust">Most popular</p>}
                                <h4 className="text-lg font-bold">{tier.name}</h4>
                                <p className="mt-3 text-2xl font-bold">{formatPrice(tier.price)}</p>
                                <p className="mt-1 text-sm text-ink-muted">per group of 5</p>
                                <ul className="mt-5 space-y-3">{tier.features.map(feature => <li key={feature} className="flex gap-2 text-sm leading-relaxed text-ink-muted"><Check className="h-4 w-4 shrink-0 text-ink" />{feature}</li>)}</ul>
                                <Link href={`/project/consult?tier=${encodeURIComponent(tier.name)}&price=${tier.price}&type=${projectType}`} className="mt-6 flex min-h-11 items-center justify-center rounded-md border border-rule px-3 text-sm font-semibold text-ink hover:bg-selection">Get started</Link>
                            </div>)}
                        </div>
                        <p className="mt-5 text-sm text-ink-muted">Already paid for DIY? We&apos;ll deduct that from your Agency upgrade.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
