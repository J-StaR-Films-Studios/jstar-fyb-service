import type { Metadata } from "next";
import { Outfit, Space_Grotesk, DM_Sans, IBM_Plex_Mono } from "next/font/google";
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

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "J-Star Projects",
    template: "%s | J-Star Projects",
  },
  description:
    "Plan, research and write your final year project with J-Star Projects.",
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
    title: "J-Star Projects",
    description:
      "Plan, research and write your final year project.",
    siteName: "J-Star Projects",
  },
  twitter: {
    card: "summary_large_image",
    title: "J-Star Projects",
    description: "Plan, research and write your final year project.",
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
        className={`${outfit.variable} ${spaceGrotesk.variable} ${dmSans.variable} ${plexMono.variable} font-sans antialiased bg-dark`}
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
              name: "J-Star Projects",
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web",
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
