import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "../stack";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  title: {
    default: "Event Management Hub",
    template: "%s | Event Management Hub",
  },
  description:
    "Modern event management platform with seamless registration, check-in, and analytics",
  keywords: [
    "event management",
    "registration",
    "check-in",
    "analytics",
    "QR codes",
  ],
  authors: [{ name: "Event Management Team" }],
  creator: "Event Management Hub",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: "Event Management Hub",
    description:
      "Modern event management platform with seamless registration, check-in, and analytics",
    siteName: "Event Management Hub",
  },
  twitter: {
    card: "summary_large_image",
    title: "Event Management Hub",
    description:
      "Modern event management platform with seamless registration, check-in, and analytics",
    creator: "@eventmanagementhub",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <StackProvider app={stackClientApp}>
          <StackTheme>
            <Providers>{children}</Providers>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
