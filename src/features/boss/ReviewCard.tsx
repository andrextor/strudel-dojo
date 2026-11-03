import { Sparkles } from 'lucide-preact'
import { useEffect, useState } from 'preact/hooks'
import ProgressBar from '../../components/ui/ProgressBar.tsx'
import type { Boss } from '../curriculum/schema.ts'
import type { SenseiReview } from '../sensei/types.ts'
import { evaluatePattern } from '../strudel/evaluate.ts'
import Listen from '../strudel/Listen.tsx'

interface Props {
  review: SenseiReview
  rubric: Boss['rubric']
  passScore: number
}

export default function ReviewCard({ review, rubric, passScore }: Props) {
  // The suggested variation only shows if it actually evaluates (spec 06); otherwise it hides.
  const [variationOk, setVariationOk] = useState(false)
  useEffect(() => {
    let alive = true
    void evaluatePattern(review.variation.code).then((r) => alive && setVariationOk(r.ok))
    return () => {
      alive = false
    }
  }, [review.variation.code])
  const label = (id: string) => rubric.find((c) => c.id === id)?.label ?? id

  return (
    <section class="space-y-5 rounded-card border-2 border-dojo-violet bg-dojo-surface p-5 md:p-6">
      <header class="flex flex-wrap items-baseline justify-between gap-3">
        <h2 class="flex items-center gap-2 font-display text-xl font-bold">
          <Sparkles size={20} class="text-dojo-violet" aria-hidden="true" />
          Revisión del Sensei
        </h2>
        <p class="font-display text-4xl font-extrabold">
          {review.score}
          <span class="text-lg text-dojo-muted"> / 10 · se aprueba con {passScore}</span>
        </p>
      </header>

      <ul class="space-y-4">
        {review.criteria.map((c) => (
          <li key={c.id} class="space-y-1">
            <ProgressBar value={c.score} max={10} label={label(c.id)} />
            <p class="text-sm text-dojo-muted">{c.comment}</p>
          </li>
        ))}
      </ul>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <h3 class="font-semibold">Lo que ya funciona</h3>
          <ul class="list-disc space-y-1 pl-5 text-dojo-muted">
            {review.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 class="font-semibold">Siguientes pasos</h3>
          <ul class="list-disc space-y-1 pl-5 text-dojo-muted">
            {review.nextSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      {variationOk && (
        <div class="space-y-2">
          <h3 class="font-semibold">Una variación para probar</h3>
          <p class="text-dojo-muted">{review.variation.idea}</p>
          <pre class="overflow-x-auto rounded-control bg-dojo-raised p-3 font-mono text-sm text-dojo-violet">
            {review.variation.code}
          </pre>
          <Listen code={review.variation.code} label="Escuchar variación" />
        </div>
      )}
    </section>
  )
}
