import { Prec, StateEffect } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import type { StrudelMirror } from '@strudel/codemirror'
import { Play, Square } from 'lucide-preact'
import { Fragment } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import { dojoTheme } from './editor-theme.ts'
import { colorToken, DRAW_TIME, getEngine, isAudioReady, paintRoll, unlockAudio } from './engine.ts'
import { toDojoError } from './errors.ts'
import { type EvalResult, isPattern, knownNames } from './evaluate.ts'
import type { DojoError } from './types.ts'

export type Visual = 'pianoroll' | 'punchcard' | 'scope'

const VISUALS: { id: Visual; label: string }[] = [
  { id: 'pianoroll', label: 'Pianoroll' },
  { id: 'punchcard', label: 'Ritmo' },
  { id: 'scope', label: 'Onda' },
]

const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform)
const MOD = isMac ? '⌘' : 'Ctrl'

// What the editor answers to: ours plus CodeMirror's default keymap (via @strudel/codemirror).
const SHORTCUTS: [string, string][] = [
  [`${MOD}+Enter`, 'Reproducir o aplicar los cambios sin cortar el sonido'],
  [`${MOD}+.`, 'Parar este editor'],
  ['Esc', 'Parar todo lo que suena en la página'],
  [`${MOD}+A`, 'Seleccionar todo'],
  [`${MOD}+Z`, 'Deshacer'],
  [isMac ? '⌘+Shift+Z' : 'Ctrl+Y', 'Rehacer'],
  [`${MOD}+/`, 'Comentar o descomentar la línea'],
  [`${MOD}+]`, 'Indentar la línea'],
  [`${MOD}+[`, 'Quitar indentación'],
  ['Alt+↑ / Alt+↓', 'Mover la línea arriba o abajo'],
]

export interface EditorApi {
  getCode: () => string
  setCode: (code: string) => void
}

interface Props {
  initialCode: string
  playLabel?: string // e.g. "Probar el código" in katas
  onReady?: (api: EditorApi) => void
  onCodeChange?: (code: string) => void
  onEvaluate?: (result: EvalResult) => void
  onTrigger?: (hap: unknown) => void
  visual?: Visual
  compact?: boolean
}

interface Paintable {
  onPaint(painter: unknown): unknown
  analyze(id: number): unknown
}

const isPaintable = (v: unknown): v is Paintable =>
  typeof v === 'object' && v !== null && 'onPaint' in v && 'analyze' in v

export default function StrudelEditor({
  initialCode,
  onCodeChange,
  onEvaluate,
  onTrigger,
  visual: initialVisual = 'pianoroll',
  compact = false,
  playLabel = 'Reproducir',
  onReady,
}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const mirror = useRef<StrudelMirror | null>(null)
  const [visual, setVisual] = useState<Visual>(initialVisual)
  const visualRef = useRef(visual)
  const callbacks = useRef({ onCodeChange, onEvaluate, onTrigger })
  callbacks.current = { onCodeChange, onEvaluate, onTrigger }
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [audio, setAudio] = useState(isAudioReady)
  const [error, setError] = useState<DojoError | null>(null)

  useEffect(() => {
    let disposed = false
    let instance: StrudelMirror | null = null
    void getEngine().then((engine) => {
      const root = host.current
      if (disposed || root === null) return
      const { codemirror, webaudio } = engine.modules
      const ctx = canvas.current?.getContext('2d') ?? null
      let lastCode = initialCode

      instance = new codemirror.StrudelMirror({
        root,
        initialCode,
        bgFill: false,
        drawTime: DRAW_TIME,
        drawContext: ctx,
        transpiler: engine.modules.transpiler,
        getTime: engine.getTime,
        prebake: () => engine.sounds,
        defaultOutput: (hap: unknown, ...rest: unknown[]) => {
          callbacks.current.onTrigger?.(hap)
          return webaudio.webaudioOutput(hap, ...rest)
        },
        // StrudelMirror only keeps a look-ahead window when the pattern has a painter, so a
        // no-op one is attached; drawing itself happens in onDraw.
        editPattern: (pattern: unknown) => {
          if (!isPaintable(pattern)) return pattern
          return visualRef.current === 'scope' ? pattern.analyze(1) : pattern.onPaint(() => {})
        },
        onDraw: (haps: unknown[], time: number) => {
          if (ctx === null) return
          if (visualRef.current !== 'scope') {
            paintRoll(engine, ctx, haps, time, visualRef.current === 'punchcard' ? 1 : 0)
            return
          }
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
          webaudio.drawTimeScope(webaudio.getAnalyserById(1), {
            ctx,
            color: colorToken('neon'),
            thickness: 2,
            scale: 0.4,
            pos: 0.5,
          })
        },
        onToggle: (started: boolean) => setPlaying(started),
        beforeEval: () => {
          lastCode = instance?.code ?? lastCode
          callbacks.current.onCodeChange?.(lastCode)
        },
        afterEval: ({ pattern }: { pattern: unknown }) => {
          setError(null)
          if (isPattern(pattern)) callbacks.current.onEvaluate?.({ ok: true, pattern })
        },
        onEvalError: async (err: unknown) => {
          const dojoError = toDojoError(err, lastCode, await knownNames())
          setError(dojoError)
          callbacks.current.onEvaluate?.({ ok: false, error: dojoError })
        },
      })
      const theme = codemirror.compartments.theme
      instance.editor.dispatch({
        effects: [
          ...(theme ? [theme.reconfigure(dojoTheme)] : []),
          StateEffect.appendConfig.of([
            EditorView.contentAttributes.of({ 'aria-label': 'Código Strudel' }),
            Prec.highest(
              keymap.of([
                {
                  key: 'Mod-Enter',
                  run: () => {
                    void play()
                    return true
                  },
                },
                {
                  key: 'Mod-.',
                  run: () => {
                    void stop()
                    return true
                  },
                },
              ]),
            ),
          ]),
        ],
      })
      instance.setFontFamily('var(--font-mono)')
      instance.setFontSize(compact ? 14 : 16)
      mirror.current = instance
      const editor = instance
      onReady?.({ getCode: () => editor.code, setCode: (code) => editor.setCode(code) })
      setLoading(false)
    })
    return () => {
      disposed = true
      if (instance) {
        void instance.stop()
        instance.clear()
        instance.editor.destroy()
      }
      mirror.current = null
    }
    // The editor is created once; later prop changes go through refs.
  }, [])

  // Keep the canvas sharp on high-DPI screens.
  useEffect(() => {
    const el = canvas.current
    if (el === null) return
    const resize = () => {
      el.width = el.clientWidth * devicePixelRatio
      el.height = el.clientHeight * devicePixelRatio
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  async function play() {
    unlockAudio()
    setAudio(true)
    await mirror.current?.evaluate()
  }

  async function stop() {
    await mirror.current?.stop()
  }

  function chooseVisual(next: Visual) {
    setVisual(next)
    visualRef.current = next
    if (playing) void play()
  }

  return (
    <div
      class="overflow-hidden rounded-card border border-dojo-hairline bg-dojo-surface"
      onKeyDownCapture={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') unlockAudio()
      }}
    >
      <div ref={host} class={`${compact ? 'min-h-24' : 'min-h-48'} text-base`} />
      {loading && <p class="px-4 py-3 text-sm text-dojo-muted">Cargando Strudel…</p>}

      <div class="flex flex-wrap items-center gap-3 border-t border-dojo-hairline px-4 py-3">
        <button
          type="button"
          class={buttonClass(playing ? 'secondary' : 'primary', 'min-h-11 px-4')}
          onClick={() => (playing ? void stop() : void play())}
          disabled={loading}
        >
          {playing ? (
            <Square size={18} aria-hidden="true" />
          ) : (
            <Play size={18} aria-hidden="true" />
          )}
          {playing ? 'Parar' : audio ? playLabel : 'Activar sonido'}
        </button>
        <details class="text-sm text-dojo-muted">
          <summary class="cursor-pointer">
            <kbd class="font-mono">{MOD}+Enter</kbd> reproduce ·{' '}
            <kbd class="font-mono">{MOD}+.</kbd> para · más atajos
          </summary>
          <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {SHORTCUTS.map(([keys, what]) => (
              <Fragment key={keys}>
                <dt>
                  <kbd class="font-mono text-dojo-text">{keys}</kbd>
                </dt>
                <dd>{what}</dd>
              </Fragment>
            ))}
          </dl>
        </details>
        {!compact && (
          <fieldset class="ml-auto flex gap-1">
            <legend class="sr-only">Visual</legend>
            {VISUALS.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={visual === v.id}
                class={`min-h-11 rounded-control px-3 text-sm ${visual === v.id ? 'bg-dojo-raised text-dojo-neon' : 'text-dojo-muted hover:text-dojo-text'}`}
                onClick={() => chooseVisual(v.id)}
              >
                {v.label}
              </button>
            ))}
          </fieldset>
        )}
      </div>

      <canvas
        ref={canvas}
        class={`block w-full border-t border-dojo-hairline ${compact ? 'h-20' : 'h-32'}`}
        role="img"
        aria-label="Visual del patrón que suena"
      />

      {error && (
        <div role="alert" class="border-t border-dojo-hairline bg-dojo-danger-bg px-4 py-3 text-sm">
          <p class="text-dojo-text">
            {error.line !== null && <strong>Línea {error.line}: </strong>}
            {error.message}
          </p>
          <details class="mt-1 text-dojo-muted">
            <summary class="cursor-pointer">Ver el error original</summary>
            <pre class="mt-1 whitespace-pre-wrap font-mono text-xs">{error.raw}</pre>
          </details>
        </div>
      )}
    </div>
  )
}
