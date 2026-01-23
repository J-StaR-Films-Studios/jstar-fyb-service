import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import { SupportProviderClient } from "@/features/support/components/SupportProviderClient";
import { Toaster } from "sonner";
import { ReferralListener } from "@/features/referral/components/ReferralListener";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { SkipLink } from "@/features/accessibility/SkipLink";
import { PasswordPromptDialog } from "@/features/auth/components/PasswordPromptDialog";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "J-Star FYB Service",
    template: "%s | J-Star FYB",
  },
  description:
    "Dominating Final Year Projects. The ultimate tool for researching, outlining, and writing your final year project.",
  keywords: [
    "Final Year Project",
    "Research Assistant",
    "Writing Tool",
    "Academic Writing",
    "Thesis Builder",
  ],
  authors: [{ name: "J-Star Films" }],
  creator: "J-Star Films",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://fyb.jstarstudios.com",
    title: "J-Star FYB Service - Dominate Your Project",
    description:
      "The AI-powered platform to streamline your final year project workflow.",
    siteName: "J-Star FYB",
  },
  twitter: {
    card: "summary_large_image",
    title: "J-Star FYB Service",
    description: "Dominating Final Year Projects with AI.",
    creator: "@jstarfilms",
  },
  metadataBase: new URL("https://fyb.jstarstudios.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <MetaPixel />
      </head>
      <body
        className={`${outfit.variable} ${spaceGrotesk.variable} font-sans antialiased bg-dark`}
        suppressHydrationWarning
      >
        <SkipLink />
        <ErrorBoundary>
          <SupportProviderClient>
            <div id="main-content">{children}</div>
            <PasswordPromptDialog />
          </SupportProviderClient>
        </ErrorBoundary>
        <OfflineIndicator />
        <ReferralListener />
        <Toaster position="top-center" richColors />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "J-Star FYB Service",
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "NGN",
              },
              author: {
                "@type": "Organization",
                name: "J-Star Films",
                url: "https://fyb.jstarstudios.com",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
