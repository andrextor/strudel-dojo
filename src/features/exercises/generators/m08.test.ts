import { generatorTests } from '../check-generators.ts'

generatorTests([
  { id: 'secondary-dominant', params: {} },
  { id: 'secondary-dominant', params: { tonics: ['C', 'G', 'F'] } },
  { id: 'borrowed-chord', params: {} },
  { id: 'tritone-sub', params: {} },
  { id: 'passing-chord', params: {} },
])
