import type { Metadata } from 'next'

import { PageContainer, PageHeader, Section } from '@/components/shared/page'
import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const metadata: Metadata = { title: 'Design Kit' }

// Living brand + component reference. Renders from the real tokens/components so
// it never drifts from the app. Keep this page in sync when the system changes.

const surfaces = [
  { name: 'background', className: 'bg-background border' },
  { name: 'card', className: 'bg-card border' },
  { name: 'muted', className: 'bg-muted' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'secondary', className: 'bg-secondary' },
]

const brandColors = [
  { name: 'primary', className: 'bg-primary' },
  { name: 'foreground', className: 'bg-foreground' },
  { name: 'muted-foreground', className: 'bg-muted-foreground' },
  { name: 'border', className: 'bg-border' },
  { name: 'destructive', className: 'bg-destructive' },
]

const charts = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5']

const radii = [
  { name: 'sm', className: 'rounded-sm' },
  { name: 'md', className: 'rounded-md' },
  { name: 'lg', className: 'rounded-lg' },
  { name: 'xl', className: 'rounded-xl' },
  { name: '2xl', className: 'rounded-2xl' },
]

const statuses = [
  'lead',
  'quote_sent',
  'quote_accepted',
  'job_scheduled',
  'job_completed',
  'quote_rejected',
] as const

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-14 w-full rounded-lg border border-border/60 ${className}`} />
      <span className="text-xs text-muted-foreground">{name}</span>
    </div>
  )
}

export default function BrandPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="QuotePro"
        title="Design Kit"
        description="The single source of truth for our look and voice. Calm, focused, and consistent — features stay powerful while the interface stays quiet."
      />

      <div className="mt-8 space-y-6">
        {/* Brand + voice */}
        <Section title="Brand">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <span className="text-base font-semibold">Q</span>
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">QuotePro</div>
                <div className="text-xs text-muted-foreground">Quote to cash for field service</div>
              </div>
            </div>
          </div>
          <ul className="mt-5 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>• Outcome-first copy — name the result, not the mechanism.</li>
            <li>• Automation stays behind the scenes; no “AI” on screens or buttons.</li>
            <li>• One accent, quiet borders, restrained shadows. Whitespace over decoration.</li>
            <li>• Plain, friendly language a busy contractor reads in one glance.</li>
          </ul>
        </Section>

        {/* Color */}
        <Section title="Color" description="One accent (primary). Warm neutral surfaces. Semantic reds for destructive only.">
          <div className="space-y-6">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Brand & ink</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {brandColors.map((c) => (
                  <Swatch key={c.name} {...c} />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Surfaces</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {surfaces.map((c) => (
                  <Swatch key={c.name} {...c} />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Data / charts</div>
              <div className="grid grid-cols-5 gap-3">
                {charts.map((c) => (
                  <Swatch key={c} name={c.replace('bg-', '')} className={c} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography" description="Geist, tight tracking on headings, normal-weight body. Tabular numerals wherever numbers matter.">
          <div className="space-y-3">
            <h1>Heading 1 — Win more jobs</h1>
            <h2>Heading 2 — Quote to cash</h2>
            <h3>Heading 3 — Section title</h3>
            <h4>Heading 4 — Label</h4>
            <p>Body — Professional quotes, sent for signature, paid online. One calm workspace for the whole job.</p>
            <small>Small — Helper and secondary text.</small>
            <div className="tabular text-2xl font-semibold">$12,480.00</div>
          </div>
        </Section>

        {/* Radius + elevation */}
        <Section title="Radius & elevation">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="grid grid-cols-5 gap-3">
              {radii.map((r) => (
                <div key={r.name} className="flex flex-col items-center gap-1.5">
                  <div className={`h-12 w-12 border border-border bg-muted ${r.className}`} />
                  <span className="text-xs text-muted-foreground">{r.name}</span>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-16 w-24 rounded-xl border bg-card shadow-sm" />
                <span className="text-xs text-muted-foreground">shadow-sm</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-16 w-24 rounded-xl border bg-card shadow-card" />
                <span className="text-xs text-muted-foreground">shadow-card</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Components */}
        <Section title="Components" description="Built once, reused everywhere. Import from components/ui and components/shared.">
          <div className="space-y-6">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Buttons</div>
              <div className="flex flex-wrap items-center gap-2">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button disabled>Disabled</Button>
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Badges</div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</div>
              <div className="flex flex-wrap items-center gap-2">
                {statuses.map((s) => (
                  <StatusBadge key={s} status={s} />
                ))}
              </div>
            </div>
            <div className="max-w-sm">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Inputs</div>
              <div className="space-y-2">
                <Input placeholder="Customer name" />
                <Input placeholder="Disabled" disabled />
              </div>
            </div>
          </div>
        </Section>
      </div>
    </PageContainer>
  )
}
