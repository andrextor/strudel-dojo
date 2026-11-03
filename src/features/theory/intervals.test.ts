import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  formatInterval,
  intervalBetween,
  invertInterval,
  parseIntervalInput,
  transposeNote,
} from './intervals.ts'

const PARSE_CASES: [string, string | null][] = [
  ['5P', '5P'],
  ['P5', '5P'],
  ['5J', '5P'],
  ['J5', '5P'],
  ['3M', '3M'],
  ['M3', '3M'],
  ['3m', '3m'],
  ['m3', '3m'],
  ['2m', '2m'],
  ['segunda menor', '2m'],
  ['quinta justa', '5P'],
  ['tercera mayor', '3M'],
  ['tercera menor', '3m'],
  ['4A', '4A'],
  ['cuarta aumentada', '4A'],
  ['5d', '5d'],
  ['quinta disminuida', '5d'],
  ['8P', '8P'],
  ['octava justa', '8P'],
  ['QUINTA JUSTA', '5P'],
  ['', null],
  ['2P', null],
  ['xyz', null],
  ['tercera', null],
]

test('parseIntervalInput table', () => {
  for (const [input, expected] of PARSE_CASES) {
    assert.equal(parseIntervalInput(input), expected, `for input "${input}"`)
  }
})

test('formatInterval short and long', () => {
  assert.equal(formatInterval('5P', 'short'), '5J')
  assert.equal(formatInterval('5P', 'long'), 'quinta justa')
  assert.equal(formatInterval('3M', 'short'), '3M')
  assert.equal(formatInterval('3M', 'long'), 'tercera mayor')
  assert.equal(formatInterval('4A', 'short'), '4A')
  assert.equal(formatInterval('4A', 'long'), 'cuarta aumentada')
  assert.equal(formatInterval('6m', 'long'), 'sexta menor')
})

test('intervalBetween and transposeNote delegate to tonal', () => {
  assert.equal(intervalBetween('C', 'E'), '3M')
  assert.equal(intervalBetween('C', 'G'), '5P')
  assert.equal(transposeNote('C', '3M'), 'E')
  assert.equal(transposeNote('D', '5P'), 'A')
  assert.equal(intervalBetween('C', 'nope'), null)
})

test('invertInterval', () => {
  assert.equal(invertInterval('3M'), '6m')
  assert.equal(invertInterval('5P'), '4P')
  assert.equal(invertInterval('2m'), '7M')
})
