import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bumpSkill, recordBoss, recordKata } from '../progress/rules.ts'
import { bossRecord, curriculum, fresh, NOW, stages } from '../progress/test-helpers.ts'
import { buildReviewSet, dueSkills, isDue, priority, reviewMixes } from './schedule.ts'

const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)

test('a box is due once its interval has passed', () => {
  const stat = (box: number, days: number) => ({
    correct: 1,
    wrong: 0,
    box,
    lastSeen: daysAgo(days).toISOString(),
  })
  assert.equal(isDue(stat(1, 0), NOW), true)
  assert.equal(isDue(stat(3, 2), NOW), false)
  assert.equal(isDue(stat(3, 3), NOW), true)
  assert.equal(isDue(stat(5, 13), NOW), false)
  assert.ok(priority(stat(1, 0), NOW) > priority(stat(5, 20), NOW))
})

test('wrong answers send a skill back to box 1 and to the top of the review', () => {
  let p = fresh()
  for (let i = 0; i < 4; i++) p = bumpSkill(p, 'note-naming', true, daysAgo(1))
  p = bumpSkill(p, 'semitones', true, daysAgo(1))
  p = bumpSkill(p, 'interval-quality', true, daysAgo(1))
  p = bumpSkill(p, 'interval-quality', false, NOW)
  assert.equal(p.skillStats['interval-quality']?.box, 1)
  assert.equal(p.skillStats['note-naming']?.box, 5)

  const unlocked = new Set(reviewMixes(p, curriculum, stages).keys())
  const due = dueSkills(p.skillStats, unlocked, NOW)
  assert.equal(due[0], 'interval-quality')
  assert.ok(!due.includes('note-naming')) // box 5, seen yesterday

  const set = buildReviewSet(p, curriculum, stages, NOW, 'review-test')
  assert.equal(set.length, 10)
  assert.equal(set[0]?.skill, 'interval-quality')
  assert.equal(new Set(set.map((q) => q.key)).size, 10)
  assert.ok(set.every((q) => unlocked.has(q.skill)))
})

test('only unlocked skills are reviewed and an empty profile has nothing to review', () => {
  assert.deepEqual(buildReviewSet(fresh(), curriculum, stages, NOW, 'x'), [])
  // M02 is locked for a fresh profile, so its skills are not offered even with stats.
  const p = bumpSkill(fresh(), 'key-signatures', false, NOW)
  assert.equal(reviewMixes(p, curriculum, stages).has('key-signatures'), false)
  assert.deepEqual(buildReviewSet(p, curriculum, stages, NOW, 'x'), [])
})

test('a unit practice skill is reviewed once its unit is open', () => {
  const p = bumpSkill(fresh(), 'sound-design', false, NOW)
  assert.equal(reviewMixes(p, curriculum, stages).has('sound-design'), false) // S02 is locked
  const s01 = stages[0]
  assert.ok(s01)
  const katas = s01.units.flatMap((u) => u.katas)
  const passed = katas.reduce((acc, k) => recordKata(acc, k.id, 'x', true, NOW), p)
  const open = recordBoss(passed, s01.boss.id, bossRecord(true))
  assert.equal(reviewMixes(open, curriculum, stages).has('sound-design'), true)
  assert.ok(buildReviewSet(open, curriculum, stages, NOW, 'x').length > 0)
})
