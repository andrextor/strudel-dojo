import { Ear, Flame, Lock } from 'lucide-preact'
import { useMemo, useRef, useState } from 'preact/hooks'
import { freshRng, randomId } from '../../lib/random.ts'
import type { MixEntry, Module } from '../curriculum/schema.ts'
import QuestionCard from '../exercises/QuestionCard.tsx'
import { pickQuestion } from '../exercises/registry.ts'
import NeedProfile from '../profiles/NeedProfile.tsx'
import { isTopicPassed, recordPractice } from '../progress/rules.ts'
import { localDate } from '../progress/streak.ts'
import type { Prefs, ProgressState } from '../progress/types.ts'
import { useProgress } from '../progress/use-progress.ts'

type Direction = 'up' | 'down' | 'harmonic'

interface IntervalSet {
  id: string
  label: string
  set: string[]
  unlockedBy: string | null // topic whose pass opens it; null = always open
}

const SETS: IntervalSet[] = [
  {
    id: 'basic',
    label: 'Básicos: 2M, 3M, 4J, 5J, 8J',
    set: ['2M', '3M', '4P', '5P', '8P'],
    unlockedBy: null,
  },
  {
    id: 'thirds',
    label: 'Mayores y menores: suma 2m, 3m, 6m, 6M',
    set: ['2m', '2M', '3m', '3M', '4P', '5P', '6m', '6M', '8P'],
    unlockedBy: 'M01-T03',
  },
  {
    id: 'all',
    label: 'Todos hasta la octava, con el tritono',
    set: ['2m', '2M', '3m', '3M', '4P', '4A', '5P', '6m', '6M', '7m', '7M', '8P'],
    unlockedBy: 'M01-T03',
  },
]

const DIRECTIONS: { id: Direction; label: string }[] = [
  { id: 'up', label: 'Ascendentes' },
  { id: 'down', label: 'Descendentes' },
  { id: 'harmonic', label: 'Armónicos' },
]

// The other ear skills arrive with the belts that teach them (their generators come in P11).
const LATER = [
  { label: 'Acordes', belt: 'naranja (M03)' },
  { label: 'Escalas y modos', belt: 'morado (M06)' },
  { label: 'Dictado melódico', belt: 'los cinturones avanzados' },
]

function openSets(p: ProgressState, curriculum: Module[]): Set<string> {
  const passed = (topicId: string) =>
    curriculum.some((m) => m.topics.some((t) => t.id === topicId && isTopicPassed(p, m, t)))
  return new Set(SETS.filter((s) => s.unlockedBy === null || passed(s.unlockedBy)).map((s) => s.id))
}

export default function EarGym({ curriculum }: { curriculum: Module[] }) {
  const { active, progress, updateProgress } = useProgress()
  const [setId, setSetId] = useState('basic')
  const [direction, setDirection] = useState<Direction>('up')
  const [session, setSession] = useState(() => randomId(freshRng()))
  const [n, setN] = useState(0)
  const [streak, setStreak] = useState({ now: 0, best: 0, answered: 0 })
  const used = useRef(new Set<string>())
  const chosen = SETS.find((s) => s.id === setId) ?? SETS[0]
  const mix: MixEntry[] = [
    { generator: 'ear-interval', params: { set: chosen?.set ?? [], direction }, weight: 1 },
  ]
  const question = useMemo(() => {
    try {
      return pickQuestion(mix, `ear:${session}`, n, used.current)
    } catch {
      used.current.clear()
      return pickQuestion(mix, `ear:${session}`, n, used.current)
    }
  }, [session, n, setId, direction])

  if (active === null || progress === null) return <NeedProfile />
  const open = openSets(progress, curriculum)
  // Unlocked sets, plus the first locked one to try ("probar lo siguiente").
  const nextLocked = SETS.find((s) => !open.has(s.id))
  const offered = SETS.filter((s) => open.has(s.id) || s.id === nextLocked?.id)

  const restart = () => {
    used.current.clear()
    setSession(randomId(freshRng()))
    setN(0)
    setStreak({ now: 0, best: 0, answered: 0 })
  }
  const patchPrefs = (patch: Partial<Prefs>) =>
    updateProgress((p) => ({ ...p, prefs: { ...p.prefs, ...patch } }))

  return (
    <div class="space-y-6">
      <header class="space-y-2">
        <h1 class="flex items-center gap-3 font-display text-3xl font-bold">
          <Ear size={28} aria-hidden="true" />
          Oído
        </h1>
        <p class="text-dojo-muted">
          Escucha, repite las veces que quieras y responde. No hay nota: solo racha.
        </p>
      </header>

      <div class="grid gap-4 md:grid-cols-2">
        <fieldset class="space-y-2">
          <legend class="font-semibold">Intervalos</legend>
          {offered.map((s) => (
            <label
              key={s.id}
              class={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control border-2 px-4 py-2 ${setId === s.id ? 'border-dojo-neon' : 'border-dojo-hairline'}`}
            >
              <input
                type="radio"
                name="ear-set"
                class="sr-only"
                checked={setId === s.id}
                onChange={() => {
                  setSetId(s.id)
                  restart()
                }}
              />
              <span class="flex-1">{s.label}</span>
              {!open.has(s.id) && <span class="text-sm text-dojo-gold">Probar lo siguiente</span>}
            </label>
          ))}
        </fieldset>
        <fieldset class="space-y-2">
          <legend class="font-semibold">Dirección</legend>
          <div class="flex flex-wrap gap-2">
            {DIRECTIONS.map((d) => (
              <label
                key={d.id}
                class={`flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 ${direction === d.id ? 'border-dojo-neon text-dojo-neon' : 'border-dojo-hairline'}`}
              >
                <input
                  type="radio"
                  name="ear-direction"
                  class="sr-only"
                  checked={direction === d.id}
                  onChange={() => {
                    setDirection(d.id)
                    restart()
                  }}
                />
                {d.label}
              </label>
            ))}
          </div>
          <ul class="space-y-1 pt-2 text-sm text-dojo-muted">
            {LATER.map((l) => (
              <li key={l.label} class="flex items-center gap-2">
                <Lock size={14} aria-hidden="true" />
                {l.label}: llega con el cinturón {l.belt}.
              </li>
            ))}
          </ul>
        </fieldset>
      </div>

      <p class="flex items-center gap-2 font-semibold text-dojo-gold" aria-live="polite">
        <Flame size={18} aria-hidden="true" />
        Racha: {streak.now} · mejor de la sesión: {streak.best} · respondidas: {streak.answered}
      </p>

      <QuestionCard
        key={question.id}
        question={question}
        mode="practice"
        prefs={progress.prefs}
        onPrefs={patchPrefs}
        onAnswer={(_, g) => {
          const now = new Date()
          setStreak((s) => {
            const run = g.correct ? s.now + 1 : 0
            return { now: run, best: Math.max(s.best, run), answered: s.answered + 1 }
          })
          updateProgress((p) => recordPractice(p, localDate(now), question.skill, g.correct, now))
        }}
        onNext={() => setN((x) => x + 1)}
      />
    </div>
  )
}
