// Shared harness for generator tests (spec 03: 200 seeds each). Every module's test file calls
// generatorTests with its own cases; nothing here runs on its own.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Note } from 'tonal'
import { createRng } from '../../lib/random.ts'
import { grade } from './grade.ts'
import { registry } from './registry.ts'
import type { Question, Response } from './types.ts'

export interface GeneratorCase {
  id: string
  params: Record<string, unknown>
  strict?: boolean // a right-sounding wrong spelling of the first note must fail
  minDistinct?: number // distinct questions in 200 seeds; 12 by default (a 10-question test)
}

export function canonicalResponse(q: Question): Response {
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

export function generatorTests(cases: readonly GeneratorCase[]): void {
  for (const { id, params, strict, minDistinct = 12 } of cases) {
    test(`${id} (${JSON.stringify(params)}): 200 seeds are valid and grade correctly`, () => {
      const gen = registry.get(id)
      if (gen === undefined) throw new Error(`missing generator ${id}`)
      assert.ok(gen.validate(params), `params rejected by ${id}`)
      const keys = new Set<string>()

      for (let i = 0; i < 200; i++) {
        const q: Question = gen.run(params, createRng(`${id}:${i}`))
        keys.add(q.key)
        assert.ok(q.prompt.length > 0, 'empty prompt')
        assert.ok(q.explanation.length > 0, 'empty explanation')
        assert.equal(q.generator, id)
        assert.ok(q.key.length > 0, 'empty key')

        if (q.answer.kind === 'pitch-classes') {
          for (const n of q.answer.notes) {
            const got = Note.get(n)
            assert.ok(!got.empty && got.pc === n, `invalid note ${n} in ${id}`)
          }
        } else if (q.answer.kind === 'choice') {
          const options =
            q.input.kind === 'choice' || q.input.kind === 'rhythm' ? q.input.options : []
          assert.ok(options.length >= 2, `${id}: fewer than 2 options`)
          assert.equal(new Set(options).size, options.length, `${id}: repeated options`)
          assert.ok(
            q.answer.index >= 0 && q.answer.index < options.length,
            'choice index out of range',
          )
        } else {
          assert.ok((q.answer.accepted[0] ?? '').length > 0, 'empty accepted answer')
        }

        // Any audio is a playable Strudel expression.
        if (q.audio !== undefined) assert.match(q.audio, /\(".+"\)/, 'malformed audio')

        assert.equal(grade(q, canonicalResponse(q)).correct, true, `canonical failed: ${q.prompt}`)

        if (strict && q.answer.kind === 'pitch-classes') {
          const bad = misspell(q.answer.notes[0] ?? '')
          if (bad !== null) {
            const rest = q.answer.notes.slice(1)
            const g = grade(q, { kind: 'notes', notes: [bad, ...rest] })
            assert.equal(g.correct, false, `misspelling accepted: ${bad} for ${q.answer.notes[0]}`)
          }
        }
      }
      // A generator needs room to fill a 10-question test without repeating itself.
      assert.ok(
        keys.size >= minDistinct,
        `${id}: only ${keys.size} distinct questions in 200 seeds`,
      )
    })
  }
}
