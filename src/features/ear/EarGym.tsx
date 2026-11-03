import { Ear, Flame, Lock } from 'lucide-preact'
import { useMemo, useRef, useState } from 'preact/hooks'
import { freshRng, randomId } from '../../lib/random.ts'
import type { MixEntry, Module } from '../curriculum/schema.ts'
import QuestionCard from '../exercises/QuestionCard.tsx'
import { pickQuestion } from '../exercises/registry.ts'
import NeedProfile from '../profiles/NeedProfile.tsx'
import {
  isModulePassed,
  isModuleUnlocked,
  isTopicPassed,
  recordPractice,
} from '../progress/rules.ts'
import { localDate } from '../progress/streak.ts'
import type { Prefs, ProgressState } from '../progress/types.ts'
import { useProgress } from '../progress/use-progress.ts'

type Direction = 'up' | 'down' | 'harmonic'
type Kind = 'intervals' | 'chords' | 'modes' | 'dictation'

interface Exercise {
  id: string
  kind: Kind
  label: string
  entry: (direction: Direction) => MixEntry
  open: (p: ProgressState, curriculum: Module[]) => boolean
}

const topicPassed = (topicId: string) => (p: ProgressState, curriculum: Module[]) =>
  curriculum.some((m) => m.topics.some((t) => t.id === topicId && isTopicPassed(p, m, t)))
const moduleOpen = (moduleId: string) => (p: ProgressState, curriculum: Module[]) => {
  const m = curriculum.find((x) => x.id === moduleId)
  return m !== undefined && isModuleUnlocked(p, curriculum, m)
}
const modulePassed = (moduleId: string) => (p: ProgressState, curriculum: Module[]) => {
  const m = curriculum.find((x) => x.id === moduleId)
  return m !== undefined && isModulePassed(p, m)
}
const interval =
  (set: string[]) =>
  (direction: Direction): MixEntry => ({
    generator: 'ear-interval',
    params: { set, direction },
    weight: 1,
  })
const fixed = (generator: string, params: Record<string, unknown>) => (): MixEntry => ({
  generator,
  params,
  weight: 1,
})

// Each exercise opens with the topic or belt that teaches it (spec 01, ear track).
const EXERCISES: Exercise[] = [
  {
    id: 'basic',
    kind: 'intervals',
    label: 'Básicos: 2M, 3M, 4J, 5J, 8J',
    entry: interval(['2M', '3M', '4P', '5P', '8P']),
    open: () => true,
  },
  {
    id: 'thirds',
    kind: 'intervals',
    label: 'Mayores y menores: suma 2m, 3m, 6m, 6M',
    entry: interval(['2m', '2M', '3m', '3M', '4P', '5P', '6m', '6M', '8P']),
    open: topicPassed('M01-T03'),
  },
  {
    id: 'all',
    kind: 'intervals',
    label: 'Todos hasta la octava, con el tritono',
    entry: interval(['2m', '2M', '3m', '3M', '4P', '4A', '5P', '6m', '6M', '7m', '7M', '8P']),
    open: modulePassed('M01'),
  },
  {
    id: 'triads',
    kind: 'chords',
    label: 'Mayor o menor',
    entry: fixed('ear-chord', { qualities: ['major', 'minor'] }),
    open: moduleOpen('M03'),
  },
  {
    id: 'qualities',
    kind: 'chords',
    label: 'Las cuatro calidades',
    entry: fixed('ear-chord', { qualities: ['major', 'minor', 'diminished', 'augmented'] }),
    open: topicPassed('M03-T01'),
  },
  {
    id: 'inversions',
    kind: 'chords',
    label: 'Las cuatro calidades, con inversiones',
    entry: fixed('ear-chord', {
      qualities: ['major', 'minor', 'diminished', 'augmented'],
      inversions: true,
    }),
    open: topicPassed('M03-T02'),
  },
  {
    id: 'modes4',
    kind: 'modes',
    label: 'Jónico, dórico, mixolidio y eólico',
    entry: fixed('ear-scale', { modes: ['ionian', 'dorian', 'mixolydian', 'aeolian'] }),
    open: moduleOpen('M06'),
  },
  {
    id: 'modes7',
    kind: 'modes',
    label: 'Los siete modos',
    entry: fixed('ear-scale', {}),
    open: topicPassed('M06-T03'),
  },
  {
    id: 'dictation4',
    kind: 'dictation',
    label: '4 notas en mayor, por grados',
    entry: fixed('ear-melody', { length: 4, scale: 'major', maxLeap: 2 }),
    open: moduleOpen('M06'),
  },
  {
    id: 'dictation6',
    kind: 'dictation',
    label: '6 notas en menor, con saltos',
    entry: fixed('ear-melody', { length: 6, scale: 'minor', maxLeap: 3 }),
    open: modulePassed('M06'),
  },
]

const KINDS: { id: Kind; label: string; belt: string }[] = [
  { id: 'intervals', label: 'Intervalos', belt: 'blanco' },
  { id: 'chords', label: 'Acordes', belt: 'naranja (M03)' },
  { id: 'modes', label: 'Escalas y modos', belt: 'morado (M06)' },
  { id: 'dictation', label: 'Dictado melódico', belt: 'morado (M06)' },
]

const DIRECTIONS: { id: Direction; label: string }[] = [
  { id: 'up', label: 'Ascendentes' },
  { id: 'down', label: 'Descendentes' },
  { id: 'harmonic', label: 'Armónicos' },
]

export default function EarGym({ curriculum }: { curriculum: Module[] }) {
  const { active, progress, updateProgress } = useProgress()
  const [exerciseId, setExerciseId] = useState('basic')
  const [direction, setDirection] = useState<Direction>('up')
  const [session, setSession] = useState(() => randomId(freshRng()))
  const [n, setN] = useState(0)
  const [streak, setStreak] = useState({ now: 0, best: 0, answered: 0 })
  const used = useRef(new Set<string>())
  const chosen = EXERCISES.find((e) => e.id === exerciseId) ?? EXERCISES[0]
  const question = useMemo(() => {
    const mix = chosen ? [chosen.entry(direction)] : []
    try {
      return pickQuestion(mix, `ear:${session}`, n, used.current)
    } catch {
      used.current.clear()
      return pickQuestion(mix, `ear:${session}`, n, used.current)
    }
  }, [session, n, exerciseId, direction])

  if (active === null || progress === null) return <NeedProfile />

  const restart = () => {
    used.current.clear()
    setSession(randomId(freshRng()))
    setN(0)
    setStreak({ now: 0, best: 0, answered: 0 })
  }
  const choose = (id: string) => {
    setExerciseId(id)
    restart()
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
        {KINDS.map((kind) => {
          const all = EXERCISES.filter((e) => e.kind === kind.id)
          const open = all.filter((e) => e.open(progress, curriculum))
          // Unlocked ones plus the first locked one, to try ("probar lo siguiente").
          const next = all.find((e) => !open.includes(e))
          const offered = open.length === 0 ? [] : all.filter((e) => open.includes(e) || e === next)
          return (
            <fieldset key={kind.id} class="space-y-2">
              <legend class="font-semibold">{kind.label}</legend>
              {offered.length === 0 && (
                <p class="flex items-center gap-2 text-sm text-dojo-muted">
                  <Lock size={14} aria-hidden="true" />
                  Llega con el cinturón {kind.belt}.
                </p>
              )}
              {offered.map((e) => (
                <label
                  key={e.id}
                  class={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control border-2 px-4 py-2 ${exerciseId === e.id ? 'border-dojo-neon' : 'border-dojo-hairline'}`}
                >
                  <input
                    type="radio"
                    name="ear-exercise"
                    class="sr-only"
                    checked={exerciseId === e.id}
                    onChange={() => choose(e.id)}
                  />
                  <span class="flex-1">{e.label}</span>
                  {!open.includes(e) && (
                    <span class="text-sm text-dojo-gold">Probar lo siguiente</span>
                  )}
                </label>
              ))}
            </fieldset>
          )
        })}
      </div>

      {chosen?.kind === 'intervals' && (
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
        </fieldset>
      )}

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
          setStreak((st) => {
            const run = g.correct ? st.now + 1 : 0
            return { now: run, best: Math.max(st.best, run), answered: st.answered + 1 }
          })
          updateProgress((p) => recordPractice(p, localDate(now), question.skill, g.correct, now))
        }}
        onNext={() => setN((x) => x + 1)}
      />
    </div>
  )
}
