import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Assertion } from '../curriculum/schema.ts'
import { checkAssertion, runKata, stripCode } from './assertions.ts'
import { levenshtein, suggest } from './errors.ts'
import { evaluatePattern } from './evaluate.ts'
import { firstCycle, MAX_EVENTS, queryEvents, summarize } from './query.ts'
import type { NoteEvent } from './types.ts'

async function events(code: string, cycles = 1): Promise<NoteEvent[]> {
  const r = await evaluatePattern(code)
  if (!r.ok) throw new Error(r.error.raw)
  const q = queryEvents(r.pattern, cycles)
  if (!q.ok) throw new Error(q.error.raw)
  return q.events
}

async function check(a: Assertion, code: string, cycles = 1) {
  return checkAssertion(a, await events(code, cycles), code, cycles)
}

test('spike: core + mini + tonal + transpiler evaluate and query in Node', async () => {
  const r = await evaluatePattern('note("c3 [e3,g3]").s("piano")')
  assert.ok(r.ok)
  const haps = r.pattern.queryArc(0, 1)
  assert.equal(haps.length, 3)
})

test('queryEvents normalizes note, n + scale, freq and samples', async () => {
  const chord = await events('note("c3 [e3,g3]").s("piano")')
  assert.deepEqual(
    chord.map((e) => [e.begin, e.end, e.midi, e.pitchClass, e.sound, e.voice]),
    [
      [0, 0.5, 48, 'C', 'piano', undefined],
      [0.5, 1, 52, 'E', 'piano', 0],
      [0.5, 1, 55, 'G', 'piano', 1],
    ],
  )
  const dorian = await events('n("0 2 4 <6 7>").scale("D:dorian")', 2)
  assert.deepEqual(
    dorian.map((e) => e.pitchClass),
    ['D', 'F', 'A', 'C', 'D', 'F', 'A', 'D'],
  )
  assert.equal(dorian[4]?.cycle, 1)
  assert.deepEqual(
    (await events('freq("440")')).map((e) => e.midi),
    [69],
  )
  assert.deepEqual(
    (await events('note("c f#")')).map((e) => e.midi),
    [48, 54],
  )
  const drums = await events('s("bd sd")')
  assert.deepEqual(
    drums.map((e) => [e.sound, e.midi]),
    [
      ['bd', null],
      ['sd', null],
    ],
  )
})

test('queryEvents stops at the event cap with a clear error', async () => {
  const r = await evaluatePattern('note("c3 e3").fast(4000)')
  assert.ok(r.ok)
  const q = queryEvents(r.pattern, 1)
  assert.equal(q.ok, false)
  if (!q.ok) assert.match(q.error.message, new RegExp(`más de ${MAX_EVENTS}`))
})

test('summarize reports key, range, chords and sounds', async () => {
  const s = summarize(await events('note("<[c3,e3,g3] [a2,c3,e3]>").s("piano")', 2), 2)
  assert.equal(s.key, 'C major')
  assert.deepEqual(s.range, { low: 'A2', high: 'G3' })
  assert.deepEqual(s.eventsPerCycle, [3, 3])
  assert.deepEqual(s.chordsPerCycle, ['CM', 'Am'])
  assert.deepEqual(s.sounds, ['piano'])
})

test('beginner errors become Spanish messages with a line', async () => {
  const cases: [string, RegExp, number | null][] = [
    ['note("c3 e3"', /Falta cerrar un paréntesis/, 1],
    ['note("c3 e3)', /Falta cerrar unas comillas/, 1],
    ['s("bd")\n  .fast(2', /Falta cerrar un paréntesis.*línea 2/, 2],
    ['note("c3 [e3")', /mini-notation de la línea 1.*Falta cerrar `\]`/, 1],
    [
      'note("c3")\n  .scael("C:major")',
      /`scael` no es una función de Strudel, ¿quisiste decir `scale`\?/,
      2,
    ],
    ['nots("c3")', /`nots` no existe, ¿quisiste decir `note`\?/, 1],
    ['s("bd").fast(x)', /`x` no existe/, 1],
    ['1 + 1', /no produce un patrón/, null],
  ]
  for (const [code, message, line] of cases) {
    const r = await evaluatePattern(code)
    assert.equal(r.ok, false, code)
    if (r.ok) continue
    assert.match(r.error.message, message, code)
    assert.equal(r.error.line, line, code)
    assert.ok(r.error.raw.length > 0)
  }
})

test('levenshtein and suggest', () => {
  assert.equal(levenshtein('scael', 'scale'), 2)
  assert.equal(suggest('scael', ['scale', 'stack', 'note']), 'scale')
  assert.equal(suggest('banana', ['note', 's']), null)
  assert.equal(suggest('setcpm', ['setcpm', 'cpm']), null)
})

test('stripCode drops comments and string contents', () => {
  assert.equal(stripCode('note("scale(") // scale(\n/* n( */ s(\'x\')'), 'note("") \n s("")')
})

const CASES: { a: Assertion; pass: string; fail: string; message: RegExp; cycles?: number }[] = [
  {
    a: { type: 'usesFunction', names: ['n', 'scale'] },
    pass: 'n("0 2").scale("C:major")',
    fail: 'n("0 2") // scale("C:major")',
    message: /Falta usar `scale`/,
  },
  {
    a: { type: 'avoidsFunction', names: ['note'] },
    pass: 'n("0").scale("C:major")',
    fail: 'note("c3")',
    message: /no se usa `note`/,
  },
  {
    a: { type: 'soundsInclude', names: ['bd', 'sd', 'hh'] },
    pass: 's("bd hh sd hh")',
    fail: 's("bd hh bd hh")',
    message: /Falta que suene `sd`/,
  },
  {
    a: { type: 'eventsPerCycle', min: 3, max: 3 },
    pass: 's("bd(3,8)")',
    fail: 's("bd*4")',
    message: /ciclo 1 tiene 4 eventos; se piden 3/,
  },
  {
    a: { type: 'eventsPerCycle', min: 2, filter: 'sd' },
    pass: 's("sd bd sd")',
    fail: 's("sd bd bd")',
    message: /1 eventos de `sd`; se piden al menos 2/,
  },
  {
    a: { type: 'notesWithinScale', scale: 'G major' },
    pass: 'n("0 1 2 3 4 5 6 7").scale("G:major")',
    fail: 'note("g3 a3 b3 c4 d4 e4 f4")',
    message: /Fuera de la escala: F$|Fuera de la escala: F\./,
  },
  {
    a: { type: 'pitchClassesInclude', pitchClasses: ['C', 'E', 'G'] },
    pass: 'note("c3 e3 g3")',
    fail: 'note("c3 e3")',
    message: /Falta que suene G/,
  },
  {
    a: { type: 'noteSequence', pitchClasses: ['C', 'D', 'E', 'F'], voice: 'all' },
    pass: 'note("c d e f")',
    fail: 'note("c e d f")',
    message: /Se espera C D E F en el ciclo 1, y suena C E D F/,
  },
  {
    a: { type: 'noteSequence', pitchClasses: ['G', 'A'], voice: 'highest' },
    pass: 'note("[c3,g3] [d3,a3]")',
    fail: 'note("[c3,g3] [d3,b3]")',
    message: /en la voz de arriba/,
  },
  {
    a: { type: 'chordPerCycle', chords: ['C', 'Am'] },
    pass: 'chord("<C Am>").voicing()',
    fail: 'chord("<C Dm>").voicing()',
    message: /ciclo 2 debería sonar Am/,
    cycles: 2,
  },
  {
    a: { type: 'harmonicIntervals', interval: '5P', minRatio: 1 },
    pass: 'note("[c3,g3] [d3,a3] [f3,c4]")',
    fail: 'note("[c3,g3] [d3,f3]")',
    message: /1 de 2 pares simultáneos forman 5P/,
  },
  {
    a: { type: 'distinctMelodicIntervals', min: 3 },
    pass: 'note("c3 d3 f3 c4")',
    fail: 'note("c3 d3 e3 f#3")',
    message: /usa 1 intervalos distintos; se piden al menos 3/,
  },
  {
    a: { type: 'maxVoiceLeap', semitones: 2 },
    pass: 'note("[c3,e3,g3] [b2,f3,g3]")',
    fail: 'note("[c3,e3,g3] [f3,a3,c4]")',
    message: /una voz salta 5 semitonos; el máximo es 2/,
  },
  {
    a: { type: 'rootsPerBar', roots: ['C', 'F'] },
    pass: 'note("<[c2,e3] [f2,a3]>")',
    fail: 'note("<[c2,e3] [g2,b3]>")',
    message: /ciclo 2 el bajo debería ser F y es G/,
    cycles: 2,
  },
  {
    a: { type: 'rhythmEquals', reference: 'x ~ x x' },
    pass: 's("bd ~ sd hh")',
    fail: 's("bd sd ~ hh")',
    message: /ritmo del ciclo 1 no coincide/,
  },
  {
    a: { type: 'matchesReference', code: 'note("c3 e3 g3")', transposeBy: '2M' },
    pass: 'note("d3 f#3 a3")',
    fail: 'note("d3 f3 a3")',
    message: /transportada 2M: faltan 1 notas y sobran 1/,
  },
  {
    a: { type: 'characteristicNoteRatio', mode: 'D dorian', minRatio: 0.2 },
    pass: 'note("d3 b3 a3 b3")',
    fail: 'note("d3 e3 f3 a3")',
    message: /B \(la nota que da color a D dorian\) es 0 %/,
  },
  {
    a: { type: 'chordFunctionAt', key: 'C', cycle: 1, function: 'secondary-dominant' },
    pass: 'note("<[c3,e3,g3] [a2,c#3,e3,g3] [d3,f3,a3]>")',
    fail: 'note("<[c3,e3,g3] [a2,c3,e3] [d3,f3,a3]>")',
    message: /ciclo 2 debería sonar una dominante secundaria de Do mayor/,
    cycles: 3,
  },
  {
    // V/IV as a plain C triad is just the tonic: only C7 counts.
    a: { type: 'chordFunctionAt', key: 'C', cycle: 0, function: 'secondary-dominant' },
    pass: 'note("[c3,e3,g3,bb3]")',
    fail: 'note("[c3,e3,g3]")',
    message: /debería sonar una dominante secundaria/,
  },
  {
    a: { type: 'chordFunctionAt', key: 'C', cycle: 0, function: 'borrowed' },
    pass: 'note("[f3,ab3,c4]")',
    fail: 'note("[f3,a3,c4]")',
    message: /un acorde prestado/,
  },
  {
    a: { type: 'chordFunctionAt', key: 'C', cycle: 0, function: 'tritone-sub' },
    pass: 'note("[db3,f3,ab3,cb4]")',
    fail: 'note("[g2,b2,d3,f3]")',
    message: /sustituto tritonal/,
  },
  {
    a: { type: 'scalePerCycle', scales: ['D:dorian', 'G:mixolydian'] },
    pass: 'n("0 2 4 6").scale("<D:dorian G:mixolydian>")',
    fail: 'n("0 2 4 6").scale("<D:dorian G:major>")',
    message: /ciclo 2 se pide G mixolydian/,
    cycles: 2,
  },
  {
    a: { type: 'sectionsDistinct', min: 2 },
    pass: 'note("<[c3 e3] [f3 a3]>")',
    fail: 'note("c3 e3")',
    message: /Solo hay 1 compases distintos/,
    cycles: 2,
  },
  {
    a: { type: 'layerCount', min: 3 },
    pass: 'stack(s("bd hh"), note("c3").s("piano"))',
    fail: 's("bd sd")',
    message: /se piden al menos 3/,
  },
]

for (const { a, pass, fail, message, cycles } of CASES) {
  test(`assertion ${a.type}: passes and fails with a useful message`, async () => {
    const good = await check(a, pass, cycles)
    assert.equal(good.pass, true, `${pass}: ${good.message}`)
    const bad = await check(a, fail, cycles)
    assert.equal(bad.pass, false, fail)
    assert.match(bad.message, message)
  })
}

test('runKata reports evaluation errors without running assertions', async () => {
  const r = await runKata('note("c3"', [{ type: 'usesFunction', names: ['note'] }], 1)
  assert.equal(r.ok, false)
  const ok = await runKata('note("c3")', [{ type: 'usesFunction', names: ['note'] }], 1)
  assert.ok(ok.ok && ok.passed && ok.results.length === 1)
})

test('firstCycle gives one cycle of haps, or just the first onset', async () => {
  const melody = await evaluatePattern('note("c3 e3 g3").s("piano")')
  const chord = await evaluatePattern('note("[c3,e3] g3")')
  assert.ok(melody.ok && chord.ok)
  const all = firstCycle(melody.pattern)
  assert.deepEqual(
    all.map((h) => [h.value.note, h.begin]),
    [
      ['c3', 0],
      ['e3', 1 / 3],
      ['g3', 2 / 3],
    ],
  )
  assert.equal(all[0]?.value.s, 'piano')
  assert.deepEqual(
    firstCycle(chord.pattern, true).map((h) => h.value.note),
    ['c3', 'e3'],
  )
})

test('every documented Strudel function has its Spanish translation', async () => {
  const { reference } = await import('@strudel/reference')
  const { readFileSync } = await import('node:fs')
  const es: Record<string, string> = JSON.parse(
    readFileSync(new URL('./ref-es.json', import.meta.url), 'utf8'),
  )
  for (const d of reference.docs) {
    if (typeof d.name !== 'string' || !d.description) continue
    const translated = es[d.name]
    assert.ok(
      translated,
      `${d.name}: missing; run node --env-file=.env scripts/translate-reference.mjs`,
    )
    assert.equal(translated.split('`').length % 2, 1, `${d.name}: unbalanced backticks`)
  }
})
