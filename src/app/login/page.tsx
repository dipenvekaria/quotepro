'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Sparkles, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandLogo } from '@/components/brand/logo'
import { useAuth } from './use-auth'

/**
 * Confirmation that a deleted account really is gone.
 *
 * Behind Suspense so reading the query string does not push the whole sign-in
 * page into client-side rendering for the sake of one optional banner.
 */
function AccountDeletedNotice() {
  const deleted = useSearchParams().has('deleted')
  if (!deleted) return null
  return (
    <div
      role="status"
      className="mb-6 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground"
    >
      Your account has been deleted. Nothing of it remains — signing in again starts from scratch.
    </div>
  )
}

export default function LoginPage() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    isSignUp,
    setIsSignUp,
    handleAuth,
    handleGoogleLogin,
  } = useAuth()

  return (
    <div className="grid min-h-dvh grid-cols-1 bg-background lg:grid-cols-2">
      {/* ─────────── LEFT: form ─────────── */}
      <div className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-16">
        <header>
          <BrandLogo />
        </header>

        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <Suspense fallback={null}>
            <AccountDeletedNotice />
          </Suspense>

          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-[15px] text-muted-foreground">
              {isSignUp
                ? 'Start winning more jobs. Free 14-day trial.'
                : 'Sign in to your workspace.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                {!isSignUp && (
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Forgot?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full text-[15px] font-medium shadow-sm transition-transform hover:shadow-md active:scale-[0.99]"
            >
              {isLoading ? (
                'Loading…'
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  {isSignUp ? 'Create account' : 'Sign in'}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/70" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs uppercase tracking-wider text-muted-foreground">
                  or
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              className="h-11 w-full font-medium"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "New here?"}{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </main>

        <footer className="flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Rivet</span>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </footer>
      </div>

      {/* ─────────── RIGHT: marketing panel (desktop only) ─────────── */}
      <aside className="relative hidden overflow-hidden bg-[#0a0a0a] lg:flex">
        {/* Cloud-soft gradient mesh */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.10), transparent 70%)' }}
          />
          <div
            className="absolute -right-24 top-1/3 h-[26rem] w-[26rem] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06), transparent 70%)' }}
          />
          <div
            className="absolute -bottom-32 left-1/4 h-[26rem] w-[26rem] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.05), transparent 70%)' }}
          />
        </div>

        <div className="relative z-10 flex w-full flex-col justify-between p-14 xl:p-16">
          <div className="flex justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-white/70" />
              Quoting that wins more jobs
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-5">
              <h2 className="max-w-xl text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-white">
                Win more jobs in{' '}
                <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  seconds
                </span>
                , not hours.
              </h2>
              <p className="max-w-md text-[15px] leading-relaxed text-slate-300">
                Generate professional quotes, send them for signature, and get paid —
                all from one place. Trusted by field-service pros across the US.
              </p>
            </div>

            {/* Glassy quote card */}
            <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">Quote #Q-1042</p>
                  <p className="mt-1 font-semibold text-white">Water Heater Replacement</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                  Accepted
                </span>
              </div>
              <dl className="mt-4 space-y-2 text-sm tabular">
                <div className="flex justify-between text-slate-400">
                  <dt>50-gal gas water heater</dt>
                  <dd className="text-slate-200">$1,250.00</dd>
                </div>
                <div className="flex justify-between text-slate-400">
                  <dt>Standard labor · 3 hrs</dt>
                  <dd className="text-slate-200">$375.00</dd>
                </div>
                <div className="flex justify-between text-slate-400">
                  <dt>Expansion tank</dt>
                  <dd className="text-slate-200">$89.00</dd>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 font-semibold text-white">
                  <dt>Total</dt>
                  <dd>$1,850.55</dd>
                </div>
              </dl>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <Zap className="h-3.5 w-3.5 text-white/70" />
                Generated in 2.4s · grounded in your catalog
              </div>
            </div>
          </div>

          {/* Stats / trust row */}
          {/* Claims here must be true. A "SOC 2 — In progress" tile was removed:
              implying a security certification you do not hold, to businesses
              handling customer payment data, is a misrepresentation. The two
              below describe the pricing model, which is verifiable. */}
          <div className="grid max-w-md grid-cols-2 gap-4 border-t border-white/10 pt-6">
            <div>
              <div className="text-2xl font-semibold text-white">Flat</div>
              <div className="mt-0.5 text-[11px] text-slate-400">No per-seat billing</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-white">Unlimited</div>
              <div className="mt-0.5 text-[11px] text-slate-400">Users and AI quotes</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
