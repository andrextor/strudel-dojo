import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { type Module, moduleSchema } from '../curriculum/schema.ts'
import { buildSet, generateQuestion, validateEntry } from './registry.ts'

const modulesDir = fileURLToPath(new URL('../../content/modules', import.meta.url))

function readModule(id: string): Module {
  const raw = JSON.parse(readFileSync(`${modulesDir}/${id.toLowerCase()}.json`, 'utf8'))
  const parsed = moduleSchema.safeParse(raw)
  assert.ok(parsed.success, `${id} invalid`)
  return parsed.data
}

const ready = ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10'].map(readModule)

test('every graded mix builds a full set with no duplicates across 100 seeds', () => {
  for (const m of ready) {
    if (m.status !== 'ready') continue
    for (const topic of m.topics) {
      const { questions, mix } = topic.test
      for (let s = 0; s < 100; s++) {
        const set = buildSet(mix, questions, `${topic.id}:test:${s}`)
        assert.equal(set.length, questions, `${topic.id} seed ${s}: wrong count`)
        const keys = new Set(set.map((q) => q.key))
        assert.equal(keys.size, questions, `${topic.id} seed ${s}: duplicate keys`)
        set.forEach((q, i) => {
          assert.equal(q.id, `${topic.id}:test:${s}:${i}`)
        })
      }
    }
  }
})

test('every generator and params in every mix validate', () => {
  for (const m of ready) {
    const mixes = [
      ...(m.status === 'ready' && m.placement ? [m.placement.mix] : []),
      ...(m.status === 'ready' ? m.topics.flatMap((t) => [t.practice.mix, t.test.mix]) : []),
    ]
    for (const mix of mixes) {
      for (const entry of mix) {
        assert.ok(validateEntry(entry), `invalid entry: ${JSON.stringify(entry)}`)
      }
    }
  }
})

test('unknown generator throws a clear error', () => {
  assert.throws(
    () => generateQuestion({ generator: 'does-not-exist', weight: 1 }, 'seed', new Set()),
    /unknown generator/,
  )
})

test('placement mixes build without duplicates', () => {
  for (const m of ready) {
    if (m.status !== 'ready' || !m.placement) continue
    for (let s = 0; s < 30; s++) {
      const set = buildSet(m.placement.mix, m.placement.questions, `${m.id}:placement:${s}`)
      assert.equal(new Set(set.map((q) => q.key)).size, m.placement.questions, `${m.id} seed ${s}`)
    }
  }
})
