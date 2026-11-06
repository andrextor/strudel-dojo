import type { InputVia, Question, Response } from '../exercises/types.ts'
import type { SenseiReview } from '../sensei/types.ts'

export type LocalDate = string // 'YYYY-MM-DD' in the viewer's time zone

export type TopicStatus =
  | 'locked'
  | 'not_started'
  | 'in_progress'
  | 'passed'
  | 'passed_by_placement'
export type ModuleStatus = 'locked' | 'available' | 'exam_ready' | 'passed' | 'draft'
export type KataStatus = 'not_started' | 'attempted' | 'passed'

export interface TestAttempt {
  id: string
  kind: 'test' | 'placement'
  scopeId: string // topicId for tests, moduleId for placements
  startedAt: string
  submittedAt: string | null
  questions: Question[]
  responses: (Response | null)[]
  correct: number | null
  passed: boolean | null
}

export interface KataRecord {
  code: string
  attempts: number
  passedAt: string | null
  helped: boolean
  solutionSeen: boolean
}

export interface BossRecord {
  submittedAt: string
  code: string
  assertions: { type: string; pass: boolean; message: string }[]
  review: SenseiReview | null
  selfAssessed: boolean
  score: number
  passed: boolean
}

export interface SkillStat {
  correct: number
  wrong: number
  lastSeen: string
  box: number // Leitner box 1–5
}

export interface Scroll {
  id: string
  name: string
  code: string
  updatedAt: string
}

export interface Prefs {
  instrument: 'keyboard' | 'fretboard'
  notation: 'latin' | 'american'
  midi: boolean
  sound: boolean
  lefty: boolean // mirrors the fretboard
  via: InputVia | null // last answer input chosen in a question card
}

export interface GuitarBest {
  bpm: number
  at: string
  helped: boolean // the positions were shown on the fretboard
}

export interface GuitarState {
  latencyMs: number
  minRms: number
  deviceId: string | null
  best: Record<string, GuitarBest> // by drill key, e.g. "notes:5-1:0-12:all"
}

export interface ProgressState {
  version: 1
  attempts: TestAttempt[]
  katas: Record<string, KataRecord>
  bosses: Record<string, BossRecord[]>
  skillStats: Record<string, SkillStat>
  practiceDays: Record<LocalDate, { answered: number; correct: number }>
  scrolls: Scroll[]
  prefs: Prefs
  backedUpAt: string | null // last backup download, for the 14-day reminder
  guitar?: GuitarState // fretboard gym (spec 08); absent until first used
}
