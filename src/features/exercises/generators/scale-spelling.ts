import { SCALE_TYPE_ES } from '../../theory/es.ts'
import { needsRareSpelling } from '../../theory/instruments.ts'
import { formatNote } from '../../theory/notes.ts'
import { spellScale } from '../../theory/scales.ts'
import type { Generator } from '../types.ts'
import { MAJOR_TONICS, MINOR_TONICS } from './_shared.ts'

interface Params {
  scales: string[]
  tonics: string[] | null
}

function tonicsFor(type: string, override: string[] | null): readonly string[] {
  if (override !== null) return override
  return type.includes('minor') ? MINOR_TONICS : MAJOR_TONICS
}

// Spelling any scale is the same exercise; each family registers its own id and skill so the
// review schedule and stats keep them apart (major scale, modes, minor variants…).
export function scaleSpellingFor(
  id: string,
  skill: string,
  defaults: { scales: string[]; tonics: string[] | null },
): Generator<Params> {
  return {
    id,
    skill,
    parseParams(raw) {
      const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
      const scales = r.scales ?? defaults.scales
      if (
        !Array.isArray(scales) ||
        scales.length === 0 ||
        scales.some((x) => typeof x !== 'string' || spellScale('C', x) === null)
      ) {
        return null
      }
      let tonics = defaults.tonics
      if (r.tonics !== undefined) {
        if (!Array.isArray(r.tonics) || r.tonics.some((t) => typeof t !== 'string')) return null
        tonics = r.tonics as string[]
      }
      return { scales: scales as string[], tonics }
    },
    generate(params, rng) {
      const type = rng.pick(params.scales)
      const tonic = rng.pick([...tonicsFor(type, params.tonics)])
      const notes = spellScale(tonic, type) ?? [tonic]
      const typeEs = SCALE_TYPE_ES[type] ?? type
      const spellAll = needsRareSpelling(
        params.scales.flatMap((x) =>
          tonicsFor(x, params.tonics).flatMap((t) => spellScale(t, x) ?? []),
        ),
      )
      return {
        id: '',
        key: `${id}:${tonic}:${type}`,
        generator: id,
        skill,
        prompt: `Escribe la escala ${typeEs} de ${formatNote(tonic, 'latin')}.`,
        input: {
          kind: 'note-set',
          via: ['text', 'keyboard'],
          ordered: true,
          count: notes.length,
          spellAll,
        },
        answer: { kind: 'pitch-classes', notes, spelling: 'strict' },
        explanation: `${formatNote(tonic, 'latin')} ${typeEs}: ${notes.map((n) => formatNote(n, 'american')).join(' ')}.`,
      }
    },
  }
}

export const scaleSpelling = scaleSpellingFor('scale-spelling', 'major-scale-spelling', {
  scales: ['major'],
  tonics: null,
})
