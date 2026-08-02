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
  NEXT_PUBLIC_BACKEND_URL: z.string().url().default('http://localhost:8000'),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
})

// Reject `process.env.X` reads from client bundles — Next.js already does
// this at build time via the NEXT_PUBLIC_ prefix, but the schema documents
// the surface.
const rawClient = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
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

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_JWT_SECRET: z.string().min(20).optional(),
  GEMINI_API_KEY: z.string().min(10).optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().default('no-reply@quotepro.demo'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  DROPBOX_SIGN_API_KEY: z.string().optional(),
  LEMONSQUEEZY_API_KEY: z.string().optional(),
  BACKEND_INTERNAL_URL: z.string().url().default('http://localhost:8000'),
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
