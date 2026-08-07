import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { query } from '@/lib/db'
import { BrandLogo } from '@/components/brand/logo'
import { ROLE_LABEL } from '@/lib/team-personas'
import type { UserRole } from '@/lib/permissions'

import { JoinAccept } from './join-accept'

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const [inv] = await query<{
    id: string
    email: string
    role: string
    status: string
    company_name: string | null
    expired: boolean
  }>(
    `select i.id, i.email, i.role, i.status,
            c.name as company_name,
            (i.expires_at <= now()) as expired
       from invitations i
       left join companies c on c.id = i.company_id
      where i.token = $1
      limit 1`,
    [token],
  )

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const valid = Boolean(inv && inv.status === 'pending' && !inv.expired)

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandLogo tile="h-9 w-9" mark="h-5 w-5" wordmarkClassName="text-lg" />
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 text-center shadow-sm">
          {!valid ? (
            <>
              <h1 className="text-lg font-semibold tracking-tight">Invitation unavailable</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This invite link is invalid, already used, or expired. Ask your team to send a new one.
              </p>
              <Link href="/login" className="mt-5 inline-flex text-sm text-primary hover:underline">
                Go to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold tracking-tight">
                Join {inv!.company_name ?? 'the team'}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                You've been invited as{' '}
                <span className="font-medium text-foreground">
                  {ROLE_LABEL[inv!.role as UserRole] ?? inv!.role}
                </span>
                .
              </p>

              {user ? (
                <div className="mt-6">
                  <JoinAccept token={token} />
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sign in or create your account to accept.
                  </p>
                  <Link
                    href={`/login?next=${encodeURIComponent(`/join/${token}`)}`}
                    className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
                  >
                    Continue
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Invited as <span className="font-medium">{inv!.email}</span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
