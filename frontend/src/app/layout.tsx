import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppProviders } from "./providers";
import { OfflineBanner } from "@/components/layout/offline-banner";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArchiFlow - Gestion Electronique de Documents",
  description: "Systeme de gestion electronique de documents moderne et performant",
};

const themeScript = `(function(){try{var k='archiflow-theme',t=localStorage.getItem(k);var s=t==='system'||!t? (window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t; document.documentElement.classList.toggle('dark',s==='dark'); document.documentElement.style.colorScheme=s;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-[100dvh] bg-background font-sans antialiased">
        <OfflineBanner />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
