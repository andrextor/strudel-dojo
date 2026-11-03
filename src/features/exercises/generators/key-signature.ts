import { formatNote } from '../../theory/notes.ts'
import { type KeySignature, keySignature } from '../../theory/scales.ts'
import type { Generator } from '../types.ts'
import { MAJOR_TONICS, MINOR_TONICS } from './_shared.ts'

interface Params {
  maxAccidentals: number
  minor: boolean
}

function describe(sig: KeySignature): string {
  if (sig.count === 0) return 'sin alteraciones'
  const noun =
    sig.type === 'sharp'
      ? sig.count === 1
        ? 'sostenido'
        : 'sostenidos'
      : sig.count === 1
        ? 'bemol'
        : 'bemoles'
  return `${sig.count} ${noun}`
}

export const keySignatureGen: Generator<Params> = {
  id: 'key-signature',
  skill: 'key-signatures',
  parseParams(raw) {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const max = r.maxAccidentals ?? 7
    if (typeof max !== 'number' || !Number.isInteger(max) || max < 0 || max > 7) return null
    return { maxAccidentals: max, minor: r.minor === true }
  },
  generate(params, rng) {
    const mode = params.minor ? 'minor' : 'major'
    const pool = (params.minor ? MINOR_TONICS : MAJOR_TONICS).filter((t) => {
      const sig = keySignature(t, mode)
      return sig !== null && sig.count <= params.maxAccidentals
    })
    const tonic = rng.pick(pool)
    const sig = keySignature(tonic, mode)
    const correct = sig === null ? 'sin alteraciones' : describe(sig)

    // Distractors: other plausible signature descriptions within range.
    const all = new Set<string>()
    for (let c = 0; c <= params.maxAccidentals; c++) {
      for (const type of ['sharp', 'flat'] as const) {
        all.add(describe({ accidentals: [], count: c, type }))
      }
    }
    all.delete(correct)
    const distractors = rng.shuffle([...all]).slice(0, 3)
    const options = rng.shuffle([correct, ...distractors])

    const modeEs = params.minor ? 'menor' : 'mayor'
    return {
      id: '',
      key: `key-signature:${tonic}:${mode}`,
      generator: 'key-signature',
      skill: 'key-signatures',
      prompt: `¿Qué armadura tiene ${formatNote(tonic, 'latin')} ${modeEs}?`,
      input: { kind: 'choice', options },
      answer: { kind: 'choice', index: options.indexOf(correct) },
      explanation: `${formatNote(tonic, 'latin')} ${modeEs} lleva ${correct}.`,
    }
  },
}
