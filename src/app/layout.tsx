import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { NetworkStatus } from "@/components/network-status";
import { HideDevTools } from "@/components/hide-devtools";
import { ThemeProvider } from '@/components/shared/theme-provider'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Absolute URLs for OG/canonical resolve against the real domain, not the
  // deploy host — three hostnames serve this app and search must see one.
  metadataBase: new URL("https://getrivet.ai"),
  alternates: { canonical: "/" },
  title: {
    default: "Rivet — Quote to cash for field service",
    template: "%s · Rivet",
  },
  description:
    "Quotes, jobs, invoices, and payments for HVAC, plumbing, electrical, and other trades. AI drafts the quote from your own price book in seconds.",
  openGraph: {
    type: "website",
    siteName: "Rivet",
    title: "Rivet — Quote to cash for field service",
    description:
      "AI drafts the quote from your own price book in seconds. Send it, win the job, schedule it, get paid — one record the whole way.",
    url: "https://getrivet.ai",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Rivet" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rivet — Quote to cash for field service",
    description:
      "AI drafts the quote from your own price book in seconds. Send, win, schedule, get paid.",
    images: ["/og.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rivet",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // Light to match the app default; ThemeProvider re-syncs it to the resolved
  // theme so Safari's bars always blend with the rendered page, not the device.
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
                  isDisabled: true,
                  supportsFiber: true,
                  inject: function() {},
                  onCommitFiberRoot: function() {},
                  onCommitFiberUnmount: function() {},
                };
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider nonce={nonce}>
          <ErrorBoundary>
            <HideDevTools />
            <NetworkStatus />
            {children}
            <Toaster />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
