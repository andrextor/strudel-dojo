import { Interval, Note } from 'tonal'
import { formatNote } from '../../theory/notes.ts'
import type { Generator } from '../types.ts'
import { notePool, randomPitch } from './_shared.ts'

interface Params {
  maxSemitones: number
}

export const semitoneCount: Generator<Params> = {
  id: 'semitone-count',
  skill: 'semitones',
  parseParams(raw) {
    if (typeof raw !== 'object' || raw === null) return { maxSemitones: 12 }
    const max = (raw as Record<string, unknown>).maxSemitones ?? 12
    if (typeof max !== 'number' || !Number.isInteger(max) || max < 1) return null
    return { maxSemitones: max }
  },
  generate(params, rng) {
    const a = randomPitch(rng, notePool('all'), 3, 4)
    const semis = rng.int(1, params.maxSemitones)
    const b = Note.transpose(a, Interval.fromSemitones(semis))
    return {
      id: '',
      key: `semitone-count:${a}>${b}`,
      generator: 'semitone-count',
      skill: 'semitones',
      prompt: `¿Cuántos semitonos hay de ${formatNote(a, 'american')} a ${formatNote(b, 'american')}?`,
      input: { kind: 'text', placeholder: 'un número' },
      answer: { kind: 'text', accepted: [String(semis)] },
      explanation: `De ${formatNote(a, 'american')} a ${formatNote(b, 'american')} hay ${semis} semitono${semis === 1 ? '' : 's'}.`,
    }
  },
}
