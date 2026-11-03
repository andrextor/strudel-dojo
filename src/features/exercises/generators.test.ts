import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Note } from 'tonal'
import { createRng } from '../../lib/random.ts'
import { grade } from './grade.ts'
import { registry } from './registry.ts'
import type { Question, Response } from './types.ts'

// Representative params drawn from M01–M02 content, one case per generator.
const CASES: { id: string; params: Record<string, unknown>; strict?: boolean }[] = [
  { id: 'note-name', params: { accidentals: 'all' } },
  { id: 'enharmonic', params: { allowDouble: true } },
  { id: 'semitone-count', params: { maxSemitones: 12 } },
  { id: 'interval-name', params: { maxInterval: '8P', qualities: ['m', 'M', 'P'] } },
  { id: 'interval-build', params: { maxInterval: '8P' }, strict: true },
  { id: 'interval-invert', params: {} },
  { id: 'ear-interval', params: { set: ['2M', '3M', '4P', '5P', '8P'], direction: 'up' } },
  { id: 'ear-interval', params: { set: ['3m', '3M'], direction: 'harmonic' } },
  { id: 'rhythm-match', params: { meter: 4, subdivision: 4 } },
  { id: 'scale-spelling', params: { scales: ['major'] }, strict: true },
  { id: 'scale-spelling', params: { scales: ['minor'] }, strict: true },
  { id: 'key-signature', params: { maxAccidentals: 7 } },
  { id: 'key-signature', params: { maxAccidentals: 4, minor: true } },
  { id: 'scale-degree', params: { scales: ['major'] } },
  { id: 'relative-key', params: { maxAccidentals: 7 } },
]

function canonicalResponse(q: Question): Response {
  switch (q.answer.kind) {
    case 'choice':
      return { kind: 'choice', index: q.answer.index }
    case 'pitch-classes':
      return { kind: 'notes', notes: q.answer.notes }
    case 'text':
      return { kind: 'text', value: q.answer.accepted[0] ?? '' }
  }
}

// A valid but wrongly-spelled version of the first note, if an obvious one exists.
function misspell(note: string): string | null {
  const other = Note.enharmonic(note)
  if (other === note || other === '') return null
  if (!/^[A-G](#|b)?$/.test(other)) return null // skip doubles, keep it realistic
  return other
}

for (const { id, params, strict } of CASES) {
  test(`${id} (${JSON.stringify(params)}): 200 seeds are valid and grade correctly`, () => {
    const gen = registry.get(id)
    if (gen === undefined) throw new Error(`missing generator ${id}`)
    assert.ok(gen.validate(params), `params rejected by ${id}`)

    for (let i = 0; i < 200; i++) {
      const q: Question = gen.run(params, createRng(`${id}:${i}`))
      assert.ok(q.prompt.length > 0, 'empty prompt')
      assert.ok(q.explanation.length > 0, 'empty explanation')
      assert.equal(q.generator, id)
      assert.ok(q.key.length > 0, 'empty key')

      // Answer agrees with tonal / is internally consistent.
      if (q.answer.kind === 'pitch-classes') {
        for (const n of q.answer.notes) {
          const got = Note.get(n)
          assert.ok(!got.empty && got.pc === n, `invalid note ${n} in ${id}`)
        }
      } else if (q.answer.kind === 'choice') {
        assert.ok(q.input.kind === 'choice' || q.input.kind === 'rhythm')
        const options =
          q.input.kind === 'choice' || q.input.kind === 'rhythm' ? q.input.options : []
        assert.ok(
          q.answer.index >= 0 && q.answer.index < options.length,
          'choice index out of range',
        )
      } else {
        assert.ok((q.answer.accepted[0] ?? '').length > 0, 'empty accepted answer')
      }

      // Ear exercises carry playable Strudel code.
      if (id === 'ear-interval' || id === 'rhythm-match') {
        assert.match(q.audio ?? '', /\(".+"\)/, 'missing or malformed audio')
      }

      // Canonical answer is graded correct.
      assert.equal(grade(q, canonicalResponse(q)).correct, true, `canonical failed: ${q.prompt}`)

      // Strict spelling: a right-sounding wrong spelling must fail.
      if (strict && q.answer.kind === 'pitch-classes') {
        const bad = misspell(q.answer.notes[0] ?? '')
        if (bad !== null) {
          const rest = q.answer.notes.slice(1)
          const g = grade(q, { kind: 'notes', notes: [bad, ...rest] })
          assert.equal(g.correct, false, `misspelling accepted: ${bad} for ${q.answer.notes[0]}`)
        }
      }
    }
  })
}
