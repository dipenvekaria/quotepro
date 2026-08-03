'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect } from 'react'
import { ArrowRight, Building2, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { bootstrapCompany, type BootstrapCompanyState } from './actions'

const initial: BootstrapCompanyState = { ok: false }

export default function OnboardingPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState(bootstrapCompany, initial)

  useEffect(() => {
    if (state.ok) router.replace('/app/dashboard')
  }, [state.ok, router])

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">1</span>
          Company setup
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Let's set up your workspace
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Just a few details — takes 30 seconds. You can edit everything later in Settings.
        </p>

        <form action={action} className="mt-8 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-medium">
              Company name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Acme HVAC & Plumbing"
              autoFocus
              className="h-11"
              disabled={pending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
              <Input id="phone" name="phone" placeholder="+1 (555) 000-0000" className="h-11" disabled={pending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Business email</Label>
              <Input id="email" name="email" type="email" placeholder="hello@yourbiz.com" className="h-11" disabled={pending} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-sm font-medium">Address</Label>
            <Input id="address" name="address" placeholder="123 Main St, San Francisco, CA 94103" className="h-11" disabled={pending} />
            <p className="text-xs text-muted-foreground">
              We use this to auto-calculate state sales tax on your quotes.
            </p>
          </div>

          {state.error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <div className="font-medium">Included when you create your workspace</div>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {[
                    'A starter catalog (labor, trip fee, permits) — edit or replace anytime',
                    '3 team roles: owner, office, technician',
                    'Free SOC2-grade encryption + daily backups',
                    'AI quote generation ready — just add a Gemini API key',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
              Sign out
            </Link>
            <Button
              type="submit"
              disabled={pending}
              className="h-11 shadow-sm"
            >
              {pending ? 'Creating…' : (
                <span className="inline-flex items-center gap-1.5">
                  Create workspace <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
