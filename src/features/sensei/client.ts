// Browser side of the Sensei: is it on, and typed calls whose responses are checked before use.
import { useEffect, useState } from 'preact/hooks'
import type { AssertionResult } from '../strudel/types.ts'
import type { CheckResult, ExplainResult } from './contracts.ts'
import type { SenseiReview } from './types.ts'

let status: Promise<boolean> | null = null

// One request per page load; any failure means "off", so no button ever shows by mistake.
export function senseiEnabled(): Promise<boolean> {
  status ??= fetch('/api/sensei/status')
    .then((r) => (r.ok ? r.json() : null))
    .then(
      (d: unknown) => typeof d === 'object' && d !== null && 'enabled' in d && d.enabled === true,
    )
    .catch(() => false)
  return status
}

export function useSenseiEnabled(): boolean {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let alive = true
    void senseiEnabled().then((v) => alive && setEnabled(v))
    return () => {
      alive = false
    }
  }, [])
  return enabled
}

export type Call<T> = { ok: true; data: T } | { ok: false; error: string }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isStrings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')

async function post<T>(
  path: string,
  body: unknown,
  check: (v: unknown) => v is T,
): Promise<Call<T>> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data: unknown = await res.json().catch(() => null)
    if (res.ok && check(data)) return { ok: true, data }
    const error = isObject(data) && typeof data.error === 'string' ? data.error : null
    return { ok: false, error: error ?? 'No se pudo hablar con el Sensei. Intenta de nuevo.' }
  } catch {
    return { ok: false, error: 'Sin conexión. Revisa tu internet e intenta de nuevo.' }
  }
}

const isHint = (v: unknown): v is { hint: string } => isObject(v) && typeof v.hint === 'string'

const isExplain = (v: unknown): v is ExplainResult =>
  isObject(v) &&
  typeof v.overview === 'string' &&
  Array.isArray(v.lines) &&
  v.lines.every((l) => isObject(l) && typeof l.line === 'number' && typeof l.text === 'string')

export interface ReviewResponse {
  review: SenseiReview
  assertions: (AssertionResult & { type: string })[]
  passed: boolean
}

const isReview = (v: unknown): v is ReviewResponse => {
  if (!isObject(v) || typeof v.passed !== 'boolean' || !Array.isArray(v.assertions)) return false
  const r = v.review
  return (
    isObject(r) &&
    typeof r.score === 'number' &&
    Array.isArray(r.criteria) &&
    r.criteria.every(
      (c) =>
        isObject(c) &&
        typeof c.id === 'string' &&
        typeof c.score === 'number' &&
        typeof c.comment === 'string',
    ) &&
    isStrings(r.strengths) &&
    isStrings(r.nextSteps) &&
    isObject(r.variation) &&
    typeof r.variation.idea === 'string' &&
    typeof r.variation.code === 'string'
  )
}

export const askHint = (body: unknown) => post('/api/sensei/hint', body, isHint)
export const askExplain = (code: string) => post('/api/sensei/explain', { code }, isExplain)
export const askReview = (bossId: string, code: string, checks: CheckResult[], summary: string) =>
  post('/api/sensei/review', { bossId, code, checks, summary }, isReview)
