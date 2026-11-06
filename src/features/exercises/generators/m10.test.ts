import { generatorTests } from '../check-generators.ts'

generatorTests([
  { id: 'motif-transform', params: {} },
  { id: 'motif-transform', params: { transforms: ['transposition', 'inversion', 'retrograde'] } },
  { id: 'layer-role', params: {} },
  { id: 'layer-role', params: { modes: ['role', 'missing'] } },
  { id: 'layer-role', params: { modes: ['density'] } },
  { id: 'sound-design', params: {} },
  {
    id: 'sound-design',
    params: {
      functions: ['lpf', 'hpf', 'lpq', 'room', 'delay', 'shape', 'vowel', 'attack', 'release'],
    },
  },
  { id: 'performance-signal', params: {} },
  { id: 'performance-signal', params: { directions: ['describe'] } },
  { id: 'timbre-concept', params: {} },
  { id: 'tension-device', params: {} },
])
