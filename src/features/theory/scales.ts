import { Key, Scale } from 'tonal'

export interface KeySignature {
  accidentals: string[]
  count: number
  type: 'sharp' | 'flat'
}

// Order in which sharps and flats appear in a key signature.
const SHARP_ORDER = ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#']
const FLAT_ORDER = ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb']

// The characteristic degree (1-based) that colors each diatonic mode.
const CHARACTERISTIC_DEGREE: Record<string, number> = {
  dorian: 6,
  phrygian: 2,
  lydian: 4,
  mixolydian: 7,
  aeolian: 6,
  locrian: 5,
}

export function spellScale(tonic: string, type: string): string[] | null {
  const scale = Scale.get(`${tonic} ${type}`)
  return scale.empty || scale.notes.length === 0 ? null : scale.notes
}

// Rotates a scale so it starts on its `degree`-th note (1-based) — the relative mode.
export function modeOf(scaleName: string, degree: number): string[] | null {
  const scale = Scale.get(scaleName)
  if (scale.empty || scale.notes.length === 0) return null
  if (!Number.isInteger(degree) || degree < 1 || degree > scale.notes.length) return null
  const start = degree - 1
  return [...scale.notes.slice(start), ...scale.notes.slice(0, start)]
}

export function characteristicNote(mode: string, tonic: string): string | null {
  const degree = CHARACTERISTIC_DEGREE[mode]
  if (degree === undefined) return null
  const scale = Scale.get(`${tonic} ${mode}`)
  if (scale.empty) return null
  return scale.notes[degree - 1] ?? null
}

export function keySignature(
  tonic: string,
  mode: 'major' | 'minor' = 'major',
): KeySignature | null {
  const key = mode === 'minor' ? Key.minorKey(tonic) : Key.majorKey(tonic)
  if (key.tonic === '') return null
  const alteration = key.alteration
  const type: 'sharp' | 'flat' = alteration >= 0 ? 'sharp' : 'flat'
  const count = Math.abs(alteration)
  const order = type === 'sharp' ? SHARP_ORDER : FLAT_ORDER
  return { accidentals: order.slice(0, count), count, type }
}

export function relativeMinor(majorTonic: string): string | null {
  const key = Key.majorKey(majorTonic)
  return key.tonic === '' ? null : key.minorRelative
}

export function relativeMajor(minorTonic: string): string | null {
  const key = Key.minorKey(minorTonic)
  return key.tonic === '' ? null : key.relativeMajor
}
