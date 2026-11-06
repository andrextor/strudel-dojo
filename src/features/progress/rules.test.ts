import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRng } from '../../lib/random.ts'
import type { Module } from '../curriculum/schema.ts'
import {
  answerQuestion,
  bestScore,
  bumpSkill,
  canSeeSolution,
  examAdvice,
  examAvailable,
  examPassPercent,
  isModulePassed,
  isModuleUnlocked,
  isTopicPassed,
  kataStatus,
  markSolutionSeen,
  moduleStatus,
  newlyPassedModule,
  openAttempt,
  passes,
  percentOf,
  recommendedNext,
  recordBoss,
  recordKata,
  recordPractice,
  rubricScore,
  saveAttempt,
  startTest,
  submitTest,
  topicStatus,
} from './rules.ts'
import {
  bossRecord,
  canonical,
  curriculum,
  fresh,
  NOW,
  passModule,
  passTopic,
  ready,
  takeTest,
} from './test-helpers.ts'
import type { ProgressState } from './types.ts'

const m01 = ready('M01')
const m02 = ready('M02')
const t1 = m01.topics[0]
if (t1 === undefined) throw new Error('M01 has no topics')

test('passes uses integer math: 8/10 passes and 7/10 fails at 80 %', () => {
  assert.equal(passes(8, 10, 80), true)
  assert.equal(passes(7, 10, 80), false)
  assert.equal(passes(18, 20, 90), true)
  assert.equal(passes(0, 0, 80), false)
  assert.equal(percentOf(7, 9), 77)
  assert.equal(percentOf(0, 0), 0)
})

test('rule 1: M01 starts unlocked, M02 unlocks when M01 is passed', () => {
  let p = fresh()
  assert.equal(isModuleUnlocked(p, curriculum, m01), true)
  assert.equal(moduleStatus(p, curriculum, m02), 'locked')
  assert.equal(topicStatus(p, curriculum, m02, m02.topics[0] ?? t1), 'locked')
  p = passModule(p, 'M01')
  assert.equal(moduleStatus(p, curriculum, m01), 'passed')
  assert.equal(moduleStatus(p, curriculum, m02), 'available')
})

test('draft modules report draft', () => {
  // Every belt is ready now, so the rule is checked on a made-up next module.
  const draft: Module = {
    id: 'M11',
    order: 11,
    belt: 'dan',
    title: 'Próximo',
    summary: 'Próximo',
    status: 'draft',
    prerequisite: 'M10',
    topics: [],
  }
  assert.equal(moduleStatus(fresh(), [...curriculum, draft], draft), 'draft')
})

test('rule T1: the test alone passes the topic, with every kata pending', () => {
  const p = takeTest(fresh(), { kind: 'test', scopeId: t1.id }, t1.test, t1.test.questions).progress
  assert.equal(isTopicPassed(p, m01, t1), true)
  assert.equal(topicStatus(p, curriculum, m01, t1), 'passed')
  assert.equal(kataStatus(p, t1.katas[0]?.id ?? ''), 'not_started')
})

test('rule 2: 7/10 on an 80 % test does not pass, 8/10 does', () => {
  const failed = takeTest(fresh(), { kind: 'test', scopeId: t1.id }, t1.test, 7)
  assert.equal(failed.attempt.correct, 7)
  assert.equal(failed.attempt.passed, false)
  const ok = takeTest(fresh(), { kind: 'test', scopeId: t1.id }, t1.test, 8)
  assert.equal(ok.attempt.passed, true)
})

test('rule 3: topics are free to do in any order and the next one is recommended', () => {
  let p = fresh()
  assert.deepEqual(recommendedNext(p, curriculum), {
    kind: 'topic',
    moduleId: 'M01',
    topicId: 'M01-T01',
  })
  for (const t of m01.topics) assert.equal(topicStatus(p, curriculum, m01, t), 'not_started')
  p = passTopic(p, 'M01', 2)
  assert.equal(topicStatus(p, curriculum, m01, m01.topics[2] ?? t1), 'passed')
  p = passTopic(p, 'M01', 0)
  assert.deepEqual(recommendedNext(p, curriculum), {
    kind: 'topic',
    moduleId: 'M01',
    topicId: 'M01-T02',
  })
})

const passTests = (p: ProgressState, moduleId: string) =>
  ready(moduleId).topics.reduce(
    (acc, t) => takeTest(acc, { kind: 'test', scopeId: t.id }, t.test, t.test.questions).progress,
    p,
  )

const takeExam = (p: ProgressState, moduleId: string, right: number) => {
  const m = ready(moduleId)
  const graded = { ...m.exam, passPercent: examPassPercent(p, m) }
  return takeTest(p, { kind: 'placement', scopeId: moduleId }, graded, right)
}

test('rule T3: after the tests the exam is next and passing it passes the module', () => {
  let p = passTests(fresh(), 'M01')
  assert.equal(moduleStatus(p, curriculum, m01), 'exam_ready')
  assert.deepEqual(recommendedNext(p, curriculum), { kind: 'exam', moduleId: 'M01' })
  p = takeExam(p, 'M01', 16).progress
  assert.equal(isModulePassed(p, m01), true)
  assert.equal(moduleStatus(p, curriculum, m02), 'available')
  assert.deepEqual(recommendedNext(p, curriculum), {
    kind: 'topic',
    moduleId: 'M02',
    topicId: 'M02-T01',
  })
})

test('rule T2: 16/20 passes with every topic done, 18/20 is needed with topics pending', () => {
  const done = passTests(fresh(), 'M01')
  assert.equal(takeExam(done, 'M01', 15).attempt.passed, false)
  assert.equal(takeExam(done, 'M01', 16).attempt.passed, true)
  assert.equal(takeExam(fresh(), 'M01', 16).attempt.passed, false)
  assert.equal(takeExam(fresh(), 'M01', 18).attempt.passed, true)
})

test('rule T3: every topic plus the boss passes the module without the exam', () => {
  let p = passTests(fresh(), 'M01')
  p = recordBoss(p, 'M01-BOSS', bossRecord(false))
  assert.equal(isModulePassed(p, m01), false)
  p = recordBoss(p, 'M01-BOSS', { ...bossRecord(true), submittedAt: '2026-03-11T10:00:00Z' })
  assert.equal(isModulePassed(p, m01), true)
  // A boss alone is not enough: the tests are still theory's own gate.
  assert.equal(isModulePassed(recordBoss(fresh(), 'M01-BOSS', bossRecord(true)), m01), false)
})

test('progress never goes back: an old full pass still passes without an exam', () => {
  const p = passModule(fresh(), 'M01')
  assert.equal(isModulePassed(p, m01), true)
  for (const t of m01.topics) assert.equal(topicStatus(p, curriculum, m01, t), 'passed')
})

test('rule T5: a skip exam passes the topics and the module', () => {
  let p = fresh()
  assert.equal(examAvailable(p, curriculum, m01), true)
  assert.equal(examAvailable(p, curriculum, m02), false)
  p = takeExam(p, 'M01', m01.exam.questions).progress
  for (const t of m01.topics) {
    assert.equal(topicStatus(p, curriculum, m01, t), 'passed_by_placement')
  }
  assert.equal(isModulePassed(p, m01), true)
  assert.equal(examAvailable(p, curriculum, m01), false)
  assert.equal(examAvailable(p, curriculum, m02), true)
})

test('rule T6: a belt is new on the exam, on the boss and on a last topic test', () => {
  const tests = passTests(fresh(), 'M01')
  const byExam = takeExam(tests, 'M01', 16).progress
  assert.equal(newlyPassedModule(tests, byExam, curriculum)?.id, 'M01')
  assert.equal(newlyPassedModule(byExam, byExam, curriculum), null)

  const byBoss = recordBoss(tests, 'M01-BOSS', bossRecord(true))
  assert.equal(newlyPassedModule(tests, byBoss, curriculum)?.id, 'M01')

  const last = m01.topics[3]
  assert.ok(last)
  let before = recordBoss(fresh(), 'M01-BOSS', bossRecord(true))
  for (let i = 0; i < 3; i++) before = passTopic(before, 'M01', i)
  const after = takeTest(
    before,
    { kind: 'test', scopeId: last.id },
    last.test,
    last.test.questions,
  ).progress
  assert.equal(newlyPassedModule(before, after, curriculum)?.id, 'M01')
})

test('a failed exam suggests the topics whose skills had errors', () => {
  const { progress, attempt } = takeExam(fresh(), 'M01', 10)
  assert.equal(attempt.passed, false)
  assert.equal(isModulePassed(progress, m01), false)
  const failedSkills = new Set(attempt.questions.slice(10).map((q) => q.skill))
  const advice = examAdvice(attempt, m01)
  assert.ok(advice.length > 0)
  for (const id of advice) {
    const topic = m01.topics.find((t) => t.id === id)
    assert.ok(topic?.skills.some((s) => failedSkills.has(s)))
  }
})

test('rule 7: attempts are unlimited and each one gets a fresh set', () => {
  const first = takeTest(fresh(), { kind: 'test', scopeId: t1.id }, t1.test, 2)
  const second = takeTest(first.progress, { kind: 'test', scopeId: t1.id }, t1.test, 9)
  assert.notEqual(first.attempt.id, second.attempt.id)
  assert.notDeepEqual(
    first.attempt.questions.map((q) => q.key),
    second.attempt.questions.map((q) => q.key),
  )
  assert.equal(isTopicPassed(second.progress, m01, t1), true)
  assert.equal(second.progress.attempts.length, 2)
})

test('rules 8 and 9: answers are stored ungraded and an open attempt resumes', () => {
  let attempt = startTest({ kind: 'test', scopeId: t1.id }, t1.test.mix, 10, NOW, createRng('a'))
  const q0 = attempt.questions[0]
  assert.ok(q0)
  attempt = answerQuestion(attempt, 0, canonical(q0))
  assert.equal(attempt.correct, null)
  assert.equal(attempt.passed, null)
  const p = saveAttempt(fresh(), attempt)
  const resumed = openAttempt(p, 'test', t1.id)
  assert.deepEqual(resumed?.responses[0], canonical(q0))
  assert.equal(resumed?.responses[1], null)

  const done = submitTest(attempt, 80, NOW)
  assert.equal(done.correct, 1)
  assert.equal(answerQuestion(done, 1, { kind: 'text', value: 'x' }), done)
  assert.equal(submitTest(done, 0, new Date()), done)
  assert.equal(openAttempt(saveAttempt(p, done), 'test', t1.id), null)
})

test('rule 10: the solution opens after 3 fails and a helped kata still passes', () => {
  const [kata, ...others] = t1.katas
  assert.ok(kata)
  let p = others.reduce((acc, k) => recordKata(acc, k.id, k.solution, true, NOW), fresh())
  assert.equal(kataStatus(p, kata.id), 'not_started')
  for (let i = 0; i < 2; i++) p = recordKata(p, kata.id, 's("x")', false, NOW)
  assert.equal(kataStatus(p, kata.id), 'attempted')
  assert.equal(canSeeSolution(p, kata.id), false)
  assert.equal(markSolutionSeen(p, kata.id), p)
  p = recordKata(p, kata.id, 's("x")', false, NOW)
  assert.equal(canSeeSolution(p, kata.id), true)
  p = markSolutionSeen(p, kata.id)
  assert.equal(kataStatus(p, kata.id), 'attempted') // seeing it passes nothing
  p = recordKata(p, kata.id, kata.solution, true, NOW)
  assert.equal(kataStatus(p, kata.id), 'passed')
  assert.equal(p.katas[kata.id]?.helped, true)
})

test('a kata keeps its first pass date', () => {
  let p = recordKata(fresh(), 'M01-T01-K1', 'a', true, NOW)
  p = recordKata(p, 'M01-T01-K1', 'b', true, new Date('2026-04-01T00:00:00Z'))
  assert.equal(p.katas['M01-T01-K1']?.passedAt, NOW.toISOString())
  assert.equal(p.katas['M01-T01-K1']?.code, 'b')
})

test('skills move up a Leitner box when right and back to 1 when wrong', () => {
  let p = fresh()
  for (let i = 0; i < 6; i++) p = bumpSkill(p, 'intervals', true, NOW)
  assert.equal(p.skillStats.intervals?.box, 5)
  p = bumpSkill(p, 'intervals', false, NOW)
  assert.deepEqual(p.skillStats.intervals, {
    correct: 6,
    wrong: 1,
    lastSeen: NOW.toISOString(),
    box: 1,
  })
  p = recordPractice(p, '2026-03-10', 'intervals', true, NOW)
  assert.deepEqual(p.practiceDays['2026-03-10'], { answered: 1, correct: 1 })
})

test('rubricScore: weighted mean, integer pass check', () => {
  const rubric = [
    { id: 'a', weight: 3 },
    { id: 'b', weight: 1 },
  ]
  assert.deepEqual(rubricScore(rubric, { a: 7, b: 7 }, 7), { score: 7, passed: true })
  assert.deepEqual(rubricScore(rubric, { a: 8, b: 3 }, 7), { score: 6.8, passed: false })
  assert.deepEqual(rubricScore(rubric, { a: 20 }, 7), { score: 7.5, passed: true })
})

test('bestScore keeps the highest submitted attempt', () => {
  const scope = { kind: 'test' as const, scopeId: t1.id }
  let p = fresh()
  assert.equal(bestScore(p, 'test', t1.id), null)
  for (const right of [7, 9, 8]) p = takeTest(p, scope, t1.test, right).progress
  assert.deepEqual(bestScore(p, 'test', t1.id), { correct: 9, total: 10 })
})
