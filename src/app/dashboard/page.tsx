// @ts-nocheck - Supabase type generation pending
import { redirect } from 'next/navigation'

// Redirect old /dashboard route to new home page
export default async function DashboardPage() {
  redirect('/home')
}
