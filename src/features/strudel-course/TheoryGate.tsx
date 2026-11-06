import { BookOpen } from 'lucide-preact'
import { buttonClass } from '../../components/ui/button.ts'
import { nextStepHref, topicHref } from '../curriculum/paths.ts'
import type { Module } from '../curriculum/schema.ts'
import { isModuleUnlocked, recommendedNext } from '../progress/rules.ts'
import type { ProgressState } from '../progress/types.ts'

interface Props {
  topicIds: string[]
  curriculum: Module[]
  progress: ProgressState
}

// A locked theory topic can be read but not tested, so the action goes to the next theory step.
export default function TheoryGate({ topicIds, curriculum, progress }: Props) {
  const missing = curriculum.flatMap((m) =>
    m.topics
      .filter((t) => topicIds.includes(t.id))
      .map((t) => ({ topic: t, open: isModuleUnlocked(progress, curriculum, m) })),
  )
  const next = recommendedNext(progress, curriculum)
  const blocked = missing.some((m) => !m.open)
  return (
    <div class="space-y-3">
      <p>Esto usa teoría que todavía no apruebas:</p>
      <ul class="flex flex-wrap gap-2">
        {missing.map(({ topic }) => (
          <li key={topic.id}>
            <a
              href={topicHref(topic.id)}
              class="inline-flex min-h-11 items-center rounded-full bg-dojo-warning-bg px-4 text-dojo-warning hover:underline"
            >
              {topic.title}
            </a>
          </li>
        ))}
      </ul>
      {blocked && next && (
        <a href={nextStepHref(next)} class={buttonClass('primary')}>
          <BookOpen size={18} aria-hidden="true" />
          Seguir con la teoría
        </a>
      )}
    </div>
  )
}
