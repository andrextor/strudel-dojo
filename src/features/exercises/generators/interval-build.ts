import { Interval } from 'tonal'
import { needsRareSpelling } from '../../theory/instruments.ts'
import { formatInterval, transposeNote } from '../../theory/intervals.ts'
import { formatNote } from '../../theory/notes.ts'
import type { Generator } from '../types.ts'
import { INTERVAL_CATALOG, notePool } from './_shared.ts'

interface Params {
  maxInterval: string
  qualities: string[] | null
}

export const intervalBuild: Generator<Params> = {
  id: 'interval-build',
  skill: 'interval-quality',
  parseParams(raw) {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const maxInterval = r.maxInterval ?? '8P'
    if (typeof maxInterval !== 'string' || Interval.get(maxInterval).empty) return null
    let qualities: string[] | null = null
    if (r.qualities !== undefined) {
      if (!Array.isArray(r.qualities) || r.qualities.some((q) => typeof q !== 'string')) return null
      qualities = r.qualities as string[]
    }
    return { maxInterval, qualities }
  },
  generate(params, rng) {
    const maxSemis = Interval.semitones(params.maxInterval) ?? 12
    const pool = INTERVAL_CATALOG.filter((name) => {
      const semis = Interval.semitones(name) ?? 0
      if (semis < 1 || semis > maxSemis) return false
      return params.qualities === null || params.qualities.includes(Interval.get(name).q)
    })
    const roots = notePool('all')
    const interval = rng.pick(pool)
    const root = rng.pick(roots)
    const result = transposeNote(root, interval) ?? root
    const resultPc = result.replace(/-?\d+$/, '')
    return {
      id: '',
      key: `interval-build:${root}+${interval}`,
      generator: 'interval-build',
      skill: 'interval-quality',
      prompt: `¿Qué nota está una ${formatInterval(interval, 'long')} por encima de ${formatNote(root, 'american')}?`,
      input: {
        kind: 'note',
        via: ['text', 'keyboard', 'fretboard'],
        spellAll: needsRareSpelling(
          pool.flatMap((i) => roots.map((r) => transposeNote(r, i) ?? r)),
        ),
      },
      answer: { kind: 'pitch-classes', notes: [resultPc], spelling: 'strict' },
      explanation: `Una ${formatInterval(interval, 'long')} sobre ${formatNote(root, 'american')} es ${formatNote(resultPc, 'american')}.`,
    }
  },
}
