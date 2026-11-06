import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Lock } from 'lucide-preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import ProgressBar from '../../components/ui/ProgressBar.tsx'
import { freshRng } from '../../lib/random.ts'
import EarnedBelt from '../boss/EarnedBelt.tsx'
import { resultHref } from '../curriculum/paths.ts'
import type { MixEntry, Module } from '../curriculum/schema.ts'
import { formatResponse } from '../exercises/format.ts'
import QuestionCard from '../exercises/QuestionCard.tsx'
import NeedProfile from '../profiles/NeedProfile.tsx'
import {
  answerQuestion,
  examAvailable,
  examPassPercent,
  newlyPassedModule,
  openAttempt,
  recordSubmission,
  saveAttempt,
  startTest,
  submitTest,
  topicStatus,
} from '../progress/rules.ts'
import type { Prefs, ProgressState, TestAttempt } from '../progress/types.ts'
import { useProgress } from '../progress/use-progress.ts'

interface Props {
  kind: TestAttempt['kind']
  scopeId: string // topic id for a test, module id for an exam
  title: string
  graded: { questions: number; passPercent: number; mix: MixEntry[] }
  module: Module
  curriculum: Module[]
  backHref: string
}

const firstUnanswered = (a: TestAttempt) => {
  const i = a.responses.indexOf(null)
  return i === -1 ? a.responses.length - 1 : i
}

export default function TestView(props: Props) {
  const { kind, scopeId, title, graded, module, curriculum, backHref } = props
  const { active, progress, updateProgress } = useProgress()
  const attempt = progress ? openAttempt(progress, kind, scopeId) : null
  const [index, setIndex] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [earned, setEarned] = useState<Module | null>(null)

  const passPercent = (p: ProgressState) =>
    kind === 'placement' && module.status === 'ready'
      ? examPassPercent(p, module)
      : graded.passPercent

  const allowed = (p: ProgressState) => {
    if (kind === 'placement') return examAvailable(p, curriculum, module)
    const topic = module.topics.find((t) => t.id === scopeId)
    return topic !== undefined && topicStatus(p, curriculum, module, topic) !== 'locked'
  }

  // Rule 9: the attempt exists (and is saved) before the first answer, so it can be resumed.
  // Once per visit: after submitting there is no open attempt, and that must not start another.
  const started = useRef(false)
  const lastAttempt = useRef<string | null>(null)
  useEffect(() => {
    if (progress === null || started.current || !allowed(progress)) return
    started.current = true
    if (attempt !== null) return
    // A rare seed can exhaust a small mix; another seed always works.
    const fresh = () => {
      for (let t = 0; ; t++) {
        try {
          return startTest({ kind, scopeId }, graded.mix, graded.questions, new Date(), freshRng())
        } catch (e) {
          if (t >= 4) throw e
        }
      }
    }
    updateProgress((p) => (openAttempt(p, kind, scopeId) ? p : saveAttempt(p, fresh())))
  }, [progress === null, attempt === null])

  if (active === null || progress === null) return <NeedProfile />
  if (earned !== null && lastAttempt.current !== null) {
    const id = lastAttempt.current
    return (
      <EarnedBelt
        module={earned}
        curriculum={curriculum}
        onContinue={() => {
          location.href = resultHref(id)
        }}
      />
    )
  }
  if (!allowed(progress)) {
    return (
      <section class="space-y-3 rounded-card bg-dojo-surface p-5 md:p-6">
        <p class="flex items-center gap-2">
          <Lock size={18} aria-hidden="true" />
          {kind === 'placement'
            ? 'El examen no está disponible: el módulo está bloqueado o ya lo aprobaste.'
            : 'Este tema está bloqueado.'}
        </p>
        <a href={backHref} class={buttonClass('secondary')}>
          Volver
        </a>
      </section>
    )
  }
  if (attempt === null) return <p class="text-dojo-muted">Preparando la prueba…</p>

  const total = attempt.questions.length
  const current = index ?? firstUnanswered(attempt)
  const question = attempt.questions[current]
  const answered = attempt.responses.filter((r) => r !== null).length
  const missing = total - answered
  const saved = attempt.responses[current] ?? null
  if (question === undefined) return null

  const patchPrefs = (patch: Partial<Prefs>) =>
    updateProgress((p) => ({ ...p, prefs: { ...p.prefs, ...patch } }))

  function submit() {
    if (attempt === null) return
    const now = new Date()
    let belt: Module | null = null
    updateProgress((p) => {
      const open = openAttempt(p, kind, scopeId)
      if (open === null) return p
      const next = recordSubmission(p, submitTest(open, passPercent(p), now), now)
      belt = newlyPassedModule(p, next, curriculum)
      return next
    })
    lastAttempt.current = attempt.id
    if (belt === null) location.href = resultHref(attempt.id)
    else setEarned(belt)
  }

  return (
    <div class="space-y-6">
      <header class="space-y-2">
        <p class="text-sm text-dojo-muted">
          {kind === 'placement' ? 'Examen de cinturón' : 'Prueba'} · apruebas con{' '}
          {passPercent(progress)} %
        </p>
        <h1 class="font-display text-2xl font-bold md:text-3xl">{title}</h1>
        <div class="max-w-md">
          <ProgressBar value={answered} max={total} label="Contestadas" />
        </div>
      </header>

      <nav aria-label="Preguntas" class="flex flex-wrap gap-2">
        {attempt.questions.map((q, i) => {
          const done = attempt.responses[i] !== null
          return (
            <button
              key={q.id}
              type="button"
              aria-current={i === current ? 'step' : undefined}
              class={`inline-flex size-11 items-center justify-center rounded-control border-2 text-sm font-semibold ${i === current ? 'border-dojo-neon text-dojo-neon' : done ? 'border-dojo-violet bg-dojo-raised' : 'border-dojo-border text-dojo-muted'}`}
              onClick={() => setIndex(i)}
            >
              {done && i !== current ? <Check size={16} aria-hidden="true" /> : i + 1}
              <span class="sr-only">
                Pregunta {i + 1}
                {done ? ', contestada' : ', sin contestar'}
              </span>
            </button>
          )
        })}
      </nav>

      <div class="space-y-2">
        <p class="text-sm text-dojo-muted">
          Pregunta {current + 1} de {total}
        </p>
        {saved && (
          <p class="text-sm text-dojo-muted">
            Ya respondiste:{' '}
            <strong class="text-dojo-text">
              {formatResponse(question, saved, progress.prefs.notation)}
            </strong>
            . Si respondes de nuevo, se reemplaza.
          </p>
        )}
        <QuestionCard
          key={`${question.id}:${saved === null ? 'new' : 'again'}`}
          question={question}
          mode="test"
          hintUsed={saved?.hinted === true}
          prefs={progress.prefs}
          onPrefs={patchPrefs}
          onAnswer={(response) => {
            updateProgress((p) => {
              const open = openAttempt(p, kind, scopeId)
              return open ? saveAttempt(p, answerQuestion(open, current, response)) : p
            })
            const next = attempt.responses.findIndex((r, i) => r === null && i !== current)
            if (next !== -1) setIndex(next)
          }}
        />
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class={buttonClass('ghost')}
          disabled={current === 0}
          onClick={() => setIndex(current - 1)}
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Anterior
        </button>
        <button
          type="button"
          class={buttonClass('ghost')}
          disabled={current === total - 1}
          onClick={() => setIndex(current + 1)}
        >
          Siguiente
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          class={buttonClass('primary', 'ml-auto')}
          onClick={() => (missing > 0 ? setConfirming(true) : submit())}
        >
          <ClipboardCheck size={18} aria-hidden="true" />
          Entregar prueba
        </button>
      </div>

      {confirming && missing > 0 && (
        <div role="alert" class="space-y-3 rounded-card bg-dojo-warning-bg p-5">
          <p>
            Te {missing === 1 ? 'falta 1 pregunta' : `faltan ${missing} preguntas`}. Las que no
            respondas cuentan como incorrectas.
          </p>
          <div class="flex flex-wrap gap-3">
            <button type="button" class={buttonClass('primary')} onClick={submit}>
              Entregar igual
            </button>
            <button
              type="button"
              class={buttonClass('secondary')}
              onClick={() => {
                setConfirming(false)
                setIndex(firstUnanswered(attempt))
              }}
            >
              Seguir respondiendo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
