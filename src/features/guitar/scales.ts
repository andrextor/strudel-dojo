// Major-scale fingerings on the neck (exercise 2), built from tonal and fretToNote. Pure.
import { Note, Scale } from 'tonal'
import { fretToNote, STANDARD_TUNING } from '../theory/instruments.ts'

export interface ScaleNote {
  string: number // index, 0 = low E (as Fretboard uses)
  fret: number
  midi: number
  pc: string
  tonic: boolean
}

export type System = '3nps' | 'caged'
export const POSITIONS: Record<System, number> = { '3nps': 7, caged: 5 }

const openMidi = (s: number) => Note.midi(STANDARD_TUNING[s] ?? 'E2') ?? 40

function lowStringFrets(scale: string[]): { fret: number; degree: number }[] {
  const out: { fret: number; degree: number }[] = []
  for (let fret = 0; fret < 12; fret++) {
    const name = fretToNote(0, fret)
    const degree = scale.findIndex((pc) => Note.chroma(pc) === Note.chroma(name ?? ''))
    if (degree !== -1) out.push({ fret, degree })
  }
  return out
}

const named = (scale: string[], s: number, fret: number, tonic: string): ScaleNote => {
  const midi = openMidi(s) + fret
  const pc = scale.find((p) => Note.chroma(p) === midi % 12) ?? ''
  return { string: s, fret, midi, pc, tonic: Note.chroma(pc) === Note.chroma(tonic) }
}

// Three notes per string: position k starts on scale degree k (1 = the tonic) where it first
// appears on the low E string (fret 0–11), then climbs the scale, three notes per string.
function threeNotesPerString(tonic: string, scale: string[], position: number): ScaleNote[] {
  const start = lowStringFrets(scale).find((f) => f.degree === position)
  if (!start) return []
  const pitches: number[] = [openMidi(0) + start.fret]
  for (let i = 1; pitches.length < STANDARD_TUNING.length * 3; i++) {
    const chroma = Note.chroma(scale[(start.degree + i) % scale.length] ?? '') ?? 0
    let midi = (pitches.at(-1) ?? 0) + 1
    while (midi % 12 !== chroma) midi++
    pitches.push(midi)
  }
  return pitches.map((midi, i) => {
    const s = Math.floor(i / 3)
    return named(scale, s, midi - openMidi(s), tonic)
  })
}

// CAGED: five 5-fret boxes, each starting on the low E string at degrees 7, 2, 3, 5 and 6 of the
// scale; every scale note inside the box, lowest string first, each pitch once.
const CAGED_DEGREES = [6, 1, 2, 4, 5] // zero-based: 7th, 2nd, 3rd, 5th, 6th

function caged(tonic: string, scale: string[], position: number): ScaleNote[] {
  const degree = CAGED_DEGREES[position] ?? 0
  const lowest = lowStringFrets(scale).find((f) => f.degree === degree)
  if (!lowest) return []
  const from = lowest.fret
  const seen = new Set<number>()
  const out: ScaleNote[] = []
  for (let s = 0; s < STANDARD_TUNING.length; s++) {
    for (let fret = from; fret <= from + 4; fret++) {
      const midi = openMidi(s) + fret
      if (seen.has(midi) || !scale.some((p) => Note.chroma(p) === midi % 12)) continue
      seen.add(midi)
      out.push(named(scale, s, fret, tonic))
    }
  }
  return out.sort((a, b) => a.midi - b.midi)
}

export function majorPosition(tonic: string, system: System, position: number): ScaleNote[] {
  const scale = Scale.get(`${tonic} major`).notes
  if (scale.length !== 7) return []
  return system === '3nps'
    ? threeNotesPerString(tonic, scale, position)
    : caged(tonic, scale, position)
}

export type Walk = 'up' | 'down' | 'up-down' | 'thirds' | 'groups-3' | 'groups-4'

// Practice patterns over a position, each a pure reordering of its notes (low to high).
export function walk<T>(notes: readonly T[], kind: Walk): T[] {
  const up = [...notes]
  const down = [...notes].reverse()
  const groups = (size: number) => {
    const out: T[] = []
    for (let i = 0; i + size <= up.length; i++) out.push(...up.slice(i, i + size))
    return out
  }
  switch (kind) {
    case 'up':
      return up
    case 'down':
      return down
    case 'up-down':
      return [...up, ...down.slice(1)]
    case 'thirds': {
      const out: T[] = []
      for (let i = 0; i + 2 < up.length; i++) out.push(up[i] as T, up[i + 2] as T)
      return out
    }
    case 'groups-3':
      return groups(3)
    case 'groups-4':
      return groups(4)
  }
}
