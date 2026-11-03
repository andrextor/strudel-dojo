// Exercise 1 (one note on every string) and the round state machine both exercises share. Pure.
import { Interval, Note, Scale } from 'tonal'
import type { Rng } from '../../lib/random.ts'
import { spellTriad, type TriadQuality } from '../theory/chords.ts'
import { fretToNote, noteToFrets, STANDARD_TUNING } from '../theory/instruments.ts'

export type NotePool = 'naturals' | 'sharps' | 'flats' | 'all'
const NATURALS = Scale.get('C major').notes
const isNatural = (pc: string) => NATURALS.some((n) => Note.chroma(n) === Note.chroma(pc))
const SHARPS = NATURALS.map((n) => Note.transpose(n, '1A')).filter((pc) => !isNatural(pc))
const FLATS = SHARPS.map((pc) => Note.enharmonic(pc))

export const POOLS: Record<NotePool, string[]> = {
  naturals: NATURALS,
  sharps: [...NATURALS, ...SHARPS],
  flats: [...NATURALS, ...FLATS],
  all: [...NATURALS, ...SHARPS, ...FLATS],
}

// Pitch classes for a round, never the same sound twice (C♯ and D♭ count as one).
export function buildNoteRound(rng: Rng, { pool, count }: { pool: NotePool; count: number }) {
  const picked: string[] = []
  for (const pc of rng.shuffle(POOLS[pool])) {
    if (picked.length >= count) break
    if (!picked.some((p) => Note.chroma(p) === Note.chroma(pc))) picked.push(pc)
  }
  return picked
}

export type FretZone = '0-5' | '5-9' | '7-12' | '0-12'
export const zoneRange = (zone: FretZone): [number, number] => {
  const [lo, hi] = zone.split('-').map(Number)
  return [lo ?? 0, hi ?? 12]
}

// Strings are numbered as guitarists do: 6 = low E, 1 = high E.
const indexOf = (stringNumber: number) => STANDARD_TUNING.length - stringNumber

// Frets where note `pc` sits on that string inside the zone.
function fretsOn(pc: string, stringNumber: number, zone: FretZone): number[] {
  const [lo, hi] = zoneRange(zone)
  const string = indexOf(stringNumber)
  return noteToFrets(pc, STANDARD_TUNING, hi)
    .filter((p) => p.string === string && p.fret >= lo)
    .map((p) => p.fret)
}

// Every exact pitch (MIDI) that note `pc` has on that string inside the fret zone.
export function expectedPitches(pc: string, stringNumber: number, zone: FretZone): number[] {
  const open = Note.midi(STANDARD_TUNING[indexOf(stringNumber)] ?? '') ?? 0
  return fretsOn(pc, stringNumber, zone).map((fret) => open + fret)
}

// Where note `pc` is on that string in the zone, as fretboard places ("string:fret").
export function positionsOf(pc: string, stringNumber: number, zone: FretZone): string[] {
  return fretsOn(pc, stringNumber, zone).map((fret) => `${indexOf(stringNumber)}:${fret}`)
}

export type Direction = 'up' | 'down' | 'both'

// The strings to play, e.g. from 5 to 1 going up in pitch: 5 4 3 2 1; `both` comes back down.
export function stringSequence(low: number, high: number, direction: Direction): number[] {
  const up: number[] = []
  for (let s = low; s >= high; s--) up.push(s)
  if (direction === 'up') return up
  if (direction === 'down') return [...up].reverse()
  return [...up, ...[...up].reverse().slice(1)]
}

// A round is segments of steps, each after a count-in (exercise 1: one segment per note, one
// step per string; exercise 2: one segment, one step per scale note).
export interface RoundPlan {
  segments: number[]
  countIn: number
}

export type Phase =
  | { kind: 'count-in'; segment: number; beat: number }
  | { kind: 'play'; segment: number; step: number }
  | { kind: 'error'; segment: number; step: number }
  | { kind: 'done' }

export interface RoundState {
  phase: Phase
  attempts: number // rounds started, the clean one included
}

export const startRound = (plan: RoundPlan): RoundState => ({
  phase:
    plan.countIn > 0
      ? { kind: 'count-in', segment: 0, beat: 0 }
      : { kind: 'play', segment: 0, step: 0 },
  attempts: 1,
})

// One input per beat: `tick` while counting in or after an error, `ok` / `miss` for a played
// step. Any miss sends the round back to the first segment (spec 08).
export function advance(
  state: RoundState,
  plan: RoundPlan,
  input: 'tick' | 'ok' | 'miss',
): RoundState {
  const { phase } = state
  const playOrCount = (segment: number): Phase =>
    plan.countIn > 0 ? { kind: 'count-in', segment, beat: 0 } : { kind: 'play', segment, step: 0 }

  if (phase.kind === 'done') return state
  if (phase.kind === 'error') {
    return input === 'tick' ? { phase: playOrCount(0), attempts: state.attempts + 1 } : state
  }
  if (phase.kind === 'count-in') {
    if (input !== 'tick') return state
    return phase.beat + 1 >= plan.countIn
      ? { ...state, phase: { kind: 'play', segment: phase.segment, step: 0 } }
      : { ...state, phase: { ...phase, beat: phase.beat + 1 } }
  }
  if (input === 'tick') return state
  if (input === 'miss')
    return { ...state, phase: { kind: 'error', segment: phase.segment, step: phase.step } }
  const steps = plan.segments[phase.segment] ?? 0
  if (phase.step + 1 < steps) return { ...state, phase: { ...phase, step: phase.step + 1 } }
  if (phase.segment + 1 < plan.segments.length)
    return { ...state, phase: playOrCount(phase.segment + 1) }
  return { ...state, phase: { kind: 'done' } }
}

// ---- Exercises as segments of steps ------------------------------------------------------------

// What one beat expects. `accepts` gets the played MIDI note and the previous accepted one.
export interface Step {
  label: string
  accepts: (midi: number, previous: number | null) => boolean
  show: string[] // fretboard places ("string:fret") revealed on a miss or as help
}

export interface Segment {
  title: string // shown big while the segment plays: a note, a chord, an interval
  steps: Step[]
}

const exactly = (midis: number[]) => (midi: number) => midis.includes(midi)

// Exercise 1: each note of the round on every string of the sequence.
export function noteSegments(notes: string[], strings: number[], zone: FretZone): Segment[] {
  return notes.map((pc) => ({
    title: pc,
    steps: strings.map((s) => ({
      label: `Cuerda ${s}`,
      accepts: exactly(expectedPitches(pc, s, zone)),
      show: positionsOf(pc, s, zone),
    })),
  }))
}

// Exercise 2: a fingering walked note by note; the fingering fixes every exact pitch.
export function scaleSegment(
  title: string,
  notes: readonly { string: number; fret: number; midi: number }[],
): Segment {
  return {
    title,
    steps: notes.map((n) => ({
      label: `Cuerda ${STANDARD_TUNING.length - n.string}, traste ${n.fret}`,
      accepts: exactly([n.midi]),
      show: [`${n.string}:${n.fret}`],
    })),
  }
}

export const INTERVALS = ['2m', '2M', '3m', '3M', '4P', '4A', '5P', '6m', '6M', '7m', '7M', '8P']

// Extra: from a given note on a low string, play it and then the interval above it.
export function intervalSegments(
  rng: Rng,
  { count, intervals, zone }: { count: number; intervals: string[]; zone: FretZone },
): Segment[] {
  const [lo, hi] = zoneRange(zone)
  return Array.from({ length: count }, () => {
    const s = rng.pick([6, 5, 4])
    const fret = rng.int(lo, Math.min(hi, 9))
    const root = fretToNote(indexOf(s), fret) ?? 'E2'
    const name = rng.pick(intervals)
    const target = Note.transpose(root, name)
    const rootMidi = Note.midi(root) ?? 0
    const targetMidi = Note.midi(target) ?? 0
    return {
      title: `${root}|${name}|${target}`,
      steps: [
        {
          label: `${root}: cuerda ${s}, traste ${fret}`,
          accepts: exactly([rootMidi]),
          show: [`${indexOf(s)}:${fret}`],
        },
        {
          label: `Una ${name} arriba`,
          accepts: exactly([targetMidi]),
          show: placesOf(targetMidi, lo, hi + 3),
        },
      ],
    }
  })
}

// Every place on the neck (frets lo…hi) where an exact pitch sounds.
export function placesOf(midi: number, lo: number, hi: number): string[] {
  const out: string[] = []
  for (let i = 0; i < STANDARD_TUNING.length; i++) {
    const fret = midi - (Note.midi(STANDARD_TUNING[i] ?? '') ?? 0)
    if (fret >= lo && fret <= hi) out.push(`${i}:${fret}`)
  }
  return out
}

// Extra: a triad as an ascending arpeggio (root, third, fifth, root), any string, any octave,
// as long as each note is higher than the one before.
export function arpeggioSegments(
  rng: Rng,
  { count, qualities }: { count: number; qualities: TriadQuality[] },
): Segment[] {
  return Array.from({ length: count }, () => {
    const quality = rng.pick(qualities)
    // Roots whose triad needs no double sharp or flat.
    const root = rng.pick(
      POOLS.all.filter((r) =>
        (spellTriad(r, quality) ?? []).every((n) => Math.abs(Note.get(n).alt) <= 1),
      ),
    )
    const triad = spellTriad(root, quality) ?? [root]
    const order = [...triad, root]
    const names = ['Fundamental', 'Tercera', 'Quinta', 'Fundamental (octava)']
    return {
      title: `${root}|${quality}`,
      steps: order.map((pc, i) => ({
        label: names[i] ?? '',
        accepts: (midi: number, previous: number | null) =>
          midi % 12 === Note.chroma(pc) && (previous === null || midi > previous),
        show: [],
      })),
    }
  })
}

export const semitonesOf = (interval: string) => Interval.semitones(interval) ?? 0
