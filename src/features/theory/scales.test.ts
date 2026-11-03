import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Key } from 'tonal'
import {
  characteristicNote,
  keySignature,
  modeOf,
  relativeMajor,
  relativeMinor,
  spellScale,
} from './scales.ts'

const MAJOR_TONICS = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#',
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Db',
  'Gb',
  'Cb',
]

test('spellScale matches tonal for all 15 major keys', () => {
  for (const tonic of MAJOR_TONICS) {
    assert.deepEqual(spellScale(tonic, 'major'), Key.majorKey(tonic).scale, tonic)
  }
})

test('spellScale enharmonic spellings differ correctly', () => {
  assert.deepEqual(spellScale('F#', 'major'), ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'])
  assert.deepEqual(spellScale('Gb', 'major'), ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'])
  assert.equal(spellScale('X', 'major'), null)
})

test('keySignature for major keys', () => {
  assert.deepEqual(keySignature('C'), { accidentals: [], count: 0, type: 'sharp' })
  assert.deepEqual(keySignature('G'), { accidentals: ['F#'], count: 1, type: 'sharp' })
  assert.deepEqual(keySignature('D'), { accidentals: ['F#', 'C#'], count: 2, type: 'sharp' })
  assert.deepEqual(keySignature('F'), { accidentals: ['Bb'], count: 1, type: 'flat' })
  assert.deepEqual(keySignature('Eb'), { accidentals: ['Bb', 'Eb', 'Ab'], count: 3, type: 'flat' })
  assert.equal(keySignature('C#')?.count, 7)
  assert.equal(keySignature('Cb')?.type, 'flat')
})

test('keySignature for minor keys equals their relative major', () => {
  assert.deepEqual(keySignature('A', 'minor'), keySignature('C', 'major'))
  assert.deepEqual(keySignature('E', 'minor'), keySignature('G', 'major'))
  assert.deepEqual(keySignature('D', 'minor'), keySignature('F', 'major'))
})

test('relative keys', () => {
  assert.equal(relativeMinor('C'), 'A')
  assert.equal(relativeMinor('G'), 'E')
  assert.equal(relativeMajor('A'), 'C')
  assert.equal(relativeMajor('E'), 'G')
  assert.equal(relativeMinor('X'), null)
})

test('modeOf rotates the scale', () => {
  assert.deepEqual(modeOf('C major', 2), ['D', 'E', 'F', 'G', 'A', 'B', 'C'])
  assert.deepEqual(modeOf('C major', 6), ['A', 'B', 'C', 'D', 'E', 'F', 'G'])
  assert.deepEqual(modeOf('C major', 1), ['C', 'D', 'E', 'F', 'G', 'A', 'B'])
  assert.equal(modeOf('C major', 9), null)
})

test('characteristicNote of each mode', () => {
  assert.equal(characteristicNote('dorian', 'D'), 'B') // natural 6th
  assert.equal(characteristicNote('phrygian', 'E'), 'F') // b2
  assert.equal(characteristicNote('lydian', 'F'), 'B') // #4
  assert.equal(characteristicNote('mixolydian', 'G'), 'F') // b7
  assert.equal(characteristicNote('aeolian', 'A'), 'F') // b6
  assert.equal(characteristicNote('locrian', 'B'), 'F') // b5
  assert.equal(characteristicNote('ionian', 'C'), null)
})
