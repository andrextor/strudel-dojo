import { spellTriad, type TriadQuality } from '../../theory/chords.ts'
import { CHORD_TYPE_ES } from '../../theory/es.ts'
import { needsRareSpelling } from '../../theory/instruments.ts'
import { formatNote } from '../../theory/notes.ts'
import type { Generator } from '../types.ts'
import { chordLabel, MAJOR_TONICS, parseQualities } from './_shared.ts'

interface Params {
  qualities: TriadQuality[]
  roots: string[]
}

const BUILD: Record<TriadQuality, string> = {
  major: 'tercera mayor y quinta justa',
  minor: 'tercera menor y quinta justa',
  diminished: 'tercera menor y quinta disminuida',
  augmented: 'tercera mayor y quinta aumentada',
}

export const chordSpelling: Generator<Params> = {
  id: 'chord-spelling',
  skill: 'triad-quality',
  parseParams(raw) {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const qualities = parseQualities(r.qualities)
    const roots = r.roots ?? [...MAJOR_TONICS]
    if (qualities === null || !Array.isArray(roots) || roots.length === 0) return null
    if (!roots.every((x) => typeof x === 'string' && spellTriad(x, 'major') !== null)) return null
    return { qualities, roots: roots as string[] }
  },
  generate(params, rng) {
    const quality = rng.pick(params.qualities)
    const root = rng.pick(params.roots)
    const notes = spellTriad(root, quality) ?? [root]
    const spellAll = needsRareSpelling(
      params.qualities.flatMap((q) => params.roots.flatMap((x) => spellTriad(x, q) ?? [])),
    )
    return {
      id: '',
      key: `chord-spelling:${root}:${quality}`,
      generator: 'chord-spelling',
      skill: 'triad-quality',
      prompt: `Escribe las notas del acorde de ${chordLabel(root, quality)}.`,
      input: { kind: 'note-set', via: ['text', 'keyboard'], ordered: false, count: 3, spellAll },
      answer: { kind: 'pitch-classes', notes, spelling: 'strict' },
      explanation: `${formatNote(root, 'latin')} ${CHORD_TYPE_ES[quality]}: ${notes.map((n) => formatNote(n, 'american')).join(' ')}. Fundamental, ${BUILD[quality]}.`,
    }
  },
}
