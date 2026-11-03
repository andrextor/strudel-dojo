import { CircleCheck, CircleX, Repeat } from 'lucide-preact'
import { useMemo, useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import ProgressBar from '../../components/ui/ProgressBar.tsx'
import { freshRng, randomId } from '../../lib/random.ts'
import type { Module } from '../curriculum/schema.ts'
import { SKILL_NAME_ES } from '../curriculum/skills.ts'
import QuestionCard from '../exercises/QuestionCard.tsx'
import NeedProfile from '../profiles/NeedProfile.tsx'
import { recordPractice } from '../progress/rules.ts'
import { localDate } from '../progress/streak.ts'
import type { Prefs } from '../progress/types.ts'
import { useProgress } from '../progress/use-progress.ts'
import { buildReviewSet } from './schedule.ts'

export default function ReviewSession({ curriculum }: { curriculum: Module[] }) {
  const { active, progress, updateProgress } = useProgress()
  const [session, setSession] = useState(() => randomId(freshRng()))
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<{ skill: string; correct: boolean }[]>([])
  // Built once per session from the stats at its start; answering mid-session reshuffles nothing.
  const set = useMemo(
    () => (progress ? buildReviewSet(progress, curriculum, new Date(), `review:${session}`) : []),
    [session, curriculum, progress === null],
  )
  if (active === null || progress === null) return <NeedProfile />

  if (set.length === 0) {
    return (
      <section class="space-y-3 rounded-card bg-dojo-surface p-5 md:p-6">
        <h1 class="flex items-center gap-2 font-display text-3xl font-bold">
          <Repeat size={26} aria-hidden="true" />
          Repaso
        </h1>
        <p>Todavía no hay nada que repasar: practica un tema y vuelve mañana.</p>
        <a href="/" class={buttonClass('primary')}>
          Ir al camino de cinturones
        </a>
      </section>
    )
  }

  const question = set[index]
  const patchPrefs = (patch: Partial<Prefs>) =>
    updateProgress((p) => ({ ...p, prefs: { ...p.prefs, ...patch } }))

  if (question === undefined) {
    const bySkill = new Map<string, { right: number; total: number }>()
    for (const r of results) {
      const s = bySkill.get(r.skill) ?? { right: 0, total: 0 }
      bySkill.set(r.skill, { right: s.right + (r.correct ? 1 : 0), total: s.total + 1 })
    }
    const right = results.filter((r) => r.correct).length
    return (
      <section class="space-y-5 rounded-card bg-dojo-surface p-5 md:p-6">
        <h1 class="font-display text-3xl font-bold">Repaso terminado</h1>
        <p class="font-display text-5xl font-extrabold">
          {right}/{results.length}
        </p>
        <ul class="space-y-2">
          {[...bySkill].map(([skill, s]) => (
            <li key={skill} class="flex items-center gap-2">
              {s.right === s.total ? (
                <CircleCheck size={18} class="text-dojo-success" aria-hidden="true" />
              ) : (
                <CircleX size={18} class="text-dojo-danger" aria-hidden="true" />
              )}
              {SKILL_NAME_ES[skill] ?? skill}: {s.right} de {s.total}
            </li>
          ))}
        </ul>
        <p class="text-dojo-muted">Lo que acertaste vuelve más tarde; lo que fallaste, mañana.</p>
        <button
          type="button"
          class={buttonClass('primary')}
          onClick={() => {
            setSession(randomId(freshRng()))
            setIndex(0)
            setResults([])
          }}
        >
          <Repeat size={18} aria-hidden="true" />
          Repasar otra vez
        </button>
      </section>
    )
  }

  return (
    <div class="space-y-4">
      <header class="space-y-2">
        <h1 class="flex items-center gap-2 font-display text-3xl font-bold">
          <Repeat size={26} aria-hidden="true" />
          Repaso
        </h1>
        <p class="text-dojo-muted">
          {SKILL_NAME_ES[question.skill] ?? question.skill} · pregunta {index + 1} de {set.length}
        </p>
        <div class="max-w-md">
          <ProgressBar value={index} max={set.length} label="Avance" showValue={false} />
        </div>
      </header>
      <QuestionCard
        key={question.id}
        question={question}
        mode="practice"
        prefs={progress.prefs}
        onPrefs={patchPrefs}
        onAnswer={(_, g) => {
          const now = new Date()
          setResults((r) => [...r, { skill: question.skill, correct: g.correct }])
          updateProgress((p) => recordPractice(p, localDate(now), question.skill, g.correct, now))
        }}
        onNext={() => setIndex((i) => i + 1)}
      />
    </div>
  )
}
