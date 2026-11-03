import { createRng, type Rng } from '../../lib/random.ts'
import type { MixEntry } from '../curriculum/schema.ts'
import { chordName } from './generators/chord-name.ts'
import { chordSpelling } from './generators/chord-spelling.ts'
import { diatonicChord, diatonicChordMinor } from './generators/diatonic-chord.ts'
import { earChord } from './generators/ear-chord.ts'
import { earInterval } from './generators/ear-interval.ts'
import { enharmonic } from './generators/enharmonic.ts'
import { intervalBuild } from './generators/interval-build.ts'
import { intervalInvert } from './generators/interval-invert.ts'
import { intervalName } from './generators/interval-name.ts'
import { keySignatureGen } from './generators/key-signature.ts'
import { noteName } from './generators/note-name.ts'
import { relativeKey } from './generators/relative-key.ts'
import { rhythmMatch } from './generators/rhythm-match.ts'
import { scaleDegree } from './generators/scale-degree.ts'
import { scaleSpelling } from './generators/scale-spelling.ts'
import { semitoneCount } from './generators/semitone-count.ts'
import type { Generator, Question } from './types.ts'

// Type-erased generator: hides the per-generator params type behind the id.
interface Registered {
  id: string
  skill: string
  validate(raw: unknown): boolean
  run(raw: unknown, rng: Rng): Question
}

function erase<P>(gen: Generator<P>): Registered {
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

const REGISTERED: Registered[] = [
  erase(noteName),
  erase(enharmonic),
  erase(semitoneCount),
  erase(intervalName),
  erase(intervalBuild),
  erase(intervalInvert),
  erase(earInterval),
  erase(rhythmMatch),
  erase(scaleSpelling),
  erase(keySignatureGen),
  erase(scaleDegree),
  erase(relativeKey),
  erase(chordSpelling),
  erase(chordName),
  erase(diatonicChord),
  erase(diatonicChordMinor),
  erase(earChord),
]

export const registry: Map<string, Registered> = new Map(REGISTERED.map((r) => [r.id, r]))

export function hasGenerator(id: string): boolean {
  return registry.has(id)
}

// Validates a mix entry's generator id and its params without generating.
export function validateEntry(entry: MixEntry): boolean {
  const gen = registry.get(entry.generator)
  return gen?.validate(entry.params ?? {}) ?? false
}

// Generates one fresh question (not already in `used`, compared by key).
// Retries with a derived seed up to 20 times; failing that is a content bug
// (the question space is smaller than the number of questions asked).
export function generateQuestion(entry: MixEntry, seed: string, used: Set<string>): Question {
  const gen = registry.get(entry.generator)
  if (gen === undefined) throw new Error(`unknown generator: ${entry.generator}`)
  for (let n = 0; n <= 20; n++) {
    const s = n === 0 ? seed : `${seed}:r${n}`
    const question = gen.run(entry.params ?? {}, createRng(s))
    if (!used.has(question.key)) {
      used.add(question.key)
      question.id = seed
      return question
    }
  }
  throw new Error(`no fresh ${entry.generator} question after 20 tries (content space too small)`)
}

// One question from a weighted mix: the i-th of a test set, or the next one of a practice run.
export function pickQuestion(
  mix: MixEntry[],
  seedPrefix: string,
  i: number,
  used: Set<string>,
): Question {
  const entry = createRng(`${seedPrefix}:pick:${i}`).weighted(
    mix.map((e) => ({ value: e, weight: e.weight })),
  )
  return generateQuestion(entry, `${seedPrefix}:${i}`, used)
}

export function buildSet(mix: MixEntry[], count: number, seedPrefix: string): Question[] {
  const used = new Set<string>()
  return Array.from({ length: count }, (_, i) => pickQuestion(mix, seedPrefix, i, used))
}
