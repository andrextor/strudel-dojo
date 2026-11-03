import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatAnswer, formatResponse } from './format.ts'
import type { Question } from './types.ts'

const base = { id: 'x', key: 'x', generator: 'g', skill: 's', prompt: 'p', explanation: 'e' }

test('formatResponse and formatAnswer read every kind', () => {
  const choice: Question = {
    ...base,
    input: { kind: 'choice', options: ['3M', '5J'] },
    answer: { kind: 'choice', index: 1 },
  }
  assert.equal(formatResponse(choice, { kind: 'choice', index: 0 }, 'latin'), '3M')
  assert.equal(formatAnswer(choice, 'latin'), '5J')
  assert.equal(formatResponse(choice, null, 'latin'), 'Sin responder')

  const scale: Question = {
    ...base,
    input: { kind: 'note-set', via: ['text'], ordered: true },
    answer: { kind: 'pitch-classes', notes: ['D', 'F#'], spelling: 'strict' },
  }
  assert.equal(formatAnswer(scale, 'latin'), 'Re Fa♯')
  assert.equal(formatResponse(scale, { kind: 'notes', notes: ['re', 'solb'] }, 'american'), 'D G♭')
})
