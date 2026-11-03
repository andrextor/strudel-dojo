import type { Rng } from '../../../lib/random.ts'
import type { Generator } from '../types.ts'

interface Params {
  meter: number
  subdivision: number // number of slots in the bar
}

// onsets[i] true = hit, false = rest. Rendered as Strudel mini-notation.
function render(onsets: boolean[]): string {
  return onsets.map((on) => (on ? 'bd' : '~')).join(' ')
}

function randomPattern(rng: Rng, slots: number): boolean[] {
  const onsets = Array.from({ length: slots }, (_, i) => (i === 0 ? true : rng.next() < 0.5))
  // Guarantee at least two onsets so the figure is not trivial.
  while (onsets.filter(Boolean).length < 2) {
    onsets[rng.int(1, slots - 1)] = true
  }
  return onsets
}

export const rhythmMatch: Generator<Params> = {
  id: 'rhythm-match',
  skill: 'rhythm-reading',
  parseParams(raw) {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const meter = r.meter ?? 4
    const subdivision = r.subdivision ?? 8
    if (typeof meter !== 'number' || !Number.isInteger(meter) || meter < 1) return null
    if (typeof subdivision !== 'number' || !Number.isInteger(subdivision) || subdivision < 3) {
      return null
    }
    return { meter, subdivision }
  },
  generate(params, rng) {
    const slots = params.subdivision
    const target = randomPattern(rng, slots)
    const correct = render(target)

    // Distractors: flip one non-downbeat slot, keeping the appearance similar.
    const distractors: string[] = []
    for (const i of rng.shuffle(Array.from({ length: slots - 1 }, (_, k) => k + 1))) {
      const variant = [...target]
      variant[i] = !variant[i]
      const rendered = render(variant)
      if (rendered !== correct && !distractors.includes(rendered)) distractors.push(rendered)
      if (distractors.length === 3) break
    }

    const options = rng.shuffle([correct, ...distractors])
    return {
      id: '',
      key: `rhythm-match:${target.map((o) => (o ? '1' : '0')).join('')}`,
      generator: 'rhythm-match',
      skill: 'rhythm-reading',
      prompt: 'Escucha el patrón y elige la mini-notación que suena igual.',
      input: { kind: 'rhythm', options },
      audio: `s("${correct}")`,
      answer: { kind: 'choice', index: options.indexOf(correct) },
      explanation: `El patrón suena como ${correct} (bd = golpe, ~ = silencio).`,
    }
  },
}
