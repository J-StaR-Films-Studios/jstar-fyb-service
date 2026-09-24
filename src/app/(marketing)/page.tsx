import { Hero } from '@/features/marketing/components/Hero';
import { Pricing } from '@/features/marketing/components/Pricing';
import { ProjectGallery } from '@/features/marketing/components/ProjectGallery';
import { Marquee } from '@/features/marketing/components/Marquee';
import { StickyCTA } from '@/features/marketing/components/StickyCTA';
import { getLandingPageTimer } from '@/features/marketing/actions/marketing-actions';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Start your final year project",
    description: "Plan, research and write your final year project with J-Star Projects, or ask the J-Star team for help.",
};

export default async function MarketingPage() {
    const { startDate, targetDate } = await getLandingPageTimer();

    return (
        <div className="min-h-screen overflow-x-hidden">
            <Hero startDate={startDate} targetDate={targetDate} />
            <Marquee />
            <Pricing />
            <ProjectGallery />
            <StickyCTA />
        </div>
    );
}
