import { ArrowRight, CircleCheck, CircleX, Dumbbell, Lightbulb, RotateCcw } from 'lucide-preact'
import type { ComponentChildren } from 'preact'
import { buttonClass } from '../../components/ui/button.ts'
import StatusBadge from '../../components/ui/StatusBadge.tsx'
import { examHref, moduleHref, testHref, topicHref } from '../curriculum/paths.ts'
import type { Module } from '../curriculum/schema.ts'
import { SKILL_NAME_ES } from '../curriculum/skills.ts'
import { formatAnswer, formatResponse } from '../exercises/format.ts'
import { grade } from '../exercises/grade.ts'
import NeedProfile from '../profiles/NeedProfile.tsx'
import { examAdvice, percentOf, recommendedNext } from '../progress/rules.ts'
import { useProgress } from '../progress/use-progress.ts'

const attemptId = () =>
  typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('intento')

function Cta({
  href,
  primary,
  children,
}: {
  href: string
  primary?: boolean
  children: ComponentChildren
}) {
  return (
    <a href={href} class={buttonClass(primary ? 'primary' : 'secondary')}>
      {children}
    </a>
  )
}

export default function ResultView({ curriculum }: { curriculum: Module[] }) {
  const { active, progress } = useProgress()
  if (active === null || progress === null) return <NeedProfile />
  const id = attemptId()
  const attempt = progress.attempts.find((a) => a.id === id)
  if (attempt === undefined || attempt.submittedAt === null) {
    return (
      <section class="space-y-3 rounded-card bg-dojo-surface p-5 md:p-6">
        <p>No encontramos ese resultado en este perfil.</p>
        <a href="/progreso" class={buttonClass('secondary')}>
          Ver tu historial
        </a>
      </section>
    )
  }

  const notation = progress.prefs.notation
  const moduleId = attempt.kind === 'placement' ? attempt.scopeId : attempt.scopeId.slice(0, 3)
  const module = curriculum.find((m) => m.id === moduleId)
  if (module === undefined || module.status !== 'ready') return null
  const topic = module.topics.find((t) => t.id === attempt.scopeId)
  const total = attempt.questions.length
  const correct = attempt.correct ?? 0
  const passed = attempt.passed === true
  const failedSkills = [
    ...new Set(
      attempt.questions.flatMap((q, i) => {
        const r = attempt.responses[i] ?? null
        return r === null || !grade(q, r).correct ? [q.skill] : []
      }),
    ),
  ]
  const review = examAdvice(attempt, module)
    .map((tid) => module.topics.find((t) => t.id === tid))
    .filter((t) => t !== undefined)

  let ctas: ComponentChildren
  if (attempt.kind === 'placement') {
    const next = recommendedNext(progress, curriculum)
    ctas = passed ? (
      <Cta
        href={
          next ? (next.kind === 'exam' ? examHref(next.moduleId) : topicHref(next.topicId)) : '/'
        }
        primary
      >
        Seguir
        <ArrowRight size={18} aria-hidden="true" />
      </Cta>
    ) : (
      <>
        <Cta href={moduleHref(module.id)} primary>
          Ir al módulo
        </Cta>
        <Cta href={examHref(module.id)}>
          <RotateCcw size={18} aria-hidden="true" />
          Intentar de nuevo
        </Cta>
      </>
    )
  } else if (topic && !passed) {
    ctas = (
      <>
        <Cta href={`${topicHref(topic.id)}#practica`} primary>
          <Dumbbell size={18} aria-hidden="true" />
          Practicar las que fallaste
        </Cta>
        <Cta href={topicHref(topic.id)}>Repasar la lección</Cta>
        <Cta href={testHref(topic.id)}>
          <RotateCcw size={18} aria-hidden="true" />
          Intentar de nuevo
        </Cta>
      </>
    )
  } else if (topic) {
    const next = recommendedNext(progress, curriculum)
    ctas =
      next?.kind === 'exam' ? (
        <Cta href={examHref(next.moduleId)} primary>
          Ir al examen de cinturón
          <ArrowRight size={18} aria-hidden="true" />
        </Cta>
      ) : (
        <Cta href={next ? topicHref(next.topicId) : moduleHref(module.id)} primary>
          Siguiente tema
          <ArrowRight size={18} aria-hidden="true" />
        </Cta>
      )
  }

  return (
    <div class="space-y-8">
      <section class="space-y-3 rounded-card bg-dojo-surface p-5 md:p-6">
        <h1 class="text-sm text-dojo-muted">
          Resultado ·{' '}
          {attempt.kind === 'placement' ? `Examen de ${module.title}` : (topic?.title ?? '')}
        </h1>
        <p class="font-display text-5xl font-extrabold">
          {correct}/{total}
          <span class="ml-3 text-2xl text-dojo-muted">{percentOf(correct, total)} %</span>
        </p>
        <StatusBadge
          status={passed ? 'passed' : 'failed'}
          label={passed ? 'Aprobada' : 'No aprobada'}
        />
        {attempt.kind === 'placement' && passed && <p>Ganaste el cinturón de {module.title}.</p>}
        <div class="flex flex-wrap gap-3 pt-2">{ctas}</div>
      </section>

      {review.length > 0 && (
        <section class="space-y-2">
          <h2 class="font-display text-xl font-bold">Para repasar</h2>
          <p class="text-dojo-muted">
            Fallaste en: {failedSkills.map((s) => SKILL_NAME_ES[s] ?? s).join(', ')}.{' '}
            {attempt.kind === 'placement' && !passed
              ? 'Repasa estos temas antes de intentar de nuevo el examen:'
              : 'Practica estos temas:'}
          </p>
          <ul class="flex flex-wrap gap-2">
            {review.map((t) => (
              <li key={t.id}>
                <a
                  href={`${topicHref(t.id)}#practica`}
                  class="inline-flex min-h-11 items-center rounded-full bg-dojo-warning-bg px-4 text-dojo-warning hover:underline"
                >
                  {t.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section class="space-y-3">
        <h2 class="font-display text-xl font-bold">Pregunta por pregunta</h2>
        <ol class="space-y-3">
          {attempt.questions.map((q, i) => {
            const r = attempt.responses[i] ?? null
            const g = r === null ? null : grade(q, r)
            const ok = g?.correct === true
            return (
              <li key={q.id} class="space-y-2 rounded-card bg-dojo-surface p-4">
                <p class="flex items-start gap-2 font-semibold">
                  {ok ? (
                    <CircleCheck
                      size={20}
                      class="mt-0.5 shrink-0 text-dojo-success"
                      aria-label="Correcta"
                    />
                  ) : (
                    <CircleX
                      size={20}
                      class="mt-0.5 shrink-0 text-dojo-danger"
                      aria-label="Incorrecta"
                    />
                  )}
                  {i + 1}. {q.prompt}
                </p>
                <p class="text-sm">
                  Tu respuesta: <strong>{formatResponse(q, r, notation)}</strong>
                  {!ok && (
                    <>
                      {' '}
                      · Correcta: <strong>{formatAnswer(q, notation)}</strong>
                    </>
                  )}
                </p>
                {g?.feedback && <p class="text-sm text-dojo-warning">{g.feedback}</p>}
                <p class="flex items-start gap-2 text-sm text-dojo-muted">
                  <Lightbulb size={16} class="mt-0.5 shrink-0 text-dojo-gold" aria-hidden="true" />
                  {q.explanation}
                </p>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
