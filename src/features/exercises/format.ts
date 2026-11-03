// Answers and responses as text for review screens (result page, saved test answers).
import type { Notation } from '../theory/es.ts'
import { formatNote, parseNoteInput } from '../theory/notes.ts'
import type { Question, Response } from './types.ts'

const notes = (list: string[], notation: Notation) =>
  list.map((n) => formatNote(parseNoteInput(n)?.pitchClass ?? n, notation)).join(' ')

export function formatResponse(q: Question, r: Response | null, notation: Notation): string {
  if (r === null) return 'Sin responder'
  switch (r.kind) {
    case 'choice': {
      const options = q.input.kind === 'choice' || q.input.kind === 'rhythm' ? q.input.options : []
      return options[r.index] ?? 'Sin responder'
    }
    case 'notes':
      return notes(r.notes, notation) || 'Sin responder'
    case 'text':
      return r.value.trim() || 'Sin responder'
  }
}

export function formatAnswer(q: Question, notation: Notation): string {
  const a = q.answer
  switch (a.kind) {
    case 'choice':
      return formatResponse(q, { kind: 'choice', index: a.index }, notation)
    case 'pitch-classes':
      return notes(a.notes, notation)
    case 'text':
      return a.accepted[0] ?? ''
  }
}
