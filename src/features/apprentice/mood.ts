// The apprentice's resting pose, derived from saved progress and never stored (spec 05). Pure.
import { activeDays, localDate, streak } from '../progress/streak.ts'
import type { ProgressState } from '../progress/types.ts'

export type Pose = 'guard' | 'cheer' | 'bow' | 'down' | 'meditate' | 'ki' | 'dance'

export const KI_STREAK = 3
export const REST_DAYS = 3

const DAY_MS = 86_400_000

// A long absence reads as rest, never as sadness: the app does not guilt anyone into coming back.
export function restingPose(p: ProgressState, now: Date, timeZone?: string): Pose {
  if (streak(p, now, timeZone) >= KI_STREAK) return 'ki'
  const days = [...activeDays(p, timeZone)].sort()
  const last = days.at(-1)
  if (last === undefined) return 'guard'
  const today = Date.parse(`${localDate(now, timeZone)}T12:00:00Z`)
  const idle = Math.round((today - Date.parse(`${last}T12:00:00Z`)) / DAY_MS)
  return idle >= REST_DAYS ? 'meditate' : 'guard'
}

export const POSE_ES: Record<Pose, string> = {
  guard: 'en guardia',
  cheer: 'celebrando',
  bow: 'haciendo una reverencia',
  down: 'tomando aire para volver a intentarlo',
  meditate: 'meditando',
  ki: 'con mucha energía',
  dance: 'bailando',
}
