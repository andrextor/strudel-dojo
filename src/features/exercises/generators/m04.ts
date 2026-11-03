// M04 · Función armónica y progresiones: function, cadences, progressions, harmonizing a note.
import { type DiatonicTriad, diatonicTriads } from '../../theory/chords.ts'
import { formatNote } from '../../theory/notes.ts'
import type { Generator } from '../types.ts'
import { choiceQuestion, chordAudio, chordLabel, keyName, MAJOR_TONICS } from './_shared.ts'
import { erase, type Registered } from './erase.ts'

interface KeyParams {
  tonics: string[]
}

const parseTonics = (raw: unknown): KeyParams | null => {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const tonics = r.tonics ?? [...MAJOR_TONICS]
  if (!Array.isArray(tonics) || tonics.length === 0) return null
  if (!tonics.every((t) => typeof t === 'string' && diatonicTriads(t, 'major') !== null))
    return null
  return { tonics: tonics as string[] }
}

const triadsOf = (tonic: string): DiatonicTriad[] => {
  const triads = diatonicTriads(tonic, 'major')
  if (triads === null) throw new Error(`no major key on ${tonic}`)
  return triads
}

const label = (t: DiatonicTriad) => chordLabel(t.root, t.quality)

// iii is left out of the questions: it shares notes with both I and V, so its function is ambiguous.
const FUNCTION_OF: Record<number, 'T' | 'S' | 'D'> = {
  1: 'T',
  2: 'S',
  4: 'S',
  5: 'D',
  6: 'T',
  7: 'D',
}
const FUNCTION_ES = {
  T: 'Tónica (reposo)',
  S: 'Subdominante (se aleja)',
  D: 'Dominante (tensión que pide volver)',
} as const
const FUNCTION_NAME = { T: 'tónica', S: 'subdominante', D: 'dominante' } as const

export const harmonicFunction: Generator<KeyParams> = {
  id: 'harmonic-function',
  skill: 'harmonic-function',
  parseParams: parseTonics,
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const triads = triadsOf(tonic)
    const degree = rng.pick([1, 2, 4, 5, 6, 7])
    const t = triads[degree - 1] ?? triads[0]
    const fn = FUNCTION_OF[degree] ?? 'T'
    if (!t) throw new Error('missing triad')
    return choiceQuestion(
      rng,
      {
        key: `harmonic-function:${tonic}:${degree}`,
        generator: 'harmonic-function',
        skill: 'harmonic-function',
        prompt: `En ${keyName(tonic)}, ¿qué función cumple ${label(t)}, el grado ${t.roman}?`,
        audio: `note("<${chordAudio(t.notes)} ${chordAudio(triads[0]?.notes ?? [])}>").s("piano")`,
        explanation: `${t.roman} es de función ${FUNCTION_NAME[fn]}: tónica = I y vi; subdominante = ii y IV; dominante = V y vii°.`,
      },
      FUNCTION_ES[fn],
      Object.values(FUNCTION_ES),
    )
  },
}

// Two-chord endings by degree (1-based). `top` is the chord tone (0 root, 1 third, 2 fifth) left
// in the highest voice of the last chord: only V→I with the tonic on top is a perfect cadence.
const CADENCES = [
  { id: 'perfect', es: 'Auténtica perfecta', from: 5, to: 1, top: 0 },
  { id: 'imperfect-3', es: 'Auténtica imperfecta', from: 5, to: 1, top: 1 },
  { id: 'imperfect-5', es: 'Auténtica imperfecta', from: 5, to: 1, top: 2 },
  { id: 'plagal', es: 'Plagal', from: 4, to: 1, top: 0 },
  { id: 'deceptive', es: 'Rota', from: 5, to: 6, top: 0 },
  { id: 'half-I', es: 'Semicadencia', from: 1, to: 5, top: 2 },
  { id: 'half-IV', es: 'Semicadencia', from: 4, to: 5, top: 0 },
  { id: 'half-ii', es: 'Semicadencia', from: 2, to: 5, top: 1 },
] as const

const WHY: Record<(typeof CADENCES)[number]['id'], string> = {
  perfect: 'dominante a tónica con la tónica arriba, el cierre más fuerte',
  'imperfect-3':
    'dominante a tónica, pero arriba queda la tercera y no la tónica; cierra, con menos peso',
  'imperfect-5':
    'dominante a tónica, pero arriba queda la quinta y no la tónica; cierra, con menos peso',
  plagal: 'subdominante a tónica, el «amén», un reposo sin pasar por la dominante',
  deceptive: 'la dominante promete la tónica y en su lugar aparece el vi',
  'half-I': 'la frase se detiene en el V: queda abierta, como una pregunta',
  'half-IV': 'la frase se detiene en el V: queda abierta, como una pregunta',
  'half-ii': 'la frase se detiene en el V: queda abierta, como una pregunta',
}

// Root-position voicing with the chosen chord tone on top: [1 3 5 1], [1 5 3] or [1 3 5].
const withTop = (notes: readonly string[], top: number): string[] => {
  const [r = '', third = '', fifth = ''] = notes
  return top === 0 ? [r, third, fifth, r] : top === 1 ? [r, fifth, third] : [r, third, fifth]
}

export const cadenceId: Generator<KeyParams & { ear: boolean }> = {
  id: 'cadence-id',
  skill: 'cadences',
  parseParams(raw) {
    const base = parseTonics(raw)
    const ear = typeof raw === 'object' && raw !== null && (raw as { ear?: unknown }).ear === true
    return base && { ...base, ear }
  },
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const triads = triadsOf(tonic)
    const c = rng.pick([...CADENCES])
    const from = triads[c.from - 1]
    const to = triads[c.to - 1]
    if (!from || !to) throw new Error('missing triad')
    const last = withTop(to.notes, c.top)
    const audio = `note("${chordAudio(from.notes)}@2 ${chordAudio(last)}@2").s("piano")`
    const names = `${label(from)} → ${label(to)}`
    const top = formatNote(last[last.length - 1] ?? '', 'latin')
    return choiceQuestion(
      rng,
      {
        key: `cadence-id:${tonic}:${c.id}:${params.ear ? 'ear' : 'read'}`,
        generator: 'cadence-id',
        skill: 'cadences',
        prompt: params.ear
          ? `Escucha el final de una frase en ${keyName(tonic)}. ¿Qué cadencia es?`
          : `En ${keyName(tonic)}, una frase termina con ${names}, los dos en estado fundamental y con ${top} en la voz más aguda. ¿Qué cadencia es?`,
        audio,
        explanation: `${names} (${from.roman} → ${to.roman}), con ${top} arriba: ${WHY[c.id]}. Es una cadencia ${c.es.toLowerCase()}.`,
      },
      c.es,
      rng.shuffle(['Auténtica perfecta', 'Auténtica imperfecta', 'Plagal', 'Rota', 'Semicadencia']),
    )
  },
}

const PROGRESSIONS = [
  [1, 5, 6, 4],
  [1, 6, 4, 5],
  [2, 5, 1],
  [1, 4, 5, 1],
  [6, 4, 1, 5],
  [1, 4, 1, 5],
  [1, 6, 2, 5],
  [4, 5, 1],
  [1, 2, 5, 1],
] as const

export const progressionRoman: Generator<KeyParams> = {
  id: 'progression-roman',
  skill: 'common-progressions',
  parseParams: parseTonics,
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const triads = triadsOf(tonic)
    const romanOf = (p: readonly number[]) => p.map((d) => triads[d - 1]?.roman ?? '').join('–')
    const p = rng.pick([...PROGRESSIONS])
    const chords = p.map((d) => triads[d - 1]).filter((t) => t !== undefined)
    // Same-length progressions first, so the answer can't be picked by counting chords.
    const others = rng
      .shuffle(PROGRESSIONS.filter((x) => x !== p))
      .sort((a, b) => Number(b.length === p.length) - Number(a.length === p.length))
    return choiceQuestion(
      rng,
      {
        key: `progression-roman:${tonic}:${p.join('')}`,
        generator: 'progression-roman',
        skill: 'common-progressions',
        prompt: `En ${keyName(tonic)} suena ${chords.map(label).join(', ')}. ¿Qué progresión es, en cifrado romano?`,
        audio: `note("<${chords.map((t) => chordAudio(t.notes)).join(' ')}>").s("piano")`,
        explanation: `Son los grados ${romanOf(p)} de ${keyName(tonic)}.`,
      },
      romanOf(p),
      others.map(romanOf),
    )
  },
}

// Twelve-bar blues by degree: I I I I · IV IV I I · V IV I I(V).
const BLUES = [1, 1, 1, 1, 4, 4, 1, 1, 5, 4, 1, 5] as const

export const bluesBar: Generator<KeyParams> = {
  id: 'blues-bar',
  skill: 'common-progressions',
  parseParams: parseTonics,
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const triads = triadsOf(tonic)
    const bar = rng.int(1, 12)
    const degree = BLUES[bar - 1] ?? 1
    const primary = [triads[0], triads[3], triads[4]].filter((t) => t !== undefined)
    const fit = triads[degree - 1]
    if (!fit) throw new Error('missing triad')
    const romanLine = BLUES.map((d) => triads[d - 1]?.roman ?? '').join(' ')
    const show = (t: DiatonicTriad) => `${t.roman}: ${label(t)}`
    return choiceQuestion(
      rng,
      {
        key: `blues-bar:${tonic}:${bar}`,
        generator: 'blues-bar',
        skill: 'common-progressions',
        prompt: `En un blues de 12 compases en ${keyName(tonic)}, ¿qué acorde suena en el compás ${bar}?`,
        explanation: `La forma es ${romanLine}: el compás ${bar} es ${show(fit)}.`,
      },
      show(fit),
      primary.filter((t) => t !== fit).map(show),
    )
  },
}

// Degrees 2, 3, 4, 6 and 7 belong to exactly one of I, IV and V, so the answer is unique.
const MELODY_DEGREES = [2, 3, 4, 6, 7] as const

export const harmonizeNote: Generator<KeyParams> = {
  id: 'harmonize-note',
  skill: 'harmonization',
  parseParams: parseTonics,
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const triads = triadsOf(tonic)
    const degree = rng.pick([...MELODY_DEGREES])
    const scaleNote = triads[degree - 1]?.root ?? tonic
    const primary = [triads[0], triads[3], triads[4]].filter((t) => t !== undefined)
    const fit = primary.find((t) => t.notes.includes(scaleNote)) ?? primary[0]
    if (!fit) throw new Error('no primary chord')
    const show = (t: DiatonicTriad) => `${t.roman}: ${label(t)}`
    return choiceQuestion(
      rng,
      {
        key: `harmonize-note:${tonic}:${degree}`,
        generator: 'harmonize-note',
        skill: 'harmonization',
        prompt: `En ${keyName(tonic)}, la melodía se queda en ${formatNote(scaleNote, 'latin')} todo el compás. ¿Cuál de los acordes principales (I, IV, V) la contiene?`,
        explanation: `${formatNote(scaleNote, 'latin')} está en ${show(fit)}, formado por ${fit.notes.map((n) => formatNote(n, 'american')).join(' ')}, y no en los otros dos.`,
      },
      show(fit),
      primary.filter((t) => t !== fit).map(show),
    )
  },
}

export const m04: Registered[] = [
  erase(harmonicFunction),
  erase(cadenceId),
  erase(progressionRoman),
  erase(bluesBar),
  erase(harmonizeNote),
]
