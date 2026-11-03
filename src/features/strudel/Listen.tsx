import { Play, Square } from 'lucide-preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import { type Engine, getEngine, paintRoll, unlockAudio } from './engine.ts'

// Plays a snippet with no editor, plus a mini pianoroll (lessons, spec 02).
export default function Listen({ code, label = 'Escuchar' }: { code: string; label?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const engine = useRef<Engine | null>(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const playingRef = useRef(false)
  playingRef.current = playing

  useEffect(
    () => () => {
      if (playingRef.current) engine.current?.stop()
    },
    [],
  )

  async function toggle() {
    unlockAudio()
    engine.current ??= await getEngine()
    const e = engine.current
    if (playing) {
      e.stop()
      return
    }
    const el = canvas.current
    const ctx = el?.getContext('2d') ?? null
    if (el) {
      el.width = el.clientWidth * devicePixelRatio
      el.height = el.clientHeight * devicePixelRatio
    }
    const failed = await e.play(code, {
      onToggle: setPlaying,
      onDraw: (haps, time) => ctx && paintRoll(e, ctx, haps, time),
    })
    setError(failed?.message ?? null)
  }

  return (
    <div class="my-4 flex items-center gap-3 rounded-card bg-dojo-surface p-3">
      <button
        type="button"
        class={buttonClass('play', 'shrink-0 px-0')}
        aria-label={playing ? 'Parar' : label}
        onClick={() => void toggle()}
      >
        {playing ? <Square size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
      </button>
      <canvas
        ref={canvas}
        class="h-12 min-w-0 flex-1"
        role="img"
        aria-label="Notas del fragmento"
      />
      <code class="hidden max-w-[40%] truncate font-mono text-sm text-dojo-muted md:block">
        {code}
      </code>
      {error && (
        <p role="alert" class="text-sm text-dojo-danger">
          {error}
        </p>
      )}
    </div>
  )
}
