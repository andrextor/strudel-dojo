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

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
const ACCIDENTALS = ['', '#', 'b', '##', 'bb'] as const

// Pitch-class spellings of a key, natural first. `rare` adds the ones a spelling exercise
// may need on any key (E♯, C♭, doubles); without it a white key has one name and a black
// key two (C♯ / D♭).
export function spellingsFor(midi: number, rare = false): string[] {
  const chroma = ((midi % 12) + 12) % 12
  const all = ACCIDENTALS.flatMap((acc) =>
    LETTERS.map((l) => `${l}${acc}`).filter((pc) => Note.chroma(pc) === chroma),
  )
  if (rare) return all
  const natural = all.find((pc) => pc.length === 1)
  return natural ? [natural] : all.filter((pc) => pc.length === 2)
}

const DEGREES = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7']

// Chromatic degree of a key relative to a tonic, for the "grado" key labels.
export function degreeLabel(midi: number, tonic: string): string {
  const t = Note.chroma(tonic)
  if (t === undefined) return ''
  return DEGREES[(((midi - t) % 12) + 12) % 12] ?? ''
}

// True when some note is spelled in a way a key would not suggest by itself (E♯, C♭, doubles):
// a spelling exercise that can ask for one must let every key choose its name.
export function needsRareSpelling(notes: Iterable<string>): boolean {
  for (const n of notes) {
    const chroma = Note.chroma(n)
    if (chroma !== undefined && !spellingsFor(chroma).includes(Note.get(n).pc)) return true
  }
  return false
}
