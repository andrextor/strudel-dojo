import { Note } from 'tonal'
import { formatNote } from '../../theory/notes.ts'
import type { Generator } from '../types.ts'

interface Params {
  allowDouble: boolean
}

const SINGLE = ['C#', 'Db', 'D#', 'Eb', 'F#', 'Gb', 'G#', 'Ab', 'A#', 'Bb']
// Naturals whose enharmonic needs a sharp/flat on the neighbour letter.
const WITH_DOUBLE = ['C', 'F', 'E', 'B']

// Every other spelling of the same sound with at most a double accidental (C → B#, Dbb).
function respellings(note: string): string[] {
  const target = Note.chroma(note) ?? 0
  return Note.names().flatMap((letter) => {
    const d = ((target - (Note.chroma(letter) ?? 0) + 18) % 12) - 6
    const name = letter + (d > 0 ? '#'.repeat(d) : 'b'.repeat(-d))
    return Math.abs(d) <= 2 && name !== note ? [name] : []
  })
}

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
    const accepted = respellings(note)
    // The usual answer first: the single-accidental neighbour when there is one.
    const other = accepted.find((n) => n.length === 2) ?? accepted[0] ?? note
    return {
      id: '',
      key: `enharmonic:${note}`,
      generator: 'enharmonic',
      skill: 'note-naming',
      prompt: `Escribe un enarmónico de ${formatNote(note, 'latin')} (${formatNote(note, 'american')}).`,
      input: { kind: 'text', placeholder: 'p. ej. Re♭' },
      answer: { kind: 'text', accepted: [other, ...accepted.filter((n) => n !== other)] },
      explanation: `${formatNote(note, 'american')} y ${formatNote(other, 'american')} suenan igual pero se escriben distinto.`,
    }
  },
}
