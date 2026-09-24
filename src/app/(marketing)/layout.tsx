import { Navbar } from '@/features/marketing/components/Navbar';
import { Footer } from '@/features/marketing/components/Footer';

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="margin-public flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
}
