// Pattern → normalized NoteEvent[] for assertions, visuals and the Sensei summary. Pure.
import { Chord, Midi, Note, Scale } from 'tonal'
import type { DojoError, NoteEvent, PatternLike } from './types.ts'

export const MAX_EVENTS = 5000
const DEFAULT_OCTAVE = 3 // Strudel reads note("c") as c3

type Fields = Record<string, unknown>
const isObject = (v: unknown): v is Fields => typeof v === 'object' && v !== null
const num = (v: unknown): number | null => {
  if (typeof v === 'number') return v
  if (isObject(v) && typeof v.valueOf === 'function') {
    const n = v.valueOf()
    return typeof n === 'number' ? n : null
  }
  return null
}

function pitchOf(value: Fields): { midi: number | null; pitchClass: string | null } {
  const { note, freq } = value
  if (typeof note === 'string') {
    const parsed = Note.get(/\d$/.test(note) ? note : `${note}${DEFAULT_OCTAVE}`)
    if (!parsed.empty && parsed.midi !== null) return { midi: parsed.midi, pitchClass: parsed.pc }
  }
  const midi =
    typeof note === 'number' ? note : typeof freq === 'number' ? Midi.freqToMidi(freq) : null
  if (midi === null || !Number.isFinite(midi)) return { midi: null, pitchClass: null }
  const rounded = Math.round(midi)
  return {
    midi: rounded,
    pitchClass: Midi.midiToNoteName(rounded, { pitchClass: true, sharps: true }),
  }
}

function toEvent(hap: unknown): NoteEvent | null {
  if (!isObject(hap) || typeof hap.hasOnset !== 'function' || !hap.hasOnset()) return null
  const whole = hap.whole
  if (!isObject(whole) || !isObject(hap.value)) return null
  const begin = num(whole.begin)
  const end = num(whole.end)
  if (begin === null || end === null) return null
  const { midi, pitchClass } = pitchOf(hap.value)
  const s = hap.value.s
  return {
    begin,
    end,
    cycle: Math.floor(begin),
    midi,
    pitchClass,
    sound: typeof s === 'string' ? s : null,
  }
}

// Sorted by onset then pitch; notes sharing an onset get `voice` by pitch (0 = lowest).
function order(events: NoteEvent[]): NoteEvent[] {
  events.sort((a, b) => a.begin - b.begin || (a.midi ?? -1) - (b.midi ?? -1))
  let groupStart = 0
  for (let i = 0; i <= events.length; i++) {
    if (i === events.length || events[i]?.begin !== events[groupStart]?.begin) {
      const group = events.slice(groupStart, i).filter((e) => e.midi !== null)
      if (group.length > 1) {
        group.forEach((e, v) => {
          e.voice = v
        })
      }
      groupStart = i
    }
  }
  return events
}

export type QueryResult = { ok: true; events: NoteEvent[] } | { ok: false; error: DojoError }

// Queries in 1/64-cycle slices so a runaway pattern (`s("hh*9999999")`) stops at the cap
// instead of freezing the tab on one giant cycle. Only onsets count, so slicing never duplicates.
// ponytail: an infinite loop in plain JS (`while(true){}`) still hangs; that needs a worker.
const SLICES = 64

export function queryEvents(pattern: PatternLike, cycles: number): QueryResult {
  const events: NoteEvent[] = []
  for (let k = 0; k < cycles * SLICES; k++) {
    for (const hap of pattern.queryArc(k / SLICES, (k + 1) / SLICES)) {
      const e = toEvent(hap)
      if (e !== null) events.push(e)
    }
    if (events.length > MAX_EVENTS) {
      return {
        ok: false,
        error: {
          message: `El patrón genera más de ${MAX_EVENTS} notas en ${cycles} ciclos: baja la velocidad (\`fast\`) o la cantidad de pasos.`,
          line: null,
          raw: `${events.length} events`,
        },
      }
    }
  }
  return { ok: true, events: order(events) }
}

// Events grouped by onset (chords and simultaneous hits), pitched notes only.
export function onsetGroups(events: NoteEvent[]): NoteEvent[][] {
  const groups = new Map<number, NoteEvent[]>()
  for (const e of events) {
    if (e.midi === null) continue
    const g = groups.get(e.begin)
    if (g) g.push(e)
    else groups.set(e.begin, [e])
  }
  return [...groups.values()]
}

export interface PatternSummary {
  key: string | null
  range: { low: string; high: string } | null
  eventsPerCycle: number[]
  chordsPerCycle: (string | null)[]
  sounds: string[]
}

const KEY_CANDIDATES = Note.names()
  .concat(['C#', 'Db', 'D#', 'Eb', 'F#', 'Gb', 'G#', 'Ab', 'A#', 'Bb'])
  .flatMap((t) => [`${t} major`, `${t} minor`])

// Best-fitting major/minor scale by share of notes inside it; ties keep the first candidate.
function estimateKey(events: NoteEvent[]): string | null {
  const chromas = events.flatMap((e) => (e.pitchClass ? [Note.chroma(e.pitchClass)] : []))
  if (chromas.length === 0) return null
  let best: string | null = null
  let bestScore = -1
  for (const name of KEY_CANDIDATES) {
    const scale = new Set(Scale.get(name).notes.map((n) => Note.chroma(n)))
    const score = chromas.filter((c) => scale.has(c)).length
    if (score > bestScore) {
      best = name
      bestScore = score
    }
  }
  return best
}

export function summarize(events: NoteEvent[], cycles: number): PatternSummary {
  const pitched = events.filter((e) => e.midi !== null)
  const midis = pitched.map((e) => e.midi ?? 0)
  const range =
    midis.length > 0
      ? {
          low: Midi.midiToNoteName(Math.min(...midis)),
          high: Midi.midiToNoteName(Math.max(...midis)),
        }
      : null
  const eventsPerCycle = Array.from(
    { length: cycles },
    (_, c) => events.filter((e) => e.cycle === c).length,
  )
  const chordsPerCycle = Array.from({ length: cycles }, (_, c) => {
    const inCycle = pitched
      .filter((e) => e.cycle === c)
      .sort((x, y) => (x.midi ?? 0) - (y.midi ?? 0))
    const pcs = [...new Set(inCycle.map((e) => e.pitchClass ?? ''))]
    return pcs.length >= 3 ? (Chord.detect(pcs)[0] ?? null) : null
  })
  const sounds = [...new Set(events.flatMap((e) => (e.sound ? [e.sound] : [])))]
  return { key: estimateKey(pitched), range, eventsPerCycle, chordsPerCycle, sounds }
}

export interface OneShotHap {
  value: Fields
  begin: number
  end: number
}

// The haps of the first cycle, ready to hand to superdough once (ear questions, key taps).
// `firstOnly` keeps just the first onset, so a chord still sounds whole.
export function firstCycle(pattern: PatternLike, firstOnly = false): OneShotHap[] {
  const haps: OneShotHap[] = []
  for (const hap of pattern.queryArc(0, 1)) {
    if (!isObject(hap) || typeof hap.hasOnset !== 'function' || !hap.hasOnset()) continue
    if (!isObject(hap.whole) || !isObject(hap.value)) continue
    const begin = num(hap.whole.begin)
    const end = num(hap.whole.end)
    if (begin !== null && end !== null) haps.push({ value: { ...hap.value }, begin, end })
  }
  haps.sort((a, b) => a.begin - b.begin)
  const first = haps[0]?.begin
  return firstOnly ? haps.filter((h) => h.begin === first) : haps
}
