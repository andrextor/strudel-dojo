import { needsRareSpelling } from '../../theory/instruments.ts'
import { formatNote } from '../../theory/notes.ts'
import { keySignature, relativeMajor, relativeMinor } from '../../theory/scales.ts'
import type { Generator } from '../types.ts'
import { MAJOR_TONICS, MINOR_TONICS } from './_shared.ts'

interface Params {
  maxAccidentals: number
}

export const relativeKey: Generator<Params> = {
  id: 'relative-key',
  skill: 'relative-minor',
  parseParams(raw) {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const max = r.maxAccidentals ?? 7
    if (typeof max !== 'number' || !Number.isInteger(max) || max < 0 || max > 7) return null
    return { maxAccidentals: max }
  },
  generate(params, rng) {
    const toMinor = rng.next() < 0.5
    const sourceMode = toMinor ? 'major' : 'minor'
    const poolOf = (minor: boolean) =>
      (minor ? MAJOR_TONICS : MINOR_TONICS).filter((t) => {
        const sig = keySignature(t, minor ? 'major' : 'minor')
        return sig !== null && sig.count <= params.maxAccidentals
      })
    const sourcePool = poolOf(toMinor)
    const spellAll = needsRareSpelling([
      ...poolOf(true).map((t) => relativeMinor(t) ?? t),
      ...poolOf(false).map((t) => relativeMajor(t) ?? t),
    ])
    const tonic = rng.pick(sourcePool)
    const relative = (toMinor ? relativeMinor(tonic) : relativeMajor(tonic)) ?? tonic
    const relPc = relative.replace(/-?\d+$/, '')
    const fromEs = toMinor ? 'mayor' : 'menor'
    const toEs = toMinor ? 'menor' : 'mayor'
    return {
      id: '',
      key: `relative-key:${tonic}:${sourceMode}`,
      generator: 'relative-key',
      skill: 'relative-minor',
      prompt: `¿Cuál es la tónica de la relativa ${toEs} de ${formatNote(tonic, 'latin')} ${fromEs}?`,
      input: { kind: 'note', via: ['text', 'keyboard'], spellAll },
      answer: { kind: 'pitch-classes', notes: [relPc], spelling: 'strict' },
      explanation: `${formatNote(tonic, 'latin')} ${fromEs} y ${formatNote(relPc, 'latin')} ${toEs} comparten armadura.`,
    }
  },
}
