// M08 · Armonía avanzada: secondary dominants, modal interchange, tritone subs, passing dim7.
import { Chord, Note } from 'tonal'
import { diatonicTriads } from '../../theory/chords.ts'
import { formatNote } from '../../theory/notes.ts'
import type { Generator } from '../types.ts'
import {
  choiceQuestion,
  chordAudio,
  chordLabel,
  keyName,
  MAJOR_TONICS,
  prettySymbol,
} from './_shared.ts'
import { erase, type Registered } from './erase.ts'

interface KeyParams {
  tonics: string[]
}

const keyParser =
  (defaults: readonly string[]) =>
  (raw: unknown): KeyParams | null => {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const tonics = r.tonics ?? [...defaults]
    if (!Array.isArray(tonics) || tonics.length === 0) return null
    if (!tonics.every((t) => typeof t === 'string' && diatonicTriads(t, 'major') !== null))
      return null
    return { tonics: tonics as string[] }
  }

// Chromatic roots stay readable: a double accidental, F♭, C♭, E♯ or B♯ becomes its enharmonic.
const readable = (pc: string) => (/(##|bb)|^(Fb|Cb|E#|B#)$/.test(pc) ? Note.enharmonic(pc) : pc)
// The passing root keeps its chromatic spelling (E♯°7 leads to F♯m); only doubles are respelled.
const noDoubles = (pc: string) => (/##|bb/.test(pc) ? Note.enharmonic(pc) : pc)
const up = (pc: string, interval: string) => Note.pitchClass(Note.transpose(pc, interval))
const latin = (pc: string) => formatNote(pc, 'latin')
const notesOf = (symbol: string) => Chord.get(symbol).notes
const spelled = (symbol: string) =>
  notesOf(symbol)
    .map((n) => formatNote(n, 'american'))
    .join(' ')

// V/ii … V/vi: degrees 2–6 of the major key (index into its triads).
const TARGETS = [1, 2, 3, 4, 5] as const

export const secondaryDominant: Generator<KeyParams> = {
  id: 'secondary-dominant',
  skill: 'secondary-dominants',
  parseParams: keyParser(MAJOR_TONICS),
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const triads = diatonicTriads(tonic, 'major') ?? []
    const i = rng.pick([...TARGETS])
    const target = triads[i]
    if (!target) throw new Error('missing triad')
    const v7 = (t: (typeof triads)[number]) => `${up(t.root, '5P')}7`
    const dom = v7(target)
    const slash = `V/${target.roman}`
    const targetLabel = chordLabel(target.root, target.quality)
    const askChord = rng.next() < 0.5
    const others = TARGETS.filter((x) => x !== i).map((x) => triads[x])
    const explanation = `${slash} es el V7 de ${targetLabel}: una quinta justa arriba de ${latin(target.root)}, ${prettySymbol(dom)} (${spelled(dom)}). Su tercera, ${latin(notesOf(dom)[1] ?? '')}, es la sensible que sube a ${latin(target.root)}.`
    const audio = `note("<${chordAudio(notesOf(dom))} ${chordAudio(target.notes)}>").s("piano")`
    if (askChord) {
      return choiceQuestion(
        rng,
        {
          key: `secondary-dominant:${tonic}:${i}:chord`,
          generator: 'secondary-dominant',
          skill: 'secondary-dominants',
          prompt: `En ${keyName(tonic)}, ¿cuál es la dominante secundaria ${slash}, la que resuelve a ${targetLabel}?`,
          audio,
          explanation,
        },
        prettySymbol(dom),
        rng.shuffle([
          prettySymbol(`${up(target.root, '5P')}m7`),
          prettySymbol(`${up(target.root, '4P')}7`),
          ...others.flatMap((t) => (t ? [prettySymbol(v7(t))] : [])),
        ]),
      )
    }
    return choiceQuestion(
      rng,
      {
        key: `secondary-dominant:${tonic}:${i}:degree`,
        generator: 'secondary-dominant',
        skill: 'secondary-dominants',
        prompt: `En ${keyName(tonic)} suena ${prettySymbol(dom)}, que no es de la tonalidad. ¿De qué grado es dominante secundaria?`,
        audio,
        explanation,
      },
      `${slash} (resuelve a ${prettySymbol(target.root + (target.quality === 'minor' ? 'm' : ''))})`,
      others.flatMap((t) =>
        t
          ? [
              `V/${t.roman} (resuelve a ${prettySymbol(t.root + (t.quality === 'minor' ? 'm' : ''))})`,
            ]
          : [],
      ),
    )
  },
}

// Degrees borrowed from the parallel natural minor: iv, ♭VI, ♭VII, ♭III (index into its triads).
const BORROWED = [
  { i: 3, roman: 'iv' },
  { i: 5, roman: '♭VI' },
  { i: 6, roman: '♭VII' },
  { i: 2, roman: '♭III' },
] as const

// Db and Gb minor need double flats (B𝄫, E𝄫): left out of the default keys.
const BORROW_TONICS = MAJOR_TONICS.filter((t) => t !== 'Db' && t !== 'Gb')

export const borrowedChord: Generator<KeyParams> = {
  id: 'borrowed-chord',
  skill: 'modal-interchange',
  parseParams: keyParser(BORROW_TONICS),
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const major = diatonicTriads(tonic, 'major') ?? []
    const minor = diatonicTriads(tonic, 'minor') ?? []
    const b = rng.pick([...BORROWED])
    const chord = minor[b.i]
    if (!chord) throw new Error('missing triad')
    const label = chordLabel(chord.root, chord.quality)
    const explanation = `${label} es el ${b.roman} de ${keyName(tonic, 'minor')}, la menor paralela: misma tónica, otra escala. En ${keyName(tonic)} ese grado es ${major[b.i]?.roman ?? ''} (${chordLabel(major[b.i]?.root ?? '', major[b.i]?.quality ?? 'major')}); el préstamo le da un color más oscuro.`
    if (rng.next() < 0.5) {
      return choiceQuestion(
        rng,
        {
          key: `borrowed-chord:${tonic}:${b.i}:which`,
          generator: 'borrowed-chord',
          skill: 'modal-interchange',
          prompt: `En ${keyName(tonic)}, ¿cuál de estos acordes es un préstamo de ${keyName(tonic, 'minor')}?`,
          explanation,
        },
        label,
        rng
          .shuffle(major.filter((t) => t.quality !== 'diminished'))
          .map((t) => chordLabel(t.root, t.quality)),
      )
    }
    return choiceQuestion(
      rng,
      {
        key: `borrowed-chord:${tonic}:${b.i}:degree`,
        generator: 'borrowed-chord',
        skill: 'modal-interchange',
        prompt: `En ${keyName(tonic)} aparece ${label}, prestado de ${keyName(tonic, 'minor')}. ¿Qué grado es?`,
        explanation,
      },
      b.roman,
      BORROWED.map((x) => x.roman),
    )
  },
}

const subOf = (dominantRoot: string) => readable(up(dominantRoot, '5d'))

export const tritoneSub: Generator<KeyParams> = {
  id: 'tritone-sub',
  skill: 'tritone-sub',
  parseParams: keyParser(MAJOR_TONICS),
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const root = up(tonic, '5P')
    const dom = `${root}7`
    const sub = `${subOf(root)}7`
    const [, third = '', , seventh = ''] = notesOf(dom)
    const explanation = `${prettySymbol(sub)} está a un tritono (quinta disminuida) de ${prettySymbol(dom)} y comparte su tritono interior: ${latin(third)} y ${latin(seventh)}, la tercera y la séptima. Por eso lo sustituye y resuelve igual a ${latin(tonic)}, con el bajo bajando medio tono.`
    const variant = rng.pick(['plain', 'reharm', 'shared'] as const)
    if (variant === 'shared') {
      const [r = '', , fifth = ''] = notesOf(dom)
      const pair = (a: string, c: string) => `${latin(a)} y ${latin(c)}`
      return choiceQuestion(
        rng,
        {
          key: `tritone-sub:${tonic}:shared`,
          generator: 'tritone-sub',
          skill: 'tritone-sub',
          prompt: `${prettySymbol(dom)} y su sustituto tritonal ${prettySymbol(sub)} comparten dos notas. ¿Cuáles?`,
          explanation,
        },
        pair(third, seventh),
        rng.shuffle([pair(r, fifth), pair(r, third), pair(fifth, seventh), pair(r, seventh)]),
      )
    }
    const reharm = variant === 'reharm'
    const ii = `${up(tonic, '2M')}m7`
    return choiceQuestion(
      rng,
      {
        key: `tritone-sub:${tonic}:${variant}`,
        generator: 'tritone-sub',
        skill: 'tritone-sub',
        prompt: reharm
          ? `En ${keyName(tonic)}, reharmoniza ${prettySymbol(ii)} – ${prettySymbol(dom)} – ${prettySymbol(`${tonic}maj7`)} cambiando el V7 por su sustituto tritonal. ¿Qué acorde va en lugar de ${prettySymbol(dom)}?`
          : `¿Cuál es el sustituto tritonal de ${prettySymbol(dom)}?`,
        ...(reharm && {
          audio: `note("<${[ii, sub, `${tonic}maj7`].map((c) => chordAudio(notesOf(c))).join(' ')}>").s("piano")`,
        }),
        explanation,
      },
      prettySymbol(sub),
      rng.shuffle([
        prettySymbol(`${subOf(root)}maj7`),
        prettySymbol(`${subOf(root)}m7`),
        prettySymbol(`${readable(up(root, '4P'))}7`),
        prettySymbol(`${readable(up(root, '2m'))}7`),
        prettySymbol(`${readable(up(root, '2M'))}7`),
      ]),
    )
  },
}

// Whole-tone steps between neighbouring degrees (index into the triads), up or down.
const STEPS = [
  [0, 1],
  [1, 2],
  [3, 4],
  [4, 5],
  [2, 1],
  [1, 0],
  [5, 4],
] as const

export const passingChord: Generator<KeyParams> = {
  id: 'passing-chord',
  skill: 'passing-chords',
  parseParams: keyParser(MAJOR_TONICS),
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const triads = diatonicTriads(tonic, 'major') ?? []
    const [a, c] = rng.pick([...STEPS])
    const from = triads[a]
    const to = triads[c]
    if (!from || !to) throw new Error('missing triad')
    const ascending = c > a
    // Up, the bass raises the first root (C → C♯); down, it lowers the first one (E → E♭).
    const passRoot = noDoubles(up(from.root, ascending ? '1A' : '-1A'))
    const passing = `${passRoot}dim7`
    const fromLabel = chordLabel(from.root, from.quality)
    const toLabel = chordLabel(to.root, to.quality)
    const bass = [from.root, passRoot, to.root].map(latin).join(' → ')
    return choiceQuestion(
      rng,
      {
        key: `passing-chord:${tonic}:${a}${c}`,
        generator: 'passing-chord',
        skill: 'passing-chords',
        prompt: `En ${keyName(tonic)} vas de ${fromLabel} a ${toLabel} y quieres que el bajo ${ascending ? 'suba' : 'baje'} por semitonos. ¿Qué acorde de paso va en medio?`,
        audio: `note("<${[from.notes, notesOf(passing), to.notes].map((n) => chordAudio(n)).join(' ')}>").s("piano")`,
        explanation: `${prettySymbol(passing)} (${spelled(passing)}) llena el hueco: el bajo hace ${bass}, todo por semitonos, y el disminuido empuja hacia ${toLabel}.`,
      },
      prettySymbol(passing),
      rng.shuffle([
        prettySymbol(`${from.root}dim7`),
        prettySymbol(`${to.root}dim7`),
        prettySymbol(`${passRoot}m7`),
        prettySymbol(`${passRoot}maj7`),
      ]),
    )
  },
}

export const m08: Registered[] = [
  erase(secondaryDominant),
  erase(borrowedChord),
  erase(tritoneSub),
  erase(passingChord),
]
