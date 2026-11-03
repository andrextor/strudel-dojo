import assert from 'node:assert/strict'
import { test } from 'node:test'
import { capoShape, transposeSequence, transposeToKey } from './transpose.ts'

test('transposeSequence', () => {
  assert.deepEqual(transposeSequence(['C', 'E', 'G'], '3M'), ['E', 'G#', 'B'])
  assert.deepEqual(transposeSequence(['C4', 'D4'], '2M'), ['D4', 'E4'])
  assert.equal(transposeSequence(['C', 'nope'], '3M'), null)
})

test('transposeToKey keeps destination spelling', () => {
  assert.deepEqual(transposeToKey(['C', 'D', 'E'], 'C', 'D'), ['D', 'E', 'F#'])
  assert.deepEqual(transposeToKey(['C', 'E', 'G'], 'C', 'Eb'), ['Eb', 'G', 'Bb'])
  assert.equal(transposeToKey(['C'], 'C', 'nope'), null)
})

test('capoShape', () => {
  assert.equal(capoShape('D', 2), 'C')
  assert.equal(capoShape('F', 1), 'E')
  assert.equal(capoShape('Am', 2), 'Gm')
  assert.equal(capoShape('C', 0), 'C')
  assert.equal(capoShape('nope', 2), null)
})
