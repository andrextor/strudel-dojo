import { Interval, Note } from 'tonal'

export interface FretPosition {
  string: number // 0 = lowest string
  fret: number
}

export interface KeyInfo {
  midi: number
  name: string
  pitchClass: string
  isBlack: boolean
}

// Standard guitar tuning, lowest string first.
export const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] as const

const BLACK_CHROMAS = new Set([1, 3, 6, 8, 10])

export function fretToNote(
  stringIndex: number,
  fret: number,
  tuning: readonly string[] = STANDARD_TUNING,
): string | null {
  const open = tuning[stringIndex]
  if (open === undefined || !Number.isInteger(fret) || fret < 0) return null
  const note = Note.transpose(open, Interval.fromSemitones(fret))
  return note === '' ? null : note
}

export function noteToFrets(
  pitchClass: string,
  tuning: readonly string[] = STANDARD_TUNING,
  maxFret = 15,
): FretPosition[] {
  const targetChroma = Note.chroma(pitchClass)
  if (targetChroma === undefined) return []
  const positions: FretPosition[] = []
  for (let string = 0; string < tuning.length; string++) {
    for (let fret = 0; fret <= maxFret; fret++) {
      const note = fretToNote(string, fret, tuning)
      if (note !== null && Note.chroma(note) === targetChroma) {
        positions.push({ string, fret })
      }
    }
  }
  return positions
}

export function keyboardRange(lowMidi: number, highMidi: number): KeyInfo[] {
  if (lowMidi > highMidi) return []
  const keys: KeyInfo[] = []
  for (let midi = lowMidi; midi <= highMidi; midi++) {
    const name = Note.fromMidi(midi)
    const note = Note.get(name)
    keys.push({
      midi,
      name,
      pitchClass: note.pc,
      isBlack: note.chroma !== null && BLACK_CHROMAS.has(note.chroma),
    })
  }
  return keys
}
