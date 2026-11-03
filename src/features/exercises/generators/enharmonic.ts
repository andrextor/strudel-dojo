import { Note } from 'tonal'
import { formatNote } from '../../theory/notes.ts'
import type { Generator } from '../types.ts'

interface Params {
  allowDouble: boolean
}

const SINGLE = ['C#', 'Db', 'D#', 'Eb', 'F#', 'Gb', 'G#', 'Ab', 'A#', 'Bb']
// Naturals whose enharmonic needs a sharp/flat on the neighbour letter.
const WITH_DOUBLE = ['C', 'F', 'E', 'B']

export const enharmonic: Generator<Params> = {
  id: 'enharmonic',
  skill: 'note-naming',
  parseParams(raw) {
    if (typeof raw !== 'object' || raw === null) return { allowDouble: false }
    return { allowDouble: (raw as Record<string, unknown>).allowDouble === true }
  },
  generate(params, rng) {
    const pool = params.allowDouble ? [...SINGLE, ...WITH_DOUBLE] : SINGLE
    const note = rng.pick(pool)
    const other = Note.enharmonic(note)
    return {
      id: '',
      key: `enharmonic:${note}`,
      generator: 'enharmonic',
      skill: 'note-naming',
      prompt: `Escribe un enarmónico de ${formatNote(note, 'latin')} (${formatNote(note, 'american')}).`,
      input: { kind: 'text', placeholder: 'p. ej. Re♭' },
      answer: { kind: 'text', accepted: [other] },
      explanation: `${formatNote(note, 'american')} y ${formatNote(other, 'american')} suenan igual pero se escriben distinto.`,
    }
  },
}
