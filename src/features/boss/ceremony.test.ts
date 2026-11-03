import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evaluatePattern } from '../strudel/evaluate.ts'
import { queryEvents } from '../strudel/query.ts'
import { cadence } from './cadence.ts'

test('the ceremony plays I–IV–I in the belt key', async () => {
  assert.equal(cadence(1), 'note("[c3,e3,g3] [f3,a3,c4] [c3,e3,g3]").s("piano")')
  const r = await evaluatePattern(cadence(2))
  assert.ok(r.ok)
  const q = queryEvents(r.pattern, 1)
  assert.ok(q.ok)
  assert.deepEqual(
    q.events.map((e) => e.pitchClass),
    ['G', 'B', 'D', 'C', 'E', 'G', 'G', 'B', 'D'],
  )
})
