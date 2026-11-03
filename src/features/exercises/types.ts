import type { Rng } from '../../lib/random.ts'

export type Seed = string // reproducible: `${topicId}:${attemptId}:${index}`

export type InputVia = 'keyboard' | 'fretboard' | 'text' | 'midi'

export type InputSpec =
  | { kind: 'choice'; options: string[] }
  | { kind: 'note'; via: InputVia[] }
  | { kind: 'note-set'; via: InputVia[]; ordered: boolean; count?: number }
  | { kind: 'text'; placeholder: string }
  | { kind: 'rhythm'; options: string[] }

export type Answer =
  | { kind: 'choice'; index: number }
  | { kind: 'pitch-classes'; notes: string[]; spelling: 'strict' | 'enharmonic' }
  | { kind: 'text'; accepted: string[] } // canonical/normalized forms

export type Response =
  | { kind: 'choice'; index: number; hinted?: boolean }
  | { kind: 'notes'; notes: string[]; hinted?: boolean }
  | { kind: 'text'; value: string; hinted?: boolean }

export type Grade = { correct: boolean; feedback?: string }

export interface Question {
  id: string // = seed
  key: string // canonical content; two questions with the same key are the same
  generator: string
  skill: string
  prompt: string
  input: InputSpec
  audio?: string // Strudel code for ear exercises
  staff?: string // ABC to draw
  answer: Answer
  explanation: string
}

export interface Generator<P> {
  id: string
  skill: string
  parseParams(raw: unknown): P | null
  generate(params: P, rng: Rng): Question
}
