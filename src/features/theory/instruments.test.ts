import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Note } from 'tonal'
import { fretToNote, keyboardRange, noteToFrets, STANDARD_TUNING } from './instruments.ts'

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
