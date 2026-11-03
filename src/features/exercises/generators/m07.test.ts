import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generatorTests } from '../check-generators.ts'
import { tensionsOf } from './m07.ts'

generatorTests([
  { id: 'seventh-spelling', params: {}, strict: true },
  {
    id: 'seventh-spelling',
    params: { types: ['dim7'], roots: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
    strict: true,
    minDistinct: 7,
  },
  { id: 'diatonic-seventh', params: {} },
  { id: 'tension-available', params: {} },
  { id: 'guide-tones', params: {}, strict: true },
  { id: 'guide-tone-resolution', params: {} },
])

test('avoid notes in C major follow the half-step rule taught in M07-T03', () => {
  const avoid = [0, 1, 2, 3, 4, 5, 6].map((d) =>
    tensionsOf('C', d)
      .filter((t) => t.avoid)
      .map((t) => t.label)
      .join(','),
  )
  // Imaj7 11 · iim7 none · iiim7 9 and 13 · IVmaj7 none · V7 11 · vim7 13 · viiø7 9
  assert.deepEqual(avoid, ['11', '', '9,13', '', '11', '13', '9'])
})
