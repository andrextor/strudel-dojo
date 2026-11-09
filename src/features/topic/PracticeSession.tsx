import { ClipboardCheck, Dumbbell } from 'lucide-preact'
import { useMemo, useRef, useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import { freshRng, randomId } from '../../lib/random.ts'
import type { MixEntry } from '../curriculum/schema.ts'
import QuestionCard from '../exercises/QuestionCard.tsx'
import { pickQuestion } from '../exercises/registry.ts'
import type { Question } from '../exercises/types.ts'
import { recordPractice } from '../progress/rules.ts'
import { localDate } from '../progress/streak.ts'
import type { Prefs } from '../progress/types.ts'
import { useProgress } from '../progress/use-progress.ts'

// Practice comes in rounds; every question is fresh, and once the mix runs out of unseen
// questions the session starts reusing them instead of failing.
const ROUND = 10

function nextQuestion(mix: MixEntry[], prefix: string, n: number, used: Set<string>): Question {
  try {
    return pickQuestion(mix, prefix, n, used)
  } catch {
    used.clear()
    return pickQuestion(mix, prefix, n, used)
  }
}

interface Props {
  topicId: string
  mix: MixEntry[]
  test?: string // a theory topic passes on its test, not on practice
  next?: { href: string; label: string }
}

export default function PracticeSession({ topicId, mix, test, next }: Props) {
  const { progress, updateProgress } = useProgress()
  const [session, setSession] = useState(() => randomId(freshRng()))
  const [n, setN] = useState(0)
  const [score, setScore] = useState({ answered: 0, correct: 0 })
  const [stopped, setStopped] = useState(false)
  const ended = stopped || n >= ROUND
  const used = useRef(new Set<string>())
  const question = useMemo(
    () => nextQuestion(mix, `practice:${topicId}:${session}`, n, used.current),
    [mix, topicId, session, n],
  )
  if (progress === null) return null
  const patchPrefs = (patch: Partial<Prefs>) =>
    updateProgress((p) => ({ ...p, prefs: { ...p.prefs, ...patch } }))

  if (ended) {
    return (
      <div class="space-y-4 rounded-card bg-dojo-surface p-5 md:p-6" role="status">
        <p class="font-display text-2xl font-bold">
          {score.correct} de {score.answered} correctas
        </p>
        <p>
          La práctica suma a tu racha y tu XP
          {test ? ', pero el tema se aprueba con la prueba.' : '.'}
        </p>
        <div class="flex flex-wrap gap-3">
          {test && (
            <a href={test} class={buttonClass('primary')}>
              <ClipboardCheck size={18} aria-hidden="true" />
              Hacer la prueba
            </a>
          )}
          <button
            type="button"
            class={buttonClass('secondary')}
            onClick={() => {
              used.current.clear()
              setSession(randomId(freshRng()))
              setN(0)
              setScore({ answered: 0, correct: 0 })
              setStopped(false)
            }}
          >
            <Dumbbell size={18} aria-hidden="true" />
            Otra ronda
          </button>
          {next && (
            <a href={next.href} class={buttonClass('ghost')}>
              {next.label}
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm text-dojo-muted" aria-live="polite">
          Pregunta {n + 1} de {ROUND} · {score.correct} correctas
        </p>
        <button
          type="button"
          class={buttonClass('ghost', 'min-h-11')}
          onClick={() => setStopped(true)}
        >
          Terminar
        </button>
      </div>
      <QuestionCard
        key={question.id}
        question={question}
        mode="practice"
        prefs={progress.prefs}
        onPrefs={patchPrefs}
        onAnswer={(_, g) => {
          const now = new Date()
          setScore((s) => ({ answered: s.answered + 1, correct: s.correct + (g.correct ? 1 : 0) }))
          updateProgress((p) => recordPractice(p, localDate(now), question.skill, g.correct, now))
        }}
        onNext={() => setN((x) => x + 1)}
      />
    </div>
  )
}
