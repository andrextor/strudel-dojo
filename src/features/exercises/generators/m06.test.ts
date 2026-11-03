import { generatorTests } from '../check-generators.ts'

generatorTests([
  { id: 'mode-spelling', params: {}, strict: true },
  {
    id: 'mode-spelling',
    params: {
      scales: ['ionian', 'dorian', 'mixolydian', 'aeolian'],
      tonics: ['C', 'D', 'E', 'G', 'A'],
    },
    strict: true,
  },
  { id: 'characteristic-note', params: {}, strict: true },
  {
    id: 'characteristic-note',
    params: {
      modes: ['dorian', 'lydian', 'mixolydian', 'aeolian'],
      tonics: ['C', 'D', 'F', 'G', 'A'],
    },
    strict: true,
  },
  { id: 'parallel-mode', params: {} },
  { id: 'ear-scale', params: {} },
  { id: 'ear-scale', params: { modes: ['ionian', 'dorian', 'mixolydian', 'aeolian'] } },
  { id: 'modal-progression', params: {} },
  { id: 'modal-progression', params: { ear: true } },
  { id: 'ear-melody', params: {} },
  { id: 'ear-melody', params: { length: 4, scale: 'dorian', maxLeap: 2 } },
  { id: 'ear-melody', params: { length: 6, scale: 'minor', maxLeap: 3 } },
])
