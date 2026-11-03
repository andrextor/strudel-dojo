import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_CODE, parseExplain, parseHint, parseReview, readBody } from './contracts.ts'

test('readBody rejects oversized and non-object bodies', () => {
  assert.deepEqual(readBody('x'.repeat(40_000)).ok, false)
  assert.equal((readBody('x'.repeat(40_000)) as { status: number }).status, 413)
  assert.equal(readBody('[1]').ok, false)
  assert.equal(readBody('{"a":1}').ok, true)
})

test('code over 8 000 characters is a 413 with a clear message', () => {
  const r = parseExplain({ code: 'a'.repeat(9_000) })
  assert.equal(r.ok, false)
  if (!r.ok) {
    assert.equal(r.status, 413)
    assert.match(r.error, /8000 caracteres/)
  }
  assert.equal(parseExplain({ code: 'a'.repeat(MAX_CODE) }).ok, true)
  assert.equal(parseExplain({ code: '   ' }).ok, false)
})

test('parseHint accepts a question snapshot or a kata id with code', () => {
  const q = parseHint({
    context: 'question',
    question: {
      prompt: '¿Qué intervalo hay?',
      skill: 'interval-quality',
      input: { kind: 'text', placeholder: '3M' },
      answer: { kind: 'text', accepted: ['3M'] },
    },
  })
  assert.ok(q.ok && q.value.context === 'question')
  assert.ok(parseHint({ context: 'kata', kataId: 'M01-T03-K1', code: 'note("c")' }).ok)
  assert.equal(parseHint({ context: 'kata', kataId: '../etc', code: 'x' }).ok, false)
  assert.equal(parseHint({ context: 'question', question: { prompt: 'x' } }).ok, false)
})

test('parseReview needs a boss id and code', () => {
  assert.ok(parseReview({ bossId: 'M01-BOSS', code: 's("bd")' }).ok)
  assert.equal(parseReview({ bossId: 'M01-T01-K1', code: 's("bd")' }).ok, false)
})
