import { Note } from 'tonal'
import type { Rng } from '../../../lib/random.ts'

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
