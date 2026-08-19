'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowRight, BookText, Check, FileUp, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  importCustomers,
  mapCustomerCsv,
  type CustomerField,
  type ImportSummary,
  type MappingResult,
} from './actions'

/**
 * The switching wizard. Three beats: where the export button is in the app
 * they're leaving, drop the file here, watch it land. No column mapping UI —
 * known exports map by header, unknown ones get one AI read of the header
 * row, and the preview is the proof it worked.
 */

const SOURCES = [
  {
    id: 'jobber',
    name: 'Jobber',
    steps: [
      'In Jobber, open Clients from the sidebar.',
      'Click the ⋯ (More Actions) menu → Export clients.',
      'Jobber emails you a CSV — download it and drop it below.',
    ],
  },
  {
    id: 'housecall',
    name: 'Housecall Pro',
    steps: [
      'In Housecall Pro, open Customers.',
      'Select all → Export (top right) to download the customer CSV.',
      'Drop the file below.',
    ],
  },
  {
    id: 'joist',
    name: 'Joist',
    steps: [
      'Joist keeps exports thin — but if you synced it to QuickBooks, your customers are there.',
      'In QuickBooks Online: Sales → Customers → Export to Excel, then save as CSV.',
      'No QuickBooks? Email Joist support for a data export — they will send a CSV.',
    ],
  },
  {
    id: 'other',
    name: 'Somewhere else',
    steps: [
      'Any CSV with a name column works — from a spreadsheet, another app, or an old backup.',
      'Columns for email, phone, and address come along automatically when present.',
    ],
  },
] as const

export function ImportWizard() {
  const [source, setSource] = useState<(typeof SOURCES)[number]['id']>('jobber')
  const [csv, setCsv] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [mapped, setMapped] = useState<MappingResult | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [busy, start] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const activeSource = SOURCES.find((s) => s.id === source)!

  function onFile(file: File) {
    setSummary(null)
    setMapped(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      setCsv(text)
      start(async () => {
        const res = await mapCustomerCsv({ csv: text })
        if (!res.ok) {
          toast.error(res.error)
          setCsv(null)
          return
        }
        setMapped(res.data)
      })
    }
    reader.readAsText(file)
  }

  function runImport() {
    if (!csv || !mapped) return
    start(async () => {
      const res = await importCustomers({ csv, mapping: mapped.mapping })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setSummary(res.data)
      toast.success(`Imported ${res.data.imported} customers.`)
    })
  }

  const fieldLabel: Record<string, string> = {
    name: 'Name', first_name: 'First name', last_name: 'Last name', company: 'Company',
    email: 'Email', phone: 'Phone', address: 'Address', city: 'City', state: 'State', zip: 'ZIP',
  }

  return (
    <div className="space-y-6">
      {/* Step 1: where they're coming from */}
      <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">1</span>
          Where is your data now?
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSource(s.id)}
              className={cn(
                'h-11 rounded-lg border px-4 text-sm font-medium',
                source === s.id
                  ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                  : 'border-border bg-background hover:bg-muted',
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
        <ol className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          {activeSource.steps.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground/60">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      {/* Step 2: customers file */}
      <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">2</span>
          <Users className="h-4 w-4" />
          Customers
        </h2>

        {!summary && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onFile(f)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="mt-3 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
            >
              {busy && !mapped ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileUp className="h-5 w-5" />}
              {fileName ? `${fileName} — choose a different file` : 'Drop the CSV here, or tap to choose'}
            </button>
          </>
        )}

        {mapped && !summary && (
          <div className="mt-4">
            <p className="text-sm">
              Found <span className="font-semibold tabular">{mapped.total}</span> customers.
              Columns matched {mapped.mappedBy === 'ai' ? 'by AI from the header row' : 'automatically'}:
              {' '}
              <span className="text-muted-foreground">
                {mapped.mapping.filter((f): f is CustomerField => Boolean(f && f !== 'ignore')).map((f) => fieldLabel[f]).join(', ')}
              </span>
            </p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Phone</th>
                    <th className="px-3 py-2 font-medium">Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {mapped.preview.map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{p.name ?? [p.first_name, p.last_name].filter(Boolean).join(' ') ?? p.company}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.email ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.phone ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{[p.address, p.city].filter(Boolean).join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={runImport} disabled={busy} className="mt-4 h-12 w-full gap-2 text-base sm:w-auto sm:px-6">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Import {mapped.total} customers
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Safe to re-run — anyone already in Rivet (matched by email or phone) is skipped, never duplicated.
            </p>
          </div>
        )}

        {summary && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-border/70 bg-muted/30 p-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-4 w-4" />
            </span>
            <div className="text-sm">
              <p className="font-medium">
                {summary.imported} imported
                {summary.merged > 0 && ` · ${summary.merged} already existed`}
                {summary.skipped > 0 && ` · ${summary.skipped} skipped (no name)`}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                They&rsquo;re in <Link href="/app/customers" className="underline underline-offset-4">Customers</Link> now.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Step 3: price book — the existing importer already does this */}
      <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">3</span>
          <BookText className="h-4 w-4" />
          Price book
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Export your products &amp; services as a CSV — or don&rsquo;t bother: a photo or PDF of
          an old quote, invoice, or rate sheet works, and the AI reads the items straight off it.
        </p>
        <Button asChild variant="outline" className="mt-3 h-11 gap-1.5">
          <Link href="/app/catalog">
            Import your price book
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  )
}
