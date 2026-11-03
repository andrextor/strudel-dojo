import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRng } from '../../lib/random.ts'
import { createProfile, parseProfiles, removeProfile, setActive } from './profiles.ts'

const now = new Date('2026-03-10T15:00:00Z')
const empty = { profiles: [], activeProfileId: null }

test('createProfile trims, limits to 24 chars and rejects case-insensitive duplicates', () => {
  const rng = createRng('profiles')
  const first = createProfile(empty, '  Iván  ', 'white', now, rng)
  assert.ok(first.ok)
  assert.equal(first.profile.name, 'Iván')
  assert.equal(first.state.activeProfileId, first.profile.id)

  assert.deepEqual(createProfile(first.state, 'IVÁN', 'blue', now, rng), {
    ok: false,
    error: 'Ya hay un perfil con ese nombre.',
  })
  assert.ok(createProfile(first.state, 'Ivan', 'blue', now, rng).ok) // accents still matter
  assert.equal(createProfile(empty, '   ', 'white', now, rng).ok, false)
  assert.equal(createProfile(empty, 'x'.repeat(25), 'white', now, rng).ok, false)
  assert.ok(createProfile(empty, 'x'.repeat(24), 'white', now, rng).ok)
})

test('removeProfile clears the active one and setActive ignores unknown ids', () => {
  const rng = createRng('p2')
  const a = createProfile(empty, 'Ana', 'white', now, rng)
  assert.ok(a.ok)
  const b = createProfile(a.state, 'Leo', 'yellow', now, rng)
  assert.ok(b.ok)
  assert.equal(setActive(b.state, 'nope'), b.state)
  const onA = setActive(b.state, a.profile.id)
  assert.equal(onA.activeProfileId, a.profile.id)
  const removed = removeProfile(onA, a.profile.id)
  assert.equal(removed.activeProfileId, null)
  assert.deepEqual(removed.profiles, [b.profile])
  assert.equal(removeProfile(b.state, a.profile.id).activeProfileId, b.profile.id)
})

test('parseProfiles drops invalid entries and a dangling active id', () => {
  const ok = { id: 'a', name: 'Ana', color: 'white', createdAt: '2026-01-01' }
  const parsed = parseProfiles({
    profiles: [ok, ok, { id: 'b', name: 'B', color: 'pink', createdAt: '' }, null],
    activeProfileId: 'b',
  })
  assert.deepEqual(parsed, { profiles: [ok], activeProfileId: null })
  assert.deepEqual(parseProfiles('junk'), empty)
})
