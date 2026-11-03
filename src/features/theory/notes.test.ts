import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatNote, parseNoteInput, parseNoteList, sameSound, sameSpelling } from './notes.ts'

// [input, expectedPitchClass | null, expectedOctave]
const CASES: [string, string | null, number | null][] = [
  // American
  ['C', 'C', null],
  ['c', 'C', null],
  ['C#4', 'C#', 4],
  ['c#4', 'C#', 4],
  ['Bb', 'Bb', null],
  ['bb', 'Bb', null],
  ['b', 'B', null],
  ['Db3', 'Db', 3],
  ['Ebb', 'Ebb', null],
  ['F##', 'F##', null],
  ['Fx', 'F##', null],
  ['G##5', 'G##', 5],
  ['Cb', 'Cb', null],
  ['E#', 'E#', null],
  ['B#', 'B#', null],
  ['A4', 'A', 4],
  ['C-1', 'C', -1],
  // Unicode accidentals
  ['C♯', 'C#', null],
  ['D♭', 'Db', null],
  ['F\u{1D12A}', 'F##', null],
  ['E\u{1D12B}', 'Ebb', null],
  ['G♯4', 'G#', 4],
  // Latin
  ['Do', 'C', null],
  ['do', 'C', null],
  ['Re', 'D', null],
  ['Mi', 'E', null],
  ['Fa', 'F', null],
  ['Sol', 'G', null],
  ['La', 'A', null],
  ['Si', 'B', null],
  ['Sib', 'Bb', null],
  ['do#', 'C#', null],
  ['do#4', 'C#', 4],
  ['mib', 'Eb', null],
  ['fa##', 'F##', null],
  ['sol#3', 'G#', 3],
  // Solfège with words (with and without tilde / spacing)
  ['do sostenido', 'C#', null],
  ['re bemol', 'Db', null],
  ['fa doble sostenido', 'F##', null],
  ['si doble bemol', 'Bbb', null],
  ['Do Sostenido', 'C#', null],
  // Whitespace
  ['  Sol  ', 'G', null],
  // Invalid
  ['H', null, null],
  ['do##b', null, null],
  ['', null, null],
  ['   ', null, null],
  ['xyz', null, null],
  ['C#b', null, null],
  ['C4.5', null, null],
]

test('parseNoteInput table', () => {
  for (const [input, pc, oct] of CASES) {
    const result = parseNoteInput(input)
    if (pc === null) {
      assert.equal(result, null, `${input} should be invalid`)
    } else {
      assert.deepEqual(result, { pitchClass: pc, octave: oct }, `for input ${input}`)
    }
  }
})

test('parseNoteInput rejects non-strings', () => {
  assert.equal(parseNoteInput(42), null)
  assert.equal(parseNoteInput(null), null)
  assert.equal(parseNoteInput(undefined), null)
})

test('formatNote in both notations', () => {
  assert.equal(formatNote('C#', 'american'), 'C♯')
  assert.equal(formatNote('C#', 'latin'), 'Do♯')
  assert.equal(formatNote('Bb', 'latin'), 'Si♭')
  assert.equal(formatNote('F##', 'american'), 'F\u{1D12A}')
  assert.equal(formatNote('Ebb', 'latin'), 'Mi\u{1D12B}')
  assert.equal(formatNote('G4', 'latin'), 'Sol4')
  assert.equal(formatNote('A', 'american'), 'A')
})

test('sameSpelling vs sameSound', () => {
  assert.equal(sameSpelling('C#', 'C#'), true)
  assert.equal(sameSpelling('C#', 'Db'), false)
  assert.equal(sameSound('C#', 'Db'), true)
  assert.equal(sameSound('C#4', 'Db4'), true)
  assert.equal(sameSound('C', 'D'), false)
  assert.equal(sameSpelling('H', 'H'), false)
})

test('parseNoteList splits on spaces, commas and dashes', () => {
  assert.deepEqual(
    parseNoteList('C E G')?.map((n) => n.pitchClass),
    ['C', 'E', 'G'],
  )
  assert.deepEqual(
    parseNoteList('do, mi, sol')?.map((n) => n.pitchClass),
    ['C', 'E', 'G'],
  )
  assert.deepEqual(
    parseNoteList('c3-e3-g3')?.map((n) => n.octave),
    [3, 3, 3],
  )
  assert.equal(parseNoteList('C E H'), null)
  assert.equal(parseNoteList('   '), null)
})
