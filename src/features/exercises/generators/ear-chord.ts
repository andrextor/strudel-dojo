import { spellTriad, type TriadQuality } from '../../theory/chords.ts'
import { CHORD_TYPE_ES } from '../../theory/es.ts'
import type { Generator } from '../types.ts'
import { parseQualities, strudelNote, voiceUp } from './_shared.ts'

interface Params {
  qualities: TriadQuality[]
  inversions: boolean
}

// Roots spread over two octaves so the quality, not the register, gives the answer away.
const EAR_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb', 'Eb']

export const earChord: Generator<Params> = {
  id: 'ear-chord',
  skill: 'chord-ear',
  parseParams(raw) {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const qualities = parseQualities(r.qualities)
    if (qualities === null || qualities.length < 2) return null
    return { qualities, inversions: r.inversions === true }
  },
  generate(params, rng) {
    const quality = rng.pick(params.qualities)
    const root = rng.pick(EAR_ROOTS)
    const octave = rng.int(3, 4)
    const triad = spellTriad(root, quality) ?? [root]
    const inversion = params.inversions ? rng.int(0, 2) : 0
    const voiced = voiceUp([...triad.slice(inversion), ...triad.slice(0, inversion)], octave)
    const options = rng.shuffle(params.qualities.map((q) => CHORD_TYPE_ES[q] ?? q))
    const correct = CHORD_TYPE_ES[quality] ?? quality
    return {
      id: '',
      key: `ear-chord:${root}${octave}:${quality}:${inversion}`,
      generator: 'ear-chord',
      skill: 'chord-ear',
      prompt: 'Escucha el acorde: ¿de qué tipo es?',
      input: { kind: 'choice', options },
      audio: `note("[${voiced.map(strudelNote).join(',')}]").s("piano")`,
      answer: { kind: 'choice', index: options.indexOf(correct) },
      explanation: `Es un acorde ${correct}${inversion > 0 ? ` en ${inversion}.ª inversión` : ''}.`,
    }
  },
}
