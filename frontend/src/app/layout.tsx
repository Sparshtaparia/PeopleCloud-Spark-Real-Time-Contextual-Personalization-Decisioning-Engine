import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const space = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PeopleCloud Spark — Enterprise AI Personalization",
    template: "%s | PeopleCloud Spark"
  },
  description: "Identity-aware generative personalization engine. Resolve identity, generate brand-safe AI creatives, activate 1:1 campaigns, and learn from every customer signal.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "PeopleCloud Spark — Enterprise AI Personalization",
    description: "Identity-aware generative personalization engine built by Epsilon.",
    type: "website",
  },
};

import Providers from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <style>{`
          .glass-card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(20px);
            border: 1px solid var(--color-border-subtle);
            box-shadow: var(--shadow-soft);
          }
        `}</style>
      </head>
      <body className={`${inter.variable} ${space.variable} bg-warm-cream text-text-primary font-body antialiased min-h-screen flex selection:bg-electric-mint selection:text-deep-black`}>
        <Providers>
          <div className="flex-1 w-full min-h-screen">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
