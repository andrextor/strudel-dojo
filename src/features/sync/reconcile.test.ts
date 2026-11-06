import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Profile } from '../profiles/profiles.ts'
import { emptyProgress } from '../progress/persist.ts'
import { recordKata } from '../progress/rules.ts'
import type { ProgressState } from '../progress/types.ts'
import { type SyncDb, type SyncDevice, syncOnce } from './engine.ts'
import { type LocalProfile, type Plan, parseRows, type RemoteRow, reconcile } from './reconcile.ts'

const NOW = new Date('2026-11-05T12:00:00Z')
const profile = (id: string, name = 'Iván'): Profile => ({
  id,
  name,
  color: 'white',
  createdAt: NOW.toISOString(),
})
const withKata = (id: string, base = emptyProgress()) => recordKata(base, id, 'x', true, NOW)
const local = (id: string, progress = emptyProgress(), name = 'Iván'): LocalProfile => ({
  profile: profile(id, name),
  progress,
})
const row = (id: string, progress: unknown = emptyProgress(), over: Partial<RemoteRow> = {}) => ({
  profile_id: id,
  name: 'Iván',
  color: 'white',
  created_at: NOW.toISOString(),
  progress,
  revision: 1,
  deleted_at: null,
  ...over,
})

test('a profile only on this device is uploaded, one only in the cloud comes down', () => {
  const plan = reconcile([local('a', emptyProgress(), 'Ana')], [row('b')], [])
  assert.deepEqual(
    plan.uploads.map((u) => [u.profile.id, u.revision]),
    [['a', null]],
  )
  assert.deepEqual(plan.kept.map((k) => k.profile.id).sort(), ['a', 'b'])
})

test('the same name under two ids becomes one profile with both progresses', () => {
  const plan = reconcile(
    [local('phone', withKata('K1'))],
    [row('laptop', withKata('K2'), { revision: 4 })],
    [],
  )
  assert.deepEqual(plan.renames, { phone: 'laptop' })
  assert.equal(plan.kept.length, 1)
  const [kept] = plan.kept
  assert.deepEqual(Object.keys(kept?.progress.katas ?? {}).sort(), ['K1', 'K2'])
  assert.equal(plan.uploads[0]?.revision, 4)
})

test('a profile deleted elsewhere is removed here, not uploaded again', () => {
  const plan = reconcile([local('a')], [row('a', {}, { deleted_at: NOW.toISOString() })], [])
  assert.deepEqual(plan.removals, ['a'])
  assert.deepEqual(plan.kept, [])
  assert.deepEqual(plan.uploads, [])
})

test('a deleted name is free: a new profile with it is a new row', () => {
  const plan = reconcile([local('new')], [row('old', {}, { deleted_at: NOW.toISOString() })], [])
  assert.deepEqual(plan.renames, {})
  assert.equal(plan.uploads[0]?.revision, null)
})

test('a local delete reaches the cloud and the row does not come back', () => {
  const plan = reconcile([], [row('a', emptyProgress(), { revision: 2 })], ['a'])
  assert.deepEqual(plan.deletes, [{ profileId: 'a', revision: 2 }])
  assert.deepEqual(plan.kept, [])
})

test('no difference means no writes, even with other device settings and key order', () => {
  const mine = withKata('K1')
  const theirs = JSON.parse(JSON.stringify(mine)) as ProgressState
  const device = { ...mine, prefs: { ...mine.prefs, notation: 'american' as const } }
  assert.deepEqual(reconcile([local('a', device)], [row('a', theirs)], []).uploads, [])
})

test('merging twice changes nothing', () => {
  const first = reconcile([local('a', withKata('K1'))], [row('a', withKata('K2'))], [])
  const progress = first.kept[0]?.progress
  assert.ok(progress)
  assert.deepEqual(reconcile([local('a', progress)], [row('a', progress)], []).uploads, [])
})

test('malformed rows are dropped', () => {
  assert.deepEqual(parseRows('nope'), [])
  assert.deepEqual(parseRows([{ profile_id: 1 }, null]), [])
  assert.equal(parseRows([row('a')]).length, 1)
})

// A tiny cloud with the same revision check as the real update.
function fakeCloud(rows: RemoteRow[]) {
  const db: SyncDb & { rows: RemoteRow[]; beforeWrite?: () => void } = {
    rows,
    fetchRows: async () => JSON.parse(JSON.stringify(db.rows)),
    insert: async (p, progress) => {
      if (db.rows.some((r) => r.profile_id === p.id)) return false
      db.rows.push(row(p.id, progress, { name: p.name }))
      return true
    },
    update: async (p, progress, revision) => {
      db.beforeWrite?.()
      const target = db.rows.find((r) => r.profile_id === p.id)
      if (target?.revision !== revision) return false
      target.progress = progress
      target.revision += 1
      return true
    },
    softDelete: async (id, revision) => {
      const target = db.rows.find((r) => r.profile_id === id)
      if (target?.revision !== revision) return false
      target.deleted_at = NOW.toISOString()
      return true
    },
  }
  return db
}

function fakeDevice(start: LocalProfile[], pendingDeletes: string[] = []) {
  const device: SyncDevice & { state: LocalProfile[]; pending: string[] } = {
    state: start,
    pending: pendingDeletes,
    readLocal: () => ({ profiles: device.state, pendingDeletes: device.pending }),
    apply: (plan: Plan) => {
      device.state = plan.kept
    },
    confirmDeletes: () => {
      device.pending = []
    },
  }
  return device
}

const katasIn = (r: RemoteRow | undefined) =>
  Object.keys((r?.progress as ProgressState).katas).sort()

test('two devices end up with the union of their changes', async () => {
  const cloud = fakeCloud([])
  const phone = fakeDevice([local('phone', withKata('K1'))])
  const laptop = fakeDevice([local('laptop', withKata('K2'))])
  assert.equal(await syncOnce(cloud, phone), true)
  assert.equal(await syncOnce(cloud, laptop), true)
  assert.equal(await syncOnce(cloud, phone), true)
  assert.deepEqual(katasIn(cloud.rows[0]), ['K1', 'K2'])
  assert.deepEqual(Object.keys(phone.state[0]?.progress.katas ?? {}).sort(), ['K1', 'K2'])
  assert.equal(phone.state[0]?.profile.id, laptop.state[0]?.profile.id)
})

test('a write that loses the race rereads, merges and keeps both changes', async () => {
  const cloud = fakeCloud([row('a', withKata('K0'))])
  const device = fakeDevice([local('a', withKata('K1'))])
  let raced = false
  cloud.beforeWrite = () => {
    if (raced) return
    raced = true
    const target = cloud.rows[0]
    assert.ok(target)
    target.progress = withKata('K2', target.progress as ProgressState)
    target.revision += 1
  }
  assert.equal(await syncOnce(cloud, device), true)
  assert.deepEqual(katasIn(cloud.rows[0]), ['K0', 'K1', 'K2'])
})

test('a sync that keeps losing reports failure', async () => {
  const cloud = fakeCloud([row('a')])
  cloud.update = async () => false
  assert.equal(await syncOnce(cloud, fakeDevice([local('a', withKata('K1'))])), false)
})

test('a delete is confirmed only after it reaches the cloud', async () => {
  const cloud = fakeCloud([row('a')])
  const device = fakeDevice([], ['a'])
  assert.equal(await syncOnce(cloud, device), true)
  assert.notEqual(cloud.rows[0]?.deleted_at, null)
  assert.deepEqual(device.pending, [])
})
