import { DEGREE_NAME_ES, SCALE_TYPE_ES } from '../../theory/es.ts'
import { formatNote } from '../../theory/notes.ts'
import { spellScale } from '../../theory/scales.ts'
import { normalizeText } from '../grade.ts'
import type { Generator } from '../types.ts'
import { MAJOR_TONICS, MINOR_TONICS } from './_shared.ts'

interface Params {
  scales: string[]
}

export const scaleDegree: Generator<Params> = {
  id: 'scale-degree',
  skill: 'scale-degrees',
  parseParams(raw) {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const scales = r.scales ?? ['major']
    if (
      !Array.isArray(scales) ||
      scales.length === 0 ||
      scales.some((s) => typeof s !== 'string')
    ) {
      return null
    }
    return { scales: scales as string[] }
  },
  generate(params, rng) {
    const type = rng.pick(params.scales)
    const tonic = rng.pick([...(type.includes('minor') ? MINOR_TONICS : MAJOR_TONICS)])
    const notes = spellScale(tonic, type) ?? [tonic]
    const degree = rng.int(1, Math.min(7, notes.length))
    const note = notes[degree - 1] ?? tonic
    const typeEs = SCALE_TYPE_ES[type] ?? type

    // Functional names only make sense (and only exist) for the major scale.
    const askName = type === 'major' && rng.next() < 0.5
    if (askName) {
      const name = DEGREE_NAME_ES[degree] ?? ''
      return {
        id: '',
        key: `scale-degree:${tonic}:${type}:${degree}:name`,
        generator: 'scale-degree',
        skill: 'scale-degrees',
        prompt: `¿Cómo se llama el grado ${degree} de ${formatNote(tonic, 'latin')} ${typeEs}?`,
        input: { kind: 'text', placeholder: 'p. ej. dominante' },
        answer: { kind: 'text', accepted: [normalizeText(name)] },
        explanation: `El grado ${degree} se llama ${name}.`,
      }
    }
    return {
      id: '',
      key: `scale-degree:${tonic}:${type}:${degree}:note`,
      generator: 'scale-degree',
      skill: 'scale-degrees',
      prompt: `¿Qué nota es el grado ${degree} de ${formatNote(tonic, 'latin')} ${typeEs}?`,
      input: { kind: 'note', via: ['text', 'keyboard'] },
      answer: { kind: 'pitch-classes', notes: [note], spelling: 'strict' },
      explanation: `El grado ${degree} de ${formatNote(tonic, 'latin')} ${typeEs} es ${formatNote(note, 'american')}.`,
    }
  },
}
