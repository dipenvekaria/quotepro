'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { BusinessHours, DayKey } from '@/lib/scheduling/slots'

import { updateBusinessHours } from './actions'

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

/**
 * When this contractor works.
 *
 * This is what makes "next available" trustworthy — without it the scheduler
 * would offer 2am on a Sunday, and a contractor only has to see that once to
 * stop using the suggestions.
 */
export function WorkingHours({ initial }: { initial: BusinessHours }) {
  const router = useRouter()
  const [hours, setHours] = useState<BusinessHours>(initial)
  const [saving, startSave] = useTransition()

  function setDay(key: DayKey, next: BusinessHours[DayKey]) {
    setHours((h) => ({ ...h, [key]: next }))
  }

  function save() {
    startSave(async () => {
      const res = await updateBusinessHours(hours)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Working hours saved', {
        description: 'Job suggestions will stay inside these times.',
      })
      router.refresh()
    })
  }

  const openDays = DAYS.filter((d) => hours[d.key]).length
  const weeklyHours = DAYS.reduce((sum, d) => {
    const h = hours[d.key]
    if (!h) return sum
    const [sh, sm] = h.start.split(':').map(Number)
    const [eh, em] = h.end.split(':').map(Number)
    return sum + Math.max(0, eh * 60 + em - (sh * 60 + sm)) / 60
  }, 0)

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Working hours</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        When you take jobs. Rivet only suggests times inside these hours.
      </p>

      <div className="mt-5 space-y-2">
        {DAYS.map(({ key, label }) => {
          const day = hours[key]
          return (
            <div
              key={key}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5"
            >
              <div className="flex min-w-[9.5rem] items-center gap-3">
                <Switch
                  checked={Boolean(day)}
                  onCheckedChange={(on) =>
                    setDay(key, on ? { start: '08:00', end: '17:00' } : null)
                  }
                  aria-label={`${label} open`}
                  disabled={saving}
                />
                <span className={day ? 'text-sm font-medium' : 'text-sm text-muted-foreground'}>
                  {label}
                </span>
              </div>

              {day ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={day.start}
                    onChange={(e) => setDay(key, { ...day, start: e.target.value })}
                    className="h-11 w-[7.5rem]"
                    aria-label={`${label} start`}
                    disabled={saving}
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={day.end}
                    onChange={(e) => setDay(key, { ...day, end: e.target.value })}
                    className="h-11 w-[7.5rem]"
                    aria-label={`${label} end`}
                    disabled={saving}
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Closed</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {openDays} {openDays === 1 ? 'day' : 'days'} · {weeklyHours.toFixed(1)} hours a week of
          capacity
        </p>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save hours'}
        </Button>
      </div>
    </div>
  )
}
