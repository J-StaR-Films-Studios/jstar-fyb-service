'use client';

import { motion } from 'framer-motion';
import { Zap, Crown, Check, Star, FileText, Code2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PRICING_CONFIG, WORKSPACE_UNLOCK_PRICE } from '@/config/pricing';

const PRICING = {
    saas: {
        paperOnly: {
            price: WORKSPACE_UNLOCK_PRICE,
            features: ['AI-Generated Abstract', 'Full Chapter 1-5 Outline', 'Formatting Templates', 'Unlimited Revisions']
        },
        software: {
            price: PRICING_CONFIG.SAAS.SOFTWARE.price,
            features: ['Everything in Paper-Only', 'Code Snippets & Boilerplate', 'Database Schema Generator', 'Tech Stack Recommendations']
        }
    },
    agency: {
        paperOnly: PRICING_CONFIG.AGENCY.PAPER.map((tier) => ({
            name: tier.label,
            price: tier.price,
            id: tier.id,
            features: tier.id === 'AGENCY_PAPER_EXPRESS'
                ? ['Chapters 1-5 Written', 'APA/IEEE Formatting', 'Plagiarism Check']
                : tier.id === 'AGENCY_PAPER_DEFENSE'
                    ? ['Everything in Express', 'Mock Defense Session', 'Presentation Slides']
                    : ['Everything in Defense', 'Priority Support', 'Unlimited Revisions'],
            popular: tier.popular || false
        })),
        software: PRICING_CONFIG.AGENCY.SOFTWARE.map((tier) => ({
            name: tier.label,
            price: tier.price,
            id: tier.id,
            features: tier.id === 'AGENCY_CODE_GO'
                ? ['Complete Source Code', 'Database Setup Script', 'Installation Guide']
                : tier.id === 'AGENCY_DEFENSE_READY'
                    ? ['Everything in Code & Go', 'Chapter 3 & 4 Write-up', 'Mock Defense Session']
                    : ['Full Documentation (Ch 1-5)', 'Presentation Slides', 'Priority Support'],
            popular: tier.popular || false
        }))
    }
};

export function Pricing() {
    const [projectType, setProjectType] = useState<'paper' | 'software'>('software');

    const formatPrice = (price: number) =>
        new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0
        }).format(price);

    return (
        <section id="pricing" className="relative py-32">
            <div className="container mx-auto px-6">
                <div className="mb-12 text-center">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mb-6 text-4xl font-display font-bold md:text-5xl"
                    >
                        Simple, <span className="text-accent">Transparent</span> Pricing
                    </motion.h2>
                    <p className="mx-auto mb-8 max-w-xl text-gray-400">
                        Choose your path. DIY with our AI, or let professionals handle it.
                    </p>

                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5">
                        <button
                            onClick={() => setProjectType('paper')}
                            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${projectType === 'paper' ? 'bg-accent text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            <FileText className="h-4 w-4" />
                            Paper Only
                        </button>
                        <button
                            onClick={() => setProjectType('software')}
                            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${projectType === 'software' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Code2 className="h-4 w-4" />
                            Software + Paper
                        </button>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-20"
                >
                    <h3 className="mb-8 text-center text-sm font-bold uppercase tracking-widest text-gray-500">
                        <Zap className="mr-2 inline h-4 w-4 text-accent" />
                        Self-Service AI Builder
                    </h3>

                    <div className="mx-auto max-w-md">
                        <div className="glass-panel rounded-3xl border border-accent/20 p-8 text-center transition-colors hover:border-accent/50">
                            <div className="mb-2 text-5xl font-display font-bold text-white">
                                {formatPrice(projectType === 'paper' ? PRICING.saas.paperOnly.price : PRICING.saas.software.price)}
                            </div>
                            <p className="mb-6 text-sm text-gray-500">One-time payment</p>

                            <ul className="mb-8 space-y-3 text-left">
                                {(projectType === 'paper' ? PRICING.saas.paperOnly.features : PRICING.saas.software.features).map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                                        <Check className="h-4 w-4 flex-shrink-0 text-accent" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href="/project/builder"
                                className="block w-full rounded-xl border border-accent/30 py-4 font-bold uppercase tracking-wider text-accent transition-all hover:bg-accent hover:text-black"
                            >
                                Start Building Free
                            </Link>
                            <p className="mt-3 text-xs text-gray-600">Pay only when you&apos;re ready to unlock</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                >
                    <h3 className="mb-8 text-center text-sm font-bold uppercase tracking-widest text-gray-500">
                        <Crown className="mr-2 inline h-4 w-4 text-primary" />
                        Done-For-You Agency
                    </h3>

                    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
                        {(projectType === 'paper' ? PRICING.agency.paperOnly : PRICING.agency.software).map((tier, index) => (
                            <motion.div
                                key={tier.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className={`glass-panel relative rounded-2xl p-6 ${tier.popular ? 'ring-1 ring-primary/20 border-2 border-primary' : 'border border-white/10'}`}
                            >
                                {tier.popular ? (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase text-white">
                                        Most Popular
                                    </div>
                                ) : null}

                                <h4 className="mb-2 text-lg font-bold text-white">{tier.name}</h4>
                                <div className="mb-1 text-3xl font-display font-bold text-white">
                                    {formatPrice(tier.price)}
                                </div>
                                <p className="mb-4 text-xs text-gray-500">per group of 5</p>

                                <ul className="mb-6 space-y-2">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-400">
                                            <Star className={`mt-1 h-3 w-3 flex-shrink-0 ${tier.popular ? 'text-primary' : 'text-gray-600'}`} />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    href={`/project/consult?tier=${encodeURIComponent(tier.name)}&price=${tier.price}&type=${projectType}`}
                                    className={`block w-full rounded-xl py-3 text-center text-sm font-bold uppercase tracking-wider transition-all ${tier.popular ? 'bg-primary text-white hover:bg-primary/90' : 'border border-white/20 text-white hover:bg-white/5'}`}
                                >
                                    Get Started
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    <p className="mt-8 text-center text-sm text-gray-600">
                        Already paid for DIY? We&apos;ll deduct that from your Agency upgrade. 🤝
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
