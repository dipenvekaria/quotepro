import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { NetworkStatus } from "@/components/network-status";
import { HideDevTools } from "@/components/hide-devtools";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Field Genie - Win more jobs in seconds, not minutes",
  description: "Professional quote builder for home service contractors. HVAC, plumbing, electrical, roofing, and more.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "The Field Genie",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
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
        <ErrorBoundary>
          <HideDevTools />
          <NetworkStatus />
          {children}
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  );
}
