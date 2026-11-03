// M09 · Escalas avanzadas: minor variants, pentatonics and blues, symmetric scales, chord-scale.
import { Note } from 'tonal'
import { diatonicChords } from '../../theory/chords.ts'
import { SCALE_TYPE_ES } from '../../theory/es.ts'
import { formatNote } from '../../theory/notes.ts'
import type { Generator } from '../types.ts'
import { choiceQuestion, keyName, MINOR_TONICS, prettySymbol } from './_shared.ts'
import { erase, type Registered } from './erase.ts'
import { scaleSpellingFor } from './scale-spelling.ts'

// Tonic pools keep tonal's strict spelling free of double accidentals and B♯/E♯/C♭/F♭.
export const minorVariant = scaleSpellingFor('minor-variant', 'minor-variants', {
  scales: ['harmonic minor', 'melodic minor'],
  tonics: ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb'],
})

export const pentatonicSpelling = scaleSpellingFor('pentatonic-spelling', 'pentatonic-blues', {
  scales: ['major pentatonic', 'minor pentatonic', 'blues'],
  tonics: ['C', 'G', 'D', 'A', 'E', 'B'],
})

export const symmetricScale = scaleSpellingFor('symmetric-scale', 'symmetric-scales', {
  scales: ['diminished', 'half-whole diminished'],
  tonics: ['C', 'G', 'D', 'A', 'E'],
})

const MODES = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
] as const

const scaleLabel = (root: string, type: string) =>
  `${formatNote(root, 'latin')} ${SCALE_TYPE_ES[type] ?? type}`

interface ChordScaleParams {
  tonics: string[]
  extended: boolean
}

// Non-diatonic chords, each with the one scale that holds all its notes and tensions.
const SPECIALS = [
  { id: 'v7-minor', scale: 'phrygian dominant' },
  { id: '7alt', scale: 'altered' },
  { id: '7#11', scale: 'lydian dominant' },
  { id: 'mmaj7', scale: 'melodic minor' },
] as const
const DOMINANT_SCALES = ['mixolydian', 'altered', 'lydian dominant', 'phrygian dominant']

export const chordScale: Generator<ChordScaleParams> = {
  id: 'chord-scale',
  skill: 'chord-scale',
  parseParams(raw) {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const tonics = r.tonics ?? ['C', 'G', 'D', 'A', 'F', 'Bb', 'Eb']
    if (!Array.isArray(tonics) || tonics.length === 0) return null
    if (!tonics.every((t) => typeof t === 'string' && diatonicChords(t) !== null)) return null
    return { tonics: tonics as string[], extended: r.extended === true }
  },
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const base = { generator: 'chord-scale', skill: 'chord-scale' }

    if (!params.extended || rng.next() < 0.5) {
      const chords = diatonicChords(tonic, { sevenths: true }) ?? []
      const degree = rng.int(0, chords.length - 1)
      const chord = chords[degree]
      const mode = MODES[degree] ?? 'ionian'
      if (!chord) throw new Error('missing diatonic chord')
      const root = chord.notes[0] ?? tonic
      const symbol = prettySymbol(chord.symbol)
      return choiceQuestion(
        rng,
        {
          ...base,
          key: `chord-scale:${tonic}:${degree}`,
          prompt: `En ${keyName(tonic)} suena ${symbol} (${chord.roman}). Con las notas de la tonalidad, ¿qué escala va sobre ese acorde?`,
          explanation: `${symbol} es el grado ${degree + 1} de ${keyName(tonic)}: las notas de la tonalidad desde ${formatNote(root, 'latin')} forman ${scaleLabel(root, mode)}.`,
        },
        scaleLabel(root, mode),
        rng.shuffle(MODES.filter((m) => m !== mode)).map((m) => scaleLabel(root, m)),
      )
    }

    const special = rng.pick([...SPECIALS])
    const american = (n: string) => formatNote(n, 'american')
    let root = tonic
    let prompt: string
    let why: string
    let distractors: string[]
    switch (special.id) {
      case 'v7-minor': {
        const minor = rng.pick([...MINOR_TONICS].slice(0, 7))
        root = Note.pitchClass(Note.transpose(minor, '5P'))
        prompt = `En ${keyName(minor, 'minor')} suena ${american(root)}7, el V7 que resuelve a ${american(minor)}m. Con las notas de ${formatNote(minor, 'latin')} menor armónica, ¿qué escala va sobre ${american(root)}7?`
        why = `es ${formatNote(minor, 'latin')} menor armónica desde su quinto grado; su ♭9 y su ♭13 resuelven en ${american(minor)}m.`
        distractors = ['mixolydian', 'lydian dominant', 'ionian']
        break
      }
      case '7alt':
        prompt = `Suena ${american(root)}7alt: un dominante con ♭9, ♯9, ♯11 y ♭13. ¿Qué escala lo cubre?`
        why = 'es la única escala con todas las tensiones alteradas (♭9, ♯9, ♯11 y ♭13).'
        distractors = DOMINANT_SCALES.filter((s) => s !== 'altered')
        break
      case '7#11':
        prompt = `Suena ${american(root)}7(♯11): un dominante con 9 y 13 naturales y la ♯11. ¿Qué escala lo cubre?`
        why = 'es la mixolidia con la cuarta subida, con 9 y 13 naturales y ♯11.'
        distractors = DOMINANT_SCALES.filter((s) => s !== 'lydian dominant')
        break
      case 'mmaj7':
        prompt = `Suena ${american(root)}m(maj7): tercera menor y séptima mayor. ¿Qué escala lo cubre?`
        why = 'tiene la tercera menor, la sexta mayor y la séptima mayor del acorde.'
        distractors = ['dorian', 'aeolian', 'phrygian']
        break
    }
    const correct = scaleLabel(root, special.scale)
    return choiceQuestion(
      rng,
      {
        ...base,
        key: `chord-scale:${special.id}:${root}`,
        prompt,
        explanation: `${correct}: ${why}`,
      },
      correct,
      distractors.map((s) => scaleLabel(root, s)),
    )
  },
}

export const m09: Registered[] = [
  erase(minorVariant),
  erase(pentatonicSpelling),
  erase(symmetricScale),
  erase(chordScale),
]
