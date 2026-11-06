import { Dumbbell, Lock, Target } from 'lucide-preact'
import { buttonClass } from '../../components/ui/button.ts'
import StatusBadge from '../../components/ui/StatusBadge.tsx'
import { kataHref, stageHref } from '../curriculum/paths.ts'
import type { Kata, Module, StageOutline, UnitOutline } from '../curriculum/schema.ts'
import NeedProfile from '../profiles/NeedProfile.tsx'
import { kataStatus, missingTheory, unitStatus } from '../progress/rules.ts'
import { useProgress } from '../progress/use-progress.ts'
import PracticeSession from '../topic/PracticeSession.tsx'
import { UNIT_STATUS } from './labels.ts'
import TheoryGate from './TheoryGate.tsx'

interface Props {
  unit: Omit<UnitOutline, 'katas'> & { katas: Pick<Kata, 'id' | 'title' | 'brief'>[] }
  stage: StageOutline
  stages: StageOutline[]
  curriculum: Module[]
}

export default function UnitPanel({ unit, stage, stages, curriculum }: Props) {
  const { active, progress } = useProgress()
  if (active === null || progress === null) return <NeedProfile />

  const status = unitStatus(progress, curriculum, stages, stage, unit)
  if (status === 'locked') {
    return (
      <section class="space-y-3 rounded-card bg-dojo-surface p-5 md:p-6">
        <p class="flex items-center gap-2">
          <Lock size={18} aria-hidden="true" />
          Esta unidad se abre cuando apruebas la etapa anterior.
        </p>
        <a href={stageHref(stage.id)} class={buttonClass('secondary')}>
          Ver la etapa
        </a>
      </section>
    )
  }
  if (status === 'needs_theory') {
    return (
      <section class="rounded-card bg-dojo-surface p-5 md:p-6">
        <TheoryGate
          topicIds={missingTheory(progress, curriculum, unit)}
          curriculum={curriculum}
          progress={progress}
        />
      </section>
    )
  }

  return (
    <div class="space-y-6">
      <section class="space-y-4 rounded-card bg-dojo-surface p-5 md:p-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="flex items-center gap-2 font-display text-2xl font-bold">
            <Target size={20} aria-hidden="true" />
            Katas
          </h2>
          <StatusBadge {...UNIT_STATUS[status]} />
        </div>
        <ul class="space-y-3">
          {unit.katas.map((k) => {
            const ks = kataStatus(progress, k.id)
            return (
              <li key={k.id}>
                <a
                  href={kataHref(k.id)}
                  class="flex flex-col gap-2 rounded-card border-2 border-dojo-hairline p-4 hover:border-dojo-neon sm:flex-row sm:items-center"
                >
                  <span class="min-w-0 flex-1">
                    <span class="block font-semibold">{k.title}</span>
                    <span class="block text-sm text-dojo-muted">{k.brief}</span>
                  </span>
                  <StatusBadge
                    status={
                      ks === 'passed'
                        ? 'passed'
                        : ks === 'attempted'
                          ? 'in-progress'
                          : 'not-started'
                    }
                    label={
                      ks === 'passed'
                        ? progress.katas[k.id]?.helped
                          ? 'Aprobada con ayuda'
                          : 'Aprobada'
                        : ks === 'attempted'
                          ? 'Intentada'
                          : 'Sin empezar'
                    }
                  />
                </a>
              </li>
            )
          })}
        </ul>
      </section>
      {unit.practice && (
        <section class="space-y-4 rounded-card bg-dojo-surface p-5 md:p-6">
          <h2 class="flex items-center gap-2 font-display text-2xl font-bold">
            <Dumbbell size={20} aria-hidden="true" />
            Práctica
          </h2>
          <PracticeSession topicId={unit.id} mix={unit.practice.mix} />
        </section>
      )}
    </div>
  )
}
