import { parseIntervalInput, parseNoteInput, sameSound, sameSpelling } from '../theory/index.ts'
import { formatNote } from '../theory/notes.ts'
import type { Answer, Grade, Question, Response } from './types.ts'

// Lowercase, strip accents, collapse whitespace. Used for free-text answers.
export function normalizeText(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')
}

export function grade(question: Question, response: Response): Grade {
  const answer = question.answer
  switch (answer.kind) {
    case 'choice':
      if (response.kind !== 'choice') return { correct: false }
      return { correct: response.index === answer.index }
    case 'text':
      if (response.kind !== 'text') return { correct: false }
      return { correct: gradeText(answer.accepted, response.value) }
    case 'pitch-classes':
      if (response.kind !== 'notes') return { correct: false }
      return gradePitchClasses(question, answer, response.notes)
  }
}

// Accepts the answer typed as an interval (3M/M3/tercera mayor), a note
// (C#/Do#/Do♯), or free text. `accepted` holds canonical tonal forms for the
// first two and normalized text for the last.
function gradeText(accepted: string[], value: string): boolean {
  const interval = parseIntervalInput(value)
  if (interval !== null && accepted.includes(interval)) return true
  const note = parseNoteInput(value)
  if (note !== null && accepted.includes(note.pitchClass)) return true
  return accepted.includes(normalizeText(value))
}

function gradePitchClasses(
  question: Question,
  answer: Extract<Answer, { kind: 'pitch-classes' }>,
  given: string[],
): Grade {
  const parsed = given.map((n) => parseNoteInput(n))
  if (parsed.some((p) => p === null)) return { correct: false, feedback: 'No entendí alguna nota.' }
  const got = parsed.map((p) => (p as { pitchClass: string }).pitchClass)
  const expected = answer.notes
  if (got.length !== expected.length) {
    return { correct: false, feedback: `Faltan notas: esperaba ${expected.length}.` }
  }

  const ordered = question.input.kind === 'note-set' ? question.input.ordered : true
  if (matches(expected, got, ordered, answer.spelling)) return { correct: true }

  // Right sound, wrong spelling — only a miss when strict spelling is required.
  if (answer.spelling === 'strict' && matches(expected, got, ordered, 'enharmonic')) {
    const right = expected.map((n) => formatNote(n, 'american')).join(' ')
    return { correct: false, feedback: `Suena bien, pero el deletreo no: se escribe ${right}.` }
  }
  return { correct: false }
}

function matches(
  expected: string[],
  got: string[],
  ordered: boolean,
  spelling: 'strict' | 'enharmonic',
): boolean {
  const same = spelling === 'strict' ? sameSpelling : sameSound
  if (ordered) return expected.every((e, i) => same(e, got[i] ?? ''))
  // Unordered: every expected note is matched by a distinct given note.
  const pool = [...got]
  for (const e of expected) {
    const idx = pool.findIndex((g) => same(e, g))
    if (idx === -1) return false
    pool.splice(idx, 1)
  }
  return true
}
