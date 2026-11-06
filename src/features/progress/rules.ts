// Every pass/lock decision lives here (docs/specs/05). Pure: time and randomness are injected.
import { type Rng, randomId } from '../../lib/random.ts'
import type { MixEntry, Module, StageOutline, UnitOutline } from '../curriculum/schema.ts'
import { grade } from '../exercises/grade.ts'
import { buildSet } from '../exercises/registry.ts'
import type { Response } from '../exercises/types.ts'
import type {
  BossRecord,
  KataRecord,
  KataStatus,
  LocalDate,
  ModuleStatus,
  ProgressState,
  StageStatus,
  TestAttempt,
  TopicStatus,
  UnitStatus,
} from './types.ts'

type Topic = Module['topics'][number]
type ReadyModule = Extract<Module, { status: 'ready' }>
type ReadyTopic = ReadyModule['topics'][number]

export const SOLUTION_AFTER_FAILS = 3

const isReadyTopic = (t: Topic): t is ReadyTopic => 'test' in t

// Integer math, no rounding: 8/10 at 80 % passes, 7/10 does not.
export const passes = (correct: number, total: number, passPercent: number): boolean =>
  total > 0 && correct * 100 >= passPercent * total

export const percentOf = (correct: number, total: number): number =>
  total > 0 ? Math.floor((correct * 100) / total) : 0

const submitted = (p: ProgressState, kind: TestAttempt['kind'], scopeId: string) =>
  p.attempts.filter((a) => a.kind === kind && a.scopeId === scopeId && a.submittedAt !== null)

export function openAttempt(
  p: ProgressState,
  kind: TestAttempt['kind'],
  scopeId: string,
): TestAttempt | null {
  return (
    p.attempts.find((a) => a.kind === kind && a.scopeId === scopeId && a.submittedAt === null) ??
    null
  )
}

const isTestPassed = (p: ProgressState, topicId: string) =>
  submitted(p, 'test', topicId).some((a) => a.passed === true)

const isExamPassed = (p: ProgressState, moduleId: string) =>
  submitted(p, 'placement', moduleId).some((a) => a.passed === true)

export const isBossPassed = (p: ProgressState, bossId: string) =>
  (p.bosses[bossId] ?? []).some((r) => r.passed)

// Best submitted score of a test or placement, or null if none was submitted.
export function bestScore(
  p: ProgressState,
  kind: TestAttempt['kind'],
  scopeId: string,
): { correct: number; total: number } | null {
  let best: { correct: number; total: number } | null = null
  for (const a of submitted(p, kind, scopeId)) {
    if (a.correct !== null && (best === null || a.correct > best.correct)) {
      best = { correct: a.correct, total: a.questions.length }
    }
  }
  return best
}

export function kataStatus(p: ProgressState, kataId: string): KataStatus {
  const record = p.katas[kataId]
  if (record === undefined || record.attempts === 0) return 'not_started'
  return record.passedAt !== null ? 'passed' : 'attempted'
}

// Rule T1: the test alone passes the topic.
const isTopicEarned = (p: ProgressState, topic: Topic) =>
  isReadyTopic(topic) && isTestPassed(p, topic.id)

export function isTopicPassed(p: ProgressState, module: Module, topic: Topic): boolean {
  return isTopicEarned(p, topic) || (module.status === 'ready' && isExamPassed(p, module.id))
}

// Rule T3: the exam, or every topic plus the module's boss, which keeps belts already earned.
export function isModulePassed(p: ProgressState, module: Module): boolean {
  if (module.status !== 'ready') return false
  if (isExamPassed(p, module.id)) return true
  return module.topics.every((t) => isTopicEarned(p, t)) && isBossPassed(p, `${module.id}-BOSS`)
}

// Rule T2: decided at submit time, so topics finished mid-exam count.
export function examPassPercent(p: ProgressState, module: ReadyModule): number {
  return module.topics.every((t) => isTopicEarned(p, t))
    ? module.exam.passPercent
    : module.exam.skipPercent
}

// Rule T6: a belt can close on an exam, a boss or a last topic test, so states are compared.
export function newlyPassedModule(
  before: ProgressState,
  after: ProgressState,
  curriculum: Module[],
): Module | null {
  return curriculum.find((m) => !isModulePassed(before, m) && isModulePassed(after, m)) ?? null
}

// Rule 1.
export function isModuleUnlocked(p: ProgressState, curriculum: Module[], module: Module): boolean {
  if (module.prerequisite === null) return true
  const prerequisite = curriculum.find((m) => m.id === module.prerequisite)
  return prerequisite !== undefined && isModulePassed(p, prerequisite)
}

export function topicStatus(
  p: ProgressState,
  curriculum: Module[],
  module: Module,
  topic: Topic,
): TopicStatus {
  if (module.status !== 'ready' || !isModuleUnlocked(p, curriculum, module)) return 'locked'
  if (isTopicEarned(p, topic)) return 'passed'
  if (isExamPassed(p, module.id)) return 'passed_by_placement'
  const started = p.attempts.some((a) => a.kind === 'test' && a.scopeId === topic.id)
  return started ? 'in_progress' : 'not_started'
}

export function moduleStatus(p: ProgressState, curriculum: Module[], module: Module): ModuleStatus {
  if (module.status === 'draft') return 'draft'
  if (!isModuleUnlocked(p, curriculum, module)) return 'locked'
  if (isModulePassed(p, module)) return 'passed'
  return module.topics.every((t) => isTopicPassed(p, module, t)) ? 'exam_ready' : 'available'
}

const isKataPassed = (p: ProgressState, kata: { id: string }) => kataStatus(p, kata.id) === 'passed'

export const isUnitPassed = (p: ProgressState, unit: UnitOutline): boolean =>
  unit.katas.every((k) => isKataPassed(p, k))

// Rule S5.
export const isStagePassed = (p: ProgressState, stage: StageOutline): boolean =>
  stage.units.every((u) => isUnitPassed(p, u)) && isBossPassed(p, stage.boss.id)

// Rule S1: a passed kata keeps its stage open, so new content never locks earned progress.
export function isStageUnlocked(
  p: ProgressState,
  stages: StageOutline[],
  stage: StageOutline,
): boolean {
  if (stage.prerequisite === null) return true
  const prerequisite = stages.find((s) => s.id === stage.prerequisite)
  return (
    (prerequisite !== undefined && isStagePassed(p, prerequisite)) ||
    stage.units.some((u) => u.katas.some((k) => isKataPassed(p, k)))
  )
}

// The theory topics a unit asks for that are not passed yet.
export function missingTheory(p: ProgressState, curriculum: Module[], unit: UnitOutline): string[] {
  return unit.requires.filter(
    (id) => !curriculum.some((m) => m.topics.some((t) => t.id === id && isTopicPassed(p, m, t))),
  )
}

// Rule S2.
export function unitStatus(
  p: ProgressState,
  curriculum: Module[],
  stages: StageOutline[],
  stage: StageOutline,
  unit: UnitOutline,
): UnitStatus {
  if (isUnitPassed(p, unit)) return 'passed'
  if (!isStageUnlocked(p, stages, stage)) return 'locked'
  const earned = unit.katas.some((k) => isKataPassed(p, k))
  if (!earned && missingTheory(p, curriculum, unit).length > 0) return 'needs_theory'
  return unit.katas.some((k) => kataStatus(p, k.id) !== 'not_started')
    ? 'in_progress'
    : 'not_started'
}

// Rule S4.
export function stageBossUnlocked(
  p: ProgressState,
  stages: StageOutline[],
  stage: StageOutline,
): boolean {
  return isStageUnlocked(p, stages, stage) && stage.units.every((u) => isUnitPassed(p, u))
}

export function stageStatus(
  p: ProgressState,
  stages: StageOutline[],
  stage: StageOutline,
): StageStatus {
  if (isStagePassed(p, stage)) return 'passed'
  if (!isStageUnlocked(p, stages, stage)) return 'locked'
  return stageBossUnlocked(p, stages, stage) ? 'boss_ready' : 'available'
}

export type NextStrudelStep =
  | { kind: 'unit'; stageId: string; unitId: string }
  | { kind: 'boss'; stageId: string }
  | { kind: 'theory'; stageId: string; unitId: string; topicIds: string[] }

// The first open unit, then the boss; a unit waiting on theory only when nothing else is open.
export function recommendedStrudel(
  p: ProgressState,
  curriculum: Module[],
  stages: StageOutline[],
): NextStrudelStep | null {
  for (const stage of stages) {
    if (!isStageUnlocked(p, stages, stage) || isStagePassed(p, stage)) continue
    const pending = stage.units.filter((u) => !isUnitPassed(p, u))
    const statusOf = (u: UnitOutline) => unitStatus(p, curriculum, stages, stage, u)
    const open = pending.find((u) => statusOf(u) !== 'needs_theory')
    if (open !== undefined) return { kind: 'unit', stageId: stage.id, unitId: open.id }
    const [waiting] = pending
    if (waiting === undefined) return { kind: 'boss', stageId: stage.id }
    return {
      kind: 'theory',
      stageId: stage.id,
      unitId: waiting.id,
      topicIds: missingTheory(p, curriculum, waiting),
    }
  }
  return null
}

// Rule T2: the exam is offered on an unlocked module that is not passed yet.
export function examAvailable(p: ProgressState, curriculum: Module[], module: Module): boolean {
  return (
    module.status === 'ready' &&
    isModuleUnlocked(p, curriculum, module) &&
    !isModulePassed(p, module)
  )
}

// After a failed exam: the topics whose skills had errors, in curriculum order.
export function examAdvice(attempt: TestAttempt, module: Module): string[] {
  const failed = new Set<string>()
  attempt.questions.forEach((q, i) => {
    const r = attempt.responses[i]
    if (r == null || !grade(q, r).correct) failed.add(q.skill)
  })
  return module.topics.filter((t) => t.skills.some((s) => failed.has(s))).map((t) => t.id)
}

export type NextStep =
  | { kind: 'topic'; moduleId: string; topicId: string }
  | { kind: 'exam'; moduleId: string }

// Rule 3: the first unpassed topic in suggested order, or the exam once topics are done.
export function recommendedNext(p: ProgressState, curriculum: Module[]): NextStep | null {
  for (const module of curriculum) {
    if (!isModuleUnlocked(p, curriculum, module) || module.status !== 'ready') continue
    if (isModulePassed(p, module)) continue
    const topic = module.topics.find((t) => !isTopicPassed(p, module, t))
    if (topic !== undefined) return { kind: 'topic', moduleId: module.id, topicId: topic.id }
    return { kind: 'exam', moduleId: module.id }
  }
  return null
}

// Rule 7: attempts are unlimited, each one a fresh seeded set.
export function startTest(
  scope: { kind: TestAttempt['kind']; scopeId: string },
  mix: MixEntry[],
  count: number,
  now: Date,
  rng: Rng,
): TestAttempt {
  const id = randomId(rng)
  return {
    id,
    kind: scope.kind,
    scopeId: scope.scopeId,
    startedAt: now.toISOString(),
    submittedAt: null,
    questions: buildSet(mix, count, `${scope.scopeId}:${id}`),
    responses: new Array(count).fill(null),
    correct: null,
    passed: null,
  }
}

// Rule 8: answering a test question stores the response but grades nothing until submit.
export function answerQuestion(
  attempt: TestAttempt,
  index: number,
  response: Response,
): TestAttempt {
  if (attempt.submittedAt !== null || index < 0 || index >= attempt.questions.length) return attempt
  const responses = [...attempt.responses]
  responses[index] = response
  return { ...attempt, responses }
}

export function submitTest(attempt: TestAttempt, passPercent: number, now: Date): TestAttempt {
  if (attempt.submittedAt !== null) return attempt
  const correct = attempt.questions.filter((q, i) => {
    const r = attempt.responses[i]
    return r != null && grade(q, r).correct
  }).length
  return {
    ...attempt,
    submittedAt: now.toISOString(),
    correct,
    passed: passes(correct, attempt.questions.length, passPercent),
  }
}

// Rule 9: the open attempt is saved after every answer, so it can be resumed.
export function saveAttempt(p: ProgressState, attempt: TestAttempt): ProgressState {
  const others = p.attempts.filter((a) => a.id !== attempt.id)
  return { ...p, attempts: [...others, attempt] }
}

const emptyKata = (): KataRecord => ({
  code: '',
  attempts: 0,
  passedAt: null,
  helped: false,
  solutionSeen: false,
})

// Rule 10: a kata only passes on the user's own code; a seen solution marks it as helped.
export function recordKata(
  p: ProgressState,
  kataId: string,
  code: string,
  passed: boolean,
  now: Date,
): ProgressState {
  const prev = p.katas[kataId] ?? emptyKata()
  const firstPass = passed && prev.passedAt === null
  const record: KataRecord = {
    ...prev,
    code,
    attempts: prev.attempts + 1,
    passedAt: firstPass ? now.toISOString() : prev.passedAt,
    helped: firstPass ? prev.solutionSeen : prev.helped,
  }
  return { ...p, katas: { ...p.katas, [kataId]: record } }
}

export function canSeeSolution(p: ProgressState, kataId: string): boolean {
  const record = p.katas[kataId]
  return record !== undefined && record.passedAt === null && record.attempts >= SOLUTION_AFTER_FAILS
}

export function markSolutionSeen(p: ProgressState, kataId: string): ProgressState {
  const record = p.katas[kataId]
  if (record === undefined || !canSeeSolution(p, kataId)) return p
  return { ...p, katas: { ...p.katas, [kataId]: { ...record, solutionSeen: true } } }
}

// Self-assessed rubric: each criterion 0–10, weighted mean. Integer math for the pass check,
// like tests: Σ(w·v) ≥ passScore · Σw.
export function rubricScore(
  rubric: readonly { id: string; weight: number }[],
  values: Record<string, number>,
  passScore: number,
): { score: number; passed: boolean } {
  const total = rubric.reduce((s, c) => s + c.weight, 0)
  const sum = rubric.reduce(
    (s, c) => s + c.weight * Math.min(10, Math.max(0, values[c.id] ?? 0)),
    0,
  )
  return {
    score: total > 0 ? Math.round((sum * 10) / total) / 10 : 0,
    passed: total > 0 && sum >= passScore * total,
  }
}

export function recordBoss(p: ProgressState, bossId: string, record: BossRecord): ProgressState {
  return { ...p, bosses: { ...p.bosses, [bossId]: [...(p.bosses[bossId] ?? []), record] } }
}

// Leitner: a right answer moves the skill up a box (max 5), a wrong one back to box 1.
export function bumpSkill(
  p: ProgressState,
  skill: string,
  correct: boolean,
  now: Date,
): ProgressState {
  const prev = p.skillStats[skill] ?? { correct: 0, wrong: 0, lastSeen: '', box: 1 }
  const stat = {
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    lastSeen: now.toISOString(),
    box: correct ? Math.min(5, prev.box + 1) : 1,
  }
  return { ...p, skillStats: { ...p.skillStats, [skill]: stat } }
}

// Saves a submitted attempt and feeds every answer into the skill stats.
export function recordSubmission(p: ProgressState, attempt: TestAttempt, now: Date): ProgressState {
  let next = saveAttempt(p, attempt)
  attempt.questions.forEach((q, i) => {
    const r = attempt.responses[i]
    next = bumpSkill(next, q.skill, r != null && grade(q, r).correct, now)
  })
  return next
}

export function recordPractice(
  p: ProgressState,
  day: LocalDate,
  skill: string,
  correct: boolean,
  now: Date,
): ProgressState {
  const prev = p.practiceDays[day] ?? { answered: 0, correct: 0 }
  const entry = { answered: prev.answered + 1, correct: prev.correct + (correct ? 1 : 0) }
  return bumpSkill({ ...p, practiceDays: { ...p.practiceDays, [day]: entry } }, skill, correct, now)
}
