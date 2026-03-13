import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { Suspense } from "react";
import { GameSessionProvider } from "@/components/GameSessionProvider";
import { PostHogProvider } from "@/components/PostHogProvider";
import { BannerAd } from "@/components/ads/BannerAd";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "DailyDiffs — Spot the Difference",
  description: "Daily spot-the-difference puzzle game. 5 new AI-generated puzzles every day. Compete on the leaderboard and challenge friends.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://dailydiffs.app'),
  openGraph: {
    title: "DailyDiffs — Spot the Difference",
    description: "Can you spot today's differences? 5 new AI-generated puzzles, daily leaderboard, and friend groups.",
    url: "https://dailydiffs.app",
    siteName: "DailyDiffs",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DailyDiffs — Daily spot-the-difference puzzle game",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DailyDiffs — Spot the Difference",
    description: "Can you spot today's differences? 5 new AI-generated puzzles every day.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  return (
    <html lang="en">
      <head>
        {adsenseClientId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GameSessionProvider>
          <Suspense>
            <PostHogProvider>
              {children}
              <BannerAd />
            </PostHogProvider>
          </Suspense>
        </GameSessionProvider>
      </body>
    </html>
  );
}
