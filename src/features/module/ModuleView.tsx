import { ArrowRight, Compass, Lock, Swords, Target } from 'lucide-preact'
import BeltBadge from '../../components/ui/BeltBadge.tsx'
import { buttonClass } from '../../components/ui/button.ts'
import ProgressBar from '../../components/ui/ProgressBar.tsx'
import StatusBadge from '../../components/ui/StatusBadge.tsx'
import { bossHref, moduleHref, placementHref, topicHref } from '../curriculum/paths.ts'
import type { Module } from '../curriculum/schema.ts'
import NeedProfile from '../profiles/NeedProfile.tsx'
import { TOPIC_STATUS } from '../progress/labels.ts'
import {
  bestScore,
  bossUnlocked,
  isModulePassed,
  isTopicPassed,
  kataStatus,
  moduleStatus,
  percentOf,
  placementAvailable,
  topicStatus,
} from '../progress/rules.ts'
import { useProgress } from '../progress/use-progress.ts'

interface Props {
  module: Module
  curriculum: Module[]
}

export default function ModuleView({ module, curriculum }: Props) {
  const { active, progress } = useProgress()
  const prerequisite = curriculum.find((m) => m.id === module.prerequisite)

  const header = (stripes: number) => (
    <header class="space-y-3">
      <BeltBadge belt={module.belt} stripes={stripes} />
      <h1 class="font-display text-3xl font-bold md:text-4xl">{module.title}</h1>
      <p class="max-w-2xl text-dojo-muted">{module.summary}</p>
    </header>
  )

  if (module.status === 'draft') {
    return (
      <div class="space-y-8">
        {header(0)}
        <StatusBadge status="not-started" label="Próximamente" />
        <ol class="space-y-2">
          {module.topics.map((t) => (
            <li key={t.id} class="rounded-card bg-dojo-surface p-4 opacity-60">
              <p class="font-semibold">{t.title}</p>
              <p class="text-sm text-dojo-muted">{t.goal}</p>
            </li>
          ))}
        </ol>
      </div>
    )
  }
  if (active === null || progress === null) return <NeedProfile />

  const status = moduleStatus(progress, curriculum, module)
  const passedTopics = module.topics.filter((t) => isTopicPassed(progress, module, t)).length

  if (status === 'locked') {
    return (
      <div class="space-y-6">
        {header(0)}
        <p class="flex items-center gap-2 text-dojo-muted">
          <Lock size={18} aria-hidden="true" />
          Se desbloquea al aprobar {prerequisite ? `«${prerequisite.title}»` : 'el módulo anterior'}
          .
        </p>
        {prerequisite && (
          <a href={moduleHref(prerequisite.id)} class={buttonClass('secondary')}>
            Ir a {prerequisite.title}
          </a>
        )}
      </div>
    )
  }

  const bossOpen = bossUnlocked(progress, curriculum, module)
  const bossPassed = (progress.bosses[module.boss.id] ?? []).some((r) => r.passed)
  const placement = placementAvailable(progress, curriculum, module)
  const placementBest = bestScore(progress, 'placement', module.id)

  return (
    <div class="space-y-8">
      {header(passedTopics)}
      <div class="max-w-md">
        <ProgressBar value={passedTopics} max={module.topics.length} label="Temas aprobados" />
      </div>

      <ol class="space-y-3">
        {module.topics.map((t, i) => {
          const ts = topicStatus(progress, curriculum, module, t)
          const score = bestScore(progress, 'test', t.id)
          const katas = 'katas' in t ? t.katas : []
          const katasDone = katas.filter((k) => kataStatus(progress, k.id) === 'passed').length
          return (
            <li key={t.id}>
              <a
                href={topicHref(t.id)}
                class="flex flex-col gap-3 rounded-card border-2 border-dojo-hairline bg-dojo-surface p-4 hover:border-dojo-neon sm:flex-row sm:items-center"
              >
                <span class="font-display text-2xl font-bold text-dojo-muted">{i + 1}</span>
                <span class="min-w-0 flex-1">
                  <span class="block font-semibold">{t.title}</span>
                  <span class="block text-sm text-dojo-muted">{t.goal}</span>
                  <span class="mt-1 flex flex-wrap gap-x-4 text-sm text-dojo-muted">
                    <span>
                      Prueba: {score ? `${percentOf(score.correct, score.total)} %` : 'sin rendir'}
                    </span>
                    <span class="inline-flex items-center gap-1">
                      <Target size={14} aria-hidden="true" />
                      Katas {katasDone}/{katas.length}
                    </span>
                  </span>
                </span>
                <StatusBadge {...TOPIC_STATUS[ts]} />
              </a>
            </li>
          )
        })}
      </ol>

      <div class="grid gap-4 md:grid-cols-2">
        <section class="space-y-3 rounded-card bg-dojo-surface p-5 md:p-6">
          <h2 class="flex items-center gap-2 font-display text-xl font-bold">
            <Swords size={20} aria-hidden="true" />
            Combate: {module.boss.title}
          </h2>
          <p class="text-dojo-muted">{module.boss.brief}</p>
          {bossPassed ? (
            <StatusBadge status="passed" label="Combate aprobado" />
          ) : bossOpen ? (
            <a href={bossHref(module.id)} class={buttonClass('primary')}>
              Ir al combate
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          ) : (
            <StatusBadge status="locked" label="Aprueba los 4 temas para desbloquearlo" />
          )}
          {bossPassed && (
            <a href={bossHref(module.id)} class={buttonClass('ghost')}>
              Volver a combatir
            </a>
          )}
        </section>

        {(placement || placementBest) && module.placement && (
          <section class="space-y-3 rounded-card bg-dojo-surface p-5 md:p-6">
            <h2 class="flex items-center gap-2 font-display text-xl font-bold">
              <Compass size={20} aria-hidden="true" />
              Prueba de ubicación
            </h2>
            <p class="text-dojo-muted">
              ¿Ya sabes esto? {module.placement.questions} preguntas; con{' '}
              {module.placement.passPercent} % apruebas el módulo entero.
            </p>
            {placementBest && (
              <p class="text-sm text-dojo-muted">
                Tu mejor intento: {percentOf(placementBest.correct, placementBest.total)} %
              </p>
            )}
            {placement && !isModulePassed(progress, module) && (
              <a href={placementHref(module.id)} class={buttonClass('secondary')}>
                Hacer la prueba de ubicación
              </a>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
