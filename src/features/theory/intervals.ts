import { Interval, Note } from 'tonal'
import { INTERVAL_NUMBER_ES, QUALITY_LONG_ES, QUALITY_SHORT_ES } from './es.ts'

// Reverse maps for parsing Spanish input.
const NUMBER_ES_TO_NUM = new Map(
  Object.entries(INTERVAL_NUMBER_ES).map(([num, word]) => [word, Number(num)]),
)
const QUALITY_WORD_TO_LETTER = new Map<string, string>([
  ['justa', 'P'],
  ['mayor', 'M'],
  ['menor', 'm'],
  ['aumentada', 'A'],
  ['disminuida', 'd'],
])

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Accepts tonal forms (5P, P5), Spanish short (5J) and long (quinta justa).
// Returns the canonical tonal name (e.g. "5P", "3M") or null.
export function parseIntervalInput(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const raw = input.trim()
  if (raw === '') return null

  // Short form: digits + quality letter in either order (3M, M3, 5J, J5, 4A…).
  const compact = raw.replace(/\s+/g, '')
  const shortMatch = compact.match(/^(\d{1,2})([PMmAdJ])$/) ?? reverse(compact)
  if (shortMatch) {
    const num = shortMatch[1]
    const letter = shortMatch[2] === 'J' ? 'P' : shortMatch[2]
    const interval = Interval.get(`${num}${letter}`)
    return interval.empty ? null : interval.name
  }

  // Long Spanish form: "quinta justa", "tercera mayor".
  const words = stripAccents(raw.toLowerCase()).split(/\s+/)
  if (words.length === 2) {
    const num = NUMBER_ES_TO_NUM.get(normalizeNumberWord(words[0] ?? ''))
    const letter = QUALITY_WORD_TO_LETTER.get(normalizeQualityWord(words[1] ?? ''))
    if (num !== undefined && letter !== undefined) {
      const interval = Interval.get(`${num}${letter}`)
      return interval.empty ? null : interval.name
    }
  }
  return null
}

// "P5"/"J5" → "5P" shape, letter then digits.
function reverse(compact: string): RegExpMatchArray | null {
  const m = compact.match(/^([PMmAdJ])(\d{1,2})$/)
  return m ? ([m[0], m[2], m[1]] as unknown as RegExpMatchArray) : null
}

// The dictionary stores accented words; match against their accent-stripped form.
function normalizeNumberWord(word: string): string {
  for (const key of NUMBER_ES_TO_NUM.keys()) {
    if (stripAccents(key) === word) return key
  }
  return word
}
function normalizeQualityWord(word: string): string {
  // Qualities have no accents, but keep symmetry and allow a trailing "a".
  return word
}

export function formatInterval(name: string, length: 'short' | 'long'): string {
  const interval = Interval.get(name)
  if (interval.empty) return name
  const quality = interval.q
  if (length === 'short') {
    return `${interval.num}${QUALITY_SHORT_ES[quality] ?? quality}`
  }
  const noun = INTERVAL_NUMBER_ES[interval.num]
  const word = QUALITY_LONG_ES[quality]
  if (noun === undefined || word === undefined) return name
  return `${noun} ${word}`
}

export function intervalBetween(a: string, b: string): string | null {
  const name = Interval.distance(a, b)
  return name === '' ? null : name
}

export function transposeNote(note: string, interval: string): string | null {
  const result = Note.transpose(note, interval)
  return result === '' ? null : result
}

export function invertInterval(name: string): string | null {
  const inverted = Interval.invert(name)
  return inverted === '' ? null : inverted
}
