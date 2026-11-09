import { Guitar, Mic, Timer } from 'lucide-preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { Note } from 'tonal'
import Fretboard from '../../components/music/Fretboard.tsx'
import type { KeyState } from '../../components/music/instrument.tsx'
import NoteName from '../../components/music/NoteName.tsx'
import { buttonClass } from '../../components/ui/button.ts'
import Callout from '../../components/ui/Callout.tsx'
import Tabs from '../../components/ui/Tabs.tsx'
import { createRng, freshRng, randomId } from '../../lib/random.ts'
import NeedProfile from '../profiles/NeedProfile.tsx'
import { DEFAULT_GUITAR } from '../progress/persist.ts'
import type { GuitarState, Prefs } from '../progress/types.ts'
import { useProgress } from '../progress/use-progress.ts'
import { CHORD_TYPE_ES } from '../theory/es.ts'
import { formatInterval } from '../theory/intervals.ts'
import {
  arpeggioSegments,
  buildNoteRound,
  type Direction,
  expectedPitches,
  type FretZone,
  INTERVALS,
  intervalSegments,
  type NotePool,
  noteSegments,
  POOLS,
  positionsOf,
  type Segment,
  scaleSegment,
  stringSequence,
} from './drills.ts'
import { startMetronome } from './metronome.ts'
import type { NoteEvent } from './onset.ts'
import { majorPosition, POSITIONS, type System, type Walk, walk } from './scales.ts'
import TempoDrill, { type DrillResult } from './TempoDrill.tsx'
import { useGuitar } from './use-guitar.ts'

type Tab = 'setup' | 'notes' | 'scale' | 'intervals' | 'arpeggios' | 'find'

const field = 'min-h-11 rounded-control border-2 border-dojo-border bg-dojo-ink px-3 text-base'

function Select<T extends string>(p: {
  label: string
  value: T
  options: [T, string][]
  onChange: (v: T) => void
}) {
  return (
    <label class="block space-y-1 text-sm">
      <span class="text-dojo-muted">{p.label}</span>
      <select
        class={`${field} w-full`}
        value={p.value}
        onChange={(e) => p.onChange(e.currentTarget.value as T)}
      >
        {p.options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}

function NumberField(p: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <label class="block space-y-1 text-sm">
      <span class="text-dojo-muted">{p.label}</span>
      <input
        type="number"
        inputmode="numeric"
        class={`${field} w-full`}
        min={p.min}
        max={p.max}
        step={p.step ?? 1}
        value={p.value}
        onChange={(e) => {
          const v = Number(e.currentTarget.value)
          if (Number.isFinite(v)) p.onChange(Math.min(p.max, Math.max(p.min, v)))
        }}
      />
    </label>
  )
}

interface Run {
  key: string // drill key for the best BPM
  segments: Segment[]
  bpm: number
  noTempo: boolean
  subdivision: number
  helped: boolean
  kind: Tab
  guide: boolean
}

export default function GuitarGym() {
  const { active, progress, updateProgress } = useProgress()
  const guitar: GuitarState = progress?.guitar ?? { ...DEFAULT_GUITAR, best: {} }
  const listener = useRef<(e: NoteEvent) => void>(() => {})
  const stopCalibration = useRef(() => {})
  const { status, live, open, close } = useGuitar(guitar.deviceId, guitar.minRms, (e) =>
    listener.current(e),
  )
  const [tab, setTab] = useState<Tab>('setup')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [run, setRun] = useState<Run | null>(null)
  const [result, setResult] = useState<(DrillResult & { run: Run }) | null>(null)
  const [calibrating, setCalibrating] = useState<string | null>(null)
  // Guide: no microphone, the metronome leads and the fretboard shows each step on its beat.
  const [guide, setGuide] = useState(true)
  const [restarts, setRestarts] = useState(0)
  const guideContext = useRef<AudioContext | null>(null)

  // Exercise settings.
  const [pool, setPool] = useState<NotePool>('naturals')
  const [low, setLow] = useState(5)
  const [high, setHigh] = useState(1)
  const [direction, setDirection] = useState<Direction>('up')
  const [zone, setZone] = useState<FretZone>('0-12')
  const [bpm, setBpm] = useState(60)
  const [count, setCount] = useState(5)
  const [windowMs, setWindowMs] = useState(120)
  const [help, setHelp] = useState(false)
  const [tonic, setTonic] = useState('G')
  const [system, setSystem] = useState<System>('3nps')
  const [position, setPosition] = useState(0)
  const [walkKind, setWalkKind] = useState<Walk>('up-down')
  const [eighths, setEighths] = useState(false)
  const [noTempo, setNoTempo] = useState(false)
  const [intervalSet, setIntervalSet] = useState<'basic' | 'all'>('basic')
  const [arpQualities, setArpQualities] = useState<'mm' | 'all'>('mm')

  if (active === null || progress === null) return <NeedProfile />
  const prefs = progress.prefs
  const saveGuitar = (patch: Partial<GuitarState>) =>
    updateProgress((p) => ({
      ...p,
      guitar: { ...(p.guitar ?? { ...DEFAULT_GUITAR, best: {} }), ...patch },
    }))

  async function activate(id?: string) {
    await open(id)
    try {
      const { listGuitarInputs } = await import('./mic.ts')
      setDevices(await listGuitarInputs())
    } catch {
      setDevices([])
    }
  }

  // 8 clicks at 60 BPM; each note played is matched to its nearest click.
  function calibrate() {
    if (status.state !== 'on') return
    const { context } = status.input
    stopCalibration.current()
    const metronome = startMetronome(context, { bpm: 60 })
    const offsets: number[] = []
    setCalibrating('Toca una nota en cada clic (8).')
    const handler = (e: NoteEvent) => {
      const n = Math.round((e.time / 1000 - metronome.beatTime(0)) / 1)
      if (n < 0 || n > 7) return
      const offset = e.time - metronome.beatTime(n) * 1000
      if (Math.abs(offset) < 300) offsets.push(offset)
    }
    listener.current = handler
    const release = () => {
      clearTimeout(timer)
      metronome.stop()
      if (listener.current === handler) listener.current = () => {}
      stopCalibration.current = () => {}
    }
    stopCalibration.current = () => {
      release()
      setCalibrating(null)
    }
    const timer = setTimeout(() => {
      release()
      if (offsets.length < 4) {
        setCalibrating('No se oyeron suficientes notas. Sube el nivel o baja el umbral y repite.')
        return
      }
      const sorted = [...offsets].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0
      const latencyMs = Math.max(0, Math.min(500, Math.round(median)))
      saveGuitar({ latencyMs })
      setCalibrating(`Latencia medida: ${latencyMs} ms (con ${offsets.length} notas).`)
    }, 9_000)
  }

  function startRun(r: Run) {
    if (r.guide) {
      guideContext.current ??= new AudioContext()
      void guideContext.current.resume()
    }
    stopCalibration.current()
    setResult(null)
    setRun(r)
  }

  function finish(r: Run, res: DrillResult) {
    setRun(null)
    setResult({ ...res, run: r })
    if (r.noTempo || r.guide) return
    updateProgress((p) => {
      const g = p.guitar ?? { ...DEFAULT_GUITAR, best: {} }
      const prev = g.best[r.key]
      if (prev && prev.bpm >= r.bpm) return p
      return {
        ...p,
        guitar: {
          ...g,
          best: {
            ...g.best,
            [r.key]: { bpm: r.bpm, at: new Date().toISOString(), helped: r.helped },
          },
        },
      }
    })
  }

  const noteTitle = (pc: string) => <NoteName note={pc} notation={prefs.notation} />

  const titleOf = (kind: Tab) => (segment: Segment) => {
    if (kind === 'notes') return noteTitle(segment.title)
    if (kind === 'intervals') {
      const [root, name] = segment.title.split('|')
      return (
        <span>
          {noteTitle(root ?? '')}{' '}
          <span class="text-2xl">+ {formatInterval(name ?? '', 'short')}</span>
        </span>
      )
    }
    if (kind === 'arpeggios') {
      const [root, quality] = segment.title.split('|')
      return (
        <span>
          {noteTitle(root ?? '')}{' '}
          <span class="text-2xl">{CHORD_TYPE_ES[quality ?? ''] ?? quality}</span>
        </span>
      )
    }
    return segment.title
  }

  const ready = guide || status.state === 'on'
  const drillContext = run?.guide
    ? guideContext.current
    : status.state === 'on'
      ? status.input.context
      : null
  const startButton = (label: string, make: () => Omit<Run, 'guide'>) => (
    <button
      type="button"
      class={buttonClass('primary')}
      disabled={!ready}
      onClick={() => startRun({ ...make(), guide })}
    >
      <Timer size={18} aria-hidden="true" />
      {label}
    </button>
  )
  const tempoFields = (
    <>
      <NumberField label="BPM" value={bpm} min={40} max={160} onChange={setBpm} />
      {!guide && (
        <NumberField
          label="Ventana de tiempo (ms)"
          value={windowMs}
          min={60}
          max={200}
          step={10}
          onChange={setWindowMs}
        />
      )}
    </>
  )
  const best = (key: string) => {
    const b = guitar.best[key]
    return b ? (
      <p class="text-sm text-dojo-muted">
        Tu mejor marca: {b.bpm} BPM{b.helped ? ' (con ayuda visual)' : ''}.
      </p>
    ) : null
  }

  const notesKey = `notes:${low}-${high}:${direction}:${zone}:${pool}`
  const scaleKey = `scale:${system}:${position + 1}:${walkKind}:${tonic}${eighths ? ':8' : ''}`

  return (
    <div class="space-y-6">
      <header class="space-y-2">
        <h1 class="flex items-center gap-3 font-display text-3xl font-bold">
          <Guitar size={28} aria-hidden="true" />
          Diapasón
        </h1>
        <p class="text-dojo-muted">
          Practica con metrónomo. En modo guía la app marca cada paso al pulso y tú tocas; si
          quieres que te corrija, actívala para escuchar la guitarra.
        </p>
      </header>

      {run && drillContext ? (
        <TempoDrill
          key={`${run.key}:${restarts}`}
          context={drillContext}
          guide={run.guide}
          segments={run.segments}
          bpm={run.bpm}
          windowMs={windowMs}
          latencyMs={guitar.latencyMs}
          subdivision={run.subdivision}
          noTempo={run.noTempo}
          help={run.helped}
          lefty={prefs.lefty}
          notation={prefs.notation}
          title={titleOf(run.kind)}
          listen={(h) => {
            listener.current = h
          }}
          onDone={(res) => finish(run, res)}
          onRestart={() => setRestarts((n) => n + 1)}
          onStop={() => {
            listener.current = () => {}
            setRun(null)
          }}
        />
      ) : (
        <Tabs<Tab>
          label="Ejercicios"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'setup', label: 'Preparar' },
            { id: 'notes', label: 'Notas en cuerdas' },
            { id: 'scale', label: 'Escala mayor' },
            { id: 'intervals', label: 'Intervalos' },
            { id: 'arpeggios', label: 'Arpegios' },
            { id: 'find', label: 'Encuentra la nota' },
          ]}
        >
          {result && (
            <div
              class="mb-5 space-y-3 rounded-card border-2 border-dojo-success bg-dojo-success-bg p-5"
              role="status"
            >
              <p class="font-display text-2xl font-bold">
                {result.run.noTempo
                  ? '¡Forma completa!'
                  : result.run.guide
                    ? `Ronda guiada completa a ${result.run.bpm} BPM`
                    : `¡Ronda limpia a ${result.run.bpm} BPM!`}
              </p>
              {result.run.guide ? (
                <button
                  type="button"
                  class={buttonClass('primary')}
                  onClick={() => startRun(result.run)}
                >
                  Otra vez
                </button>
              ) : (
                <p>
                  {result.run.segments.length} {result.run.kind === 'scale' ? 'recorrido' : 'notas'}{' '}
                  · te costó {result.attempts === 1 ? '1 intento' : `${result.attempts} intentos`}
                  {result.run.helped ? ' · con ayuda visual' : ''}.
                </p>
              )}
              {!result.run.noTempo && (
                <button
                  type="button"
                  class={buttonClass('primary')}
                  onClick={() => {
                    setBpm(Math.min(160, result.run.bpm + 8))
                    startRun({ ...result.run, bpm: Math.min(160, result.run.bpm + 8) })
                  }}
                >
                  Subir a {Math.min(160, result.run.bpm + 8)} BPM
                </button>
              )}
            </div>
          )}

          {tab === 'setup' && (
            <div class="space-y-5">
              <fieldset class="space-y-2">
                <legend class="text-sm text-dojo-muted">Cómo practicar</legend>
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    name="guitar-mode"
                    class="size-5 accent-dojo-neon"
                    checked={guide}
                    onChange={() => setGuide(true)}
                  />
                  Guía con metrónomo (sin conectar la guitarra)
                </label>
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    name="guitar-mode"
                    class="size-5 accent-dojo-neon"
                    checked={!guide}
                    onChange={() => setGuide(false)}
                  />
                  Escuchar la guitarra y corregirme
                </label>
              </fieldset>
              <MetronomePanel defaultBpm={bpm} />
              {guide ? (
                <p class="text-dojo-muted">
                  Elige un ejercicio arriba. Tras 4 clics de cuenta, cada paso se ilumina en su
                  pulso: tócalo tú. Para cuando quieras y empieza de nuevo.
                </p>
              ) : (
                <>
                  <Callout tone="warning" title="Lo que la app puede oír">
                    La app oye la nota y la octava, no la cuerda: la cuerda la pones tú. Toca una
                    nota a la vez (sin acordes). La interfaz y el navegador suman algo de retraso:
                    calíbralo abajo.
                  </Callout>
                  {status.state === 'denied' && (
                    <p role="alert" class="text-dojo-danger">
                      {status.reason}
                    </p>
                  )}
                  {status.state !== 'on' ? (
                    <button
                      type="button"
                      class={buttonClass('primary')}
                      disabled={status.state === 'opening'}
                      onClick={() => void activate()}
                    >
                      <Mic size={18} aria-hidden="true" />
                      {status.state === 'opening' ? 'Abriendo…' : 'Activar la guitarra'}
                    </button>
                  ) : (
                    <div class="space-y-5">
                      {devices.length > 1 && (
                        <Select
                          label="Entrada de audio"
                          value={guitar.deviceId ?? ''}
                          options={devices.map((d, i) => [
                            d.deviceId,
                            d.label || `Entrada ${i + 1}`,
                          ])}
                          onChange={(id) => {
                            saveGuitar({ deviceId: id })
                            close()
                            setTimeout(() => void activate(id), 50)
                          }}
                        />
                      )}
                      <div class="space-y-2">
                        <p class="text-sm text-dojo-muted">
                          Nivel de entrada y umbral (lo de abajo del umbral es silencio)
                        </p>
                        <div class="relative h-4 overflow-hidden rounded-full bg-dojo-raised">
                          <div
                            class="h-full bg-dojo-neon"
                            style={{ width: `${Math.min(100, (live.level / 0.3) * 100)}%` }}
                          />
                          <div
                            class="absolute top-0 h-full w-0.5 bg-dojo-torii"
                            style={{ left: `${Math.min(100, (guitar.minRms / 0.3) * 100)}%` }}
                          />
                        </div>
                        <label class="block space-y-1 text-sm">
                          <span class="text-dojo-muted">Umbral</span>
                          <input
                            type="range"
                            min={0.002}
                            max={0.1}
                            step={0.002}
                            value={guitar.minRms}
                            class="w-full accent-dojo-neon"
                            onChange={(e) => saveGuitar({ minRms: Number(e.currentTarget.value) })}
                          />
                        </label>
                      </div>
                      <div class="flex items-baseline gap-4" aria-live="polite">
                        <span class="text-sm text-dojo-muted">Afinador</span>
                        <span class="font-display text-4xl font-bold">
                          {live.midi === null ? (
                            '—'
                          ) : (
                            <NoteName
                              note={Note.fromMidiSharps(live.midi)}
                              notation={prefs.notation}
                            />
                          )}
                        </span>
                        {live.midi !== null && (
                          <span
                            class={
                              Math.abs(live.cents) <= 5 ? 'text-dojo-success' : 'text-dojo-warning'
                            }
                          >
                            {live.cents > 0 ? '+' : ''}
                            {live.cents} cents
                          </span>
                        )}
                      </div>
                      <div class="space-y-2">
                        <p class="text-sm text-dojo-muted">Latencia: {guitar.latencyMs} ms</p>
                        <div class="flex flex-wrap items-end gap-3">
                          <button
                            type="button"
                            class={buttonClass('secondary')}
                            onClick={calibrate}
                          >
                            Calibrar con 8 clics
                          </button>
                          <NumberField
                            label="Ajuste manual (ms)"
                            value={guitar.latencyMs}
                            min={0}
                            max={500}
                            step={5}
                            onChange={(v) => saveGuitar({ latencyMs: v })}
                          />
                        </div>
                        {calibrating && <p class="text-sm">{calibrating}</p>}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab !== 'setup' && !ready && (
            <p class="mb-4 text-dojo-muted">Primero activa la guitarra en «Preparar».</p>
          )}

          {tab === 'notes' && (
            <div class="space-y-4">
              <p>
                Sale una nota: tócala en cada cuerda, una por tiempo. Un error reinicia la ronda.
              </p>
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select<NotePool>
                  label="Notas"
                  value={pool}
                  options={[
                    ['naturals', 'Naturales'],
                    ['sharps', 'Con sostenidos'],
                    ['flats', 'Con bemoles'],
                    ['all', 'Todas'],
                  ]}
                  onChange={setPool}
                />
                <Select
                  label="Cuerdas"
                  value={`${low}-${high}`}
                  options={[
                    ['5-1', '5 → 1'],
                    ['6-1', '6 → 1'],
                    ['5-3', '5 → 3'],
                    ['3-1', '3 → 1'],
                    ['6-4', '6 → 4'],
                  ]}
                  onChange={(v) => {
                    const [a, b] = v.split('-').map(Number)
                    setLow(a ?? 5)
                    setHigh(b ?? 1)
                  }}
                />
                <Select<Direction>
                  label="Dirección"
                  value={direction}
                  options={[
                    ['up', 'Grave → agudo'],
                    ['down', 'Agudo → grave'],
                    ['both', 'Ida y vuelta'],
                  ]}
                  onChange={setDirection}
                />
                <Select<FretZone>
                  label="Zona de trastes"
                  value={zone}
                  options={[
                    ['0-5', '0–5'],
                    ['5-9', '5–9'],
                    ['7-12', '7–12'],
                    ['0-12', '0–12'],
                  ]}
                  onChange={setZone}
                />
                {tempoFields}
                <NumberField
                  label="Notas por ronda"
                  value={count}
                  min={3}
                  max={12}
                  onChange={setCount}
                />
              </div>
              <label class="flex items-center gap-2">
                <input
                  type="checkbox"
                  class="size-5 accent-dojo-neon"
                  checked={help}
                  onChange={(e) => setHelp(e.currentTarget.checked)}
                />
                Mostrar posiciones en el diapasón
              </label>
              {best(notesKey)}
              {startButton('Empezar', () => ({
                key: notesKey,
                kind: 'notes',
                bpm,
                noTempo: false,
                subdivision: 1,
                helped: help,
                segments: noteSegments(
                  buildNoteRound(freshRng(), { pool, count: Math.min(count, POOLS[pool].length) }),
                  stringSequence(low, high, direction),
                  zone,
                ),
              }))}
            </div>
          )}

          {tab === 'scale' && (
            <div class="space-y-4">
              <p>
                Aprende la escala mayor por posiciones: primero con el diagrama, luego sin él,
                después la siguiente posición y otra tonalidad.
              </p>
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select
                  label="Tónica"
                  value={tonic}
                  options={['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb'].map((t) => [
                    t,
                    t.replace('b', '♭'),
                  ])}
                  onChange={setTonic}
                />
                <Select<System>
                  label="Sistema"
                  value={system}
                  options={[
                    ['3nps', '3 notas por cuerda'],
                    ['caged', 'CAGED'],
                  ]}
                  onChange={(v) => {
                    setSystem(v)
                    setPosition(0)
                  }}
                />
                <Select
                  label="Posición"
                  value={String(position)}
                  options={Array.from({ length: POSITIONS[system] }, (_, i) => [
                    String(i),
                    `${i + 1}`,
                  ])}
                  onChange={(v) => setPosition(Number(v))}
                />
                <Select<Walk>
                  label="Recorrido"
                  value={walkKind}
                  options={[
                    ['up', 'Subir'],
                    ['down', 'Bajar'],
                    ['up-down', 'Subir y bajar'],
                    ['thirds', 'Terceras'],
                    ['groups-3', 'Grupos de 3'],
                    ['groups-4', 'Grupos de 4'],
                  ]}
                  onChange={setWalkKind}
                />
                {tempoFields}
              </div>
              <div class="flex flex-wrap gap-4">
                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    class="size-5 accent-dojo-neon"
                    checked={help}
                    onChange={(e) => setHelp(e.currentTarget.checked)}
                  />
                  Diagrama visible
                </label>
                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    class="size-5 accent-dojo-neon"
                    checked={eighths}
                    onChange={(e) => setEighths(e.currentTarget.checked)}
                  />
                  Corcheas (dos notas por tiempo)
                </label>
                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    class="size-5 accent-dojo-neon"
                    checked={noTempo}
                    onChange={(e) => setNoTempo(e.currentTarget.checked)}
                  />
                  Practicar sin tempo
                </label>
              </div>
              <Fretboard
                mode="display"
                notation={prefs.notation}
                lefty={prefs.lefty}
                labels="name"
                label={`Escala de ${tonic} mayor, posición ${position + 1}`}
                states={
                  new Map(
                    majorPosition(tonic, system, position).map((n) => [
                      `${n.string}:${n.fret}`,
                      (n.tonic ? 'active' : 'selected') as KeyState,
                    ]),
                  )
                }
              />
              {best(scaleKey)}
              {startButton('Empezar', () => ({
                key: scaleKey,
                kind: 'scale',
                bpm,
                noTempo,
                subdivision: eighths ? 2 : 1,
                helped: help,
                segments: [
                  scaleSegment(
                    `${tonic.replace('b', '♭')} mayor · posición ${position + 1}`,
                    walk(majorPosition(tonic, system, position), walkKind),
                  ),
                ],
              }))}
            </div>
          )}

          {tab === 'intervals' && (
            <div class="space-y-4">
              <p>
                Cada intervalo son dos tiempos: toca la nota de partida donde te dicen y luego la
                nota a ese intervalo, en cualquier cuerda.
              </p>
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select
                  label="Intervalos"
                  value={intervalSet}
                  options={[
                    ['basic', '3m, 3M, 4J, 5J, 8J'],
                    ['all', 'Todos hasta la octava'],
                  ]}
                  onChange={(v) => setIntervalSet(v as 'basic' | 'all')}
                />
                <Select<FretZone>
                  label="Zona de la nota de partida"
                  value={zone}
                  options={[
                    ['0-5', '0–5'],
                    ['5-9', '5–9'],
                    ['0-12', '0–12'],
                  ]}
                  onChange={setZone}
                />
                {tempoFields}
                <NumberField
                  label="Intervalos por ronda"
                  value={count}
                  min={3}
                  max={12}
                  onChange={setCount}
                />
              </div>
              <label class="flex items-center gap-2">
                <input
                  type="checkbox"
                  class="size-5 accent-dojo-neon"
                  checked={help}
                  onChange={(e) => setHelp(e.currentTarget.checked)}
                />
                Mostrar posiciones en el diapasón
              </label>
              {best(`intervals:${intervalSet}:${zone}`)}
              {startButton('Empezar', () => ({
                key: `intervals:${intervalSet}:${zone}`,
                kind: 'intervals',
                bpm,
                noTempo: false,
                subdivision: 1,
                helped: help,
                segments: intervalSegments(freshRng(), {
                  count,
                  zone,
                  intervals: intervalSet === 'basic' ? ['3m', '3M', '4P', '5P', '8P'] : INTERVALS,
                }),
              }))}
            </div>
          )}

          {tab === 'arpeggios' && (
            <div class="space-y-4">
              <p>
                Arpegia cada acorde subiendo: fundamental, tercera, quinta y la fundamental una
                octava arriba, en las cuerdas que quieras, cada nota más aguda que la anterior.
              </p>
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select
                  label="Acordes"
                  value={arpQualities}
                  options={[
                    ['mm', 'Mayores y menores'],
                    ['all', 'Las cuatro calidades'],
                  ]}
                  onChange={(v) => setArpQualities(v as 'mm' | 'all')}
                />
                {tempoFields}
                <NumberField
                  label="Acordes por ronda"
                  value={count}
                  min={3}
                  max={12}
                  onChange={setCount}
                />
              </div>
              {best(`arp:${arpQualities}`)}
              {startButton('Empezar', () => ({
                key: `arp:${arpQualities}`,
                kind: 'arpeggios',
                bpm,
                noTempo: false,
                subdivision: 1,
                helped: false,
                segments: arpeggioSegments(freshRng(), {
                  count,
                  qualities:
                    arpQualities === 'mm'
                      ? ['major', 'minor']
                      : ['major', 'minor', 'diminished', 'augmented'],
                }),
              }))}
            </div>
          )}

          {tab === 'find' && (
            <FindNote
              ready={ready}
              guide={guide}
              pool={pool}
              setPool={setPool}
              prefs={prefs}
              listen={(h) => {
                listener.current = h
              }}
            />
          )}
        </Tabs>
      )}
    </div>
  )
}

// Without a metronome: a string and a note, as fast as you can find it. A miss shows where it was.
function FindNote(props: {
  ready: boolean
  guide: boolean
  pool: NotePool
  setPool: (p: NotePool) => void
  prefs: Prefs
  listen: (h: (e: NoteEvent) => void) => void
}) {
  const ROUND = 10
  const [list, setList] = useState<{ string: number; pc: string }[] | null>(null)
  const [i, setI] = useState(0)
  const [times, setTimes] = useState<number[]>([])
  const [misses, setMisses] = useState(0)
  const [reveal, setReveal] = useState<string[]>([])
  const startedAt = useRef(0)

  const targets = (s: string) => {
    const rng = createRng(s)
    return Array.from({ length: ROUND }, () => ({
      string: rng.int(1, 6),
      pc: rng.pick(POOLS[props.pool]),
    }))
  }
  const current = list?.[i]

  function begin() {
    const all = targets(randomId(freshRng()))
    setList(all)
    setI(0)
    setTimes([])
    setMisses(0)
    setReveal([])
    startedAt.current = performance.now()
    if (props.guide) return
    let index = 0
    props.listen((e) => {
      const target = all[index]
      if (!target) return
      if (expectedPitches(target.pc, target.string, '0-12').includes(e.midi)) {
        setTimes((t) => [...t, performance.now() - startedAt.current])
        setReveal([])
        index++
        setI(index)
        startedAt.current = performance.now()
      } else {
        setMisses((m) => m + 1)
        setReveal(positionsOf(target.pc, target.string, '0-12'))
      }
    })
  }

  const finished = list !== null && i >= ROUND
  const average = times.length ? times.reduce((a, b) => a + b, 0) / times.length / 1000 : 0

  return (
    <div class="space-y-4">
      <p>
        Sin metrónomo: aparece una cuerda y una nota; tócala lo más rápido que puedas (trastes
        0–12).
      </p>
      <div class="max-w-xs">
        <Select<NotePool>
          label="Notas"
          value={props.pool}
          options={[
            ['naturals', 'Naturales'],
            ['sharps', 'Con sostenidos'],
            ['flats', 'Con bemoles'],
            ['all', 'Todas'],
          ]}
          onChange={props.setPool}
        />
      </div>
      {current && !finished && (
        <div class="space-y-2 rounded-card bg-dojo-surface p-5" aria-live="polite">
          <p class="text-sm text-dojo-muted">
            {i + 1} de {ROUND}
          </p>
          <p class="font-display text-4xl font-extrabold">
            Cuerda {current.string}: <NoteName note={current.pc} notation={props.prefs.notation} />
          </p>
          {reveal.length > 0 && !props.guide && (
            <p class="text-dojo-danger">No es esa. En rojo, dónde está.</p>
          )}
          {props.guide && (
            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                class={buttonClass('primary')}
                onClick={() => {
                  setTimes((t) => [...t, performance.now() - startedAt.current])
                  setReveal([])
                  setI((x) => x + 1)
                  startedAt.current = performance.now()
                }}
              >
                La toqué
              </button>
              <button
                type="button"
                class={buttonClass('secondary')}
                onClick={() => {
                  setMisses((m) => m + 1)
                  setReveal(positionsOf(current.pc, current.string, '0-12'))
                }}
              >
                Mostrar dónde está
              </button>
            </div>
          )}
        </div>
      )}
      {finished && (
        <div class="rounded-card border-2 border-dojo-success bg-dojo-success-bg p-5" role="status">
          <p class="font-display text-2xl font-bold">
            {ROUND} notas en {average.toFixed(1)} s de promedio
          </p>
          <p>
            {misses === 0
              ? 'Sin errores.'
              : `${misses} ${misses === 1 ? 'error' : 'errores'} en el camino.`}
          </p>
        </div>
      )}
      <Fretboard
        mode="display"
        notation={props.prefs.notation}
        lefty={props.prefs.lefty}
        states={new Map(reveal.map((at) => [at, 'wrong' as KeyState]))}
        label="Diapasón"
      />
      <button type="button" class={buttonClass('primary')} disabled={!props.ready} onClick={begin}>
        <Timer size={18} aria-hidden="true" />
        {list === null || finished ? 'Empezar' : 'Reiniciar'}
      </button>
    </div>
  )
}

// A plain metronome to play along with, apart from the drills.
function MetronomePanel({ defaultBpm }: { defaultBpm: number }) {
  const [bpm, setBpm] = useState(defaultBpm)
  const [beatsPerBar, setBeatsPerBar] = useState(4)
  const [on, setOn] = useState(false)
  const context = useRef<AudioContext | null>(null)
  const stop = useRef(() => {})

  function toggle() {
    stop.current()
    stop.current = () => {}
    if (on) {
      setOn(false)
      return
    }
    context.current ??= new AudioContext()
    void context.current.resume()
    const metronome = startMetronome(context.current, { bpm, beatsPerBar })
    stop.current = metronome.stop
    setOn(true)
  }

  useEffect(() => () => stop.current(), [])

  return (
    <div class="space-y-3 rounded-card bg-dojo-raised p-4">
      <p class="font-display text-lg font-bold">Metrónomo</p>
      <div class="grid max-w-md gap-3 sm:grid-cols-2">
        <NumberField label="BPM" value={bpm} min={30} max={240} onChange={setBpm} />
        <Select
          label="Pulsos por compás"
          value={String(beatsPerBar)}
          options={[
            ['2', '2'],
            ['3', '3'],
            ['4', '4'],
            ['6', '6'],
          ]}
          onChange={(v) => setBeatsPerBar(Number(v))}
        />
      </div>
      <button type="button" class={buttonClass(on ? 'secondary' : 'primary')} onClick={toggle}>
        {on ? 'Parar' : 'Empezar'}
      </button>
      {on && (
        <p class="text-sm text-dojo-muted">Cambia el BPM y pulsa Parar y Empezar para aplicarlo.</p>
      )}
    </div>
  )
}
