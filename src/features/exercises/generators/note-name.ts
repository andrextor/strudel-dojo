import { formatNote } from '../../theory/notes.ts'
import type { Generator, InputVia } from '../types.ts'
import { type Accidentals, isAccidentals, notePool, randomPitch } from './_shared.ts'

interface Params {
  accidentals: Accidentals
  via: InputVia[]
}

// The note is shown on the instrument, so the answer is its name: tapping the lit key would
// give it away.
const VIA: InputVia[] = ['text']

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
      prompt: 'Nombra la nota marcada.',
      input: { kind: 'note', via: params.via },
      marked: [pitch],
      answer: { kind: 'pitch-classes', notes: [pc], spelling: 'enharmonic' },
      explanation: `La nota marcada es ${formatNote(pc, 'latin')} (${formatNote(pc, 'american')}).`,
    }
  },
}
