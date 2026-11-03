import { Chord, Key } from 'tonal'
import { LATIN_TO_LETTER } from './es.ts'

export interface DiatonicChord {
  roman: string
  symbol: string
  notes: string[]
}

const LATIN_ROOTS = Object.keys(LATIN_TO_LETTER).sort((a, b) => b.length - a.length)
const BASE_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

// Normalizes a user chord symbol to something tonal parses: latin root → letter,
// and the maj7 glyph/order variants tonal rejects.
function normalizeChordSymbol(input: string): string {
  let s = input.trim().replaceAll('♯', '#').replaceAll('♭', 'b')
  const lower = s.toLowerCase()
  for (const root of LATIN_ROOTS) {
    if (lower.startsWith(root)) {
      s = (LATIN_TO_LETTER[root] ?? '') + s.slice(root.length)
      break
    }
  }
  // tonal takes CΔ and Cmaj7 but not CΔ7 or C7M.
  return s.replace(/Δ7/g, 'maj7').replace(/7M/g, 'maj7')
}

export function spellChord(symbol: string): string[] | null {
  const chord = Chord.get(symbol)
  return chord.empty || chord.notes.length === 0 ? null : chord.notes
}

export function parseChordInput(input: unknown): string | null {
  if (typeof input !== 'string' || input.trim() === '') return null
  const chord = Chord.get(normalizeChordSymbol(input))
  return chord.empty || chord.symbol === '' ? null : chord.symbol
}

// Candidate symbols for a set of notes, bass first, inversions as "C/E".
export function identifyChord(notes: string[]): string[] {
  if (notes.length === 0) return []
  return Chord.detect(notes)
}

export function diatonicChords(
  tonic: string,
  options: { sevenths?: boolean } = {},
): DiatonicChord[] | null {
  const key = Key.majorKey(tonic)
  if (key.tonic === '') return null
  const symbols = options.sevenths ? key.chords : key.triads
  return symbols.map((symbol, i) => {
    const chord = Chord.get(symbol)
    return { roman: romanFor(BASE_ROMAN[i] ?? '', chord.quality), symbol, notes: chord.notes }
  })
}

function romanFor(base: string, quality: string): string {
  switch (quality) {
    case 'Minor':
      return base.toLowerCase()
    case 'Diminished':
      return `${base.toLowerCase()}°`
    case 'Augmented':
      return `${base}+`
    default:
      return base
  }
}

export type TriadQuality = 'major' | 'minor' | 'diminished' | 'augmented'
export const TRIAD_QUALITIES: readonly TriadQuality[] = [
  'major',
  'minor',
  'diminished',
  'augmented',
]

const TONAL_SUFFIX: Record<TriadQuality, string> = {
  major: '',
  minor: 'm',
  diminished: 'dim',
  augmented: 'aug',
}
// How the app writes chords: C, Cm, C°, C+.
const SHOWN_SUFFIX: Record<TriadQuality, string> = {
  major: '',
  minor: 'm',
  diminished: '°',
  augmented: '+',
}

export const isTriadQuality = (v: unknown): v is TriadQuality =>
  typeof v === 'string' && (TRIAD_QUALITIES as readonly string[]).includes(v)

export function spellTriad(root: string, quality: TriadQuality): string[] | null {
  return spellChord(`${root}${TONAL_SUFFIX[quality]}`)
}

export function triadSymbol(root: string, quality: TriadQuality): string {
  return `${root}${SHOWN_SUFFIX[quality]}`
}

const QUALITY_OF: Record<string, TriadQuality> = {
  Major: 'major',
  Minor: 'minor',
  Diminished: 'diminished',
  Augmented: 'augmented',
}

export interface DiatonicTriad {
  degree: number // 1–7
  roman: string // I ii iii IV V vi vii° / i ii° III iv v VI VII
  root: string
  quality: TriadQuality
  notes: string[]
}

// The seven triads of a major key or of the natural minor (spec 01, M03).
export function diatonicTriads(tonic: string, mode: 'major' | 'minor'): DiatonicTriad[] | null {
  const symbols = mode === 'major' ? Key.majorKey(tonic).triads : Key.minorKey(tonic).natural.triads
  if (symbols.length !== 7) return null
  return symbols.map((symbol, i) => {
    const chord = Chord.get(symbol)
    const quality = QUALITY_OF[chord.quality] ?? 'major'
    return {
      degree: i + 1,
      roman: romanFor(BASE_ROMAN[i] ?? '', chord.quality),
      root: chord.tonic ?? '',
      quality,
      notes: chord.notes,
    }
  })
}
