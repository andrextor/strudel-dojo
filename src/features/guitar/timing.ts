// Was a note on the beat? `latencyMs` (interface + browser, from calibration) is taken off the
// event time first. Pure.
export type Verdict = 'on-time' | 'early' | 'late'

export function judge(
  beatTime: number,
  eventTime: number,
  { windowMs, latencyMs }: { windowMs: number; latencyMs: number },
): Verdict {
  const delta = eventTime - latencyMs - beatTime
  if (Math.abs(delta) <= windowMs) return 'on-time'
  return delta < 0 ? 'early' : 'late'
}
