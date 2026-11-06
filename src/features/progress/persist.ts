// Defensive parsing of saved progress and backups: invalid pieces are dropped, valid ones kept.
import type { Answer, InputSpec, InputVia, Question, Response } from '../exercises/types.ts'
import { type Profile, parseProfile } from '../profiles/profiles.ts'
import type {
  BossRecord,
  GuitarBest,
  GuitarState,
  KataRecord,
  Prefs,
  ProgressState,
  Scroll,
  SkillStat,
  TestAttempt,
} from './types.ts'

type Fields = Record<string, unknown>
const isObject = (v: unknown): v is Fields =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isString = (v: unknown): v is string => typeof v === 'string'
const isInt = (v: unknown): v is number => Number.isInteger(v)
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString)
const isNullableString = (v: unknown): v is string | null => v === null || isString(v)

function list<T>(raw: unknown, read: (v: unknown) => T | null): T[] {
  if (!Array.isArray(raw)) return []
  return raw.map(read).filter((v): v is T => v !== null)
}

function record<T>(raw: unknown, read: (v: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {}
  if (!isObject(raw)) return out
  for (const [key, value] of Object.entries(raw)) {
    const parsed = read(value)
    if (parsed !== null) out[key] = parsed
  }
  return out
}

export const DEFAULT_PREFS: Prefs = {
  instrument: 'keyboard',
  notation: 'latin',
  midi: false,
  sound: true,
  lefty: false,
  via: null,
}

export const emptyProgress = (): ProgressState => ({
  version: 1,
  attempts: [],
  katas: {},
  bosses: {},
  skillStats: {},
  practiceDays: {},
  scrolls: [],
  prefs: { ...DEFAULT_PREFS },
  backedUpAt: null,
})

const VIAS: readonly string[] = ['keyboard', 'fretboard', 'text', 'midi'] satisfies InputVia[]
const isVia = (x: string): x is InputVia => VIAS.includes(x)

export function readInput(v: unknown): InputSpec | null {
  if (!isObject(v)) return null
  switch (v.kind) {
    case 'choice':
    case 'rhythm':
      return isStrings(v.options) ? { kind: v.kind, options: v.options } : null
    case 'text':
      return isString(v.placeholder) ? { kind: 'text', placeholder: v.placeholder } : null
    case 'note':
    case 'note-set': {
      if (!isStrings(v.via)) return null
      const via = v.via.filter(isVia)
      const spellAll = v.spellAll === true ? { spellAll: true } : {}
      if (v.kind === 'note') return { kind: 'note', via, ...spellAll }
      if (!isBool(v.ordered)) return null
      return {
        kind: 'note-set',
        via,
        ordered: v.ordered,
        ...(isInt(v.count) ? { count: v.count } : {}),
        ...spellAll,
      }
    }
    default:
      return null
  }
}

export function readAnswer(v: unknown): Answer | null {
  if (!isObject(v)) return null
  if (v.kind === 'choice' && isInt(v.index)) return { kind: 'choice', index: v.index }
  if (v.kind === 'text' && isStrings(v.accepted)) return { kind: 'text', accepted: v.accepted }
  if (v.kind === 'pitch-classes' && isStrings(v.notes)) {
    if (v.spelling !== 'strict' && v.spelling !== 'enharmonic') return null
    return { kind: 'pitch-classes', notes: v.notes, spelling: v.spelling }
  }
  return null
}

function readQuestion(v: unknown): Question | null {
  if (!isObject(v)) return null
  const { id, key, generator, skill, prompt, explanation, audio, staff, marked } = v
  if (!isString(id) || !isString(key) || !isString(generator) || !isString(skill)) return null
  if (!isString(prompt) || !isString(explanation)) return null
  const input = readInput(v.input)
  const answer = readAnswer(v.answer)
  if (input === null || answer === null) return null
  return {
    id,
    key,
    generator,
    skill,
    prompt,
    input,
    answer,
    explanation,
    ...(isString(audio) ? { audio } : {}),
    ...(isString(staff) ? { staff } : {}),
    ...(isStrings(marked) ? { marked } : {}),
  }
}

export function readResponse(v: unknown): Response | null {
  if (!isObject(v)) return null
  const hinted = v.hinted === true ? { hinted: true } : {}
  if (v.kind === 'choice' && isInt(v.index)) return { kind: 'choice', index: v.index, ...hinted }
  if (v.kind === 'notes' && isStrings(v.notes)) return { kind: 'notes', notes: v.notes, ...hinted }
  if (v.kind === 'text' && isString(v.value)) return { kind: 'text', value: v.value, ...hinted }
  return null
}

function readAttempt(v: unknown): TestAttempt | null {
  if (!isObject(v)) return null
  const { id, kind, scopeId, startedAt, submittedAt, correct, passed } = v
  if (!isString(id) || (kind !== 'test' && kind !== 'placement') || !isString(scopeId)) return null
  if (!isString(startedAt) || !isNullableString(submittedAt)) return null
  if (!Array.isArray(v.questions) || !Array.isArray(v.responses)) return null
  const questions = v.questions.map(readQuestion)
  if (questions.some((q) => q === null) || v.responses.length !== questions.length) return null
  return {
    id,
    kind,
    scopeId,
    startedAt,
    submittedAt,
    questions: questions.filter((q): q is Question => q !== null),
    responses: v.responses.map(readResponse),
    correct: submittedAt !== null && isInt(correct) ? correct : null,
    passed: submittedAt !== null && isBool(passed) ? passed : null,
  }
}

function readKata(v: unknown): KataRecord | null {
  if (!isObject(v) || !isString(v.code) || !isInt(v.attempts)) return null
  if (!isNullableString(v.passedAt)) return null
  return {
    code: v.code,
    attempts: v.attempts,
    passedAt: v.passedAt,
    helped: v.helped === true,
    solutionSeen: v.solutionSeen === true,
  }
}

function readBossRecord(v: unknown): BossRecord | null {
  if (!isObject(v) || !isString(v.submittedAt) || !isString(v.code)) return null
  if (typeof v.score !== 'number' || !isBool(v.passed)) return null
  const assertions = list(v.assertions, (a) =>
    isObject(a) && isString(a.type) && isBool(a.pass) && isString(a.message)
      ? { type: a.type, pass: a.pass, message: a.message }
      : null,
  )
  return {
    submittedAt: v.submittedAt,
    code: v.code,
    assertions,
    review: readReview(v.review),
    selfAssessed: v.selfAssessed === true,
    score: v.score,
    passed: v.passed,
  }
}

function readReview(v: unknown): BossRecord['review'] {
  if (!isObject(v) || typeof v.score !== 'number') return null
  if (!isStrings(v.strengths) || !isStrings(v.nextSteps)) return null
  const variation = v.variation
  if (!isObject(variation) || !isString(variation.idea) || !isString(variation.code)) return null
  const criteria = list(v.criteria, (c) =>
    isObject(c) && isString(c.id) && typeof c.score === 'number' && isString(c.comment)
      ? { id: c.id, score: c.score, comment: c.comment }
      : null,
  )
  return {
    criteria,
    score: v.score,
    strengths: v.strengths,
    nextSteps: v.nextSteps,
    variation: { idea: variation.idea, code: variation.code },
  }
}

function readSkill(v: unknown): SkillStat | null {
  if (!isObject(v) || !isInt(v.correct) || !isInt(v.wrong) || !isString(v.lastSeen)) return null
  const box = isInt(v.box) ? Math.min(5, Math.max(1, v.box)) : 1
  return { correct: v.correct, wrong: v.wrong, lastSeen: v.lastSeen, box }
}

function readDay(v: unknown): { answered: number; correct: number } | null {
  if (!isObject(v) || !isInt(v.answered) || !isInt(v.correct)) return null
  return { answered: v.answered, correct: Math.min(v.correct, v.answered) }
}

function readScroll(v: unknown): Scroll | null {
  if (!isObject(v) || !isString(v.id) || !isString(v.name) || !isString(v.code)) return null
  return {
    id: v.id,
    name: v.name,
    code: v.code,
    updatedAt: isString(v.updatedAt) ? v.updatedAt : '',
  }
}

function readPrefs(v: unknown): Prefs {
  if (!isObject(v)) return { ...DEFAULT_PREFS }
  return {
    instrument: v.instrument === 'fretboard' ? 'fretboard' : 'keyboard',
    notation: v.notation === 'american' ? 'american' : 'latin',
    midi: v.midi === true,
    sound: v.sound !== false,
    lefty: v.lefty === true,
    via: isString(v.via) && isVia(v.via) ? v.via : null,
  }
}

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/

export const DEFAULT_GUITAR: GuitarState = { latencyMs: 0, minRms: 0.01, deviceId: null, best: {} }

const inRange = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi

function readGuitarBest(v: unknown): GuitarBest | null {
  if (!isObject(v) || !inRange(v.bpm, 1, 400) || !isString(v.at)) return null
  return { bpm: v.bpm, at: v.at, helped: v.helped === true }
}

// A corrupt guitar block falls back to defaults field by field; the rest of the progress stays.
function readGuitar(v: unknown): GuitarState {
  if (!isObject(v)) return { ...DEFAULT_GUITAR, best: {} }
  return {
    latencyMs: inRange(v.latencyMs, 0, 500) ? v.latencyMs : DEFAULT_GUITAR.latencyMs,
    minRms: inRange(v.minRms, 0.0005, 0.5) ? v.minRms : DEFAULT_GUITAR.minRms,
    deviceId: isString(v.deviceId) ? v.deviceId : null,
    best: record(v.best, readGuitarBest),
  }
}

export function parseProgress(raw: unknown): ProgressState {
  if (!isObject(raw) || raw.version !== 1) return emptyProgress()
  const days = record(raw.practiceDays, readDay)
  for (const day of Object.keys(days)) if (!LOCAL_DATE.test(day)) delete days[day]
  return {
    version: 1,
    attempts: list(raw.attempts, readAttempt),
    katas: record(raw.katas, readKata),
    bosses: record(raw.bosses, (v) => (Array.isArray(v) ? list(v, readBossRecord) : null)),
    skillStats: record(raw.skillStats, readSkill),
    practiceDays: days,
    scrolls: list(raw.scrolls, readScroll),
    ...(isObject(raw.deletedScrolls)
      ? { deletedScrolls: record(raw.deletedScrolls, (v) => (isString(v) ? v : null)) }
      : {}),
    prefs: readPrefs(raw.prefs),
    backedUpAt: isString(raw.backedUpAt) ? raw.backedUpAt : null,
    ...(raw.guitar === undefined ? {} : { guitar: readGuitar(raw.guitar) }),
  }
}

// ---- Backup -------------------------------------------------------------------------------

export interface Backup {
  kind: 'strudel-dojo-backup'
  version: 1
  exportedAt: string
  profile: Profile
  progress: ProgressState
}

export const BACKUP_INVALID = 'Esto no es un respaldo válido de Strudel Dojo.'
const CODE_PREFIX = 'sdojo1:'

export function createBackup(profile: Profile, progress: ProgressState, now: Date): Backup {
  return {
    kind: 'strudel-dojo-backup',
    version: 1,
    exportedAt: now.toISOString(),
    profile,
    progress,
  }
}

export function parseBackup(raw: unknown): Backup | null {
  if (!isObject(raw) || raw.kind !== 'strudel-dojo-backup' || raw.version !== 1) return null
  const profile = parseProfile(raw.profile)
  if (profile === null || !isObject(raw.progress) || raw.progress.version !== 1) return null
  return {
    kind: 'strudel-dojo-backup',
    version: 1,
    exportedAt: isString(raw.exportedAt) ? raw.exportedAt : '',
    profile,
    progress: parseProgress(raw.progress),
  }
}

export function readBackupFile(text: string): Backup | null {
  try {
    return parseBackup(JSON.parse(text))
  } catch {
    return null
  }
}

// ponytail: the code embeds every question snapshot, so it grows with history (tens of KB);
// compress with CompressionStream if pasting long codes becomes a problem.
export function encodeBackup(backup: Backup): string {
  const bytes = new TextEncoder().encode(JSON.stringify(backup))
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  const base64 = btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  return CODE_PREFIX + base64
}

export function decodeBackup(text: string): Backup | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith(CODE_PREFIX)) return null
  try {
    const base64 = trimmed.slice(CODE_PREFIX.length).replaceAll('-', '+').replaceAll('_', '/')
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    return parseBackup(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)))
  } catch {
    return null
  }
}

// ---- Merge --------------------------------------------------------------------------------

const pickKata = (a: KataRecord, b: KataRecord): KataRecord => {
  if (a.passedAt !== null && b.passedAt !== null) return b.passedAt < a.passedAt ? b : a
  if (a.passedAt !== null) return a
  if (b.passedAt !== null) return b
  return b.attempts > a.attempts ? b : a
}

function mergeBy<T>(
  current: Record<string, T>,
  incoming: Record<string, T>,
  pick: (a: T, b: T) => T,
) {
  const out = { ...current }
  for (const [key, value] of Object.entries(incoming)) {
    const existing = out[key]
    out[key] = existing === undefined ? value : pick(existing, value)
  }
  return out
}

// Matched by id and the "more complete" copy wins (spec 05). Only a recorded scroll deletion removes.
export function mergeProgress(current: ProgressState, incoming: ProgressState): ProgressState {
  const attempts = new Map(current.attempts.map((a) => [a.id, a]))
  for (const attempt of incoming.attempts) {
    const existing = attempts.get(attempt.id)
    if (!existing || (existing.submittedAt === null && attempt.submittedAt !== null)) {
      attempts.set(attempt.id, attempt)
    }
  }

  const bosses = mergeBy(current.bosses, incoming.bosses, (a, b) => {
    const seen = new Set(a.map((r) => r.submittedAt))
    return [...a, ...b.filter((r) => !seen.has(r.submittedAt))].sort((x, y) =>
      x.submittedAt.localeCompare(y.submittedAt),
    )
  })

  const scrolls = new Map(current.scrolls.map((s) => [s.id, s]))
  for (const scroll of incoming.scrolls) {
    const existing = scrolls.get(scroll.id)
    if (!existing || scroll.updatedAt > existing.updatedAt) scrolls.set(scroll.id, scroll)
  }
  const deletedScrolls = mergeBy(
    current.deletedScrolls ?? {},
    incoming.deletedScrolls ?? {},
    (a, b) => (a.localeCompare(b) < 0 ? b : a),
  )
  for (const [id, deletedAt] of Object.entries(deletedScrolls)) {
    const scroll = scrolls.get(id)
    if (scroll && scroll.updatedAt <= deletedAt) scrolls.delete(id)
  }

  return {
    ...current,
    attempts: [...attempts.values()],
    katas: mergeBy(current.katas, incoming.katas, pickKata),
    bosses,
    skillStats: mergeBy(current.skillStats, incoming.skillStats, (a, b) =>
      b.lastSeen > a.lastSeen ? b : a,
    ),
    practiceDays: mergeBy(current.practiceDays, incoming.practiceDays, (a, b) => ({
      answered: Math.max(a.answered, b.answered),
      correct: Math.max(a.correct, b.correct),
    })),
    scrolls: [...scrolls.values()],
    ...(Object.keys(deletedScrolls).length > 0 ? { deletedScrolls } : {}),
    ...mergeGuitar(current.guitar, incoming.guitar),
  }
}

// Settings stay with this device; the best BPM per drill is kept from either side.
function mergeGuitar(a: GuitarState | undefined, b: GuitarState | undefined) {
  if (!a && !b) return {}
  const base = a ?? { ...DEFAULT_GUITAR, best: {} }
  const best = mergeBy<GuitarBest>(base.best, b?.best ?? {}, (x, y) => (y.bpm > x.bpm ? y : x))
  return { guitar: { ...base, best } }
}

export function mergeBackup(
  current: ProgressState,
  backup: Backup | null,
): { ok: true; progress: ProgressState; addedAttempts: number } | { ok: false; error: string } {
  if (backup === null) return { ok: false, error: BACKUP_INVALID }
  const known = new Set(current.attempts.map((a) => a.id))
  const addedAttempts = backup.progress.attempts.filter((a) => !known.has(a.id)).length
  return { ok: true, progress: mergeProgress(current, backup.progress), addedAttempts }
}

export const BACKUP_REMIND_DAYS = 14

// Spec 05: a gentle reminder once there is progress worth keeping and no backup in 14 days.
export function needsBackupReminder(p: ProgressState, now: Date): boolean {
  if (p.attempts.length === 0 && Object.keys(p.katas).length === 0) return false
  if (p.backedUpAt === null) return true
  return now.getTime() - Date.parse(p.backedUpAt) > BACKUP_REMIND_DAYS * 86_400_000
}
