'use client';

import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { MarketingTimer } from './MarketingTimer';

interface HeroProps {
    startDate: Date | null;
    targetDate: Date | null;
}

export function Hero({ startDate, targetDate }: HeroProps) {
    const session = useSession();

    return (
        <section className="mx-auto max-w-[1200px] px-5 pt-32 pb-16 md:px-8 md:pt-44 md:pb-24">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
                <div>
                    <p className="mb-6 font-margin-mono text-xs font-semibold uppercase tracking-wider text-rust">J-Star Projects · Your project starts here</p>
                    <h1 className="max-w-[680px] font-margin text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[68px] lg:leading-[1.03]">
                        Give your final year project room to grow.
                    </h1>
                    <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-ink-muted md:text-lg">
                        Start with a topic, build an outline and work through your writing in one place. Prefer hands-on help? Talk to the J-Star team about the agency service.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link href={session?.data ? '/dashboard' : '/auth/register'} className="inline-flex min-h-12 items-center justify-center rounded-md bg-rust px-6 py-3 font-semibold text-writing hover:bg-[#953D2C]">
                            {session?.data ? 'Go to dashboard' : 'Start your project'}
                        </Link>
                        <Link href="/project/consult" className="inline-flex min-h-12 items-center justify-center rounded-md border border-rule bg-writing px-6 py-3 font-semibold text-ink hover:bg-selection">
                            Explore agency help
                        </Link>
                    </div>
                    <a href="#showcase" className="mt-6 inline-block text-sm font-medium text-rust underline underline-offset-4">Browse project concepts</a>
                </div>
                <div aria-label="Illustration of a project notebook" className="rounded-md border border-rule bg-writing p-6 shadow-[8px_8px_0_#C9D3CA] sm:p-8">
                    <div className="flex items-center justify-between gap-4 border-b border-rule pb-4 font-margin-mono text-xs font-medium text-ink-muted">
                        <span>PROJECT NOTEBOOK</span><span>01 / 05</span>
                    </div>
                    <div className="mt-8 border-l-[5px] border-rust pl-5">
                        <p className="font-margin-mono text-xs font-semibold uppercase tracking-wider text-rust">Current chapter · 01</p>
                        <h2 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">Begin with a question.</h2>
                        <p className="mt-4 max-w-[38ch] leading-relaxed text-ink-muted">Shape your topic, map your chapters and make space for the research that follows.</p>
                    </div>
                    <div className="mt-10 space-y-3 border-t border-rule pt-6 font-margin-mono text-xs text-ink-muted">
                        <p>01 &nbsp; Topic and direction</p>
                        <p>02 &nbsp; Abstract</p>
                        <p>03 &nbsp; Chapter outline</p>
                    </div>
                    <p className="mt-7 text-xs text-ink-muted">Illustrative preview · not a saved project</p>
                </div>
            </div>
            {startDate && targetDate && <div className="mt-14 border-t border-rule pt-7"><p className="text-center font-margin-mono text-xs font-semibold uppercase tracking-wider text-ink-muted">Current offer ends in</p><MarketingTimer startDate={startDate} targetDate={targetDate} /></div>}
        </section>
    );
}
