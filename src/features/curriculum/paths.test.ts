import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  bossHref,
  examHref,
  kataHref,
  moduleHref,
  resultHref,
  testHref,
  topicHref,
} from './paths.ts'

test('content ids map to lowercase routes', () => {
  assert.equal(moduleHref('M01'), '/m/m01')
  assert.equal(topicHref('M01-T03'), '/m/m01/t03')
  assert.equal(testHref('M02-T01'), '/m/m02/t01/prueba')
  assert.equal(kataHref('M01-T03-K1'), '/m/m01/t03/kata/k1')
  assert.equal(bossHref('M01'), '/m/m01/combate')
  assert.equal(examHref('M02'), '/m/m02/examen')
  assert.equal(resultHref('a b'), '/resultado?intento=a%20b')
})
