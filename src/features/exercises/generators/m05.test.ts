import { generatorTests } from '../check-generators.ts'

generatorTests([
  { id: 'transpose-melody', params: {}, strict: true },
  {
    id: 'transpose-melody',
    params: { tonics: ['C', 'G', 'F'], intervals: ['5P', '4P'] },
    strict: true,
  },
  { id: 'transpose-key', params: {}, strict: true },
  { id: 'transpose-key', params: { tonics: ['C', 'G', 'D', 'F'] }, strict: true },
  { id: 'capo', params: {} },
  { id: 'capo', params: { maxFret: 3 } },
  { id: 'transposing-instrument', params: {} },
  { id: 'modulation-pivot', params: {} },
  { id: 'modulation-pivot', params: { tonics: ['C', 'G', 'F'] } },
  { id: 'circle-of-fifths', params: {} },
  { id: 'circle-of-fifths', params: { tonics: ['C', 'G', 'D', 'F', 'Bb'] } },
])
