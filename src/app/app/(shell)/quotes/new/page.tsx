import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { QuoteEditor, type CatalogItem } from './quote-editor'

export default async function NewQuotePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, profile')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.company_id) redirect('/app/onboarding')

  const { data: company } = await supabase
    .from('companies')
    .select('settings')
    .eq('id', profile.company_id)
    .maybeSingle()

  const settings = (company?.settings ?? {}) as { tax_rate?: number }
  const defaultTaxRate = settings.tax_rate ?? 8.5

  const { data: catalog } = await supabase
    .from('catalog_items')
    .select('id, name, description, category, base_price, unit')
    .eq('company_id', profile.company_id)
    .eq('is_active', true)
    .order('category', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(500)

  return (
    <QuoteEditor
      companyId={profile.company_id}
      defaultTaxRate={defaultTaxRate}
      catalog={(catalog ?? []) as CatalogItem[]}
    />
  )
}
