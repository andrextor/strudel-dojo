import { spellTriad, TRIAD_QUALITIES, type TriadQuality } from '../../theory/chords.ts'
import { formatNote } from '../../theory/notes.ts'
import type { Generator } from '../types.ts'
import { chordLabel, MAJOR_TONICS, parseQualities, voiceUp } from './_shared.ts'

interface Params {
  qualities: TriadQuality[]
  inversions: boolean
}

const BASS_ROLE = [
  'la fundamental: está en estado fundamental',
  'la tercera: es la primera inversión',
  'la quinta: es la segunda inversión',
]

export const chordName: Generator<Params> = {
  id: 'chord-name',
  skill: 'inversions',
  parseParams(raw) {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const qualities = parseQualities(r.qualities)
    return qualities === null ? null : { qualities, inversions: r.inversions !== false }
  },
  generate(params, rng) {
    const quality = rng.pick(params.qualities)
    const root = rng.pick([...MAJOR_TONICS])
    const triad = spellTriad(root, quality) ?? [root]
    const inversion = params.inversions ? rng.int(0, 2) : 0
    const order = [...triad.slice(inversion), ...triad.slice(0, inversion)]
    const voiced = voiceUp(order, 3)
    const bass = order[0] ?? root
    const label = (q: TriadQuality, inv: number) =>
      chordLabel(root, q, inv, (spellTriad(root, q) ?? triad)[inv] ?? root)

    // Distractors: the other inversions of the same chord first, then other qualities.
    const others = [
      ...(params.inversions ? [1, 2].map((d) => label(quality, (inversion + d) % 3)) : []),
      ...TRIAD_QUALITIES.filter((q) => q !== quality).map((q) => label(q, inversion)),
    ]
    const correct = label(quality, inversion)
    const options = rng.shuffle([correct, ...[...new Set(others)].slice(0, 3)])
    return {
      id: '',
      key: `chord-name:${root}:${quality}:${inversion}`,
      generator: 'chord-name',
      skill: 'inversions',
      prompt: `¿Qué acorde forman ${order.map((n) => formatNote(n, 'latin')).join(', ')} (de la más grave a la más aguda)?`,
      input: { kind: 'choice', options },
      marked: voiced,
      answer: { kind: 'choice', index: options.indexOf(correct) },
      explanation: `Es ${correct}. Abajo está ${formatNote(bass, 'latin')}, ${BASS_ROLE[inversion]}.`,
    }
  },
}
