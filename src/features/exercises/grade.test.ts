import assert from 'node:assert/strict'
import { test } from 'node:test'
import { grade, normalizeText } from './grade.ts'
import type { Question } from './types.ts'

function q(partial: Partial<Question> & Pick<Question, 'input' | 'answer'>): Question {
  return {
    id: '',
    key: '',
    generator: 'x',
    skill: 'x',
    prompt: 'p',
    explanation: 'e',
    ...partial,
  }
}

test('normalizeText lowercases, strips accents and collapses spaces', () => {
  assert.equal(normalizeText('  Dominante  '), 'dominante')
  assert.equal(normalizeText('SÉPTIMA'), 'septima')
})

test('choice grading', () => {
  const question = q({
    input: { kind: 'choice', options: ['a', 'b'] },
    answer: { kind: 'choice', index: 1 },
  })
  assert.equal(grade(question, { kind: 'choice', index: 1 }).correct, true)
  assert.equal(grade(question, { kind: 'choice', index: 0 }).correct, false)
})

test('text interval accepts American, Spanish short and long forms', () => {
  const question = q({
    input: { kind: 'text', placeholder: '' },
    answer: { kind: 'text', accepted: ['3M'] },
  })
  for (const v of ['3M', 'M3', 'tercera mayor', 'TERCERA MAYOR']) {
    assert.equal(grade(question, { kind: 'text', value: v }).correct, true, v)
  }
  assert.equal(grade(question, { kind: 'text', value: '3m' }).correct, false)
})

test('enharmonic rejects the same spelling and accepts the other one', () => {
  const question = q({
    input: { kind: 'text', placeholder: '' },
    answer: { kind: 'text', accepted: ['G#'] },
  })
  assert.equal(grade(question, { kind: 'text', value: 'sol sostenido' }).correct, true)
  assert.equal(grade(question, { kind: 'text', value: 'Ab' }).correct, false)
})

test('strict spelling fails a right-sounding wrong spelling, with feedback', () => {
  const question = q({
    input: { kind: 'note-set', via: ['text'], ordered: true },
    answer: {
      kind: 'pitch-classes',
      notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
      spelling: 'strict',
    },
  })
  assert.equal(
    grade(question, { kind: 'notes', notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'] }).correct,
    true,
  )
  const wrong = grade(question, { kind: 'notes', notes: ['G', 'A', 'B', 'C', 'D', 'E', 'Gb'] })
  assert.equal(wrong.correct, false)
  assert.match(wrong.feedback ?? '', /deletreo/)
})

test('enharmonic spelling accepts any equivalent note', () => {
  const question = q({
    input: { kind: 'note', via: ['keyboard'] },
    answer: { kind: 'pitch-classes', notes: ['A#'], spelling: 'enharmonic' },
  })
  assert.equal(grade(question, { kind: 'notes', notes: ['Bb'] }).correct, true)
  assert.equal(grade(question, { kind: 'notes', notes: ['A#'] }).correct, true)
})

test('unordered note-set ignores order', () => {
  const question = q({
    input: { kind: 'note-set', via: ['text'], ordered: false },
    answer: { kind: 'pitch-classes', notes: ['C', 'E', 'G'], spelling: 'strict' },
  })
  assert.equal(grade(question, { kind: 'notes', notes: ['G', 'C', 'E'] }).correct, true)
  assert.equal(grade(question, { kind: 'notes', notes: ['C', 'E', 'A'] }).correct, false)
})

test('mismatched response kind is incorrect', () => {
  const question = q({
    input: { kind: 'choice', options: ['a'] },
    answer: { kind: 'choice', index: 0 },
  })
  assert.equal(grade(question, { kind: 'text', value: 'a' }).correct, false)
})
