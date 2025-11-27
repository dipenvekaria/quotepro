// @ts-nocheck - Supabase type generation pending
import { redirect } from 'next/navigation'

// Redirect old /dashboard route to new /prospects page
export default async function DashboardPage() {
  redirect('/prospects')
}
