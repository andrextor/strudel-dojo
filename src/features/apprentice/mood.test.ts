import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emptyProgress } from '../progress/persist.ts'
import { recordKata } from '../progress/rules.ts'
import { restingPose } from './mood.ts'

const TZ = 'UTC'
const on = (day: string) => new Date(`${day}T12:00:00Z`)
const activeOn = (...days: string[]) =>
  days.reduce((p, d, i) => recordKata(p, `K${i}`, 'x', true, on(d)), emptyProgress())

test('a new profile stands on guard', () => {
  assert.equal(restingPose(emptyProgress(), on('2026-11-05'), TZ), 'guard')
})

test('recent activity stands on guard', () => {
  assert.equal(restingPose(activeOn('2026-11-03'), on('2026-11-05'), TZ), 'guard')
})

test('three days in a row bring out the ki', () => {
  const p = activeOn('2026-11-03', '2026-11-04', '2026-11-05')
  assert.equal(restingPose(p, on('2026-11-05'), TZ), 'ki')
})

test('three days away is rest, and absence is never a sad pose', () => {
  const p = activeOn('2026-11-01')
  assert.equal(restingPose(p, on('2026-11-04'), TZ), 'meditate')
  assert.equal(restingPose(p, on('2026-12-25'), TZ), 'meditate')
})
