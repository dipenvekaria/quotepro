import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { sbServer } from '@/lib/supabase/untyped'

const schema = z.object({ pass_card_fees: z.boolean() })

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = await sbServer()
  const { data: profile } = await admin
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })
  if (profile.role !== 'owner' && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })
  }

  const { error } = await admin
    .from('companies')
    .update({ pass_card_fees: parsed.data.pass_card_fees })
    .eq('id', profile.company_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
