import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Note } from 'tonal'
import {
  degreeLabel,
  fretToNote,
  keyboardRange,
  needsRareSpelling,
  noteToFrets,
  STANDARD_TUNING,
  spellingsFor,
} from './instruments.ts'

test('fretToNote on standard tuning', () => {
  assert.equal(Note.chroma(fretToNote(0, 0) as string), Note.chroma('E')) // low E open
  assert.equal(Note.chroma(fretToNote(0, 5) as string), Note.chroma('A')) // 5th fret low E = A
  assert.equal(Note.chroma(fretToNote(5, 0) as string), Note.chroma('E')) // high E open
  assert.equal(Note.chroma(fretToNote(2, 2) as string), Note.chroma('E')) // D string 2nd fret = E
  assert.equal(fretToNote(9, 0), null)
  assert.equal(fretToNote(0, -1), null)
})

test('noteToFrets finds every position up to maxFret', () => {
  const cPositions = noteToFrets('C', STANDARD_TUNING, 12)
  // Every reported position must actually sound a C.
  for (const { string, fret } of cPositions) {
    assert.equal(Note.chroma(fretToNote(string, fret) as string), Note.chroma('C'))
  }
  // Low E string: C is at fret 8.
  assert.equal(
    cPositions.some((p) => p.string === 0 && p.fret === 8),
    true,
  )
  assert.deepEqual(noteToFrets('nope'), [])
})

test('keyboardRange', () => {
  const octave = keyboardRange(60, 72) // C4..C5
  assert.equal(octave.length, 13)
  assert.equal(octave[0]?.pitchClass, 'C')
  assert.equal(octave[0]?.isBlack, false)
  assert.equal(octave[1]?.isBlack, true) // C#/Db
  assert.equal(octave.filter((k) => k.isBlack).length, 5)
  assert.deepEqual(keyboardRange(72, 60), [])
})

test('spellingsFor: black keys get both names, white keys one unless rare', () => {
  assert.deepEqual(spellingsFor(61), ['C#', 'Db'])
  assert.deepEqual(spellingsFor(60), ['C'])
  assert.deepEqual(spellingsFor(65, true), ['F', 'E#', 'Gbb'])
  assert.deepEqual(spellingsFor(67, true), ['G', 'F##', 'Abb'])
})

test('degreeLabel is chromatic from the tonic', () => {
  assert.equal(degreeLabel(62, 'D'), '1')
  assert.equal(degreeLabel(66, 'D'), '3')
  assert.equal(degreeLabel(60, 'D'), '♭7')
})

test('needsRareSpelling spots E♯, C♭ and doubles', () => {
  assert.equal(needsRareSpelling(['D', 'E', 'F#', 'G', 'A', 'B', 'C#']), false)
  assert.equal(needsRareSpelling(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']), true)
  assert.equal(needsRareSpelling(['Cb']), true)
  assert.equal(needsRareSpelling(['F##']), true)
})
