import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRng } from '../../lib/random.ts'
import { createOnsetTracker } from './onset.ts'
import { detectPitch, nearestNote, rms } from './pitch.ts'
import { judge } from './timing.ts'

const SR = 44100
const N = 2048
const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

function wave(hz: number, kind: 'sine' | 'saw'): Float32Array {
  const out = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const phase = (i * hz) / SR
    out[i] = kind === 'sine' ? 0.5 * Math.sin(2 * Math.PI * phase) : 0.5 * (2 * (phase % 1) - 1)
  }
  return out
}

test('YIN finds E2, A2, C4 and E5 within 5 cents, in sines and sawtooths', () => {
  for (const midi of [40, 45, 60, 76]) {
    for (const kind of ['sine', 'saw'] as const) {
      const reading = detectPitch(wave(freq(midi), kind), SR)
      assert.ok(reading, `${kind} ${midi}: no pitch`)
      const { midi: got, cents } = nearestNote(reading.hz)
      assert.equal(got, midi, `${kind} ${midi}: got ${got}`)
      assert.ok(Math.abs(cents) <= 5, `${kind} ${midi}: ${cents} cents off`)
    }
  }
})

test('silence and noise have no pitch', () => {
  assert.equal(detectPitch(new Float32Array(N), SR), null)
  const rng = createRng('noise')
  const noise = Float32Array.from({ length: N }, () => rng.next() * 2 - 1)
  assert.equal(detectPitch(noise, SR), null)
  assert.ok(rms(noise) > 0.3)
})

test('onset tracker: one event per note, none for the decay, again on a re-attack', () => {
  const track = createOnsetTracker({ minRms: 0.01, holdMs: 40 })
  const events: { time: number; midi: number }[] = []
  const feed = (from: number, to: number, midi: number | null, level: (t: number) => number) => {
    for (let t = from; t < to; t += 16) {
      const e = track({ time: t, rms: level(t), midi })
      if (e) events.push(e)
    }
  }
  feed(0, 500, 60, (t) => 0.3 * Math.exp(-t / 400)) // a sustained, decaying C4
  assert.deepEqual(events, [{ time: 0, midi: 60 }])
  feed(500, 800, 62, () => 0.3) // a new note right after: D4
  assert.equal(events.length, 2)
  assert.equal(events[1]?.midi, 62)
  feed(800, 1100, 62, (t) => 0.3 * Math.exp(-(t - 800) / 200)) // D4 decays: nothing new
  assert.equal(events.length, 2)
  feed(1100, 1300, 62, () => 0.3) // the same D4 plucked again
  assert.equal(events.length, 3)
  assert.equal(events[2]?.time, 1100) // the re-attack's own time, not the first pluck's
  feed(1300, 1400, null, () => 0) // silence
  feed(1400, 1500, 62, () => 0.3) // D4 after silence
  assert.equal(events.length, 4)
  assert.equal(events[3]?.time, 1400)
})

test('judge uses the window and takes the latency off', () => {
  const o = { windowMs: 120, latencyMs: 30 }
  assert.equal(judge(1000, 1150, o), 'on-time') // 120 after latency
  assert.equal(judge(1000, 1151, o), 'late')
  assert.equal(judge(1000, 910, o), 'on-time') // −120
  assert.equal(judge(1000, 909, o), 'early')
})
