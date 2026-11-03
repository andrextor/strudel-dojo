import { Interval, Note } from 'tonal'
import { formatInterval } from '../../theory/intervals.ts'
import type { Generator } from '../types.ts'
import { strudelNote } from './_shared.ts'

interface Params {
  set: string[]
  direction: 'up' | 'down' | 'harmonic'
}

const EAR_TONICS = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4']

export const earInterval: Generator<Params> = {
  id: 'ear-interval',
  skill: 'interval-ear',
  parseParams(raw) {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    if (
      !Array.isArray(r.set) ||
      r.set.length === 0 ||
      r.set.some((s) => typeof s !== 'string' || Interval.get(s).empty)
    ) {
      return null
    }
    const direction = r.direction ?? 'up'
    if (direction !== 'up' && direction !== 'down' && direction !== 'harmonic') return null
    return { set: r.set as string[], direction }
  },
  generate(params, rng) {
    const interval = rng.pick(params.set)
    const root = rng.pick(EAR_TONICS)
    const high = Note.transpose(root, interval)
    const low = strudelNote(root)
    const top = strudelNote(high)
    const audio =
      params.direction === 'harmonic'
        ? `note("[${low},${top}]").s("piano")`
        : params.direction === 'down'
          ? `note("${top} ${low}").s("piano")`
          : `note("${low} ${top}").s("piano")`

    const options = rng.shuffle(params.set.map((name) => formatInterval(name, 'short')))
    const correctLabel = formatInterval(interval, 'short')
    return {
      id: '',
      key: `ear-interval:${root}:${interval}:${params.direction}`,
      generator: 'ear-interval',
      skill: 'interval-ear',
      prompt: 'Escucha e identifica el intervalo.',
      input: { kind: 'choice', options },
      audio,
      answer: { kind: 'choice', index: options.indexOf(correctLabel) },
      explanation: `El intervalo es una ${formatInterval(interval, 'long')}.`,
    }
  },
}
