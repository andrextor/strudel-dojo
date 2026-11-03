import { Note } from 'tonal'
import { ACCIDENTAL_TO_UNICODE, LATIN_TO_LETTER, LETTER_TO_LATIN, type Notation } from './es.ts'

export interface ParsedNote {
  pitchClass: string
  octave: number | null
}

// Latin solfège names, longest first so "sol" wins before any 2-letter match.
const LATIN_PREFIXES = Object.keys(LATIN_TO_LETTER).sort((a, b) => b.length - a.length)

// Replaces unicode accidentals and Spanish accidental words with ASCII (#, b, x).
function normalizeAccidentals(raw: string): string {
  let s = raw
    .replaceAll('\u{1D12A}', '##')
    .replaceAll('\u{1D12B}', 'bb')
    .replaceAll('♯', '#')
    .replaceAll('♭', 'b')
  // Word forms (doble first so it is not shadowed by the single word).
  s = s
    .replace(/\s*doble\s*sostenid[oa]/gi, '##')
    .replace(/\s*doble\s*bemol/gi, 'bb')
    .replace(/\s*sostenid[oa]/gi, '#')
    .replace(/\s*bemol/gi, 'b')
  return s
}

export function parseNoteInput(input: unknown): ParsedNote | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (trimmed === '') return null

  let s = normalizeAccidentals(trimmed).toLowerCase().replace(/\s+/g, '')
  if (s === '') return null

  // Letter: a latin solfège prefix, otherwise a single American letter a–g.
  let letter: string | undefined
  for (const prefix of LATIN_PREFIXES) {
    if (s.startsWith(prefix)) {
      letter = LATIN_TO_LETTER[prefix]
      s = s.slice(prefix.length)
      break
    }
  }
  if (letter === undefined) {
    const first = s[0]
    if (first !== undefined && first >= 'a' && first <= 'g') {
      letter = first.toUpperCase()
      s = s.slice(1)
    } else {
      return null
    }
  }

  // Accidentals: one run of the same symbol, up to a double. "x" is double sharp.
  const accMatch = s.match(/^(##|bb|#|b|x)/)
  let accidental = ''
  if (accMatch) {
    accidental = accMatch[0] === 'x' ? '##' : accMatch[0]
    s = s.slice(accMatch[0].length)
  }

  // Whatever is left must be an octave (optionally negative) or nothing.
  let octave: number | null = null
  if (s !== '') {
    if (!/^-?\d+$/.test(s)) return null
    octave = Number.parseInt(s, 10)
  }

  const spelled = `${letter}${accidental}${octave ?? ''}`
  const note = Note.get(spelled)
  if (note.empty || note.pc === '') return null
  return { pitchClass: note.pc, octave }
}

export function formatNote(pc: string, notation: Notation): string {
  const note = Note.get(pc)
  if (note.empty) return pc
  const base = notation === 'latin' ? (LETTER_TO_LATIN[note.letter] ?? note.letter) : note.letter
  const accidental = ACCIDENTAL_TO_UNICODE[note.acc] ?? note.acc
  const octave = note.oct ?? ''
  return `${base}${accidental}${octave}`
}

export function sameSpelling(a: string, b: string): boolean {
  const na = Note.get(a)
  const nb = Note.get(b)
  return !na.empty && !nb.empty && na.pc === nb.pc
}

export function sameSound(a: string, b: string): boolean {
  const ca = Note.chroma(a)
  const cb = Note.chroma(b)
  return ca !== undefined && ca === cb
}

export function parseNoteList(input: unknown): ParsedNote[] | null {
  if (typeof input !== 'string') return null
  const tokens = input.split(/[\s,–—-]+/).filter((t) => t !== '')
  if (tokens.length === 0) return null
  const result: ParsedNote[] = []
  for (const token of tokens) {
    const parsed = parseNoteInput(token)
    if (parsed === null) return null
    result.push(parsed)
  }
  return result
}

const ACCIDENTAL_WORDS: Record<string, string> = {
  '##': ' doble sostenido',
  bb: ' doble bemol',
  '#': ' sostenido',
  b: ' bemol',
  '': '',
}

// What a screen reader should say: "Do sostenido 4" / "C sostenido 4".
export function spokenNote(name: string, notation: Notation): string {
  const note = Note.get(name)
  if (note.empty) return name
  const base = notation === 'latin' ? (LETTER_TO_LATIN[note.letter] ?? note.letter) : note.letter
  const octave = note.oct === undefined ? '' : ` ${note.oct}`
  return `${base}${ACCIDENTAL_WORDS[note.acc] ?? ''}${octave}`
}
