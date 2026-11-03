import { generatorTests } from '../check-generators.ts'

generatorTests([
  { id: 'harmonic-function', params: {} },
  { id: 'harmonic-function', params: { tonics: ['C', 'G'] } },
  { id: 'cadence-id', params: {} },
  { id: 'cadence-id', params: { ear: true } },
  { id: 'cadence-id', params: { tonics: ['C', 'G'], ear: true } },
  { id: 'progression-roman', params: {} },
  { id: 'blues-bar', params: {} },
  { id: 'blues-bar', params: { tonics: ['C', 'G', 'F'] } },
  { id: 'harmonize-note', params: {} },
])
