// M07 · Séptimas, extensiones y conducción de voces: seventh chords, diatonic sevenths,
// available tensions and guide tones.
import { Chord, Key, Note } from 'tonal'
import { diatonicChords } from '../../theory/chords.ts'
import { CHORD_TYPE_ES } from '../../theory/es.ts'
import { needsRareSpelling } from '../../theory/instruments.ts'
import { formatNote } from '../../theory/notes.ts'
import type { Generator } from '../types.ts'
import { choiceQuestion, chordAudio, keyName, MAJOR_TONICS, prettySymbol } from './_shared.ts'
import { erase, type Registered } from './erase.ts'

const SEVENTH_TYPES = ['maj7', '7', 'm7', 'm7b5', 'dim7', 'mMaj7'] as const
type SeventhType = (typeof SEVENTH_TYPES)[number]
const isSeventhType = (v: unknown): v is SeventhType =>
  typeof v === 'string' && (SEVENTH_TYPES as readonly string[]).includes(v)

const BUILD: Record<SeventhType, string> = {
  maj7: 'tríada mayor + 7.ª mayor (3M, 5J, 7M)',
  '7': 'tríada mayor + 7.ª menor (3M, 5J, 7m)',
  m7: 'tríada menor + 7.ª menor (3m, 5J, 7m)',
  m7b5: 'tríada disminuida + 7.ª menor (3m, 5d, 7m)',
  dim7: 'tríada disminuida + 7.ª disminuida (3m, 5d, 7d)',
  mMaj7: 'tríada menor + 7.ª mayor (3m, 5J, 7M)',
}

const notesOf = (symbol: string) => Chord.get(symbol).notes
const american = (notes: readonly string[]) => notes.map((n) => formatNote(n, 'american')).join(' ')

// "Re menor séptima (Dm7)": the chord as the app names it.
function seventhLabel(symbol: string): string {
  const c = Chord.get(symbol)
  return `${formatNote(c.tonic ?? '', 'latin')} ${CHORD_TYPE_ES[c.type] ?? c.type} (${prettySymbol(symbol)})`
}

// One double accidental (C°7 → B𝄫) is part of the lesson; more (G♭°7) is noise.
const reasonable = (symbol: string) => notesOf(symbol).filter((n) => /##|bb/.test(n)).length <= 1

interface ChordParams {
  types: SeventhType[]
  roots: string[]
  symbols: string[]
}

function parseChordParams(raw: unknown, defaults: readonly SeventhType[]): ChordParams | null {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const types = r.types ?? [...defaults]
  const roots = r.roots ?? [...MAJOR_TONICS]
  if (!Array.isArray(types) || types.length === 0 || !types.every(isSeventhType)) return null
  if (!Array.isArray(roots) || roots.length === 0) return null
  if (!roots.every((x) => typeof x === 'string' && notesOf(`${x}maj7`).length === 4)) return null
  const symbols = types
    .flatMap((t) => (roots as string[]).map((x) => `${x}${t}`))
    .filter(reasonable)
  return symbols.length === 0 ? null : { types, roots: roots as string[], symbols }
}

export const seventhSpelling: Generator<ChordParams> = {
  id: 'seventh-spelling',
  skill: 'seventh-chords',
  parseParams: (raw) => parseChordParams(raw, SEVENTH_TYPES),
  generate(params, rng) {
    const symbol = rng.pick(params.symbols)
    const notes = notesOf(symbol)
    const type = symbol.slice((Chord.get(symbol).tonic ?? '').length) as SeventhType
    return {
      id: '',
      key: `seventh-spelling:${symbol}`,
      generator: 'seventh-spelling',
      skill: 'seventh-chords',
      prompt: `Escribe las cuatro notas del acorde de ${seventhLabel(symbol)}.`,
      input: {
        kind: 'note-set',
        via: ['text', 'keyboard'],
        ordered: false,
        count: 4,
        spellAll: needsRareSpelling(params.symbols.flatMap(notesOf)),
      },
      answer: { kind: 'pitch-classes', notes, spelling: 'strict' },
      explanation: `${seventhLabel(symbol)}: ${american(notes)}. Es ${BUILD[type]}.`,
    }
  },
}

// Fixed by the major scale's interval pattern, the same in every key (spec 01, M07-T02).
const ROMAN7 = ['Imaj7', 'iim7', 'iiim7', 'IVmaj7', 'V7', 'vim7', 'viiø7'] as const

interface KeyParams {
  tonics: string[]
}

function parseTonics(raw: unknown): KeyParams | null {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const tonics = r.tonics ?? [...MAJOR_TONICS]
  if (!Array.isArray(tonics) || tonics.length === 0) return null
  if (!tonics.every((t) => typeof t === 'string' && diatonicChords(t, { sevenths: true }) !== null))
    return null
  return { tonics: tonics as string[] }
}

const sevenths = (tonic: string) => diatonicChords(tonic, { sevenths: true }) ?? []

export const diatonicSeventh: Generator<KeyParams> = {
  id: 'diatonic-seventh',
  skill: 'diatonic-sevenths',
  parseParams: parseTonics,
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const chords = sevenths(tonic)
    const degree = rng.int(0, 6)
    const target = chords[degree]
    if (!target) throw new Error('missing diatonic seventh')
    const roman = ROMAN7[degree] ?? ''
    const askChord = rng.next() < 0.5
    const root = Chord.get(target.symbol).tonic ?? ''
    const base = {
      key: `diatonic-seventh:${tonic}:${degree}:${askChord ? 'chord' : 'degree'}`,
      generator: 'diatonic-seventh',
      skill: 'diatonic-sevenths',
      explanation: `En ${keyName(tonic)}, el grado ${roman} es ${seventhLabel(target.symbol)}: ${american(target.notes)}. Las calidades van siempre maj7, m7, m7, maj7, 7, m7, ø7.`,
    }
    if (askChord) {
      // Same root with another quality is the tempting mistake; one other degree completes it.
      const sameRoot = rng
        .shuffle(['maj7', '7', 'm7', 'm7b5'].map((t) => `${root}${t}`))
        .filter((s) => s !== target.symbol)
        .slice(0, 2)
      const other = rng.pick(chords.filter((c) => c !== target)).symbol
      return choiceQuestion(
        rng,
        {
          ...base,
          prompt: `En ${keyName(tonic)}, ¿qué acorde de séptima se forma sobre el grado ${roman.replace(/(maj7|m7|7|ø7)$/, '')}?`,
        },
        seventhLabel(target.symbol),
        [...sameRoot, other].map(seventhLabel),
      )
    }
    return choiceQuestion(
      rng,
      { ...base, prompt: `En ${keyName(tonic)}, ¿qué grado es ${seventhLabel(target.symbol)}?` },
      roman,
      rng.shuffle(ROMAN7.filter((r) => r !== roman)),
    )
  },
}

// Simplified rule, as taught in M07-T03: the 9, 11 and 13 come from the key's scale, and a
// tension a half step above a chord tone (a minor 9th against it) is an avoid note.
const TENSIONS = [
  { label: '9', step: 1 },
  { label: '11', step: 3 },
  { label: '13', step: 5 },
] as const

export function tensionsOf(tonic: string, degree: number) {
  const scale = Key.majorKey(tonic).scale
  const tones = sevenths(tonic)[degree]?.notes ?? []
  return TENSIONS.map((t) => {
    const note = scale[(degree + t.step) % 7] ?? ''
    const c = Note.chroma(note) ?? 0
    const under = tones.find((n) => (c - (Note.chroma(n) ?? 0) + 12) % 12 === 1) ?? null
    return { ...t, note, under, avoid: under !== null }
  })
}

type Tension = ReturnType<typeof tensionsOf>[number]
const tensionName = (t: Tension) => `${t.label} (${formatNote(t.note, 'latin')})`
const listEs = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`
const SUBSETS = [['9'], ['11'], ['13'], ['9', '11'], ['9', '13'], ['11', '13'], ['9', '11', '13']]

export const tensionAvailable: Generator<KeyParams> = {
  id: 'tension-available',
  skill: 'tensions',
  parseParams: parseTonics,
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const degree = rng.int(0, 6)
    const chord = sevenths(tonic)[degree]
    if (!chord) throw new Error('missing diatonic seventh')
    const ts = tensionsOf(tonic, degree)
    const available = ts.filter((t) => !t.avoid)
    const why = ts
      .filter((t) => t.avoid)
      .map(
        (t) =>
          `${tensionName(t)} queda medio tono encima de ${formatNote(t.under ?? '', 'latin')}, nota del acorde: evitada`,
      )
    const explanation = `Sobre ${seventhLabel(chord.symbol)}, ${ROMAN7[degree]} de ${keyName(tonic)}: ${ts.map(tensionName).join(', ')}. ${why.length > 0 ? `${why.join('; ')}. ` : 'Ninguna queda medio tono encima de una nota del acorde. '}Disponibles: ${available.length > 0 ? listEs(available.map((t) => t.label)) : 'ninguna'}.`
    const on = `${seventhLabel(chord.symbol)}, el ${ROMAN7[degree]} de ${keyName(tonic)}`
    const askOne = rng.next() < 0.5
    if (askOne) {
      const t = rng.pick(ts)
      return choiceQuestion(
        rng,
        {
          key: `tension-available:${tonic}:${degree}:${t.label}`,
          generator: 'tension-available',
          skill: 'tensions',
          prompt: `Sobre ${on}, la tensión ${tensionName(t)} ¿es disponible o evitada (avoid note)?`,
          audio: `note("${chordAudio([...chord.notes, t.note])}").s("piano")`,
          explanation,
        },
        t.avoid ? 'Evitada' : 'Disponible',
        ['Disponible', 'Evitada'],
      )
    }
    const subsetLabel = (s: readonly string[]) =>
      listEs(s.map((l) => tensionName(ts.find((t) => t.label === l) ?? (ts[0] as Tension))))
    const correct = available.map((t) => t.label)
    return choiceQuestion(
      rng,
      {
        key: `tension-available:${tonic}:${degree}:set`,
        generator: 'tension-available',
        skill: 'tensions',
        prompt: `Sobre ${on}, ¿cuáles son las tensiones disponibles?`,
        explanation,
      },
      subsetLabel(correct),
      rng.shuffle(SUBSETS.filter((s) => s.join() !== correct.join())).map(subsetLabel),
    )
  },
}

export const guideTones: Generator<ChordParams> = {
  id: 'guide-tones',
  skill: 'voice-leading',
  parseParams: (raw) => parseChordParams(raw, ['maj7', '7', 'm7', 'm7b5']),
  generate(params, rng) {
    const symbol = rng.pick(params.symbols)
    const all = notesOf(symbol)
    const notes = [all[1] ?? '', all[3] ?? '']
    return {
      id: '',
      key: `guide-tones:${symbol}`,
      generator: 'guide-tones',
      skill: 'voice-leading',
      prompt: `Escribe las notas guía (guide tones) de ${seventhLabel(symbol)}: su 3.ª y su 7.ª.`,
      input: {
        kind: 'note-set',
        via: ['text', 'keyboard'],
        ordered: false,
        count: 2,
        spellAll: needsRareSpelling(params.symbols.flatMap(notesOf)),
      },
      answer: { kind: 'pitch-classes', notes, spelling: 'strict' },
      explanation: `${seventhLabel(symbol)} = ${american(all)}. La 3.ª es ${formatNote(notes[0] ?? '', 'american')} y la 7.ª es ${formatNote(notes[1] ?? '', 'american')}: definen la calidad del acorde.`,
    }
  },
}

const ROLE = ['fundamental', '3.ª', '5.ª', '7.ª'] as const

// ii→V and V→I: each guide tone of the first chord stays or moves a half step down to the
// nearest guide tone of the next one.
export const guideToneResolution: Generator<KeyParams> = {
  id: 'guide-tone-resolution',
  skill: 'voice-leading',
  parseParams: parseTonics,
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const chords = sevenths(tonic)
    const fromDegree = rng.pick([1, 4])
    const from = chords[fromDegree]
    const to = chords[fromDegree === 1 ? 4 : 0]
    if (!from || !to) throw new Error('missing ii–V–I chord')
    const voice = rng.pick([1, 3])
    const note = from.notes[voice] ?? ''
    const chroma = Note.chroma(note) ?? 0
    const distance = (n: string) => {
      const d = Math.abs(chroma - (Note.chroma(n) ?? 0))
      return Math.min(d, 12 - d)
    }
    const guide = [to.notes[1] ?? '', to.notes[3] ?? '']
    const target = distance(guide[0] ?? '') <= distance(guide[1] ?? '') ? guide[0] : guide[1]
    const label = (n: string, i: number) =>
      `${formatNote(n, 'latin')} (${ROLE[i]} de ${prettySymbol(to.symbol)})`
    const options = to.notes.map(label)
    const correct = label(target ?? '', to.notes.indexOf(target ?? ''))
    const moves = distance(target ?? '') === 0 ? 'se queda en la misma nota' : 'baja medio tono'
    return choiceQuestion(
      rng,
      {
        key: `guide-tone-resolution:${tonic}:${fromDegree}:${voice}`,
        generator: 'guide-tone-resolution',
        skill: 'voice-leading',
        prompt: `En ${keyName(tonic)}, ${prettySymbol(from.symbol)} → ${prettySymbol(to.symbol)}. Con la menor distancia posible, ¿adónde va ${formatNote(note, 'latin')}, la ${ROLE[voice]} de ${prettySymbol(from.symbol)}?`,
        audio: `note("${chordAudio(from.notes)} ${chordAudio(to.notes)}").s("piano").slow(2)`,
        explanation: `${formatNote(note, 'latin')} ${moves} y llega a ${correct}. En un ii–V–I la 3.ª de un acorde pasa a ser la 7.ª del siguiente, y la 7.ª baja medio tono a la 3.ª.`,
      },
      correct,
      options,
    )
  },
}

export const m07: Registered[] = [
  erase(seventhSpelling),
  erase(diatonicSeventh),
  erase(tensionAvailable),
  erase(guideTones),
  erase(guideToneResolution),
]
