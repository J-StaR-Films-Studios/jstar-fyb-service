import { Hero } from '@/features/marketing/components/Hero';
import { Pricing } from '@/features/marketing/components/Pricing';
import { ProjectGallery } from '@/features/marketing/components/ProjectGallery';
import { Marquee } from '@/features/marketing/components/Marquee';
import { StickyCTA } from '@/features/marketing/components/StickyCTA';
import { getLandingPageTimer } from '@/features/marketing/actions/marketing-actions';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Dominating Final Year Projects",
    description: "The #1 AI-powered platform for Nigerian students to research, write, and complete their final year projects.",
};

export default async function MarketingPage() {
    const { startDate, targetDate } = await getLandingPageTimer();

    return (
        <div className="bg-dark min-h-screen font-sans text-white overflow-x-hidden">
            <Hero startDate={startDate} targetDate={targetDate} />
            <Marquee />
            <Pricing />
            <ProjectGallery />
            <StickyCTA />
        </div>
    );
}
