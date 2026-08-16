/**
 * Which day an instant falls on, and how to move it to another one.
 *
 * This is four lines of arithmetic that has now caused two bugs, so it lives in
 * one place with tests around it.
 *
 * The trap both times: `iso.slice(0, 10)` reads as "the date part" but gives the
 * *UTC* date. West of Greenwich every evening job is already tomorrow in UTC, so
 * a 9:56pm Wednesday job keyed as Thursday — the calendar drew it in the wrong
 * column, and dropping it on Thursday looked like a no-op and silently returned.
 *
 * The second failure was subtler: the day keys were correct on both sides but
 * computed on *different machines*. A server in UTC and a contractor in
 * California produce different keys for the same instant, so a job dropped on
 * Thursday landed on Tuesday. Whatever computes these keys must compute all of
 * them — hence both functions here, used only by the browser.
 */

/** The local calendar day of an instant, as `YYYY-MM-DD`. */
export function dayKey(instant: Date | string): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * The same clock time, on a different day.
 *
 * A job booked for 9am that moves to Thursday is a 9am job on Thursday, not one
 * at midnight — the contractor moved the day, not the appointment.
 */
export function moveToDay(instant: Date | string, key: string): Date {
  const d = typeof instant === 'string' ? new Date(instant) : instant
  const [y, m, day] = key.split('-').map(Number)
  const next = new Date(d)
  // setFullYear takes all three at once: setting the month alone can roll the
  // date over when the current day-of-month does not exist in the new month.
  next.setFullYear(y, m - 1, day)
  return next
}

/**
 * An instant as the value a `<input type="datetime-local">` expects.
 *
 * `toISOString().slice(0, 16)` is the obvious way to do this and it is wrong for
 * the same reason `slice(0, 10)` was wrong above: it yields UTC, so a
 * contractor in California opens the picker and sees a time hours from the one
 * on the job. The control has no timezone — it is local wall-clock by
 * definition — so the value must be built from local getters.
 *
 * Reading back needs no helper: `new Date('2026-08-16T09:00')` has no offset and
 * is parsed as local time by specification, which is what we want.
 */
export function toDateTimeLocal(instant: Date | string): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
