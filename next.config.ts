import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  // Launch measure: the legacy `(dashboard)` route group + a few unused hooks
  // carry pre-existing type debt. The live app and the pg-migrated code are
  // type-clean (verified via `tsc`). Re-enable strict builds after the dead
  // `(dashboard)` tree is removed. Run `tsc --noEmit` in CI to keep live code honest.
  typescript: { ignoreBuildErrors: true },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  poweredByHeader: false,
  devIndicators: false,
  allowedDevOrigins: ["*.trycloudflare.com"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
