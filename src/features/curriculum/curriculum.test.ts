import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { buildSet, validateEntry } from '../exercises/registry.ts'
import { runKata, stripCode } from '../strudel/assertions.ts'
import { evaluatePattern } from '../strudel/evaluate.ts'
import { bossSolution as m04 } from './boss-solutions/m04.ts'
import { bossSolution as m05 } from './boss-solutions/m05.ts'
import { bossSolution as m06 } from './boss-solutions/m06.ts'
import { bossSolution as m07 } from './boss-solutions/m07.ts'
import { bossSolution as m08 } from './boss-solutions/m08.ts'
import { bossSolution as m09 } from './boss-solutions/m09.ts'
import { bossSolution as m10 } from './boss-solutions/m10.ts'
import { bossSolution as s01 } from './boss-solutions/s01.ts'
import { bossSolution as s02 } from './boss-solutions/s02.ts'
import { type Assertion, type Module, moduleSchema, type Stage, stageSchema } from './schema.ts'
import { SKILL_NAME_ES } from './skills.ts'

const modulesDir = fileURLToPath(new URL('../../content/modules', import.meta.url))
const lessonsDir = fileURLToPath(new URL('../../content/lessons', import.meta.url))
const stagesDir = fileURLToPath(new URL('../../content/stages', import.meta.url))
const unitLessonsDir = fileURLToPath(new URL('../../content/strudel-lessons', import.meta.url))

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

const stages: Stage[] = readdirSync(stagesDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => stageSchema.parse(JSON.parse(readFileSync(`${stagesDir}/${f}`, 'utf8'))))
  .sort((a, b) => a.order - b.order)

const units = stages.flatMap((s) => s.units)
const katas = units.flatMap((u) => u.katas)

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
  }
  for (const stage of stages) {
    add(stage.id)
    add(stage.boss.id)
    for (const unit of stage.units) {
      add(unit.id)
      assert.ok(unit.id.startsWith(`${stage.id}-U`), `${unit.id} not under ${stage.id}`)
      for (const kata of unit.katas) add(kata.id)
    }
  }
})

test('stages follow their order and prerequisite chain', () => {
  assert.equal(stages.length, 12)
  stages.forEach((s, i) => {
    assert.equal(s.order, i + 1)
    assert.equal(s.prerequisite, stages[i - 1]?.id ?? null)
  })
})

test('every unit requires theory topics that exist', () => {
  const topics = new Set(modules.flatMap((m) => m.topics.map((t) => t.id)))
  for (const u of units) {
    for (const id of u.requires) assert.ok(topics.has(id), `${u.id} requires unknown ${id}`)
  }
})

// Saved progress is keyed by these ids: moving content must never lose one.
test('all 120 belt katas and the 10 belt bosses are still in the course', () => {
  const ids = new Set(katas.map((k) => k.id))
  for (let m = 1; m <= 10; m++) {
    const mm = String(m).padStart(2, '0')
    for (let t = 1; t <= 4; t++) {
      for (let k = 1; k <= 3; k++) {
        const id = `M${mm}-T0${t}-K${k}`
        assert.ok(ids.has(id), `${id} is gone`)
      }
    }
    assert.ok(
      stages.some((s) => s.boss.id === `M${mm}-BOSS`),
      `M${mm}-BOSS is gone`,
    )
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

// Belts are finished in order: the ready modules are always M01…Mk, with no draft in between.
test('ready modules come first, in order, and the rest are drafts', () => {
  const firstDraft = modules.findIndex((m) => m.status === 'draft')
  const cut = firstDraft === -1 ? modules.length : firstDraft
  for (const m of modules.slice(cut))
    assert.equal(m.status, 'draft', `${m.id} is ready after a draft`)
  assert.ok(cut >= 3, 'M01–M03 are ready')
})

test('each generator in a mix exists in the registry and its params validate', () => {
  for (const m of modules) {
    if (m.status !== 'ready') continue
    const mixes = [m.exam.mix, ...m.topics.flatMap((t) => [t.practice.mix, t.test.mix])]
    for (const mix of mixes) {
      for (const entry of mix) {
        assert.ok(validateEntry(entry), `${m.id}: invalid mix entry ${JSON.stringify(entry)}`)
      }
    }
  }
})

test('every test and exam builds a full set for 30 seeds', () => {
  for (const m of modules) {
    if (m.status !== 'ready') continue
    const sets = [
      { id: `${m.id} exam`, ...m.exam },
      ...m.topics.map((t) => ({ id: t.id, ...t.test })),
    ]
    for (const set of sets) {
      for (let i = 0; i < 30; i++) {
        assert.doesNotThrow(() => buildSet(set.mix, set.questions, `seed:${i}`), set.id)
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
  ...Object.fromEntries(
    Object.entries({
      S01: s01,
      S02: s02,
      M04: m04,
      M05: m05,
      M06: m06,
      M07: m07,
      M08: m08,
      M09: m09,
      M10: m10,
    })
      .filter((e): e is [string, string] => e[1] !== null)
      .map(([id, code]) => [`${id}-BOSS`, code]),
  ),
  'M03-BOSS': `stack(
  chord("<C Am F G>").voicing().arp("0 1 2 3 4 3 2 1").s("piano"),
  chord("<C Am F G>").rootNotes(2).s("piano")
)`,
}

const passesAll = async (code: string, assertions: Assertion[], cycles: number) => {
  const result = await runKata(code, assertions, cycles)
  return result.ok && result.passed
}

test('each kata and boss can be passed, and no starter passes already', async () => {
  for (const kata of katas) {
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
  for (const { boss } of stages) {
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
  const files = [lessonsDir, unitLessonsDir].flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => `${dir}/${f}`),
  )
  for (const file of files) {
    const mdx = readFileSync(file, 'utf8')
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

test('every function a kata or boss uses was shown in its unit or an earlier one', () => {
  const shown = new Set<string>()
  for (const stage of stages) {
    for (const unit of stage.units) {
      const mdx = readFileSync(`${unitLessonsDir}/${unit.lesson}.mdx`, 'utf8')
      for (const match of mdx.matchAll(STRUDEL_REF)) shown.add(match[1] ?? '')
      for (const match of mdx.matchAll(SNIPPET)) {
        for (const fn of callsIn(match[1] ?? match[2] ?? match[3] ?? '')) shown.add(fn)
      }
      for (const kata of unit.katas) {
        const required = kata.assertions.flatMap((a) => (a.type === 'usesFunction' ? a.names : []))
        for (const fn of [...required, ...callsIn(kata.solution)]) {
          assert.ok(
            shown.has(fn),
            `${kata.id} uses \`${fn}\`, which no lesson up to ${unit.id} shows`,
          )
        }
      }
    }
    const solution = BOSS_SOLUTIONS[stage.boss.id] ?? ''
    const required = stage.boss.assertions.flatMap((a) =>
      a.type === 'usesFunction' ? a.names : [],
    )
    for (const fn of [...required, ...callsIn(solution)]) {
      assert.ok(shown.has(fn), `${stage.boss.id} uses \`${fn}\`, not shown up to ${stage.id}`)
    }
  }
})

test('every unit has its lesson and none is a placeholder', () => {
  for (const u of units) {
    const mdx = readFileSync(`${unitLessonsDir}/${u.lesson}.mdx`, 'utf8')
    assert.ok(!/en preparación/i.test(mdx), `${u.lesson} is still a placeholder`)
  }
})

test('theory lessons teach no code', () => {
  for (const file of readdirSync(lessonsDir).filter((f) => f.endsWith('.mdx'))) {
    const mdx = readFileSync(`${lessonsDir}/${file}`, 'utf8')
    assert.ok(!/<Example\b|<StrudelRef\b|^## .*Strudel/m.test(mdx), `${file} still teaches code`)
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
