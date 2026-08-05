import { defineConfig } from 'drizzle-kit'

// Direct Postgres access layer (Cloud SQL-ready). Points at DATABASE_URL —
// local Supabase Postgres today, Cloud SQL later, no code change.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db',
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ['public'],
  verbose: true,
})
