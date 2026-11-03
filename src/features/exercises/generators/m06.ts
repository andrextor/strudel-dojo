// M06 · Modos griegos: spelling, characteristic note, parallel modes, modal vamps and dictation.
import { Interval } from 'tonal'
import type { Rng } from '../../../lib/random.ts'
import type { TriadQuality } from '../../theory/chords.ts'
import { SCALE_TYPE_ES } from '../../theory/es.ts'
import { needsRareSpelling } from '../../theory/instruments.ts'
import { formatNote } from '../../theory/notes.ts'
import { characteristicNote, spellScale } from '../../theory/scales.ts'
import type { Generator } from '../types.ts'
import {
  choiceQuestion,
  chordAudio,
  chordLabel,
  NATURALS,
  strudelNote,
  voiceUp,
} from './_shared.ts'
import { erase, type Registered } from './erase.ts'
import { scaleSpellingFor } from './scale-spelling.ts'

// Brightest to darkest: each step lowers one note of the previous mode.
const MODES = [
  'lydian',
  'ionian',
  'mixolydian',
  'dorian',
  'aeolian',
  'phrygian',
  'locrian',
] as const
type Mode = (typeof MODES)[number]
const isMode = (v: unknown): v is Mode => MODES.some((m) => m === v)
const modeEs = (m: string) => SCALE_TYPE_ES[m] ?? m
// The degree each darkening step lowers (lydian → ionian lowers the 4th…).
const LOWERED = [4, 7, 3, 6, 2, 5] as const

const ordinal = (d: number) => `${d}.ª`
const pc = (n: string) => formatNote(n, 'american')
const latin = (n: string) => formatNote(n, 'latin')
const spelled = (notes: readonly string[]) => notes.map(pc).join(' ')

interface ModeParams {
  modes: Mode[]
  tonics: string[]
}

function parseModeParams(raw: unknown, defaults: readonly Mode[], minModes = 1): ModeParams | null {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const modes = r.modes ?? [...defaults]
  const tonics = r.tonics ?? [...NATURALS]
  if (!Array.isArray(modes) || modes.length < minModes || !modes.every(isMode)) return null
  if (!Array.isArray(tonics) || tonics.length === 0) return null
  if (!tonics.every((t) => typeof t === 'string' && spellScale(t, 'major') !== null)) return null
  return { modes, tonics: tonics as string[] }
}

// The factory asks for "la escala X"; modes are masculine in Spanish ("el modo dórico").
const modeSpellingBase = scaleSpellingFor('mode-spelling', 'mode-spelling', {
  scales: [...MODES],
  tonics: [...NATURALS],
})
export const modeSpelling: typeof modeSpellingBase = {
  ...modeSpellingBase,
  generate(params, rng) {
    const q = modeSpellingBase.generate(params, rng)
    return { ...q, prompt: q.prompt.replace('Escribe la escala', 'Escribe el modo') }
  },
}

// Each mode next to the mode it differs from by exactly its characteristic note.
const COMPARED: Record<string, { with: Mode; degree: number }> = {
  dorian: { with: 'aeolian', degree: 6 },
  phrygian: { with: 'aeolian', degree: 2 },
  lydian: { with: 'ionian', degree: 4 },
  mixolydian: { with: 'ionian', degree: 7 },
  aeolian: { with: 'dorian', degree: 6 },
  locrian: { with: 'phrygian', degree: 5 },
}
const CHARACTERISTIC_MODES: Mode[] = [
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
]

export const characteristicNoteGen: Generator<ModeParams> = {
  id: 'characteristic-note',
  skill: 'characteristic-note',
  parseParams(raw) {
    const p = parseModeParams(raw, CHARACTERISTIC_MODES)
    return p?.modes.every((m) => m !== 'ionian') ? p : null
  },
  generate(params, rng) {
    const mode = rng.pick(params.modes)
    const tonic = rng.pick(params.tonics)
    const note = characteristicNote(mode, tonic) ?? tonic
    const cmp = COMPARED[mode] ?? { with: 'ionian', degree: 1 }
    const other = spellScale(tonic, cmp.with)?.[cmp.degree - 1] ?? note
    const all = params.modes.flatMap((m) => params.tonics.map((t) => characteristicNote(m, t) ?? t))
    return {
      id: '',
      key: `characteristic-note:${tonic}:${mode}`,
      generator: 'characteristic-note',
      skill: 'characteristic-note',
      prompt: `¿Cuál es la nota característica de ${latin(tonic)} ${modeEs(mode)}?`,
      input: { kind: 'note', via: ['text', 'keyboard'], spellAll: needsRareSpelling(all) },
      answer: { kind: 'pitch-classes', notes: [note], spelling: 'strict' },
      explanation: `En ${modeEs(mode)} la nota que da el color es la ${ordinal(cmp.degree)}: ${pc(note)} en ${latin(tonic)} ${modeEs(mode)}. Es la única que cambia frente a ${latin(tonic)} ${modeEs(cmp.with)}, que tiene ${pc(other)}.`,
    }
  },
}

type ParallelAsk = 'name' | 'brighter' | 'step'

export const parallelMode: Generator<ModeParams> = {
  id: 'parallel-mode',
  skill: 'parallel-modes',
  parseParams: (raw) => parseModeParams(raw, MODES, 2),
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const ask = rng.pick<ParallelAsk>(['name', 'brighter', 'step'])
    const base = { generator: 'parallel-mode', skill: 'parallel-modes' }
    const rank = (m: Mode) => MODES.indexOf(m)

    if (ask === 'name') {
      const mode = rng.pick(params.modes)
      const notes = spellScale(tonic, mode) ?? [tonic]
      return choiceQuestion(
        rng,
        {
          ...base,
          key: `parallel-mode:name:${tonic}:${mode}`,
          prompt: `Desde ${latin(tonic)} suena ${spelled(notes)}. ¿Qué modo es?`,
          explanation: `Es ${latin(tonic)} ${modeEs(mode)}. Compáralo con ${latin(tonic)} mayor: las notas que bajan o suben dicen el modo.`,
        },
        `${latin(tonic)} ${modeEs(mode)}`,
        rng.shuffle(params.modes).map((m) => `${latin(tonic)} ${modeEs(m)}`),
      )
    }

    if (ask === 'brighter') {
      const [a, b] = rng.shuffle(params.modes)
      if (a === undefined || b === undefined) throw new Error('need two modes')
      const darker = rng.next() < 0.5
      const brightest = rank(a) < rank(b) ? a : b
      const answer = darker ? (brightest === a ? b : a) : brightest
      const order = MODES.filter((m) => params.modes.includes(m))
        .map(modeEs)
        .join(' → ')
      return choiceQuestion(
        rng,
        {
          ...base,
          key: `parallel-mode:${darker ? 'darker' : 'brighter'}:${[a, b].sort().join('-')}`,
          prompt: `Desde la misma tónica, ¿cuál suena más ${darker ? 'oscuro' : 'brillante'}?`,
          explanation: `De brillante a oscuro: ${order}. Cuantas más notas bajadas frente al mayor, más oscuro.`,
        },
        modeEs(answer),
        [modeEs(answer === a ? b : a)],
      )
    }

    const from = rng.int(0, MODES.length - 2)
    const brighter = MODES[from] ?? 'ionian'
    const darker = MODES[from + 1] ?? 'mixolydian'
    const degree = LOWERED[from] ?? 1
    const before = spellScale(tonic, brighter)?.[degree - 1] ?? tonic
    const after = spellScale(tonic, darker)?.[degree - 1] ?? tonic
    const options = [2, 3, 4, 5, 6, 7].map((d) => `Baja la ${ordinal(d)}`)
    return choiceQuestion(
      rng,
      {
        ...base,
        key: `parallel-mode:step:${tonic}:${brighter}`,
        prompt: `De ${latin(tonic)} ${modeEs(brighter)} a ${latin(tonic)} ${modeEs(darker)}, un paso más oscuro, ¿qué nota cambia?`,
        explanation: `Baja la ${ordinal(degree)}: ${pc(before)} pasa a ${pc(after)}. Cada paso hacia lo oscuro baja un semitono una sola nota.`,
      },
      `Baja la ${ordinal(degree)}`,
      rng.shuffle(options),
    )
  },
}

// Mode roots spread over the keyboard; the audio never shows spelling.
const EAR_TONICS = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb', 'Eb']

export const earScale: Generator<ModeParams> = {
  id: 'ear-scale',
  skill: 'mode-ear',
  parseParams: (raw) => parseModeParams(raw, MODES, 2),
  generate(params, rng) {
    const mode = rng.pick(params.modes)
    const tonic = rng.pick(EAR_TONICS)
    const octave = rng.int(3, 4)
    const notes = spellScale(tonic, mode) ?? [tonic]
    const up = voiceUp([...notes, tonic], octave)
    const audio = `note("${[...up, ...up.slice(0, -1).reverse()].map(strudelNote).join(' ')}").s("piano").slow(4)`
    return choiceQuestion(
      rng,
      {
        key: `ear-scale:${tonic}${octave}:${mode}`,
        generator: 'ear-scale',
        skill: 'mode-ear',
        prompt: 'Escucha el modo, que sube y baja desde su tónica. ¿Cuál es?',
        audio,
        explanation: `Es ${modeEs(mode)}. Busca su color: ${
          mode === 'ionian'
            ? 'la escala mayor de siempre'
            : `la ${ordinal(COMPARED[mode]?.degree ?? 1)} frente a ${modeEs(COMPARED[mode]?.with ?? 'ionian')}`
        }.`,
      },
      modeEs(mode),
      rng.shuffle(params.modes).map(modeEs),
    )
  },
}

// One-chord-per-cycle vamps by scale degree (1-based) that point at a single mode.
const VAMPS: Record<string, number[]> = {
  dorian: [1, 4],
  mixolydian: [1, 7],
  phrygian: [1, 2],
  lydian: [1, 2],
  aeolian: [1, 6, 7],
}
const VAMP_ROMAN: Record<string, string> = {
  dorian: 'i–IV',
  mixolydian: 'I–♭VII',
  phrygian: 'i–♭II',
  lydian: 'I–II',
  aeolian: 'i–♭VI–♭VII',
}
const VAMP_MODES = Object.keys(VAMPS) as Mode[]

const QUALITY: Record<string, TriadQuality> = {
  '3M5P': 'major',
  '3m5P': 'minor',
  '3m5d': 'diminished',
  '3M5A': 'augmented',
}

function triadOn(scale: readonly string[], degree: number) {
  const at = (i: number) => scale[(degree - 1 + i) % scale.length] ?? ''
  const notes = [at(0), at(2), at(4)]
  const quality = QUALITY[`${Interval.distance(at(0), at(2))}${Interval.distance(at(0), at(4))}`]
  return { root: at(0), notes, quality: quality ?? 'major' }
}

export const modalProgression: Generator<ModeParams & { ear: boolean }> = {
  id: 'modal-progression',
  skill: 'modal-progressions',
  parseParams(raw) {
    const p = parseModeParams(raw, VAMP_MODES, 2)
    if (p === null || !p.modes.every((m) => VAMPS[m] !== undefined)) return null
    const ear = typeof raw === 'object' && raw !== null && (raw as { ear?: unknown }).ear === true
    return { ...p, ear }
  },
  generate(params, rng) {
    const mode = rng.pick(params.modes)
    const tonic = rng.pick(params.tonics)
    const scale = spellScale(tonic, mode) ?? [tonic]
    const chords = (VAMPS[mode] ?? [1]).map((d) => triadOn(scale, d))
    const names = chords.map((c) => chordLabel(c.root, c.quality)).join(', ')
    return choiceQuestion(
      rng,
      {
        key: `modal-progression:${tonic}:${mode}:${params.ear ? 'ear' : 'read'}`,
        generator: 'modal-progression',
        skill: 'modal-progressions',
        prompt: params.ear
          ? `Escucha una vamp que gira sobre ${latin(tonic)} (el primer acorde es la tónica). ¿Qué modo sugiere?`
          : `Una vamp gira sobre ${latin(tonic)} alternando ${names}. ¿Qué modo sugiere?`,
        audio: `note("<${chords.map((c) => chordAudio(c.notes)).join(' ')}>").s("piano")`,
        explanation: `${names}: es ${VAMP_ROMAN[mode]} en ${latin(tonic)} ${modeEs(mode)}, la vamp típica de ese modo.`,
      },
      modeEs(mode),
      rng.shuffle(params.modes).map(modeEs),
    )
  },
}

interface MelodyParams {
  length: number
  scale: string
  maxLeap: number
}

// Melodies stay in comfortable keys; the answer accepts any enharmonic spelling.
const MELODY_TONICS = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb', 'Eb']

function randomWalk(rng: Rng, length: number, maxLeap: number, top: number): number[] {
  const degrees = [0]
  while (degrees.length < length) {
    const last = degrees[degrees.length - 1] ?? 0
    const step = rng.int(1, maxLeap) * (rng.next() < 0.5 ? -1 : 1)
    const next = last + step
    degrees.push(next < 0 || next > top ? last - step : next)
  }
  return degrees
}

export const earMelody: Generator<MelodyParams> = {
  id: 'ear-melody',
  skill: 'melodic-dictation',
  parseParams(raw) {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const length = r.length ?? 5
    const scale = r.scale ?? 'major'
    const maxLeap = r.maxLeap ?? 2
    if (typeof length !== 'number' || !Number.isInteger(length) || length < 3 || length > 8)
      return null
    if (typeof maxLeap !== 'number' || !Number.isInteger(maxLeap) || maxLeap < 1 || maxLeap > 4)
      return null
    if (typeof scale !== 'string' || spellScale('C', scale) === null) return null
    return { length, scale, maxLeap }
  },
  generate(params, rng) {
    const tonic = rng.pick(MELODY_TONICS)
    const scale = spellScale(tonic, params.scale) ?? [tonic]
    const degrees = randomWalk(rng, params.length, params.maxLeap, scale.length)
    const notes = degrees.map((d) => scale[d % scale.length] ?? tonic)
    const octaves = voiceUp([...scale, tonic], 4)
    const pitches = degrees.map((d) => octaves[d] ?? `${tonic}4`)
    return {
      id: '',
      key: `ear-melody:${tonic}:${params.scale}:${degrees.join('.')}`,
      generator: 'ear-melody',
      skill: 'melodic-dictation',
      prompt: `Escucha una melodía de ${params.length} notas en ${latin(tonic)} ${SCALE_TYPE_ES[params.scale] ?? params.scale}. Empieza en la tónica: escribe sus notas en orden.`,
      input: {
        kind: 'note-set',
        via: ['keyboard', 'text', 'midi'],
        ordered: true,
        count: notes.length,
      },
      audio: `note("${pitches.map(strudelNote).join(' ')}").s("piano").slow(${Math.ceil(params.length / 4)})`,
      answer: { kind: 'pitch-classes', notes, spelling: 'enharmonic' },
      explanation: `La melodía es ${spelled(notes)}: grados ${degrees.map((d) => (d % scale.length) + 1).join(' ')}.`,
    }
  },
}

export const m06: Registered[] = [
  erase(modeSpelling),
  erase(characteristicNoteGen),
  erase(parallelMode),
  erase(earScale),
  erase(modalProgression),
  erase(earMelody),
]
