import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import { Toaster } from "sonner";

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
  title: "J Star FYB Service",
  description: "Dominating Final Year Projects",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${spaceGrotesk.variable} font-sans antialiased bg-dark`} suppressHydrationWarning>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <OfflineIndicator />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
