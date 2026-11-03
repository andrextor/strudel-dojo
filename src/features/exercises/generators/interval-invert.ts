import { formatInterval, invertInterval } from '../../theory/intervals.ts'
import type { Generator } from '../types.ts'

// Unisons and octaves invert to themselves — skip them so the task has bite.
const INVERTIBLE = ['2m', '2M', '3m', '3M', '4P', '4A', '5d', '5P', '6m', '6M', '7m', '7M']

export const intervalInvert: Generator<Record<string, never>> = {
  id: 'interval-invert',
  skill: 'interval-quality',
  parseParams() {
    return {}
  },
  generate(_params, rng) {
    const name = rng.pick(INVERTIBLE)
    const inverted = invertInterval(name) ?? name
    return {
      id: '',
      key: `interval-invert:${name}`,
      generator: 'interval-invert',
      skill: 'interval-quality',
      prompt: `¿Cuál es la inversión de una ${formatInterval(name, 'long')}?`,
      input: { kind: 'text', placeholder: 'p. ej. 6m o sexta menor' },
      answer: { kind: 'text', accepted: [inverted] },
      explanation: `Una ${formatInterval(name, 'long')} invertida es una ${formatInterval(inverted, 'long')}; juntas suman una octava.`,
    }
  },
}
