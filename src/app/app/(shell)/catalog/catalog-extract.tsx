'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileScan, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { extractCatalogFromUpload, importExtractedItems, type ExtractResult } from './actions'

type Row = ExtractResult['items'][number] & { include: boolean }

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,application/pdf,image/*'

/**
 * Reads a contractor's existing paperwork into their price book.
 *
 * The review table is not a convenience — it is the safety mechanism. The model
 * is transcribing numbers off a photograph, and every one of these prices ends
 * up on a customer's quote, so nothing is saved until a human has looked at it.
 * Rows stay editable here for the same reason.
 */
export function CatalogExtract() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [reading, startRead] = useTransition()
  const [saving, startSave] = useTransition()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [meta, setMeta] = useState<{ documentType: string; notes: string } | null>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    startRead(async () => {
      const fd = new FormData()
      fd.append('file', file)
      const res = await extractCatalogFromUpload(fd)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setRows(res.data.items.map((i) => ({ ...i, include: true })))
      setMeta({ documentType: res.data.documentType, notes: res.data.notes })
    })
  }

  function save() {
    const chosen = rows?.filter((r) => r.include) ?? []
    if (chosen.length === 0) {
      toast.error('Nothing selected to import')
      return
    }
    startSave(async () => {
      const res = await importExtractedItems(
        chosen.map(({ include: _include, ...item }) => item),
      )
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const { imported, skipped } = res.data
      if (skipped === 0) toast.success(`Added ${imported} ${imported === 1 ? 'item' : 'items'}`)
      else toast.warning(`Added ${imported}, skipped ${skipped}`)
      setRows(null)
      setMeta(null)
      router.refresh()
    })
  }

  const chosenCount = rows?.filter((r) => r.include).length ?? 0

  return (
    <>
      <Button
        variant="outline"
        className="gap-1.5"
        onClick={() => fileRef.current?.click()}
        disabled={reading}
      >
        {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileScan className="h-4 w-4" />}
        {reading ? 'Reading…' : 'Read from a document'}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={onFile}
        aria-label="Read a price list from a quote, invoice or photo"
      />

      {rows && (
        <div className="mt-4 w-full rounded-xl border border-border/70">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
            <div className="text-sm">
              <span className="font-medium">
                {rows.length} {rows.length === 1 ? 'item' : 'items'} found
              </span>
              {meta?.documentType && (
                <span className="text-muted-foreground"> · read as a {meta.documentType}</span>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                Check the prices before you add them — these were read off your document.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRows(null)
                setMeta(null)
              }}
              className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Discard
            </button>
          </div>

          {meta?.notes && (
            <p className="border-b border-border/70 bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              {meta.notes}
            </p>
          )}

          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-2" />
                  <th className="px-2 py-2 font-medium">Item</th>
                  <th className="px-2 py-2 font-medium">Category</th>
                  <th className="px-2 py-2 font-medium">Unit</th>
                  <th className="px-2 py-2 text-right font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.name}-${i}`} className="border-t border-border/60">
                    <td className="px-4 py-1.5">
                      <input
                        type="checkbox"
                        checked={r.include}
                        aria-label={`Include ${r.name}`}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev!.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)),
                          )
                        }
                        className="h-4 w-4 rounded border-input"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={r.name}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev!.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                          )
                        }
                        className="h-11 lg:h-9"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{r.category || '—'}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{r.unit}</td>
                    <td className="px-2 py-1.5 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={r.price}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev!.map((x, j) =>
                              j === i ? { ...x, price: Number(e.target.value) } : x,
                            ),
                          )
                        }
                        className="h-9 w-28 text-right"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border/70 px-4 py-3">
            <Button onClick={save} disabled={saving || chosenCount === 0}>
              {saving ? 'Adding…' : `Add ${chosenCount} to catalog`}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
