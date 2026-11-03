import type { Rng } from '../../../lib/random.ts'
import type { Generator, Question } from '../types.ts'

// Type-erased generator: hides the per-generator params type behind the id.
export interface Registered {
  id: string
  skill: string
  validate(raw: unknown): boolean
  run(raw: unknown, rng: Rng): Question
}

export function erase<P>(gen: Generator<P>): Registered {
  return {
    id: gen.id,
    skill: gen.skill,
    validate: (raw) => gen.parseParams(raw) !== null,
    run: (raw, rng) => {
      const params = gen.parseParams(raw)
      if (params === null) throw new Error(`invalid params for ${gen.id}: ${JSON.stringify(raw)}`)
      return gen.generate(params, rng)
    },
  }
}
