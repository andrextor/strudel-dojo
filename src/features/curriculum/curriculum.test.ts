import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { validateEntry } from '../exercises/registry.ts'
import { runKata, stripCode } from '../strudel/assertions.ts'
import { evaluatePattern } from '../strudel/evaluate.ts'
import { type Assertion, type Module, moduleSchema } from './schema.ts'
import { SKILL_NAME_ES } from './skills.ts'

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

test('each generator in a mix exists in the registry and its params validate', () => {
  for (const m of modules) {
    if (m.status !== 'ready') continue
    const mixes = [
      ...(m.placement ? [m.placement.mix] : []),
      ...m.topics.flatMap((t) => [t.practice.mix, t.test.mix]),
    ]
    for (const mix of mixes) {
      for (const entry of mix) {
        assert.ok(validateEntry(entry), `${m.id}: invalid mix entry ${JSON.stringify(entry)}`)
      }
    }
  }
})

// Reference pieces that must beat each boss. They live here, not in the content, so they never
// ship to the browser: a boss is creative, this only proves it can be passed.
const BOSS_SOLUTIONS: Record<string, string> = {
  'M01-BOSS': `stack(
  s("bd*2 [~ bd] ~ bd, ~ sd ~ sd, hh*8"),
  note("<[c4 e4 g4 c5] [b4 g4 d4 g4] [a4 f4 c4 f4] [g4 e4 d4 c4]>").s("piano")
)`,
  'M02-BOSS': `stack(
  note("<g2!4 e2!4>").s("piano"),
  n("<[0 2 4 2] [3 4 5 4] [2 1 0 1] [4 3 2 ~] [0 2 4 2] [5 4 3 2] [1 2 3 1] [0 ~ 0 ~]>")
    .scale("<G3:major!4 E3:minor!4>").s("piano")
)`,
}

const passesAll = async (code: string, assertions: Assertion[], cycles: number) => {
  const result = await runKata(code, assertions, cycles)
  return result.ok && result.passed
}

test('each kata and boss can be passed, and no starter passes already', async () => {
  for (const m of modules) {
    if (m.status !== 'ready') continue
    for (const kata of m.topics.flatMap((t) => t.katas)) {
      const result = await runKata(kata.solution, kata.assertions, kata.cycles)
      assert.ok(result.ok, `${kata.id} solution: ${result.ok ? '' : result.error.raw}`)
      for (const r of result.results) assert.ok(r.pass, `${kata.id} ${r.type}: ${r.message}`)
      const starter = await evaluatePattern(kata.starter)
      assert.ok(starter.ok, `${kata.id} starter: ${starter.ok ? '' : starter.error.raw}`)
      assert.ok(
        !(await passesAll(kata.starter, kata.assertions, kata.cycles)),
        `${kata.id}: the starter already passes`,
      )
    }
    const { boss } = m
    const solution = BOSS_SOLUTIONS[boss.id]
    assert.ok(solution, `${boss.id} has no reference solution in this test`)
    const result = await runKata(solution, boss.assertions, boss.cycles)
    assert.ok(result.ok, `${boss.id} solution: ${result.ok ? '' : result.error.raw}`)
    for (const r of result.results) assert.ok(r.pass, `${boss.id} ${r.type}: ${r.message}`)
    const starter = await evaluatePattern(boss.starter)
    assert.ok(starter.ok, `${boss.id} starter: ${starter.ok ? '' : starter.error.raw}`)
    assert.ok(
      !(await passesAll(boss.starter, boss.assertions, boss.cycles)),
      `${boss.id}: starter passes`,
    )
  }
})

// <Listen code="..." />, <Example code='...' /> or code={`...`} in the lesson MDX.
const SNIPPET = /<(?:Listen|Example)\b[^>]*?\bcode=(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g

test('each lesson Listen/Example code evaluates without error', async () => {
  for (const file of readdirSync(lessonsDir).filter((f) => f.endsWith('.mdx'))) {
    const mdx = readFileSync(`${lessonsDir}/${file}`, 'utf8')
    for (const match of mdx.matchAll(SNIPPET)) {
      const code = match[1] ?? match[2] ?? match[3] ?? ''
      const result = await evaluatePattern(code)
      assert.ok(result.ok, `${file}: ${code}: ${result.ok ? '' : result.error.message}`)
    }
  }
})

test('every skill has a Spanish name', () => {
  for (const m of modules) {
    for (const t of m.topics) {
      for (const skill of t.skills) assert.ok(SKILL_NAME_ES[skill], `no name for skill ${skill}`)
    }
  }
})

// Function calls in code, ignoring strings (mini-notation like "bd(3,8)") and comments.
const callsIn = (code: string) =>
  new Set([...stripCode(code).matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1] ?? ''))
const STRUDEL_REF = /<StrudelRef\b[^>]*?\bname="([^"]+)"/g

test('every function a kata or boss uses was shown in a lesson of that module or an earlier one', () => {
  const shown = new Set<string>()
  for (const m of modules) {
    if (m.status !== 'ready') continue
    for (const t of m.topics) {
      const mdx = readFileSync(`${lessonsDir}/${t.lesson}.mdx`, 'utf8')
      for (const match of mdx.matchAll(STRUDEL_REF)) shown.add(match[1] ?? '')
      for (const match of mdx.matchAll(SNIPPET)) {
        for (const fn of callsIn(match[1] ?? match[2] ?? match[3] ?? '')) shown.add(fn)
      }
      for (const kata of t.katas) {
        const required = kata.assertions.flatMap((a) => (a.type === 'usesFunction' ? a.names : []))
        for (const fn of [...required, ...callsIn(kata.solution)]) {
          assert.ok(shown.has(fn), `${kata.id} uses \`${fn}\`, which no lesson up to ${t.id} shows`)
        }
      }
    }
    const solution = BOSS_SOLUTIONS[m.boss.id] ?? ''
    const required = m.boss.assertions.flatMap((a) => (a.type === 'usesFunction' ? a.names : []))
    for (const fn of [...required, ...callsIn(solution)]) {
      assert.ok(
        shown.has(fn),
        `${m.boss.id} uses \`${fn}\`, which no lesson of ${m.id} or before shows`,
      )
    }
  }
})

test('no lesson is still a placeholder', () => {
  for (const m of modules) {
    if (m.status !== 'ready') continue
    for (const t of m.topics) {
      const mdx = readFileSync(`${lessonsDir}/${t.lesson}.mdx`, 'utf8')
      assert.ok(!/en preparación/i.test(mdx), `${t.lesson} is still a placeholder`)
    }
  }
})
