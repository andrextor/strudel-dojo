import assert from 'node:assert/strict'
import { test } from 'node:test'
import { diatonicChords, identifyChord, parseChordInput, spellChord } from './chords.ts'

test('spellChord', () => {
  assert.deepEqual(spellChord('Cmaj7'), ['C', 'E', 'G', 'B'])
  assert.deepEqual(spellChord('Cm'), ['C', 'Eb', 'G'])
  assert.deepEqual(spellChord('G7'), ['G', 'B', 'D', 'F'])
  assert.equal(spellChord('nope'), null)
})

const PARSE_CASES: [string, string[]][] = [
  ['Cmaj7', ['C', 'E', 'G', 'B']],
  ['C7M', ['C', 'E', 'G', 'B']],
  ['CΔ7', ['C', 'E', 'G', 'B']],
  ['CΔ', ['C', 'E', 'G', 'B']],
  ['Do maj7', ['C', 'E', 'G', 'B']],
  ['Cm', ['C', 'Eb', 'G']],
  ['C-', ['C', 'Eb', 'G']],
  ['Cdim', ['C', 'Eb', 'Gb']],
  ['C°', ['C', 'Eb', 'Gb']],
  ['Cm7b5', ['C', 'Eb', 'Gb', 'Bb']],
  ['Cø', ['C', 'Eb', 'Gb', 'Bb']],
  ['Sol7', ['G', 'B', 'D', 'F']],
  ['Re-7', ['D', 'F', 'A', 'C']],
]

test('parseChordInput accepts aliases and latin roots', () => {
  for (const [input, notes] of PARSE_CASES) {
    const symbol = parseChordInput(input)
    assert.notEqual(symbol, null, `"${input}" should parse`)
    assert.deepEqual(spellChord(symbol as string), notes, `"${input}" notes`)
  }
  assert.equal(parseChordInput('xyz'), null)
  assert.equal(parseChordInput(''), null)
})

test('identifyChord gives candidates with inversions', () => {
  assert.equal(identifyChord(['C', 'E', 'G']).includes('CM'), true)
  assert.equal(identifyChord(['E', 'G', 'C']).includes('CM/E'), true)
  assert.deepEqual(identifyChord([]), [])
})

test('diatonicChords major: roman case reflects quality', () => {
  const triads = diatonicChords('C')
  assert.deepEqual(
    triads?.map((c) => c.roman),
    ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  )
  assert.deepEqual(
    triads?.map((c) => c.symbol),
    ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
  )
  const sevenths = diatonicChords('C', { sevenths: true })
  assert.deepEqual(
    sevenths?.map((c) => c.symbol),
    ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5'],
  )
  assert.deepEqual(sevenths?.[4]?.notes, ['G', 'B', 'D', 'F'])
  assert.equal(diatonicChords('X'), null)
})
