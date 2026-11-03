import { diatonicTriads } from '../../theory/chords.ts'
import { formatNote } from '../../theory/notes.ts'
import type { Generator } from '../types.ts'
import { chordLabel, MAJOR_TONICS, MINOR_TONICS } from './_shared.ts'

interface Params {
  tonics: string[] | null
}

// One factory for both modes, so each registers its own skill (spec 01, M03-T03 and T04).
function diatonic(mode: 'major' | 'minor'): Generator<Params> {
  const id = mode === 'major' ? 'diatonic-chord' : 'diatonic-chord-minor'
  const skill = mode === 'major' ? 'diatonic-chords-major' : 'diatonic-chords-minor'
  const modeEs = mode === 'major' ? 'mayor' : 'menor'
  return {
    id,
    skill,
    parseParams(raw) {
      const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
      if (r.tonics === undefined) return { tonics: null }
      if (!Array.isArray(r.tonics) || r.tonics.length === 0) return null
      if (!r.tonics.every((t) => typeof t === 'string' && diatonicTriads(t, mode) !== null)) {
        return null
      }
      return { tonics: r.tonics as string[] }
    },
    generate(params, rng) {
      const tonic = rng.pick(params.tonics ?? [...(mode === 'major' ? MAJOR_TONICS : MINOR_TONICS)])
      const triads = diatonicTriads(tonic, mode) ?? []
      const target = rng.pick(triads)
      const others = rng.shuffle(triads.filter((t) => t.degree !== target.degree)).slice(0, 3)
      const keyName = `${formatNote(tonic, 'latin')} ${modeEs}`
      const label = (t: (typeof triads)[number]) => chordLabel(t.root, t.quality)
      const askChord = rng.next() < 0.5
      const correct = askChord ? label(target) : target.roman
      const options = rng.shuffle([correct, ...others.map((t) => (askChord ? label(t) : t.roman))])
      return {
        id: '',
        key: `${id}:${tonic}:${target.degree}:${askChord ? 'chord' : 'degree'}`,
        generator: id,
        skill,
        prompt: askChord
          ? `En ${keyName}, ¿qué acorde se forma sobre el grado ${target.roman}?`
          : `En ${keyName}, ¿qué grado es el acorde de ${label(target)}?`,
        input: { kind: 'choice', options },
        answer: { kind: 'choice', index: options.indexOf(correct) },
        explanation: `En ${keyName}, el grado ${target.roman} es ${label(target)}: ${target.notes.map((n) => formatNote(n, 'american')).join(' ')}.`,
      }
    },
  }
}

export const diatonicChord = diatonic('major')
export const diatonicChordMinor = diatonic('minor')
