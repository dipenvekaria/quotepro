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
  experimental: {
    serverActions: {
      // Photo upload goes through a Server Action, and Next caps those bodies
      // at 1MB. A phone photo is 2-5MB, so every upload was rejected before the
      // action ran — the storage bucket had zero objects in it. The action
      // itself validates at 10MB; this clears that with room for the multipart
      // overhead so the two limits cannot disagree again.
      bodySizeLimit: '12mb',
    },
  },
  // The AI prompts are read from disk at runtime (src/lib/ai/prompts.ts), and
  // Next.js cannot trace a path it only sees as a string. Without this they are
  // missing from the serverless bundle and every prompt silently falls back to
  // its inline default.
  outputFileTracingIncludes: {
    '/*': ['./prompts/**/*.md'],
    // The starter catalogs are ~1.2MB and only onboarding reads them, so this
    // stays scoped to that route rather than riding along in every function.
    '/app/onboarding': ['./data/starter-catalogs/**/*'],
  },
  compiler: {
    // Strip console.log noise from production, but keep error and warn — this
    // was `true`, which removes console.error too, so every deliberate failure
    // log in the app compiled to nothing and production had no diagnostics at
    // all. The AI fallback warnings in src/lib/ai are only useful if they survive.
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
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
