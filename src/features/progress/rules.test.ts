import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRng } from '../../lib/random.ts'
import {
  answerQuestion,
  bossUnlocked,
  bumpSkill,
  canSeeSolution,
  isModulePassed,
  isModuleUnlocked,
  isTopicPassed,
  kataStatus,
  markSolutionSeen,
  moduleStatus,
  openAttempt,
  passes,
  percentOf,
  placementAdvice,
  placementAvailable,
  recommendedNext,
  recordBoss,
  recordKata,
  recordPractice,
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
  const draft = curriculum.find((m) => m.status === 'draft')
  assert.ok(draft)
  assert.equal(moduleStatus(fresh(), curriculum, draft), 'draft')
})

test('rule 2: a passed test with a pending kata does not pass the topic, in either order', () => {
  const kata = t1.katas[0]
  assert.ok(kata)
  let p = takeTest(fresh(), { kind: 'test', scopeId: t1.id }, t1.test, t1.test.questions).progress
  assert.equal(isTopicPassed(p, m01, t1), false)
  assert.equal(topicStatus(p, curriculum, m01, t1), 'in_progress')
  p = recordKata(p, kata.id, kata.solution, true, NOW)
  assert.equal(topicStatus(p, curriculum, m01, t1), 'passed')

  // Kata first, then the test.
  let q = recordKata(fresh(), kata.id, kata.solution, true, NOW)
  assert.equal(isTopicPassed(q, m01, t1), false)
  q = takeTest(q, { kind: 'test', scopeId: t1.id }, t1.test, t1.test.questions).progress
  assert.equal(isTopicPassed(q, m01, t1), true)
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

test('rules 4 and 5: the boss opens with all topics and passing it passes the module', () => {
  let p = fresh()
  for (let i = 0; i < 3; i++) p = passTopic(p, 'M01', i)
  assert.equal(bossUnlocked(p, curriculum, m01), false)
  p = passTopic(p, 'M01', 3)
  assert.equal(bossUnlocked(p, curriculum, m01), true)
  assert.equal(moduleStatus(p, curriculum, m01), 'boss_ready')
  assert.deepEqual(recommendedNext(p, curriculum), { kind: 'boss', moduleId: 'M01' })
  p = recordBoss(p, m01.boss.id, bossRecord(false))
  assert.equal(isModulePassed(p, m01), false)
  p = recordBoss(p, m01.boss.id, { ...bossRecord(true), submittedAt: '2026-03-11T10:00:00Z' })
  assert.equal(isModulePassed(p, m01), true)
  assert.deepEqual(recommendedNext(p, curriculum), {
    kind: 'topic',
    moduleId: 'M02',
    topicId: 'M02-T01',
  })
})

test('rule 6: a passed placement passes the module without the boss, which stays optional', () => {
  const placement = m01.placement
  assert.ok(placement)
  let p = fresh()
  assert.equal(placementAvailable(p, curriculum, m01), true)
  assert.equal(placementAvailable(p, curriculum, m02), false)
  p = takeTest(p, { kind: 'placement', scopeId: 'M01' }, placement, placement.questions).progress
  for (const t of m01.topics) {
    assert.equal(topicStatus(p, curriculum, m01, t), 'passed_by_placement')
  }
  assert.equal(isModulePassed(p, m01), true)
  assert.equal(bossUnlocked(p, curriculum, m01), true)
  assert.equal(placementAvailable(p, curriculum, m01), false)
  // To skip M02 you then take M02's placement.
  assert.equal(placementAvailable(p, curriculum, m02), m02.placement !== undefined)
})

test('rule 6: a failed placement suggests the topics whose skills had errors', () => {
  const placement = m01.placement
  assert.ok(placement)
  const { progress, attempt } = takeTest(
    fresh(),
    { kind: 'placement', scopeId: 'M01' },
    placement,
    10,
  )
  assert.equal(attempt.passed, false)
  assert.equal(isModulePassed(progress, m01), false)
  const failedSkills = new Set(attempt.questions.slice(10).map((q) => q.skill))
  const advice = placementAdvice(attempt, m01)
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
  assert.equal(isTopicPassed(second.progress, m01, t1), false) // kata still pending
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

test('rule 10: the solution opens after 3 fails and a helped kata still passes the topic', () => {
  const kata = t1.katas[0]
  assert.ok(kata)
  let p = fresh()
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
  p = takeTest(p, { kind: 'test', scopeId: t1.id }, t1.test, 10).progress
  assert.equal(isTopicPassed(p, m01, t1), true)
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
