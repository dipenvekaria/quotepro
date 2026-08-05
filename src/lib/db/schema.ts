import { pgTable, uuid, text, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core'

// Direct-Postgres schema (Cloud SQL-ready). Tables are added here as pages are
// migrated off the Supabase PostgREST client. Column names mirror the DB.

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const customerAddresses = pgTable('customer_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull(),
  label: text('label'),
  address: text('address').notNull(),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  country: text('country').notNull(),
  geocode: jsonb('geocode'),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
