import { ClipboardCheck, Dumbbell, Lock, Target } from 'lucide-preact'
import { useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import StatusBadge from '../../components/ui/StatusBadge.tsx'
import Tabs from '../../components/ui/Tabs.tsx'
import { kataHref, moduleHref, resultHref, testHref } from '../curriculum/paths.ts'
import type { Module } from '../curriculum/schema.ts'
import NeedProfile from '../profiles/NeedProfile.tsx'
import { TOPIC_STATUS } from '../progress/labels.ts'
import { bestScore, kataStatus, openAttempt, percentOf, topicStatus } from '../progress/rules.ts'
import { useProgress } from '../progress/use-progress.ts'
import PracticeSession from './PracticeSession.tsx'

type ReadyModule = Extract<Module, { status: 'ready' }>
type TabId = 'practica' | 'prueba' | 'katas'

interface Props {
  module: ReadyModule
  topicId: string
  curriculum: Module[]
}

const initialTab = (): TabId => {
  const hash = typeof location === 'undefined' ? '' : location.hash.slice(1)
  return hash === 'prueba' || hash === 'katas' ? hash : 'practica'
}

export default function TopicPanel({ module, topicId, curriculum }: Props) {
  const { active, progress } = useProgress()
  const [tab, setTab] = useState<TabId>(initialTab)
  const topic = module.topics.find((t) => t.id === topicId)
  if (topic === undefined) return null
  if (active === null || progress === null) return <NeedProfile />

  const status = topicStatus(progress, curriculum, module, topic)
  if (status === 'locked') {
    return (
      <section class="space-y-3 rounded-card bg-dojo-surface p-5 md:p-6">
        <p class="flex items-center gap-2">
          <Lock size={18} aria-hidden="true" />
          Este tema está bloqueado: primero aprueba el módulo anterior.
        </p>
        <a href={moduleHref(module.id)} class={buttonClass('secondary')}>
          Ver el módulo
        </a>
      </section>
    )
  }

  const open = openAttempt(progress, 'test', topic.id)
  const best = bestScore(progress, 'test', topic.id)
  const past = progress.attempts
    .filter((a) => a.kind === 'test' && a.scopeId === topic.id && a.submittedAt !== null)
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))
    .slice(0, 5)

  return (
    <section class="space-y-4 rounded-card bg-dojo-surface p-5 md:p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-display text-2xl font-bold">Entrena el tema</h2>
        <StatusBadge {...TOPIC_STATUS[status]} />
      </div>
      <Tabs
        label="Secciones del tema"
        value={tab}
        onChange={(id) => {
          setTab(id)
          window.history.replaceState(null, '', `#${id}`)
        }}
        tabs={[
          { id: 'practica', label: 'Práctica', icon: <Dumbbell size={16} aria-hidden="true" /> },
          { id: 'prueba', label: 'Prueba', icon: <ClipboardCheck size={16} aria-hidden="true" /> },
          { id: 'katas', label: 'Katas', icon: <Target size={16} aria-hidden="true" /> },
        ]}
      >
        {tab === 'practica' && <PracticeSession topicId={topic.id} mix={topic.practice.mix} />}

        {tab === 'prueba' && (
          <div class="space-y-4">
            <p class="text-dojo-muted">
              {topic.test.questions} preguntas. Apruebas con {topic.test.passPercent} %. Las
              respuestas se ven al entregar. Puedes repetirla cuantas veces quieras.
            </p>
            {best && (
              <p>
                Tu mejor resultado: {best.correct}/{best.total} (
                {percentOf(best.correct, best.total)} %)
              </p>
            )}
            <a href={testHref(topic.id)} class={buttonClass('primary')}>
              <ClipboardCheck size={18} aria-hidden="true" />
              {open ? 'Retomar la prueba' : best ? 'Hacer la prueba otra vez' : 'Empezar la prueba'}
            </a>
            {past.length > 0 && (
              <ul class="space-y-1 text-sm">
                {past.map((a) => (
                  <li key={a.id}>
                    <a href={resultHref(a.id)} class="text-dojo-neon hover:underline">
                      {new Date(a.submittedAt ?? '').toLocaleString('es')} · {a.correct}/
                      {a.questions.length} · {a.passed ? 'aprobada' : 'no aprobada'}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'katas' && (
          <ul class="space-y-3">
            <li class="text-sm text-dojo-muted">
              Opcionales: el tema se aprueba solo con la prueba.
            </li>
            {topic.katas.map((k) => {
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
        )}
      </Tabs>
    </section>
  )
}
