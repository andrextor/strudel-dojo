import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chordGrouper, midiSupport, parseMidiMessage } from './midi.ts'

test('parseMidiMessage reads note-on/off on any channel', () => {
  assert.deepEqual(parseMidiMessage([0x90, 60, 100]), { on: true, note: 60, velocity: 100 })
  assert.deepEqual(parseMidiMessage([0x93, 64, 0]), { on: false, note: 64, velocity: 0 })
  assert.deepEqual(parseMidiMessage([0x80, 60, 40]), { on: false, note: 60, velocity: 0 })
  assert.equal(parseMidiMessage([0xb0, 64, 127]), null)
  assert.equal(parseMidiMessage([0x90]), null)
})

test('midiSupport explains why it is missing', () => {
  const none = midiSupport({})
  assert.equal(none.supported, false)
  assert.equal(midiSupport({ requestMIDIAccess() {} }).supported, true)
})

test('chordGrouper merges notes inside the window', () => {
  const pending: (() => void)[] = []
  const timers = {
    set: (fn: () => void) => pending.push(fn),
    clear: () => {
      pending.length = 0
    },
  }
  const fire = () => pending.shift()?.()
  const chords: number[][] = []
  const g = chordGrouper((n) => chords.push(n), 80, timers)
  g.noteOn(67)
  g.noteOn(60)
  g.noteOn(64)
  fire()
  g.noteOn(62)
  fire()
  assert.deepEqual(chords, [[60, 64, 67], [62]])
})
