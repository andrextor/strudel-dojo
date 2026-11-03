import { Note } from 'tonal'
import type { Rng } from '../../../lib/random.ts'
import { isTriadQuality, type TriadQuality, triadSymbol } from '../../theory/chords.ts'
import { CHORD_TYPE_ES } from '../../theory/es.ts'
import { formatNote } from '../../theory/notes.ts'

// Pitch-class pools by accidental policy. Naturals first so "none" is a subset.
export const NATURALS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
const SHARPS = ['C#', 'D#', 'F#', 'G#', 'A#'] as const
const FLATS = ['Db', 'Eb', 'Gb', 'Ab', 'Bb'] as const

export type Accidentals = 'none' | 'sharps' | 'flats' | 'all'

export function notePool(accidentals: Accidentals): string[] {
  switch (accidentals) {
    case 'none':
      return [...NATURALS]
    case 'sharps':
      return [...NATURALS, ...SHARPS]
    case 'flats':
      return [...NATURALS, ...FLATS]
    case 'all':
      return [...NATURALS, ...SHARPS, ...FLATS]
  }
}

export function isAccidentals(v: unknown): v is Accidentals {
  return v === 'none' || v === 'sharps' || v === 'flats' || v === 'all'
}

// A Strudel-ready note token: lowercase ASCII pitch with octave, e.g. "c#4".
export function strudelNote(pitchWithOctave: string): string {
  return Note.simplify(pitchWithOctave).toLowerCase()
}

export function randomPitch(rng: Rng, pool: string[], minOct: number, maxOct: number): string {
  return `${rng.pick(pool)}${rng.int(minOct, maxOct)}`
}

// Common simple intervals, ascending by size, in tonal notation.
export const INTERVAL_CATALOG = [
  '1P',
  '2m',
  '2M',
  '3m',
  '3M',
  '4P',
  '4A',
  '5d',
  '5P',
  '5A',
  '6m',
  '6M',
  '7m',
  '7M',
  '8P',
] as const

// Major/minor tonics ordered by number of accidentals, within the useful range.
export const MAJOR_TONICS = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Db',
  'Gb',
] as const
export const MINOR_TONICS = [
  'A',
  'E',
  'B',
  'F#',
  'C#',
  'G#',
  'D#',
  'D',
  'G',
  'C',
  'F',
  'Bb',
  'Eb',
] as const

// Pitch classes stacked upwards from `octave`: each note lands above the previous one.
export function voiceUp(pcs: readonly string[], octave: number): string[] {
  let previous = Number.NEGATIVE_INFINITY
  return pcs.map((pc) => {
    let o = octave
    while ((Note.midi(`${pc}${o}`) ?? 0) <= previous) o++
    previous = Note.midi(`${pc}${o}`) ?? previous
    return `${pc}${o}`
  })
}

const INVERSION_ES = ['', ', 1.ª inversión', ', 2.ª inversión']

// "Re menor (Dm)", "Do mayor, 1.ª inversión (C/E)": the chord as the app names it.
export function chordLabel(
  root: string,
  quality: TriadQuality,
  inversion = 0,
  bass = root,
): string {
  const symbol = `${formatNote(root, 'american')}${triadSymbol('', quality)}`
  const slash = inversion === 0 ? '' : `/${formatNote(bass, 'american')}`
  return `${formatNote(root, 'latin')} ${CHORD_TYPE_ES[quality] ?? quality}${INVERSION_ES[inversion] ?? ''} (${symbol}${slash})`
}

export function parseQualities(raw: unknown): TriadQuality[] | null {
  const list = raw ?? ['major', 'minor']
  if (!Array.isArray(list) || list.length === 0 || !list.every(isTriadQuality)) return null
  return list
}
