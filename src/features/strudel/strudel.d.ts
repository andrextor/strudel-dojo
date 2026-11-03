// Strudel ships no types. Only the surface this app touches is declared; values crossing
// it stay `unknown` and are checked where they are used.
declare module '@strudel/core' {
  export function evalScope(...modules: unknown[]): Promise<unknown>
  export function evaluate(
    code: string,
    transpiler: unknown,
  ): Promise<{ pattern: unknown; mode?: string; meta?: unknown }>
  export function repl(options: Record<string, unknown>): {
    evaluate(code: string, autostart?: boolean): Promise<unknown>
    stop(): void
    scheduler: unknown
  }
}
declare module '@strudel/mini'
declare module '@strudel/tonal'
declare module '@strudel/transpiler' {
  export const transpiler: unknown
}
declare module '@strudel/reference' {
  export const reference: {
    docs: { name?: string; description?: string; examples?: string[] }[]
  }
}
declare module '@strudel/webaudio' {
  export const webaudioOutput: (...args: unknown[]) => unknown
  export function setAudioContext(ctx: AudioContext): AudioContext
  export function initAudio(options?: Record<string, unknown>): Promise<void>
  export function registerSynthSounds(): Promise<void>
  export function samples(
    map: string,
    base?: string,
    options?: Record<string, unknown>,
  ): Promise<void>
  export function aliasBank(url: string): Promise<void>
  export function getAnalyserById(id: number): AnalyserNode | undefined
  export function drawTimeScope(
    analyser: AnalyserNode | undefined,
    options: Record<string, unknown>,
  ): void
}
declare module '@strudel/soundfonts' {
  export function registerSoundfonts(): Promise<void>
}
declare module '@strudel/draw' {
  export class Drawer {
    constructor(onDraw: (haps: unknown[], time: number) => void, drawTime: [number, number])
    start(scheduler: unknown): void
    stop(): void
    invalidate(scheduler?: unknown): void
  }
  export function __pianoroll(options: Record<string, unknown>): void
  export function getDrawOptions(
    drawTime: [number, number],
    options?: Record<string, unknown>,
  ): Record<string, unknown>
}
declare module '@strudel/codemirror' {
  import type { EditorView } from '@codemirror/view'
  export class StrudelMirror {
    constructor(options: Record<string, unknown>)
    editor: EditorView
    code: string
    evaluate(autostart?: boolean): Promise<void>
    stop(): Promise<void>
    setCode(code: string): void
    setFontFamily(family: string): void
    setFontSize(size: number): void
    clear(): void
  }
}
declare module '@strudel/codemirror' {
  import type { Compartment } from '@codemirror/state'
  export const compartments: Record<string, Compartment>
}
