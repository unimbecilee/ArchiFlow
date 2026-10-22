import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppProviders } from "./providers";
import { OfflineBanner } from "@/components/layout/offline-banner";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArchiFlow - Gestion Electronique de Documents",
  description:
    "Systeme de gestion electronique de documents moderne et performant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-[100dvh] bg-background font-sans antialiased">
        <OfflineBanner />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
