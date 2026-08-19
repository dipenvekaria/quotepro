/**
 * Runtime env validation with Zod.
 *
 * Import `env` anywhere in the Next.js app. `envServer` is the server-only
 * bundle (never imported from client components).
 *
 * Fails the build if a required var is missing.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared client + server vars (must start with NEXT_PUBLIC_ to be exposed)
// ---------------------------------------------------------------------------

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  // 'true' shows account creation on /login. Unset = invite-only: the page
  // stops offering signup while Supabase's allow-signups toggle enforces it.
  NEXT_PUBLIC_SIGNUPS_OPEN: z.enum(['true', 'false']).default('false'),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_COMPANY_EMAIL: z.string().email().optional(),
})

// Reject `process.env.X` reads from client bundles — Next.js already does
// this at build time via the NEXT_PUBLIC_ prefix, but the schema documents
// the surface.
const rawClient = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SIGNUPS_OPEN: process.env.NEXT_PUBLIC_SIGNUPS_OPEN,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_COMPANY_EMAIL: process.env.NEXT_PUBLIC_COMPANY_EMAIL,
}

function parseClient() {
  const result = clientEnvSchema.safeParse(rawClient)
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid client env:', result.error.flatten().fieldErrors)
    throw new Error('Invalid public env — check NEXT_PUBLIC_* vars')
  }
  return result.data
}

export const env = parseClient()

// ---------------------------------------------------------------------------
// Server-only vars — throws if imported from a client component
// ---------------------------------------------------------------------------

/**
 * An optional secret that may legitimately be blank.
 *
 * Hosting dashboards hand back `''` for a variable that exists but was never
 * filled in, and `z.string().min(n).optional()` rejects that — which failed the
 * whole env parse and took the app down instead of degrading the one feature
 * the key belongs to.
 */
const optionalSecret = (min: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(min).optional(),
  )

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_JWT_SECRET: optionalSecret(20),
  // Absent means AI is off: quote generation degrades to keyword matching over
  // the catalog and the customer summary renders nothing, rather than failing.
  GEMINI_API_KEY: optionalSecret(10),
  // Comma-separated fallback chain, newest first. Unset uses the default in
  // src/lib/ai/gemini.ts.
  GEMINI_MODELS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  // No default: src/lib/email/client.ts owns the fallback, and declaring a
  // second, different one here (it said no-reply@quotepro.demo) meant the two
  // disagreed about what unset means.
  RESEND_FROM_EMAIL: z.string().email().optional(),
  RESEND_FROM_NAME: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PLATFORM_FEE_BPS: z.string().optional(),
  // The database. Read directly in src/lib/db/index.ts at module load, which is
  // why it is optional here — but it belongs in the contract, or the list of
  // what this app needs is wrong. Either name works; the Supabase integration
  // provisions POSTGRES_URL.
  DATABASE_URL: z.string().optional(),
  POSTGRES_URL: z.string().optional(),
  // E-signature. A live integration reached from /api/quotes/sign, and every
  // one of these was read straight from process.env with no validation.
  // Overrides the AI chain's time budget. Used to exercise the degrade path.
  GEMINI_TIMEOUT_MS: z.string().optional(),
  DROPBOX_SIGN_API_KEY: z.string().optional(),
  // Address autocomplete. Either credential works and the service account wins
  // when both are set; absent means the address fields stay plain text boxes.
  // Server-side only — neither is ever exposed to the browser.
  GOOGLE_MAPS_API_KEY: optionalSecret(20),
  // The service account's JSON key, base64-encoded (raw JSON is accepted too).
  // Not a token: tokens expire in an hour and are minted from this at runtime.
  // Also authenticates Vertex AI when that is switched on.
  GOOGLE_SERVICE_ACCOUNT_JSON: optionalSecret(50),
  // Route Gemini through Vertex AI instead of the AI Studio developer API.
  // Same models; the difference is billing — Vertex draws on the GCP billing
  // account, so GCP credit (including free trial) applies, whereas AI Studio
  // uses its own separate prepay balance.
  GOOGLE_GENAI_USE_VERTEXAI: z.string().optional(),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GOOGLE_CLOUD_LOCATION: z.string().optional(),
  /**
   * A file path, not a key. ADK resolves Vertex credentials through Application
   * Default Credentials rather than the object @google/genai accepts, and ADC
   * reads a path from here. src/lib/ai/adc.ts writes GOOGLE_SERVICE_ACCOUNT_JSON
   * out to a temp file and sets this when it is not already set — so it is
   * usually assigned at runtime rather than configured.
   */
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  LEMONSQUEEZY_API_KEY: z.string().optional(),
  // Vercel sends this as `Authorization: Bearer <secret>` on scheduled runs.
  // Unset means the cron endpoint refuses to run rather than running open.
  CRON_SECRET: optionalSecret(16),
  // QuickBooks Online, bookkeeping sync. Optional — the integrations card
  // offers Connect only when both are present.
  QBO_CLIENT_ID: optionalSecret(8),
  QBO_CLIENT_SECRET: optionalSecret(8),
  QBO_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  // Bolt's model override — lets the assistant adopt a newer/stronger model
  // by env change alone. Unset = the strongest entry of the default chain.
  ASSISTANT_MODELS: z.string().optional(),
  // Where in-app "Message us" lands. Unset = the affordance hides itself.
  SUPPORT_INBOX: z.string().email().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

type ServerEnv = z.infer<typeof serverEnvSchema>

let _serverEnv: ServerEnv | null = null

/**
 * Server-only env accessor. Import inside server actions, route handlers,
 * server components. Never touch from a `'use client'` component.
 */
export function envServer(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('envServer() called from client bundle')
  }
  if (_serverEnv) return _serverEnv
  const result = serverEnvSchema.safeParse(process.env)
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid server env:', result.error.flatten().fieldErrors)
    throw new Error('Invalid server env — check .env.local')
  }
  _serverEnv = result.data
  return result.data
}
