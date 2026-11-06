import { formatNote } from '../../theory/notes.ts'
import type { Generator } from '../types.ts'
import { type Accidentals, isAccidentals, notePool, randomPitch, strudelNote } from './_shared.ts'

interface Params {
  accidentals: Accidentals
  reference: boolean // Do sounds first, so the note is found by distance, not by absolute pitch
}

export const earNote: Generator<Params> = {
  id: 'ear-note',
  skill: 'note-ear',
  parseParams(raw) {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const accidentals = r.accidentals ?? 'none'
    const reference = r.reference ?? true
    if (!isAccidentals(accidentals) || typeof reference !== 'boolean') return null
    return { accidentals, reference }
  },
  generate(params, rng) {
    const pitch = randomPitch(rng, notePool(params.accidentals), 3, 4)
    const pc = pitch.replace(/-?\d+$/, '')
    const target = strudelNote(pitch)
    return {
      id: '',
      key: `ear-note:${pitch}:${params.reference}`,
      generator: 'ear-note',
      skill: 'note-ear',
      prompt: params.reference
        ? 'Primero suena Do (C). ¿Qué nota suena después?'
        : 'Escucha y di qué nota es.',
      input: { kind: 'note', via: ['keyboard', 'fretboard', 'text'] },
      audio: params.reference
        ? `note("c4 ~ ${target} ~").s("piano")`
        : `note("${target}").s("piano")`,
      answer: { kind: 'pitch-classes', notes: [pc], spelling: 'enharmonic' },
      explanation: `La nota es ${formatNote(pc, 'latin')} (${formatNote(pc, 'american')}).`,
    }
  },
}
