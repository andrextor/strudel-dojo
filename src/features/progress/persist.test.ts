import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Profile } from '../profiles/profiles.ts'
import {
  BACKUP_INVALID,
  createBackup,
  decodeBackup,
  emptyProgress,
  encodeBackup,
  mergeBackup,
  mergeProgress,
  parseBackup,
  parseProgress,
  readBackupFile,
} from './persist.ts'
import { recordKata, recordPractice } from './rules.ts'
import { fresh, NOW, passTopic, ready, takeTest } from './test-helpers.ts'

const profile: Profile = { id: 'p1', name: 'Iván', color: 'white', createdAt: NOW.toISOString() }
const t1 = ready('M01').topics[0]
if (t1 === undefined) throw new Error('no topic')

const busy = () => {
  let p = passTopic(fresh(), 'M01', 0)
  p = recordPractice(p, '2026-03-10', 'note-naming', true, NOW)
  return {
    ...p,
    scrolls: [{ id: 's1', name: 'Groove', code: 's("bd")', updatedAt: NOW.toISOString() }],
  }
}

test('parseProgress survives garbage and keeps the valid parts', () => {
  for (const junk of [null, 42, 'x', [], { version: 2 }]) {
    assert.deepEqual(parseProgress(junk), emptyProgress())
  }
  const p = busy()
  const raw = JSON.parse(JSON.stringify(p))
  raw.attempts.push({ id: 'broken' })
  raw.katas.bad = { code: 3 }
  raw.practiceDays['not-a-date'] = { answered: 1, correct: 1 }
  raw.prefs = { notation: 'american', instrument: 'banjo' }
  const parsed = parseProgress(raw)
  assert.deepEqual(parsed.attempts, p.attempts)
  assert.deepEqual(parsed.katas, p.katas)
  assert.deepEqual(parsed.practiceDays, p.practiceDays)
  assert.equal(parsed.prefs.notation, 'american')
  assert.equal(parsed.prefs.instrument, 'keyboard')
  assert.equal(parsed.prefs.lefty, false)
  assert.equal(parsed.prefs.via, null)
  assert.deepEqual(parseProgress(JSON.parse(JSON.stringify(p))), p)
})

test('backup code round-trips and rejects anything without the sdojo1: prefix', () => {
  const backup = createBackup(profile, busy(), NOW)
  const code = encodeBackup(backup)
  assert.ok(code.startsWith('sdojo1:'))
  assert.match(code.slice(7), /^[A-Za-z0-9_-]+$/)
  assert.deepEqual(decodeBackup(code), backup)
  assert.deepEqual(decodeBackup(`  ${code}\n`), backup)
  assert.equal(decodeBackup(code.slice(7)), null)
  assert.equal(decodeBackup('sdojo1:%%%'), null)
  assert.equal(decodeBackup(`sdojo1:${btoa('{"kind":"other"}')}`), null)
})

test('a corrupt backup file or code is rejected with a Spanish message', () => {
  for (const backup of [
    readBackupFile('{nope'),
    readBackupFile('{}'),
    decodeBackup('sdojo1:abc'),
  ]) {
    assert.deepEqual(mergeBackup(fresh(), backup), { ok: false, error: BACKUP_INVALID })
  }
  assert.equal(parseBackup({ kind: 'strudel-dojo-backup', version: 1, profile, progress: 1 }), null)
  const file = JSON.stringify(createBackup(profile, busy(), NOW))
  assert.ok(readBackupFile(file))
})

test('merging a backup is idempotent and never deletes', () => {
  const mine = takeTest(fresh(), { kind: 'test', scopeId: t1.id }, t1.test, 3).progress
  const backup = createBackup(profile, busy(), NOW)
  const once = mergeBackup(mine, backup)
  assert.ok(once.ok)
  assert.equal(once.addedAttempts, backup.progress.attempts.length)
  assert.equal(
    once.progress.attempts.length,
    mine.attempts.length + backup.progress.attempts.length,
  )
  const twice = mergeBackup(once.progress, backup)
  assert.ok(twice.ok)
  assert.deepEqual(twice.progress, once.progress)
  assert.equal(twice.addedAttempts, 0)
})

test('merge picks the more complete copy of each record', () => {
  const kata = 'M01-T01-K1'
  const open = takeTest(fresh(), { kind: 'test', scopeId: t1.id }, t1.test, 5).attempt
  const draft = { ...open, submittedAt: null, correct: null, passed: null }
  const later = new Date('2026-04-01T00:00:00Z')

  const a = {
    ...recordKata(fresh(), kata, 'early', true, NOW),
    attempts: [draft],
    practiceDays: { '2026-03-10': { answered: 4, correct: 4 } },
    skillStats: { x: { correct: 1, wrong: 0, lastSeen: later.toISOString(), box: 2 } },
  }
  const b = {
    ...recordKata(fresh(), kata, 'late', true, later),
    attempts: [open],
    practiceDays: { '2026-03-10': { answered: 9, correct: 2 } },
    skillStats: { x: { correct: 0, wrong: 3, lastSeen: NOW.toISOString(), box: 1 } },
  }
  const merged = mergeProgress(a, b)
  assert.equal(merged.katas[kata]?.code, 'early') // both passed: the older pass wins
  assert.equal(merged.attempts[0]?.submittedAt, open.submittedAt) // submitted beats open
  assert.equal(mergeProgress(b, a).attempts[0]?.submittedAt, open.submittedAt)
  assert.deepEqual(merged.practiceDays['2026-03-10'], { answered: 9, correct: 4 })
  assert.equal(merged.skillStats.x?.box, 2) // most recent lastSeen wins

  const attempted = recordKata(fresh(), kata, 'try', false, NOW)
  assert.equal(mergeProgress(attempted, a).katas[kata]?.code, 'early') // a pass beats an attempt
})

test('merge unions boss records by date and keeps more than 20 scrolls', () => {
  const scroll = (i: number) => ({ id: `s${i}`, name: `${i}`, code: '', updatedAt: '' })
  const a = { ...fresh(), scrolls: Array.from({ length: 15 }, (_, i) => scroll(i)) }
  const b = { ...fresh(), scrolls: Array.from({ length: 15 }, (_, i) => scroll(i + 10)) }
  assert.equal(mergeProgress(a, b).scrolls.length, 25)

  const rec = (submittedAt: string) => ({
    submittedAt,
    code: '',
    assertions: [],
    review: null,
    selfAssessed: true,
    score: 0,
    passed: false,
  })
  const x = { ...fresh(), bosses: { 'M01-BOSS': [rec('2026-03-02'), rec('2026-03-01')] } }
  const y = { ...fresh(), bosses: { 'M01-BOSS': [rec('2026-03-01'), rec('2026-03-03')] } }
  assert.deepEqual(
    mergeProgress(x, y).bosses['M01-BOSS']?.map((r) => r.submittedAt),
    ['2026-03-01', '2026-03-02', '2026-03-03'],
  )
})
