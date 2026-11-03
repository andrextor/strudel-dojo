// A hint never gets the answer key, but the model can still work the answer out and say it.
// revealsAnswer rejects a hint that names the canonical answer in any notation the app accepts:
// notes (latin and American, ♯/#/b/♭/words), intervals (3M, tercera mayor, M3), numbers,
// degree names and option texts. Anything the prompt already says gives nothing away. Pure.
import { Interval, Note } from 'tonal'
import type { Question } from '../exercises/types.ts'
import { LETTER_TO_LATIN } from '../theory/es.ts'
import { formatInterval, parseIntervalInput } from '../theory/intervals.ts'

export type HintQuestion = Pick<Question, 'prompt' | 'input' | 'answer'>

const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ')

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const SHARP = '(?:#|♯|\\s?sostenido)'
const FLAT = '(?:b|♭|\\s?bemol)'
const ACCIDENTAL: Record<string, string> = {
  '#': SHARP,
  b: FLAT,
  '##': `(?:##|x|𝄪|\\s?doble\\s?sostenido)`,
  bb: `(?:bb|𝄫|\\s?doble\\s?bemol)`,
}
const NOT_SENTENCE_START = '(?<![.!?¿¡]\\s*)(?<!^\\s*)'

// Regexes that find a pitch class in free text. With an accidental, case does not matter
// ("fa sostenido", "F#"). A natural note must be capitalized and not open a sentence, because
// "la", "mi", "si", "re" and "do" are everyday Spanish words.
function notePatterns(pc: string): RegExp[] {
  const note = Note.get(pc)
  if (note.empty) return []
  const latin = LETTER_TO_LATIN[note.letter] ?? note.letter
  const after = '(?![\\p{L}#♯♭𝄪𝄫])'
  if (note.acc === '') {
    return [new RegExp(`${NOT_SENTENCE_START}(?<!\\p{L})(?:${note.letter}|${latin})${after}`, 'u')]
  }
  const acc = ACCIDENTAL[note.acc] ?? escapeRe(note.acc)
  return [new RegExp(`(?<!\\p{L})(?:${note.letter}|${latin})${acc}${after}`, 'iu')]
}

const NUMBER_WORDS = [
  'cero',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
]

// Every way an interval name can be written: 5J, J5, 5P, P5, quinta justa.
function intervalPatterns(name: string): RegExp[] {
  const i = Interval.get(name)
  if (i.empty) return []
  const shortEs = formatInterval(name, 'short')
  const q = shortEs.replace(/^\d+/, '')
  const forms = [shortEs, `${q}${i.num}`, `${i.num}${i.q}`, `${i.q}${i.num}`]
  return [
    ...forms.map((f) => new RegExp(`(?<![\\p{L}\\d])${escapeRe(f)}(?![\\p{L}\\d])`, 'u')),
    new RegExp(escapeRe(fold(formatInterval(name, 'long')))),
  ]
}

function textPatterns(text: string): RegExp[] {
  if (/^\d+$/.test(text)) {
    const word = NUMBER_WORDS[Number(text)]
    return [
      new RegExp(`(?<!\\d)${text}(?!\\d)`),
      ...(word ? [new RegExp(`(?<!\\p{L})${word}(?!\\p{L})`, 'iu')] : []),
    ]
  }
  const interval = /\d/.test(text) ? parseIntervalInput(text) : null
  if (interval !== null) return intervalPatterns(interval)
  if (!Note.get(text).empty && text.length <= 3) return notePatterns(text)
  return text.trim().length >= 2 ? [new RegExp(escapeRe(fold(text)))] : []
}

function answerPatterns(q: HintQuestion): RegExp[] {
  const { answer, input } = q
  switch (answer.kind) {
    case 'pitch-classes':
      return answer.notes.flatMap(notePatterns)
    case 'text':
      return answer.accepted.flatMap(textPatterns)
    case 'choice': {
      const options = input.kind === 'choice' || input.kind === 'rhythm' ? input.options : []
      const text = options[answer.index]
      return text === undefined ? [] : textPatterns(text)
    }
  }
}

const NAMES_AN_OPTION =
  /\b(opci[oó]n|respuesta)\s+(correcta\s+)?(es\s+)?(la\s+)?(primera|segunda|tercera|cuarta|\d)\b/i

export function revealsAnswer(hint: string, question: HintQuestion): boolean {
  if (question.input.kind === 'choice' || question.input.kind === 'rhythm') {
    if (NAMES_AN_OPTION.test(hint)) return true
  }
  for (const pattern of answerPatterns(question)) {
    // A lowercase-folded pattern is matched against folded text; the rest against the raw text.
    const folded = !pattern.flags.includes('u') && pattern.source === pattern.source.toLowerCase()
    const inHint = pattern.test(folded ? fold(hint) : hint)
    const inPrompt = pattern.test(folded ? fold(question.prompt) : question.prompt)
    if (inHint && !inPrompt) return true
  }
  return false
}
