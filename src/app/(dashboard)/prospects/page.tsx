// @ts-nocheck - Supabase type generation pending
import { redirect } from 'next/navigation'

// Redirect /prospects to /leads (legacy route)
export default async function ProspectsPage() {
  redirect('/leads')
}
