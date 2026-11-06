import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  bossHref,
  examHref,
  kataHref,
  moduleHref,
  nextStepHref,
  resultHref,
  stageHref,
  testHref,
  topicHref,
  unitHref,
} from './paths.ts'

test('content ids map to lowercase routes', () => {
  assert.equal(moduleHref('M01'), '/m/m01')
  assert.equal(topicHref('M01-T03'), '/m/m01/t03')
  assert.equal(testHref('M02-T01'), '/m/m02/t01/prueba')
  assert.equal(stageHref('S04'), '/strudel/s04')
  assert.equal(unitHref('S04-U02'), '/strudel/s04/u02')
  assert.equal(kataHref('M01-T03-K1'), '/strudel/kata/m01-t03-k1')
  assert.equal(bossHref('S04'), '/strudel/s04/combate')
  assert.equal(examHref('M02'), '/m/m02/examen')
  assert.equal(nextStepHref({ kind: 'exam', moduleId: 'M02' }), '/m/m02/examen')
  assert.equal(nextStepHref({ kind: 'topic', topicId: 'M02-T01' }), '/m/m02/t01')
  assert.equal(resultHref('a b'), '/resultado?intento=a%20b')
})
