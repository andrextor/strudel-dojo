import { generatorTests } from '../check-generators.ts'

generatorTests([
  { id: 'minor-variant', params: {}, strict: true },
  {
    id: 'minor-variant',
    params: {
      scales: ['phrygian dominant', 'lydian dominant'],
      tonics: ['C', 'G', 'D', 'A', 'E', 'F'],
    },
    strict: true,
  },
  {
    id: 'minor-variant',
    params: { scales: ['altered'], tonics: ['C', 'G', 'F'] },
    strict: true,
    minDistinct: 3,
  },
  { id: 'pentatonic-spelling', params: {}, strict: true },
  {
    id: 'pentatonic-spelling',
    params: {
      scales: ['major pentatonic', 'minor pentatonic'],
      tonics: ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb'],
    },
    strict: true,
  },
  { id: 'symmetric-scale', params: {}, strict: true, minDistinct: 10 },
  {
    id: 'symmetric-scale',
    params: { scales: ['whole tone'], tonics: ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db'] },
    strict: true,
    minDistinct: 6,
  },
  { id: 'chord-scale', params: {} },
  { id: 'chord-scale', params: { extended: true } },
])
