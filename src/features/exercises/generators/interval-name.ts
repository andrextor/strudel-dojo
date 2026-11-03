import { Interval, Note } from 'tonal'
import { formatInterval } from '../../theory/intervals.ts'
import { formatNote } from '../../theory/notes.ts'
import type { Generator } from '../types.ts'
import { INTERVAL_CATALOG, notePool } from './_shared.ts'

interface Params {
  maxInterval: string
  qualities: string[] | null
  direction: 'up' | 'down' | 'both'
}

function parseIntervalParams(raw: unknown): Params | null {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const maxInterval = r.maxInterval ?? '8P'
  if (typeof maxInterval !== 'string' || Interval.get(maxInterval).empty) return null
  let qualities: string[] | null = null
  if (r.qualities !== undefined) {
    if (!Array.isArray(r.qualities) || r.qualities.some((q) => typeof q !== 'string')) return null
    qualities = r.qualities as string[]
  }
  const direction = r.direction ?? 'up'
  if (direction !== 'up' && direction !== 'down' && direction !== 'both') return null
  return { maxInterval, qualities, direction }
}

function candidates(params: Params): string[] {
  const maxSemis = Interval.semitones(params.maxInterval) ?? 12
  return INTERVAL_CATALOG.filter((name) => {
    const semis = Interval.semitones(name) ?? 0
    if (semis < 1 || semis > maxSemis) return false
    return params.qualities === null || params.qualities.includes(Interval.get(name).q)
  })
}

export const intervalName: Generator<Params> = {
  id: 'interval-name',
  skill: 'interval-quality',
  parseParams(raw) {
    const params = parseIntervalParams(raw)
    if (params === null) return null
    return candidates(params).length === 0 ? null : params
  },
  generate(params, rng) {
    const name = rng.pick(candidates(params))
    const root = `${rng.pick(notePool('all'))}${rng.int(3, 4)}`
    const high = Note.transpose(root, name)
    const dir = params.direction === 'both' ? rng.pick(['up', 'down'] as const) : params.direction
    const [first, second] = dir === 'down' ? [high, root] : [root, high]
    return {
      id: '',
      key: `interval-name:${root}>${high}`,
      generator: 'interval-name',
      skill: 'interval-quality',
      prompt: `¿Qué intervalo hay de ${formatNote(first, 'american')} a ${formatNote(second, 'american')}?`,
      input: { kind: 'text', placeholder: 'p. ej. 3M o tercera mayor' },
      answer: { kind: 'text', accepted: [name] },
      explanation: `De ${formatNote(root, 'american')} a ${formatNote(high, 'american')} hay una ${formatInterval(name, 'long')}.`,
    }
  },
}
