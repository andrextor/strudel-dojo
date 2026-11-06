import { ClipboardCheck, Code, Dumbbell, Lock } from 'lucide-preact'
import { useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import StatusBadge from '../../components/ui/StatusBadge.tsx'
import Tabs from '../../components/ui/Tabs.tsx'
import { moduleHref, resultHref, testHref } from '../curriculum/paths.ts'
import type { Module } from '../curriculum/schema.ts'
import NeedProfile from '../profiles/NeedProfile.tsx'
import { TOPIC_STATUS } from '../progress/labels.ts'
import { bestScore, openAttempt, percentOf, topicStatus } from '../progress/rules.ts'
import { useProgress } from '../progress/use-progress.ts'
import PracticeSession from './PracticeSession.tsx'

type ReadyModule = Extract<Module, { status: 'ready' }>
type TabId = 'practica' | 'prueba'

interface Props {
  module: ReadyModule
  topicId: string
  curriculum: Module[]
  strudelUnits: { title: string; href: string }[]
}

const initialTab = (): TabId => {
  const hash = typeof location === 'undefined' ? '' : location.hash.slice(1)
  return hash === 'prueba' ? hash : 'practica'
}

export default function TopicPanel({ module, topicId, curriculum, strudelUnits }: Props) {
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
      </Tabs>
      {strudelUnits.length > 0 && (
        <p class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dojo-hairline pt-4">
          <Code size={16} aria-hidden="true" />
          Practícalo en Strudel:
          {strudelUnits.map((u) => (
            <a key={u.href} href={u.href} class="text-dojo-neon hover:underline">
              {u.title}
            </a>
          ))}
        </p>
      )}
    </section>
  )
}
