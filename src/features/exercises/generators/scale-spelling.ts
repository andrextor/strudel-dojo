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

export const scaleSpelling: Generator<Params> = {
  id: 'scale-spelling',
  skill: 'major-scale-spelling',
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
    let tonics: string[] | null = null
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
      params.scales.flatMap((s) =>
        tonicsFor(s, params.tonics).flatMap((t) => spellScale(t, s) ?? []),
      ),
    )
    return {
      id: '',
      key: `scale-spelling:${tonic}:${type}`,
      generator: 'scale-spelling',
      skill: 'major-scale-spelling',
      prompt: `Escribe la escala de ${formatNote(tonic, 'latin')} ${typeEs}.`,
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
