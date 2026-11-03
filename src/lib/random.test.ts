import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRng } from './random.ts'

test('same seed gives the same sequence', () => {
  const a = createRng('seed-1')
  const b = createRng('seed-1')
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next())
})

test('different seeds diverge', () => {
  const a = createRng('seed-1')
  const b = createRng('seed-2')
  const seqA = Array.from({ length: 20 }, () => a.next())
  const seqB = Array.from({ length: 20 }, () => b.next())
  assert.notDeepEqual(seqA, seqB)
})

test('int is in range and roughly uniform over 10000 samples', () => {
  const rng = createRng('uniform')
  const buckets = new Array(10).fill(0)
  for (let i = 0; i < 10000; i++) {
    const n = rng.int(0, 9)
    assert.ok(n >= 0 && n <= 9, `out of range: ${n}`)
    buckets[n]++
  }
  // Expected 1000 each; allow ±25%.
  for (const count of buckets) assert.ok(count > 750 && count < 1250, `skewed bucket: ${count}`)
})

test('pick and weighted respect weights', () => {
  const rng = createRng('weights')
  const entries = [
    { value: 'a', weight: 9 },
    { value: 'b', weight: 1 },
  ]
  let a = 0
  for (let i = 0; i < 1000; i++) if (rng.weighted(entries) === 'a') a++
  assert.ok(a > 800, `expected ~900 'a', got ${a}`)
})

test('shuffle keeps the same elements', () => {
  const rng = createRng('shuffle')
  const input = [1, 2, 3, 4, 5]
  const out = rng.shuffle(input)
  assert.deepEqual([...out].sort(), [...input].sort())
  assert.equal(input.length, 5) // input not mutated
})
