import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { type Module, moduleSchema } from './schema.ts'

const modulesDir = fileURLToPath(new URL('../../content/modules', import.meta.url))
const lessonsDir = fileURLToPath(new URL('../../content/lessons', import.meta.url))

function loadModules(): Module[] {
  const files = readdirSync(modulesDir).filter((f) => f.endsWith('.json'))
  return files.map((f) => {
    const raw = JSON.parse(readFileSync(`${modulesDir}/${f}`, 'utf8'))
    const parsed = moduleSchema.safeParse(raw)
    assert.ok(
      parsed.success,
      `${f} failed schema: ${parsed.success ? '' : JSON.stringify(parsed.error.issues[0])}`,
    )
    return parsed.data
  })
}

const modules = loadModules().sort((a, b) => a.order - b.order)

test('every module file matches the schema', () => {
  assert.equal(modules.length, 10)
})

test('ids are unique and correctly prefixed', () => {
  const seen = new Set<string>()
  const add = (id: string) => {
    assert.equal(seen.has(id), false, `duplicate id ${id}`)
    seen.add(id)
  }
  for (const m of modules) {
    add(m.id)
    for (const topic of m.topics) {
      add(topic.id)
      assert.ok(topic.id.startsWith(`${m.id}-T`), `${topic.id} not under ${m.id}`)
    }
    if (m.status === 'ready') {
      add(m.boss.id)
      assert.equal(m.boss.id, `${m.id}-BOSS`)
      for (const topic of m.topics) {
        for (const kata of topic.katas) {
          add(kata.id)
          assert.ok(kata.id.startsWith(`${topic.id}-K`), `${kata.id} not under ${topic.id}`)
        }
      }
    }
  }
})

test('order is 1..10 with no gaps', () => {
  assert.deepEqual(
    modules.map((m) => m.order),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  )
})

test('prerequisite chain follows order', () => {
  for (const m of modules) {
    if (m.order === 1) {
      assert.equal(m.prerequisite, null, 'first module has no prerequisite')
    } else {
      const prev = modules.find((x) => x.order === m.order - 1)
      assert.equal(m.prerequisite, prev?.id, `${m.id} should require ${prev?.id}`)
    }
  }
})

test('every ready topic lesson file exists', () => {
  const lessonFiles = new Set(readdirSync(lessonsDir).filter((f) => f.endsWith('.mdx')))
  for (const m of modules) {
    if (m.status !== 'ready') continue
    for (const topic of m.topics) {
      assert.ok(lessonFiles.has(`${topic.lesson}.mdx`), `missing lesson ${topic.lesson}.mdx`)
    }
  }
})

test('ready modules M01 and M02, rest draft', () => {
  assert.equal(modules.find((m) => m.id === 'M01')?.status, 'ready')
  assert.equal(modules.find((m) => m.id === 'M02')?.status, 'ready')
  for (const m of modules) {
    if (m.id !== 'M01' && m.id !== 'M02') assert.equal(m.status, 'draft', `${m.id} should be draft`)
  }
})

// Completed in later phases:
test.todo('each generator in a mix exists in the registry and its params validate (P03)')
test.todo('each kata and boss solution passes its assertions (P05)')
test.todo('each lesson Listen/Example code evaluates without error (P05/P08)')
