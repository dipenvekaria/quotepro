import type { UserRole } from '@/lib/permissions'

export type Persona = {
  value: UserRole
  label: string
  blurb: string
}

// Personas offered when inviting (owner last — rarely invited).
export const ROLE_PERSONAS: Persona[] = [
  {
    value: 'office',
    label: 'Office / Dispatcher',
    blurb: 'Runs the day-to-day — create & send quotes, schedule jobs, manage invoices.',
  },
  {
    value: 'sales',
    label: 'Sales / Estimator',
    blurb: 'Creates the leads and quotes they own and sends them for signature.',
  },
  {
    value: 'technician',
    label: 'Technician / Field',
    blurb: 'Sees assigned jobs, updates status, and marks the work complete.',
  },
  {
    value: 'owner',
    label: 'Owner / Admin',
    blurb: 'Full access, including team, settings, and payments.',
  },
]

export const ROLE_LABEL: Record<UserRole, string> = {
  owner: 'Owner',
  office: 'Office',
  sales: 'Sales',
  technician: 'Technician',
}

/**
 * Roles a job can be assigned to, in the order a filter should offer them.
 *
 * Lives here rather than beside the filter component because that component is
 * `'use client'`, and a value exported from a client module is a client
 * *reference* when a Server Component imports it — not the array. It typechecks
 * and then fails at runtime with `ASSIGNABLE_ROLES.includes is not a function`,
 * which is a confusing way to learn the rule. Shared constants belong in a
 * module with no directive.
 */
export const ASSIGNABLE_ROLES: UserRole[] = ['technician', 'sales', 'office', 'owner']

/**
 * A role named as a group, for filters that select all of them.
 *
 * Written out rather than appending an "s" to ROLE_LABEL, which produced
 * "Saless" and would have produced "Offices" — English plurals are not a string
 * operation, and a filter is a bad place to look careless.
 */
export const ROLE_GROUP_LABEL: Record<UserRole, string> = {
  owner: 'Owners',
  office: 'Office staff',
  sales: 'Sales',
  technician: 'Technicians',
}
