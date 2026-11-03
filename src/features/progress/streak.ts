import type { LocalDate, ProgressState } from './types.ts'

export const PRACTICE_DAY_MIN = 10

// 'en-CA' formats as YYYY-MM-DD. Without a timeZone it uses the runtime's (the viewer's).
export function localDate(date: Date, timeZone?: string): LocalDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date)
}

function previousDay(day: LocalDate): LocalDate {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function activeDays(p: ProgressState, timeZone?: string): Set<LocalDate> {
  const days = new Set<LocalDate>()
  for (const a of p.attempts)
    if (a.submittedAt) days.add(localDate(new Date(a.submittedAt), timeZone))
  for (const k of Object.values(p.katas))
    if (k.passedAt) days.add(localDate(new Date(k.passedAt), timeZone))
  for (const [day, stats] of Object.entries(p.practiceDays)) {
    if (stats.answered >= PRACTICE_DAY_MIN) days.add(day)
  }
  return days
}

// Consecutive active days ending today; a streak still counts until today ends unpracticed.
export function streak(p: ProgressState, now: Date, timeZone?: string): number {
  const days = activeDays(p, timeZone)
  let day = localDate(now, timeZone)
  if (!days.has(day)) day = previousDay(day)
  let count = 0
  while (days.has(day)) {
    count++
    day = previousDay(day)
  }
  return count
}
