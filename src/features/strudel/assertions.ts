// Kata/boss assertions over queried events (docs/specs/04). Each message says what is missing.
import { Chord, Interval, Note, Scale } from 'tonal'
import type { Assertion } from '../curriculum/schema.ts'
import { formatNote } from '../theory/notes.ts'
import { evaluatePattern } from './evaluate.ts'
import { onsetGroups, queryEvents } from './query.ts'
import type { AssertionResult, DojoError, NoteEvent } from './types.ts'

type Of<T extends Assertion['type']> = Extract<Assertion, { type: T }>

const pretty = (pc: string) => formatNote(pc, 'american')
const list = (items: string[]) => items.map((s) => `\`${s}\``).join(', ')
const notes = (pcs: string[]) => pcs.map(pretty).join(' ')
const pct = (r: number) => `${Math.round(r * 100)} %`
const chroma = (pc: string) => Note.chroma(pc)
const ok = (message: string): AssertionResult => ({ pass: true, message })
const fail = (message: string): AssertionResult => ({ pass: false, message })

// Code with comments and string contents removed, so `note` inside "..." or // note is ignored.
export function stripCode(source: string): string {
  let out = ''
  let i = 0
  while (i < source.length) {
    const c = source[i] ?? ''
    const next = source[i + 1]
    if (c === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i++
    } else if (c === '/' && next === '*') {
      i = source.indexOf('*/', i + 2)
      i = i === -1 ? source.length : i + 2
    } else if (c === '"' || c === "'" || c === '`') {
      i++
      while (i < source.length && source[i] !== c) i += source[i] === '\\' ? 2 : 1
      i++
      out += '""'
    } else {
      out += c
      i++
    }
  }
  return out
}

const calls = (source: string, name: string) =>
  new RegExp(`(^|[^\\w$])${name}\\s*\\(`).test(stripCode(source))

function usesFunction(_: NoteEvent[], source: string, a: Of<'usesFunction'>): AssertionResult {
  const missing = a.names.filter((n) => !calls(source, n))
  return missing.length === 0 ? ok(`Usas ${list(a.names)}.`) : fail(`Falta usar ${list(missing)}.`)
}

function avoidsFunction(_: NoteEvent[], source: string, a: Of<'avoidsFunction'>): AssertionResult {
  const used = a.names.filter((n) => calls(source, n))
  return used.length === 0
    ? ok(`No usas ${list(a.names)}.`)
    : fail(`En esta kata no se usa ${list(used)}: resuélvela de otra forma.`)
}

function soundsInclude(events: NoteEvent[], _: string, a: Of<'soundsInclude'>): AssertionResult {
  const heard = new Set(events.map((e) => e.sound))
  const missing = a.names.filter((n) => !heard.has(n))
  return missing.length === 0
    ? ok(`Suenan ${list(a.names)}.`)
    : fail(`Falta que suene ${list(missing)}.`)
}

function eventsPerCycle(
  events: NoteEvent[],
  _: string,
  a: Of<'eventsPerCycle'>,
  cycles: number,
): AssertionResult {
  const matching = a.filter
    ? events.filter((e) => e.sound === a.filter || e.pitchClass === a.filter)
    : events
  const what = a.filter ? `eventos de \`${a.filter}\`` : 'eventos'
  const range =
    a.min !== undefined && a.max !== undefined
      ? a.min === a.max
        ? `${a.min}`
        : `entre ${a.min} y ${a.max}`
      : a.min !== undefined
        ? `al menos ${a.min}`
        : `como mucho ${a.max}`
  for (let c = 0; c < cycles; c++) {
    const n = matching.filter((e) => e.cycle === c).length
    if ((a.min !== undefined && n < a.min) || (a.max !== undefined && n > a.max)) {
      return fail(`El ciclo ${c + 1} tiene ${n} ${what}; se piden ${range} por ciclo.`)
    }
  }
  return ok(`Cada ciclo tiene ${range} ${what}.`)
}

const scaleName = (s: string) => s.replace(':', ' ')

function notesWithinScale(
  events: NoteEvent[],
  _: string,
  a: Of<'notesWithinScale'>,
): AssertionResult {
  const name = scaleName(a.scale)
  const scale = Scale.get(name)
  const inside = new Set(scale.notes.map(chroma))
  const pitched = events.filter((e) => e.pitchClass !== null)
  if (pitched.length === 0) return fail(`No suena ninguna nota; se piden notas de ${name}.`)
  const outside = pitched.filter((e) => !inside.has(chroma(e.pitchClass ?? '')))
  const ratio = 1 - outside.length / pitched.length
  const min = a.minRatio ?? 1
  if (ratio >= min) return ok(`Tus notas están en ${name}.`)
  const wrong = [...new Set(outside.map((e) => e.pitchClass ?? ''))]
  return fail(
    `${pct(ratio)} de tus notas están en ${name} (se pide ${pct(min)}). Fuera de la escala: ${notes(wrong)}.`,
  )
}

function pitchClassesInclude(
  events: NoteEvent[],
  _: string,
  a: Of<'pitchClassesInclude'>,
): AssertionResult {
  const heard = new Set(events.map((e) => (e.pitchClass ? chroma(e.pitchClass) : null)))
  const missing = a.pitchClasses.filter((pc) => !heard.has(chroma(pc)))
  return missing.length === 0
    ? ok(`Suenan ${notes(a.pitchClasses)}.`)
    : fail(`Falta que suene ${notes(missing)}.`)
}

function voiceLine(events: NoteEvent[], voice: 'all' | 'lowest' | 'highest'): NoteEvent[] {
  if (voice === 'all') return events.filter((e) => e.midi !== null)
  return onsetGroups(events).map((g) => (voice === 'lowest' ? g[0] : g[g.length - 1]) as NoteEvent)
}

// Without `cycle`, the sequence is checked on the first cycle (patterns repeat).
function noteSequence(events: NoteEvent[], _: string, a: Of<'noteSequence'>): AssertionResult {
  const cycle = a.cycle ?? 0
  const line = voiceLine(
    events.filter((e) => e.cycle === cycle),
    a.voice,
  ).map((e) => e.pitchClass ?? '')
  const same =
    line.length === a.pitchClasses.length &&
    line.every((pc, i) => chroma(pc) === chroma(a.pitchClasses[i] ?? ''))
  const where =
    a.voice === 'all' ? '' : a.voice === 'lowest' ? ' en el bajo' : ' en la voz de arriba'
  return same
    ? ok(`La secuencia${where} es ${notes(a.pitchClasses)}.`)
    : fail(
        `Se espera ${notes(a.pitchClasses)}${where} en el ciclo ${cycle + 1}, y suena ${line.length > 0 ? notes(line) : 'nada'}.`,
      )
}

function chordPerCycle(
  events: NoteEvent[],
  _: string,
  a: Of<'chordPerCycle'>,
  cycles: number,
): AssertionResult {
  for (let c = 0; c < cycles; c++) {
    const symbol = a.chords[c % a.chords.length] ?? ''
    const want = new Set(Chord.get(symbol).notes.map(chroma))
    const got = new Set(
      events.filter((e) => e.cycle === c && e.pitchClass).map((e) => chroma(e.pitchClass ?? '')),
    )
    const same = want.size === got.size && [...want].every((x) => got.has(x))
    if (!same) {
      const heard = [
        ...new Set(
          events.filter((e) => e.cycle === c && e.pitchClass).map((e) => e.pitchClass ?? ''),
        ),
      ]
      return fail(
        `En el ciclo ${c + 1} debería sonar ${symbol} (${notes(Chord.get(symbol).notes)}) y suena ${heard.length > 0 ? notes(heard) : 'nada'}.`,
      )
    }
  }
  return ok(`Cada ciclo tiene su acorde: ${a.chords.join(' → ')}.`)
}

function harmonicIntervals(
  events: NoteEvent[],
  _: string,
  a: Of<'harmonicIntervals'>,
): AssertionResult {
  const semis = Interval.semitones(a.interval) ?? 0
  const groups = onsetGroups(events).filter((g) => g.length >= 2)
  if (groups.length === 0)
    return fail(`No hay notas sonando a la vez; se piden ${a.interval} armónicas.`)
  const matching = groups.filter((g) => {
    const span = (g[g.length - 1]?.midi ?? 0) - (g[0]?.midi ?? 0)
    return span > 0 && span % 12 === semis % 12
  })
  const ratio = matching.length / groups.length
  return ratio >= a.minRatio
    ? ok(`Tus notas simultáneas forman ${a.interval}.`)
    : fail(
        `${matching.length} de ${groups.length} pares simultáneos forman ${a.interval}; se pide ${pct(a.minRatio)}.`,
      )
}

function distinctMelodicIntervals(
  events: NoteEvent[],
  _: string,
  a: Of<'distinctMelodicIntervals'>,
): AssertionResult {
  const top = voiceLine(events, 'highest').map((e) => e.midi ?? 0)
  const distinct = new Set<number>()
  for (let i = 1; i < top.length; i++) {
    const d = Math.abs((top[i] ?? 0) - (top[i - 1] ?? 0))
    if (d > 0) distinct.add(d)
  }
  return distinct.size >= a.min
    ? ok(`Tu melodía usa ${distinct.size} intervalos distintos.`)
    : fail(`Tu melodía usa ${distinct.size} intervalos distintos; se piden al menos ${a.min}.`)
}

function maxVoiceLeap(events: NoteEvent[], _: string, a: Of<'maxVoiceLeap'>): AssertionResult {
  const chords = onsetGroups(events).filter((g) => g.length >= 2)
  for (let i = 1; i < chords.length; i++) {
    const prev = chords[i - 1] ?? []
    const next = chords[i] ?? []
    for (let v = 0; v < Math.min(prev.length, next.length); v++) {
      const leap = Math.abs((next[v]?.midi ?? 0) - (prev[v]?.midi ?? 0))
      if (leap > a.semitones) {
        return fail(
          `Entre los acordes ${i} y ${i + 1} una voz salta ${leap} semitonos; el máximo es ${a.semitones}.`,
        )
      }
    }
  }
  return ok(`Ninguna voz salta más de ${a.semitones} semitonos.`)
}

function rootsPerBar(
  events: NoteEvent[],
  _: string,
  a: Of<'rootsPerBar'>,
  cycles: number,
): AssertionResult {
  for (let c = 0; c < cycles; c++) {
    const want = a.roots[c % a.roots.length] ?? ''
    const low = events
      .filter((e) => e.cycle === c && e.midi !== null)
      .reduce<NoteEvent | null>(
        (m, e) => (m === null || (e.midi ?? 0) < (m.midi ?? 0) ? e : m),
        null,
      )
    if (low === null || chroma(low.pitchClass ?? '') !== chroma(want)) {
      return fail(
        `En el ciclo ${c + 1} el bajo debería ser ${pretty(want)} y es ${low?.pitchClass ? pretty(low.pitchClass) : 'silencio'}.`,
      )
    }
  }
  return ok(`El bajo sigue ${notes(a.roots)}.`)
}

const onsets = (events: NoteEvent[], cycle: number) =>
  [...new Set(events.filter((e) => e.cycle === cycle).map((e) => Math.round(e.begin * 1e6)))].sort(
    (x, y) => x - y,
  )

function rhythmEquals(
  events: NoteEvent[],
  reference: NoteEvent[],
  a: Of<'rhythmEquals'>,
  cycles: number,
): AssertionResult {
  for (let c = 0; c < cycles; c++) {
    const got = onsets(events, c)
    const want = onsets(reference, c)
    if (got.length !== want.length || got.some((t, i) => t !== want[i])) {
      return fail(
        `El ritmo del ciclo ${c + 1} no coincide con \`${a.reference}\`: tiene ${got.length} golpes y se esperan ${want.length} en esos lugares.`,
      )
    }
  }
  return ok(`El ritmo coincide con \`${a.reference}\`.`)
}

const signature = (e: NoteEvent, shift = 0) =>
  `${Math.round(e.begin * 1e6)}:${Math.round(e.end * 1e6)}:${e.midi === null ? e.sound : e.midi + shift}`

function matchesReference(
  events: NoteEvent[],
  reference: NoteEvent[],
  a: Of<'matchesReference'>,
): AssertionResult {
  const shift = a.transposeBy ? (Interval.semitones(a.transposeBy) ?? 0) : 0
  const want = reference.map((e) => signature(e, shift)).sort()
  const got = events.map((e) => signature(e)).sort()
  const missing = want.filter((s) => !got.includes(s)).length
  const extra = got.filter((s) => !want.includes(s)).length
  const what = a.transposeBy ? `la referencia transportada ${a.transposeBy}` : 'la referencia'
  return missing === 0 && extra === 0
    ? ok(`Suena igual que ${what}.`)
    : fail(`No suena igual que ${what}: faltan ${missing} notas y sobran ${extra}.`)
}

// Interval from the tonic that gives each mode its color.
const CHARACTERISTIC: Record<string, string> = {
  ionian: '4P',
  major: '4P',
  dorian: '6M',
  phrygian: '2m',
  lydian: '4A',
  mixolydian: '7m',
  aeolian: '6m',
  minor: '6m',
  locrian: '5d',
}

function characteristicNoteRatio(
  events: NoteEvent[],
  _: string,
  a: Of<'characteristicNoteRatio'>,
): AssertionResult {
  const scale = Scale.get(scaleName(a.mode))
  const interval = CHARACTERISTIC[scale.type]
  if (scale.empty || !scale.tonic || interval === undefined) {
    return fail(`No conozco la nota característica de ${a.mode}.`)
  }
  const target = Note.transpose(scale.tonic, interval)
  const pitched = events.filter((e) => e.pitchClass !== null)
  const ratio =
    pitched.length === 0
      ? 0
      : pitched.filter((e) => chroma(e.pitchClass ?? '') === chroma(target)).length / pitched.length
  return ratio >= a.minRatio
    ? ok(`La nota característica ${pretty(target)} se oye lo suficiente (${pct(ratio)}).`)
    : fail(
        `${pretty(target)} (la nota que da color a ${scale.name}) es ${pct(ratio)} de tus notas; se pide ${pct(a.minRatio)}.`,
      )
}

// Reference patterns (rhythmEquals / matchesReference) are evaluated here, once each.
async function referenceEvents(code: string, cycles: number): Promise<NoteEvent[]> {
  const result = await evaluatePattern(code)
  if (!result.ok) throw new Error(`invalid reference in content: ${code}: ${result.error.raw}`)
  const queried = queryEvents(result.pattern, cycles)
  if (!queried.ok) throw new Error(`reference too large: ${code}`)
  return queried.events
}

export async function checkAssertion(
  a: Assertion,
  events: NoteEvent[],
  source: string,
  cycles: number,
): Promise<AssertionResult> {
  switch (a.type) {
    case 'usesFunction':
      return usesFunction(events, source, a)
    case 'avoidsFunction':
      return avoidsFunction(events, source, a)
    case 'soundsInclude':
      return soundsInclude(events, source, a)
    case 'eventsPerCycle':
      return eventsPerCycle(events, source, a, cycles)
    case 'notesWithinScale':
      return notesWithinScale(events, source, a)
    case 'pitchClassesInclude':
      return pitchClassesInclude(events, source, a)
    case 'noteSequence':
      return noteSequence(events, source, a)
    case 'chordPerCycle':
      return chordPerCycle(events, source, a, cycles)
    case 'harmonicIntervals':
      return harmonicIntervals(events, source, a)
    case 'distinctMelodicIntervals':
      return distinctMelodicIntervals(events, source, a)
    case 'maxVoiceLeap':
      return maxVoiceLeap(events, source, a)
    case 'rootsPerBar':
      return rootsPerBar(events, source, a, cycles)
    case 'rhythmEquals':
      return rhythmEquals(
        events,
        await referenceEvents(`s(${JSON.stringify(a.reference)})`, cycles),
        a,
        cycles,
      )
    case 'matchesReference':
      return matchesReference(events, await referenceEvents(a.code, cycles), a)
    case 'characteristicNoteRatio':
      return characteristicNoteRatio(events, source, a)
  }
}

export type KataResult =
  | {
      ok: true
      passed: boolean
      results: (AssertionResult & { type: string })[]
      events: NoteEvent[]
    }
  | { ok: false; error: DojoError }

// Rule from spec 04: if evaluation fails, show the error and run no assertion.
export async function runKata(
  code: string,
  assertions: Assertion[],
  cycles: number,
): Promise<KataResult> {
  const evaluated = await evaluatePattern(code)
  if (!evaluated.ok) return evaluated
  const queried = queryEvents(evaluated.pattern, cycles)
  if (!queried.ok) return queried
  const results = []
  for (const a of assertions) {
    results.push({ type: a.type, ...(await checkAssertion(a, queried.events, code, cycles)) })
  }
  return { ok: true, passed: results.every((r) => r.pass), results, events: queried.events }
}
