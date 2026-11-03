import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Note, Scale } from 'tonal'
import { createRng } from '../../lib/random.ts'
import {
  advance,
  arpeggioSegments,
  buildNoteRound,
  expectedPitches,
  intervalSegments,
  noteSegments,
  type RoundPlan,
  startRound,
  stringSequence,
} from './drills.ts'
import { majorPosition, walk } from './scales.ts'

test('a round never repeats a sound', () => {
  for (let s = 0; s < 50; s++) {
    const round = buildNoteRound(createRng(`r${s}`), { pool: 'all', count: 12 })
    assert.equal(new Set(round.map((pc) => Note.chroma(pc))).size, round.length)
    assert.equal(round.length, 12)
  }
})

test('expected pitches: C on string 5 is only C3, on string 1 only C5; C♯ = D♭', () => {
  assert.deepEqual(expectedPitches('C', 5, '0-12'), [48])
  assert.deepEqual(expectedPitches('C', 1, '0-12'), [72])
  assert.deepEqual(expectedPitches('C', 3, '0-12'), [60])
  assert.deepEqual(expectedPitches('C#', 4, '0-12'), expectedPitches('Db', 4, '0-12'))
  assert.deepEqual(stringSequence(5, 1, 'up'), [5, 4, 3, 2, 1])
  assert.deepEqual(stringSequence(5, 3, 'both'), [5, 4, 3, 4, 5])
})

test('the round machine: a miss on note 3 goes back to note 1', () => {
  const plan: RoundPlan = { segments: [5, 5, 5], countIn: 4 }
  let s = startRound(plan)
  const tick = () => {
    s = advance(s, plan, 'tick')
  }
  const ok = () => {
    s = advance(s, plan, 'ok')
  }
  for (let note = 0; note < 2; note++) {
    for (let i = 0; i < 4; i++) tick()
    for (let i = 0; i < 5; i++) ok()
  }
  for (let i = 0; i < 4; i++) tick()
  assert.deepEqual(s.phase, { kind: 'play', segment: 2, step: 0 })
  s = advance(s, plan, 'miss')
  assert.equal(s.phase.kind, 'error')
  tick()
  assert.deepEqual(s.phase, { kind: 'count-in', segment: 0, beat: 0 })
  assert.equal(s.attempts, 2)
  for (let note = 0; note < 3; note++) {
    for (let i = 0; i < 4; i++) tick()
    for (let i = 0; i < 5; i++) ok()
  }
  assert.deepEqual(s.phase, { kind: 'done' })
})

test('G major 3 notes per string, position 1: string 6 fret 3, 18 notes, all in the scale', () => {
  const pos = majorPosition('G', '3nps', 0)
  assert.equal(pos.length, 18)
  assert.deepEqual([pos[0]?.string, pos[0]?.fret], [0, 3])
  const scale = new Set(Scale.get('G major').notes.map((n) => Note.chroma(n)))
  for (let p = 0; p < 7; p++) {
    const notes = majorPosition('G', '3nps', p)
    assert.equal(notes.length, 18, `position ${p + 1}`)
    assert.ok(notes.every((n) => scale.has(n.midi % 12) && n.fret >= 0))
    assert.ok(
      notes.every((n, i) => i === 0 || n.midi > (notes[i - 1]?.midi ?? 0)),
      'ascending',
    )
  }
})

test('CAGED: five positions, all in the scale, none wider than 5 frets', () => {
  for (const tonic of ['G', 'C', 'E', 'Bb', 'F#']) {
    const scale = new Set(Scale.get(`${tonic} major`).notes.map((n) => Note.chroma(n)))
    for (let p = 0; p < 5; p++) {
      const notes = majorPosition(tonic, 'caged', p)
      assert.ok(notes.length >= 12, `${tonic} ${p + 1}: ${notes.length} notes`)
      assert.ok(notes.every((n) => scale.has(n.midi % 12)))
      const frets = notes.map((n) => n.fret)
      assert.ok(Math.max(...frets) - Math.min(...frets) + 1 <= 5, `${tonic} ${p + 1} too wide`)
    }
  }
})

test('walks over a 7-note run', () => {
  const run = [1, 2, 3, 4, 5, 6, 7]
  assert.deepEqual(walk(run, 'up-down'), [1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1])
  assert.deepEqual(walk(run, 'thirds'), [1, 3, 2, 4, 3, 5, 4, 6, 5, 7])
  assert.deepEqual(walk(run, 'groups-3'), [1, 2, 3, 2, 3, 4, 3, 4, 5, 4, 5, 6, 5, 6, 7])
  assert.equal(walk(run, 'groups-4').length, 16)
  assert.deepEqual(walk(run, 'down'), [7, 6, 5, 4, 3, 2, 1])
})

test('segments: notes per string, intervals and arpeggios accept the right pitches', () => {
  const [c] = noteSegments(['C'], [5, 1], '0-12')
  assert.equal(c?.steps[0]?.accepts(48, null), true)
  assert.equal(c?.steps[0]?.accepts(60, null), false) // C4 is not on string 5 in frets 0–12
  assert.equal(c?.steps[1]?.accepts(72, null), true)

  const rng = createRng('drills')
  for (const seg of intervalSegments(rng, { count: 20, intervals: ['3M', '5P'], zone: '0-5' })) {
    const [root, name] = seg.title.split('|')
    const rootMidi = Note.midi(root ?? '') ?? 0
    assert.equal(seg.steps[0]?.accepts(rootMidi, null), true)
    const semis = name === '3M' ? 4 : 7
    assert.equal(seg.steps[1]?.accepts(rootMidi + semis, rootMidi), true)
    assert.equal(seg.steps[1]?.accepts(rootMidi + semis + 12, rootMidi), false)
  }

  const [arp] = arpeggioSegments(createRng('arp'), { count: 1, qualities: ['major'] })
  const [root] = (arp?.title ?? '').split('|')
  const steps = arp?.steps ?? []
  const r = Note.midi(`${root}3`) ?? 0
  assert.equal(steps[0]?.accepts(r, null), true)
  assert.equal(steps[1]?.accepts(r + 4, r), true)
  assert.equal(steps[1]?.accepts(r + 4 - 12, r), false) // must go up
  assert.equal(steps[2]?.accepts(r + 7, r + 4), true)
  assert.equal(steps[3]?.accepts(r + 12, r + 7), true)
})
