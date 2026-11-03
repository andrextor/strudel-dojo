// Browser-only Strudel engine: lazy init, one shared AudioContext, sounds registered once, a
// single "who is playing" rule (starting anything stops the rest), and global hush.
import { toDojoError } from './errors.ts'
import { knownNames, loadScope } from './evaluate.ts'
import type { DojoError } from './types.ts'

const CDN = 'https://strudel.b-cdn.net'
const START_EVENT = 'start-repl' // the event StrudelMirror uses for its "solo" rule
const STOP_EVENT = 'repl-stop' // every StrudelMirror stops on it

type Modules = Awaited<ReturnType<typeof importModules>>

async function importModules() {
  const [core, mini, tonal, transpiler, webaudio, draw, codemirror] = await Promise.all([
    import('@strudel/core'),
    import('@strudel/mini'),
    import('@strudel/tonal'),
    import('@strudel/transpiler'),
    import('@strudel/webaudio'),
    import('@strudel/draw'),
    import('@strudel/codemirror'),
  ])
  return { core, mini, tonal, transpiler: transpiler.transpiler, webaudio, draw, codemirror }
}

let context: AudioContext | null = null
const audioContext = () => {
  context ??= new AudioContext()
  return context
}

let audioReady = false
export const isAudioReady = () => audioReady

// Must run synchronously inside a click/keydown handler: browsers only start audio on a
// gesture. superdough's own initAudio never resumes the context (upstream bug), so we do.
export function unlockAudio(): void {
  const ctx = audioContext()
  if (ctx.state !== 'running') void ctx.resume()
  audioReady = true
}

// Subset of strudel.cc's prebake: synths, Salamander piano, GM soundfonts, default drums
// (bd/sd/hh without bank) and the tidal drum machines with their bank aliases.
async function prebake({ webaudio }: Modules): Promise<void> {
  await Promise.all([
    webaudio.registerSynthSounds(),
    import('@strudel/soundfonts').then((m) => m.registerSoundfonts()),
    webaudio.samples(`${CDN}/piano.json`, `${CDN}/piano/`, { prebake: true }),
    webaudio.samples(`${CDN}/uzu-drumkit.json`, `${CDN}/uzu-drumkit/`, { prebake: true }),
    webaudio.samples(`${CDN}/tidal-drum-machines.json`, `${CDN}/tidal-drum-machines/machines/`, {
      prebake: true,
    }),
  ])
  await webaudio.aliasBank(`${CDN}/tidal-drum-machines-alias.json`)
}

export interface Engine {
  modules: Modules
  sounds: Promise<void>
  getTime: () => number
  play(code: string, options?: PlayOptions): Promise<DojoError | null>
  stop(): void
}

export interface PlayOptions {
  onTrigger?: (hap: unknown) => void
  onToggle?: (playing: boolean) => void
  onDraw?: (haps: unknown[], time: number) => void
}

export const DRAW_TIME: [number, number] = [-2, 2]

const token = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(`--color-dojo-${name}`).trim()

// Pianoroll (fold 0, pitch axis) or punchcard (fold 1, one row per distinct value) in the
// DESIGN.md colors: notes in neon, the sounding ones and the playhead in torii.
export function paintRoll(
  engine: Engine,
  ctx: CanvasRenderingContext2D,
  haps: unknown[],
  time: number,
  fold: 0 | 1 = 0,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  const { draw } = engine.modules
  draw.__pianoroll({
    ctx,
    time,
    haps,
    ...draw.getDrawOptions(DRAW_TIME, {
      fold,
      labels: fold === 1,
      background: 'transparent',
      inactive: token('neon'),
      active: token('torii'),
      playheadColor: token('torii'),
    }),
  })
}

export const colorToken = token

let engine: Promise<Engine> | null = null

export function getEngine(): Promise<Engine> {
  engine ??= (async () => {
    await loadScope() // core + mini + tonal registered for pure evaluation too
    const modules = await importModules()
    const { core, mini, tonal, webaudio, draw, codemirror } = modules
    webaudio.setAudioContext(audioContext())
    await core.evalScope(core, mini, tonal, webaudio, draw, codemirror)
    const sounds = prebake(modules)
    void webaudio.initAudio()
    const getTime = () => audioContext().currentTime

    // Headless player for <Listen>: one repl, swapped trigger and toggle callbacks per call.
    let current: PlayOptions = {}
    let lastError: unknown = null
    const headless = core.repl({
      defaultOutput: (hap: unknown, ...rest: unknown[]) => {
        current.onTrigger?.(hap)
        return webaudio.webaudioOutput(hap, ...rest)
      },
      getTime,
      transpiler: modules.transpiler,
      beforeEval: () => sounds,
      onEvalError: (err: unknown) => {
        lastError = err
      },
      onToggle: (started: boolean) => {
        current.onToggle?.(started)
        if (started) {
          drawer.start(headless.scheduler)
          document.dispatchEvent(new CustomEvent(START_EVENT, { detail: 'listen' }))
        } else {
          drawer.stop()
        }
      },
      afterEval: () => drawer.invalidate(headless.scheduler),
    })
    const drawer = new draw.Drawer((haps, time) => current.onDraw?.(haps, time), DRAW_TIME)
    document.addEventListener(START_EVENT, (e) => {
      if (e instanceof CustomEvent && e.detail !== 'listen') headless.stop()
    })
    document.addEventListener(STOP_EVENT, () => headless.stop())
    // Esc stops everything from anywhere on the page (spec 04, "Parar todo").
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) hushAll()
    })

    return {
      modules,
      sounds,
      getTime,
      async play(code, options = {}) {
        headless.stop()
        current = options
        lastError = null
        await headless.evaluate(code, true)
        return lastError === null ? null : toDojoError(lastError, code, await knownNames())
      },
      stop: () => headless.stop(),
    }
  })()
  return engine
}

// "Parar todo" / Esc: stops every editor and the headless player.
export function hushAll(): void {
  document.dispatchEvent(new CustomEvent(STOP_EVENT))
}
