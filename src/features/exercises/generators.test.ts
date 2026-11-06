import assert from 'node:assert/strict'
import { test } from 'node:test'
import { type GeneratorCase, generatorTests } from './check-generators.ts'
import { generateQuestion } from './registry.ts'

// Representative params drawn from M01–M03 content, one case per generator.
const CASES: GeneratorCase[] = [
  { id: 'note-name', params: { accidentals: 'all' } },
  { id: 'enharmonic', params: { allowDouble: true } },
  { id: 'semitone-count', params: { maxSemitones: 12 } },
  { id: 'interval-name', params: { maxInterval: '8P', qualities: ['m', 'M', 'P'] } },
  { id: 'interval-build', params: { maxInterval: '8P' }, strict: true },
  { id: 'interval-invert', params: {} },
  { id: 'ear-interval', params: { set: ['2M', '3M', '4P', '5P', '8P'], direction: 'up' } },
  { id: 'ear-interval', params: { set: ['3m', '3M'], direction: 'harmonic' } },
  { id: 'rhythm-match', params: { meter: 4, subdivision: 4 }, minDistinct: 5 }, // practice only
  { id: 'ear-note', params: { accidentals: 'none', reference: true } },
  { id: 'ear-note', params: { accidentals: 'sharps', reference: false } },
  { id: 'scale-spelling', params: { scales: ['major'] }, strict: true },
  { id: 'scale-spelling', params: { scales: ['minor'] }, strict: true },
  {
    id: 'chord-spelling',
    params: { qualities: ['major', 'minor', 'diminished', 'augmented'] },
    strict: true,
  },
  { id: 'chord-name', params: { qualities: ['major', 'minor', 'diminished'], inversions: true } },
  { id: 'chord-name', params: { qualities: ['major', 'minor'], inversions: false } },
  { id: 'diatonic-chord', params: {} },
  { id: 'diatonic-chord-minor', params: {} },
  {
    id: 'ear-chord',
    params: { qualities: ['major', 'minor', 'diminished', 'augmented'], inversions: true },
  },
  { id: 'key-signature', params: { maxAccidentals: 7 } },
  { id: 'key-signature', params: { maxAccidentals: 4, minor: true }, minDistinct: 5 },
  { id: 'scale-degree', params: { scales: ['major'] } },
  { id: 'relative-key', params: { maxAccidentals: 7 } },
]

generatorTests(CASES)

test('spellAll depends on the exercise params, never on the single question', () => {
  const flags = (params: Record<string, unknown>) =>
    new Set(
      Array.from({ length: 60 }, (_, i) => {
        const q = generateQuestion(
          { generator: 'scale-spelling', params, weight: 1 },
          `s:${i}`,
          new Set(),
        )
        return q.input.kind === 'note-set' ? q.input.spellAll : undefined
      }),
    )
  // D major alone never needs E♯ or C♭: black keys ask, white keys do not.
  assert.deepEqual(flags({ scales: ['major'], tonics: ['D'] }), new Set([false]))
  // The full tonic pool includes F♯ and G♭ major, so even C major asks on every key.
  assert.deepEqual(flags({ scales: ['major'] }), new Set([true]))
})
