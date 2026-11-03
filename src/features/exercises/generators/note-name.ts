import { formatNote } from '../../theory/notes.ts'
import type { Generator, InputVia } from '../types.ts'
import { type Accidentals, isAccidentals, notePool, randomPitch } from './_shared.ts'

interface Params {
  accidentals: Accidentals
  via: InputVia[]
}

const VIA: InputVia[] = ['text', 'keyboard', 'fretboard']

export const noteName: Generator<Params> = {
  id: 'note-name',
  skill: 'note-naming',
  parseParams(raw) {
    if (typeof raw !== 'object' || raw === null) return null
    const accidentals = (raw as Record<string, unknown>).accidentals ?? 'all'
    if (!isAccidentals(accidentals)) return null
    return { accidentals, via: VIA }
  },
  generate(params, rng) {
    const pitch = randomPitch(rng, notePool(params.accidentals), 3, 5)
    const pc = pitch.replace(/-?\d+$/, '')
    return {
      id: '',
      key: `note-name:${pitch}`,
      generator: 'note-name',
      skill: 'note-naming',
      prompt: 'Nombra la nota marcada en el teclado.',
      input: { kind: 'note', via: params.via },
      answer: { kind: 'pitch-classes', notes: [pc], spelling: 'enharmonic' },
      explanation: `La nota marcada es ${formatNote(pc, 'latin')} (${formatNote(pc, 'american')}).`,
    }
  },
}
