// M05 · Transporte y círculo aplicado: transposing by interval and key, capo, transposing
// instruments, modulation and the circle of fifths.
import { Note } from 'tonal'
import type { Rng } from '../../../lib/random.ts'
import { diatonicTriads, type TriadQuality } from '../../theory/chords.ts'
import { needsRareSpelling } from '../../theory/instruments.ts'
import { formatInterval } from '../../theory/intervals.ts'
import { formatNote } from '../../theory/notes.ts'
import { spellScale } from '../../theory/scales.ts'
import { capoShape, transposeSequence, transposeToKey } from '../../theory/transpose.ts'
import type { Generator, Question } from '../types.ts'
import {
  choiceQuestion,
  chordLabel,
  keyName,
  MAJOR_TONICS,
  MINOR_TONICS,
  NATURALS,
  prettySymbol,
  strudelNote,
} from './_shared.ts'
import { erase, type Registered } from './erase.ts'

type Rec = Record<string, unknown>
const asRec = (raw: unknown): Rec => (typeof raw === 'object' && raw !== null ? raw : {}) as Rec
const isMajorTonic = (t: unknown): t is string =>
  typeof t === 'string' && (MAJOR_TONICS as readonly string[]).includes(t)

function stringList(raw: unknown, fallback: readonly string[], valid: (x: string) => boolean) {
  const list = raw ?? [...fallback]
  if (!Array.isArray(list) || list.length === 0) return null
  return list.every((x) => typeof x === 'string' && valid(x)) ? (list as string[]) : null
}

const cap = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`
const latin = (notes: readonly string[]) => notes.map((n) => formatNote(n, 'latin')).join(' ')
const american = (notes: readonly string[]) => notes.map((n) => formatNote(n, 'american')).join(' ')
const melodyAudio = (notes: readonly string[]) =>
  `note("${notes.map((n) => strudelNote(`${n}4`)).join(' ')}").s("piano")`

// A four-note melody inside a major key, starting on the tonic so the key is clear.
function melody(rng: Rng, tonic: string): { degrees: number[]; notes: string[] } {
  const scale = spellScale(tonic, 'major') ?? [tonic]
  const degrees = [0, rng.int(1, 6), rng.int(0, 6), rng.int(0, 6)]
  return { degrees, notes: degrees.map((d) => scale[d] ?? tonic) }
}

const melodyInput = (spellAll: boolean): Question['input'] => ({
  kind: 'note-set',
  via: ['text', 'keyboard'],
  ordered: true,
  count: 4,
  spellAll,
})

// --- Transpose by interval -------------------------------------------------------------------

interface IntervalParams {
  pairs: { tonic: string; interval: string }[]
  spellAll: boolean
}

const UP_INTERVALS = ['2M', '3m', '3M', '4P', '5P', '6M'] as const

export const transposeMelody: Generator<IntervalParams> = {
  id: 'transpose-melody',
  skill: 'transpose-interval',
  parseParams(raw) {
    const r = asRec(raw)
    const tonics = stringList(r.tonics, ['C', 'G', 'D', 'A', 'F', 'Bb', 'Eb'], isMajorTonic)
    const intervals = stringList(r.intervals, UP_INTERVALS, (i) => Note.transpose('C', i) !== '')
    if (tonics === null || intervals === null) return null
    // Only pairs that land on a usual major key, so the answer never needs double accidentals.
    const pairs = tonics.flatMap((tonic) =>
      intervals
        .filter((interval) => isMajorTonic(Note.transpose(tonic, interval)))
        .map((interval) => ({ tonic, interval })),
    )
    if (pairs.length === 0) return null
    const spellAll = needsRareSpelling(
      pairs.flatMap((p) => spellScale(Note.transpose(p.tonic, p.interval), 'major') ?? []),
    )
    return { pairs, spellAll }
  },
  generate(params, rng) {
    const { tonic, interval } = rng.pick(params.pairs)
    const { degrees, notes } = melody(rng, tonic)
    const answer = transposeSequence(notes, interval) ?? notes
    const target = answer[0] ?? tonic
    const name = formatInterval(interval, 'long')
    return {
      id: '',
      key: `transpose-melody:${tonic}:${interval}:${degrees.join('')}`,
      generator: 'transpose-melody',
      skill: 'transpose-interval',
      prompt: `Transporta esta melodía de ${keyName(tonic)} una ${name} ascendente: ${latin(notes)}. Escribe las cuatro notas en orden.`,
      input: melodyInput(params.spellAll),
      audio: melodyAudio(notes),
      answer: { kind: 'pitch-classes', notes: answer, spelling: 'strict' },
      explanation: `Una ${name} sobre ${formatNote(tonic, 'latin')} es ${formatNote(target, 'latin')}, así que la melodía pasa a ${keyName(target)}: ${american(notes)} → ${american(answer)}. Cada nota sube la misma ${name}, y cada letra avanza lo mismo.`,
    }
  },
}

// --- Transpose to another key, keeping the degrees -------------------------------------------

interface KeyParams {
  tonics: string[]
  spellAll: boolean
}

const DEFAULT_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab'] as const

function parseKeys(raw: unknown, fallback: readonly string[]): KeyParams | null {
  const tonics = stringList(asRec(raw).tonics, fallback, isMajorTonic)
  if (tonics === null || tonics.length < 2) return null
  return {
    tonics,
    spellAll: needsRareSpelling(tonics.flatMap((t) => spellScale(t, 'major') ?? [])),
  }
}

export const transposeKey: Generator<KeyParams> = {
  id: 'transpose-key',
  skill: 'transpose-key',
  parseParams: (raw) => parseKeys(raw, DEFAULT_KEYS),
  generate(params, rng) {
    const from = rng.pick(params.tonics)
    const to = rng.pick(params.tonics.filter((t) => t !== from))
    const { degrees, notes } = melody(rng, from)
    const answer = transposeToKey(notes, from, to) ?? notes
    return {
      id: '',
      key: `transpose-key:${from}:${to}:${degrees.join('')}`,
      generator: 'transpose-key',
      skill: 'transpose-key',
      prompt: `Esta melodía está en ${keyName(from)}: ${latin(notes)}. Transpórtala a ${keyName(to)} con los mismos grados. Escribe las cuatro notas en orden.`,
      input: melodyInput(params.spellAll),
      audio: melodyAudio(notes),
      answer: { kind: 'pitch-classes', notes: answer, spelling: 'strict' },
      explanation: `Son los grados ${degrees.map((d) => d + 1).join(' ')} de ${keyName(from)}. Los mismos grados en ${keyName(to)}: ${american(answer)}, con su armadura.`,
    }
  },
}

// --- Capo -------------------------------------------------------------------------------------

const OPEN_SHAPES: { root: string; quality: TriadQuality }[] = [
  { root: 'C', quality: 'major' },
  { root: 'A', quality: 'major' },
  { root: 'G', quality: 'major' },
  { root: 'E', quality: 'major' },
  { root: 'D', quality: 'major' },
  { root: 'A', quality: 'minor' },
  { root: 'E', quality: 'minor' },
  { root: 'D', quality: 'minor' },
]

// The usual spelling of a chord root a few semitones above `root` (B♭, not A♯; F♯m, not G♭m).
function rootAbove(root: string, semitones: number, quality: TriadQuality): string {
  const chroma = ((Note.chroma(root) ?? 0) + semitones + 120) % 12
  const pool: readonly string[] = quality === 'minor' ? MINOR_TONICS : MAJOR_TONICS
  return pool.find((t) => Note.chroma(t) === chroma) ?? Note.pitchClass(Note.fromMidi(60 + chroma))
}

const symbolOf = (root: string, quality: TriadQuality) => `${root}${quality === 'minor' ? 'm' : ''}`

export const capo: Generator<{ maxFret: number }> = {
  id: 'capo',
  skill: 'transpose-key',
  parseParams(raw) {
    const maxFret = asRec(raw).maxFret ?? 7
    return typeof maxFret === 'number' && Number.isInteger(maxFret) && maxFret >= 1 && maxFret <= 11
      ? { maxFret }
      : null
  },
  generate(params, rng) {
    const shape = rng.pick(OPEN_SHAPES)
    const fret = rng.int(1, params.maxFret)
    const askSound = rng.next() < 0.5
    const { quality } = shape
    const sounding = rootAbove(shape.root, fret, quality)
    const label = (root: string) => chordLabel(root, quality)
    const base = {
      key: `capo:${askSound ? 'sound' : 'shape'}:${symbolOf(shape.root, quality)}:${fret}`,
      generator: 'capo',
      skill: 'transpose-key',
      explanation: `El capo sube todo ${fret} ${fret === 1 ? 'semitono' : 'semitonos'}: la forma de ${label(shape.root)} con capo en el traste ${fret} suena como ${label(sounding)}. Para ir al revés, baja ${fret} ${fret === 1 ? 'semitono' : 'semitonos'} desde el acorde que quieres oír.`,
    }
    if (askSound) {
      return choiceQuestion(
        rng,
        {
          ...base,
          prompt: `En la guitarra pones el capo en el traste ${fret} y tocas la forma de ${label(shape.root)}. ¿Qué acorde suena?`,
        },
        label(sounding),
        [
          label(rootAbove(shape.root, -fret, quality)),
          label(rootAbove(shape.root, fret + 1, quality)),
          label(rootAbove(shape.root, fret - 1, quality)),
        ],
      )
    }
    const answer = capoShape(symbolOf(sounding, quality), fret) ?? symbolOf(shape.root, quality)
    const others = OPEN_SHAPES.filter((s) => s !== shape && s.quality === quality)
    return choiceQuestion(
      rng,
      {
        ...base,
        prompt: `Quieres que suene ${label(sounding)} con el capo en el traste ${fret}. ¿Qué forma de acorde abierto tocas?`,
      },
      `Forma de ${prettySymbol(answer)}`,
      rng.shuffle(others).map((s) => `Forma de ${prettySymbol(symbolOf(s.root, quality))}`),
    )
  },
}

// --- Transposing instruments ------------------------------------------------------------------

// Written = concert transposed up by the interval (tenor sax sounds an octave lower still).
const INSTRUMENTS = [
  { id: 'Bb', name: 'un clarinete en Si♭', interval: '2M' },
  { id: 'Bb-tpt', name: 'una trompeta en Si♭', interval: '2M' },
  { id: 'Eb', name: 'un saxo alto en Mi♭', interval: '6M' },
  { id: 'F', name: 'un corno en Fa', interval: '5P' },
] as const

const CONCERT_POOL = [...NATURALS, 'Bb', 'Eb', 'Ab', 'F#'] as const

export const transposingInstrument: Generator<Record<string, never>> = {
  id: 'transposing-instrument',
  skill: 'transpose-key',
  parseParams: () => ({}),
  generate(_, rng) {
    const inst = rng.pick([...INSTRUMENTS])
    const toWritten = rng.next() < 0.5
    const given = rng.pick([...CONCERT_POOL])
    const move = (n: string, interval: string, up: boolean) =>
      Note.transpose(n, up ? interval : `-${interval}`)
    const answer = move(given, inst.interval, toWritten)
    const candidates = [
      move(given, inst.interval, !toWritten),
      given,
      ...['2M', '6M', '5P', '4P'].map((i) => move(given, i, toWritten)),
    ]
    const seen = new Set([Note.chroma(answer)])
    const distractors = candidates.filter((n) => {
      const c = Note.chroma(n)
      if (seen.has(c)) return false
      seen.add(c)
      return true
    })
    const name = formatInterval(inst.interval, 'long')
    const g = formatNote(given, 'latin')
    return choiceQuestion(
      rng,
      {
        key: `transposing-instrument:${inst.id}:${toWritten ? 'written' : 'concert'}:${given}`,
        generator: 'transposing-instrument',
        skill: 'transpose-key',
        prompt: toWritten
          ? `Para que suene ${g} (en concierto, como en el piano), ¿qué nota se escribe en la partitura de ${inst.name}?`
          : `${cap(inst.name)} lee ${g} en su partitura. ¿Qué nota suena en concierto (como en el piano)?`,
        explanation: `${cap(inst.name)} suena una ${name} más grave de lo que lee: su Do escrito suena ${formatNote(move('C', inst.interval, false), 'latin')}. ${toWritten ? `Se escribe una ${name} arriba: ${g} → ${formatNote(answer, 'latin')}.` : `Suena una ${name} abajo: ${g} → ${formatNote(answer, 'latin')}.`}`,
      },
      formatNote(answer, 'latin'),
      distractors.map((n) => formatNote(n, 'latin')),
    )
  },
}

// --- Modulation: pivot chord and the new dominant ---------------------------------------------

// Neighbouring major keys a fifth away, when both have a usual spelling.
function neighbours(tonic: string): string[] {
  return [Note.transpose(tonic, '5P'), Note.transpose(tonic, '4P')].filter(isMajorTonic)
}

export const modulationPivot: Generator<{ tonics: string[] }> = {
  id: 'modulation-pivot',
  skill: 'modulation',
  parseParams(raw) {
    const tonics = stringList(asRec(raw).tonics, MAJOR_TONICS, isMajorTonic)
    return tonics?.every((t) => neighbours(t).length > 0) ? { tonics } : null
  },
  generate(params, rng) {
    const from = rng.pick(params.tonics)
    const to = rng.pick(neighbours(from))
    const a = diatonicTriads(from, 'major') ?? []
    const b = diatonicTriads(to, 'major') ?? []
    const same = (x: (typeof a)[number], y: (typeof a)[number]) =>
      x.root === y.root && x.quality === y.quality
    const label = (t: (typeof a)[number]) => chordLabel(t.root, t.quality)
    const head = `Modulas de ${keyName(from)} a ${keyName(to)}.`
    if (rng.next() < 0.6) {
      const shared = a.filter((x) => b.some((y) => same(x, y)))
      const only = [...a, ...b].filter((x) => !shared.some((s) => same(s, x)))
      const pivot = rng.pick(shared)
      const inB = b.find((y) => same(pivot, y))
      return choiceQuestion(
        rng,
        {
          key: `modulation-pivot:pivot:${from}:${to}:${pivot.degree}`,
          generator: 'modulation-pivot',
          skill: 'modulation',
          prompt: `${head} ¿Cuál de estos acordes pertenece a las dos tonalidades y sirve de pivote?`,
          explanation: `${label(pivot)} es ${pivot.roman} en ${keyName(from)} y ${inB?.roman ?? ''} en ${keyName(to)}: está en las dos, por eso sirve de puente. Dos tonalidades vecinas comparten cuatro tríadas.`,
        },
        label(pivot),
        rng.shuffle(only).map(label),
      )
    }
    const [i, , , iv, v, vi] = b
    if (!i || !iv || !v || !vi) throw new Error('missing triads')
    return choiceQuestion(
      rng,
      {
        key: `modulation-pivot:dominant:${from}:${to}`,
        generator: 'modulation-pivot',
        skill: 'modulation',
        prompt: `${head} Después del acorde pivote, ¿qué acorde, la dominante (V) de la nueva tonalidad, la confirma?`,
        explanation: `La dominante de ${keyName(to)} es ${label(v)}, una quinta arriba de ${formatNote(to, 'latin')}. Su tercera, ${formatNote(v.notes[1] ?? '', 'latin')}, es la sensible que lleva a la nueva tónica.`,
      },
      label(v),
      rng.shuffle([i, iv, vi, ...a.slice(4, 5)].filter((t) => !same(t, v))).map(label),
    )
  },
}

// --- Circle of fifths -------------------------------------------------------------------------

// Clockwise, one fifth up per step; F♯ and D♭ meet at the enharmonic seam.
const CIRCLE = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'] as const
const at = (i: number) => CIRCLE[((i % 12) + 12) % 12] ?? 'C'
const ASKS = ['up', 'down', 'neighbours', 'ii-V'] as const

export const circleOfFifths: Generator<{ tonics: string[] }> = {
  id: 'circle-of-fifths',
  skill: 'circle-of-fifths',
  parseParams(raw) {
    const tonics = stringList(asRec(raw).tonics, CIRCLE, (t) =>
      (CIRCLE as readonly string[]).includes(t),
    )
    return tonics && { tonics }
  },
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const idx = CIRCLE.indexOf(tonic as (typeof CIRCLE)[number])
    const ask = rng.pick([...ASKS])
    const k = (i: number) => keyName(at(idx + i))
    const base = {
      key: `circle-of-fifths:${ask}:${tonic}`,
      generator: 'circle-of-fifths',
      skill: 'circle-of-fifths',
    }
    if (ask === 'up' || ask === 'down') {
      const step = ask === 'up' ? 1 : -1
      return choiceQuestion(
        rng,
        {
          ...base,
          prompt:
            ask === 'up'
              ? `En el círculo de quintas, ¿qué tonalidad mayor está a la derecha de ${keyName(tonic)}, una quinta arriba?`
              : `En el círculo de quintas, ¿qué tonalidad mayor está a la izquierda de ${keyName(tonic)}, una quinta abajo?`,
          explanation: `A la derecha se sube una quinta (y se gana un ♯ o se pierde un ♭); a la izquierda se baja una quinta. ${k(step)} está ${ask === 'up' ? 'a la derecha' : 'a la izquierda'} de ${keyName(tonic)}.`,
        },
        k(step),
        [k(-step), k(2 * step), k(6), k(3 * step)],
      )
    }
    if (ask === 'neighbours') {
      const pair = (x: number, y: number) => `${k(x)} y ${k(y)}`
      return choiceQuestion(
        rng,
        {
          ...base,
          prompt: `¿Cuáles son las dos tonalidades mayores vecinas de ${keyName(tonic)} en el círculo de quintas?`,
          explanation: `Las vecinas están una quinta arriba (${k(1)}) y una quinta abajo (${k(-1)}). Comparten casi todas las notas con ${keyName(tonic)}: por eso son las modulaciones más suaves.`,
        },
        pair(1, -1),
        rng.shuffle([pair(2, -2), pair(1, 2), pair(-1, -2), pair(3, -3)]),
      )
    }
    const iiV = (i: number) => {
      const t = diatonicTriads(at(idx + i), 'major') ?? []
      return `${prettySymbol(`${t[1]?.root ?? ''}m`)}–${prettySymbol(t[4]?.root ?? '')}`
    }
    return choiceQuestion(
      rng,
      {
        ...base,
        prompt: `¿Qué ii–V lleva a ${keyName(tonic)}?`,
        explanation: `En ${keyName(tonic)}, el ii es menor y el V es mayor: ${iiV(0)}, y de ahí a ${prettySymbol(tonic)}. Cada acorde está una quinta arriba del siguiente: el ii–V recorre el círculo hacia la izquierda.`,
      },
      iiV(0),
      rng.shuffle([iiV(1), iiV(-1), iiV(2), iiV(-2)]),
    )
  },
}

export const m05: Registered[] = [
  erase(transposeMelody),
  erase(transposeKey),
  erase(capo),
  erase(transposingInstrument),
  erase(modulationPivot),
  erase(circleOfFifths),
]
