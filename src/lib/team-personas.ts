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
