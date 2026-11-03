import { Square } from 'lucide-preact'
import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import Fretboard from '../../components/music/Fretboard.tsx'
import type { KeyState } from '../../components/music/instrument.tsx'
import { buttonClass } from '../../components/ui/button.ts'
import type { Notation } from '../theory/es.ts'
import { advance, type RoundPlan, type RoundState, type Segment, startRound } from './drills.ts'
import { type Metronome, startMetronome } from './metronome.ts'
import type { NoteEvent } from './onset.ts'
import { judge } from './timing.ts'

export interface DrillResult {
  attempts: number
}

interface Props {
  context: AudioContext
  segments: Segment[]
  bpm: number
  windowMs: number
  latencyMs: number
  subdivision?: number // 2 = eighth notes
  noTempo?: boolean // learn the shape first: only the order of the notes counts
  help: boolean // show where the current step is on the fretboard
  lefty: boolean
  notation: Notation
  title: (segment: Segment) => ComponentChildren
  listen: (handler: (e: NoteEvent) => void) => void
  onDone: (result: DrillResult) => void
  onStop: () => void
}

// The onset tracker confirms a note `holdMs` (40) after its attack, plus up to a frame.
const CONFIRM_MS = 80

type Miss = { segment: number; step: number; why: string }

// One beat per step after a one-bar count-in; any miss restarts the round (spec 08).
export default function TempoDrill(props: Props) {
  const { context, segments, bpm, windowMs, latencyMs, noTempo = false, subdivision = 1 } = props
  const plan: RoundPlan = {
    segments: segments.map((s) => s.steps.length),
    countIn: noTempo ? 0 : 4 * subdivision,
  }
  const [state, setState] = useState<RoundState>(() => startRound(plan))
  const [beat, setBeat] = useState(0)
  const [miss, setMiss] = useState<Miss | null>(null)
  const stateRef = useRef(state)
  const finished = useRef(false)

  const apply = (input: 'tick' | 'ok' | 'miss') => {
    const next = advance(stateRef.current, plan, input)
    stateRef.current = next
    setState(next)
    if (next.phase.kind === 'done' && !finished.current) {
      finished.current = true
      props.onDone({ attempts: next.attempts })
    }
    return next
  }

  const stepOf = (s: RoundState) =>
    s.phase.kind === 'play' ? segments[s.phase.segment]?.steps[s.phase.step] : undefined

  // Without tempo: every note played is judged right away.
  useEffect(() => {
    if (!noTempo) return
    let previous: number | null = null
    props.listen((e) => {
      const current = stateRef.current
      if (current.phase.kind !== 'play') return
      const step = stepOf(current)
      if (current.phase.step === 0) previous = null
      if (step?.accepts(e.midi, previous)) {
        previous = e.midi
        apply('ok')
        return
      }
      setMiss({
        segment: current.phase.segment,
        step: current.phase.step,
        why: 'Esa no era la nota.',
      })
      apply('miss')
      setTimeout(() => {
        setMiss(null)
        apply('tick')
      }, 1500)
    })
  }, [])

  // With tempo: the metronome's clock decides; each beat gets exactly one input.
  useEffect(() => {
    if (noTempo) return
    const metronome: Metronome = startMetronome(context, { bpm, subdivision })
    const stepMs = 60_000 / bpm / subdivision
    let n = 0
    let previous: number | null = null
    // Each note goes to its nearest beat, so a long window or latency can't spill into the next
    // step; a beat is decided once a note played at the end of its window has been confirmed.
    const heard = new Map<number, { hit: number | null; why: string }>()
    const at = (i: number) => metronome.beatTime(i) * 1000

    props.listen((e) => {
      if (stateRef.current.phase.kind !== 'play') return
      const i = Math.round((e.time - latencyMs - at(0)) / stepMs)
      if (i < n) return
      const prior = heard.get(i)
      if (prior && prior.hit !== null) return
      const verdict = judge(at(i), e.time, { windowMs, latencyMs })
      if (verdict === 'on-time') heard.set(i, { hit: e.midi, why: '' })
      else if (!prior) {
        heard.set(i, {
          hit: null,
          why: verdict === 'early' ? 'Antes de tiempo.' : 'Tarde.',
        })
      }
    })

    let frame = 0
    const loop = () => {
      const now = context.currentTime * 1000
      const current = stateRef.current
      if (current.phase.kind === 'done') return
      if (current.phase.kind === 'play') {
        // A played step is decided once its window has closed.
        if (now >= at(n) + windowMs + latencyMs + CONFIRM_MS) {
          const step = stepOf(current)
          if (current.phase.step === 0) previous = null
          const got = heard.get(n)
          heard.delete(n)
          const hit = got?.hit ?? null
          const ok = hit !== null && step?.accepts(hit, previous) === true
          if (ok) previous = hit
          else {
            heard.clear()
            setMiss({
              segment: current.phase.segment,
              step: current.phase.step,
              why: got?.why || (hit === null ? 'No sonó nada a tiempo.' : 'Esa no era la nota.'),
            })
          }
          apply(ok ? 'ok' : 'miss')
          n++
          setBeat(n)
        }
      } else if (now >= at(n)) {
        if (current.phase.kind === 'count-in' && current.phase.beat === 0) setMiss(null)
        apply('tick')
        n++
        setBeat(n)
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      metronome.stop()
    }
  }, [])

  const { phase } = state
  const segmentIndex = phase.kind === 'done' ? segments.length - 1 : phase.segment
  const segment = segments[segmentIndex]
  const step =
    phase.kind === 'play' || phase.kind === 'error' ? segment?.steps[phase.step] : segment?.steps[0]
  const states = new Map<string, KeyState>()
  if (miss) {
    for (const at of segments[miss.segment]?.steps[miss.step]?.show ?? []) states.set(at, 'wrong')
  } else if (props.help && step) {
    for (const at of step.show) states.set(at, 'selected')
  }
  const beatInBar = noTempo ? -1 : beat % (4 * subdivision)

  return (
    <section class="space-y-5 rounded-card bg-dojo-surface p-5 md:p-6" aria-live="polite">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-sm text-dojo-muted">
            Nota {segmentIndex + 1} de {segments.length} · intento {state.attempts}
          </p>
          <div class="font-display text-5xl font-extrabold">{segment && props.title(segment)}</div>
        </div>
        <button type="button" class={buttonClass('secondary')} onClick={props.onStop}>
          <Square size={18} aria-hidden="true" />
          Parar
        </button>
      </div>

      <p class="text-xl">
        {phase.kind === 'count-in'
          ? `Cuenta: ${phase.beat + 1}…`
          : phase.kind === 'error'
            ? 'Desde el principio.'
            : (step?.label ?? '')}
      </p>

      {!noTempo && (
        <div class="flex gap-2" aria-hidden="true">
          {Array.from({ length: 4 * subdivision }, (_, i) => (
            <span
              key={i}
              class={`size-4 rounded-full ${i === beatInBar ? 'bg-dojo-torii' : i % subdivision === 0 ? 'bg-dojo-raised' : 'bg-dojo-hairline'}`}
            />
          ))}
        </div>
      )}

      <p class="font-mono text-lg tracking-widest">
        <span aria-hidden="true">
          {segments.map((_, i) => (i < segmentIndex || phase.kind === 'done' ? '●' : '○')).join('')}
        </span>
        <span class="sr-only">
          {phase.kind === 'done' ? segments.length : segmentIndex} de {segments.length} completas
        </span>
      </p>

      {miss && (
        <p role="alert" class="text-dojo-danger">
          {miss.why} En rojo, dónde estaba.
        </p>
      )}

      <Fretboard
        mode="display"
        notation={props.notation}
        lefty={props.lefty}
        states={states}
        label="Diapasón"
      />
    </section>
  )
}
