import assert from 'node:assert/strict'
import { test } from 'node:test'
import { attemptXp, beltFor, totalXp, XP } from './points.ts'
import { recordBoss, recordKata } from './rules.ts'
import { streak } from './streak.ts'
import {
  bossRecord,
  curriculum,
  fresh,
  passModule,
  passTopic,
  ready,
  takeTest,
} from './test-helpers.ts'

const t1 = ready('M01').topics[0]
if (t1 === undefined) throw new Error('no topic')
const scope = { kind: 'test', scopeId: t1.id } as const

test('only the best submitted attempt of a test counts toward XP', () => {
  const first = takeTest(fresh(), scope, t1.test, 8)
  const xp = totalXp(first.progress, curriculum)
  assert.equal(xp, 8 * XP.testCorrect + XP.topic)
  const same = takeTest(first.progress, scope, t1.test, 8)
  assert.equal(totalXp(same.progress, curriculum), xp)
  const worse = takeTest(same.progress, scope, t1.test, 3)
  assert.equal(totalXp(worse.progress, curriculum), xp)
  const better = takeTest(worse.progress, scope, t1.test, 10)
  assert.equal(totalXp(better.progress, curriculum), 10 * XP.testCorrect + XP.topic)
})

test('hinted answers are worth half and open attempts nothing', () => {
  const { attempt } = takeTest(fresh(), scope, t1.test, 4, undefined, true)
  assert.equal(attemptXp(attempt), 4 * XP.testCorrectHinted)
  assert.equal(attemptXp({ ...attempt, submittedAt: null }), 0)
})

test('practice XP is capped per day and helped katas give no kata XP', () => {
  const p = {
    ...fresh(),
    practiceDays: {
      '2026-03-01': { answered: 80, correct: 70 },
      '2026-03-02': { answered: 5, correct: 3 },
    },
  }
  assert.equal(totalXp(p, curriculum), XP.practiceDailyCap + 3 * XP.practiceCorrect)
  const own = recordKata(fresh(), 'M01-T01-K1', 'x', true, new Date())
  assert.equal(totalXp(own, curriculum), XP.kata)
  const kata = own.katas['M01-T01-K1']
  assert.ok(kata)
  assert.equal(
    totalXp({ ...own, katas: { 'M01-T01-K1': { ...kata, helped: true } } }, curriculum),
    0,
  )
})

test('a passed module adds topic and boss bonuses', () => {
  const p = passModule(fresh(), 'M01')
  const tests = ready('M01').topics.reduce((n, t) => n + t.test.questions, 0)
  assert.equal(totalXp(p, curriculum), tests * XP.testCorrect + 4 * XP.topic + XP.boss)
})

test('any passed boss adds its bonus, old ids and new ones alike', () => {
  const p = recordBoss(
    recordBoss(fresh(), 'M03-BOSS', bossRecord(true)),
    'S01-BOSS',
    bossRecord(true),
  )
  assert.equal(totalXp(p, curriculum), 2 * XP.boss)
  assert.equal(totalXp(recordBoss(fresh(), 'S01-BOSS', bossRecord(false)), curriculum), 0)
})

test('belt is the last passed module and stripes count topics of the next one', () => {
  assert.deepEqual(beltFor(fresh(), curriculum), {
    belt: null,
    next: { moduleId: 'M01', belt: 'white', stripes: 0 },
  })
  let p = passModule(fresh(), 'M01')
  p = passTopic(p, 'M02', 0)
  p = passTopic(p, 'M02', 1)
  assert.deepEqual(beltFor(p, curriculum), {
    belt: 'white',
    next: { moduleId: 'M02', belt: ready('M02').belt, stripes: 2 },
  })
})

test('streak crosses local midnight and breaks on a day without activity', () => {
  const tz = 'America/Bogota' // UTC-5, no DST
  const at = (iso: string) => ({
    ...takeTest(fresh(), scope, t1.test, 1).attempt,
    submittedAt: iso,
  })
  const p = {
    ...fresh(),
    attempts: [
      at('2026-03-08T23:30:00-05:00'), // Mar 8 local
      at('2026-03-09T04:30:00Z'), // 23:30 Mar 8 local: still Mar 8
      at('2026-03-09T05:30:00Z'), // 00:30 Mar 9 local
    ],
    practiceDays: {
      '2026-03-10': { answered: 10, correct: 2 },
      '2026-03-06': { answered: 50, correct: 50 },
    },
  }
  assert.equal(streak(p, new Date('2026-03-10T20:00:00-05:00'), tz), 3) // 8, 9, 10
  assert.equal(streak(p, new Date('2026-03-11T08:00:00-05:00'), tz), 3) // today not done yet
  assert.equal(streak(p, new Date('2026-03-12T08:00:00-05:00'), tz), 0) // missed the 11th
  const few = { ...p, practiceDays: { '2026-03-10': { answered: 9, correct: 9 } } }
  assert.equal(streak(few, new Date('2026-03-10T20:00:00-05:00'), tz), 2) // 9 answers do not count
})
