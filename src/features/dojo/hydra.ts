// Optional Hydra visuals for the Dojo (spec 04: lazy, only here and in M10). @strudel/hydra
// would load hydra-synth from unpkg at runtime, unpinned; instead the bundled copy is put where
// it looks for it (a global `Hydra`) and it is handed an empty module as `src`.
const NO_REMOTE = { src: 'data:text/javascript,', detectAudio: false }

// ponytail: the canvas covers the page behind everything (z-index -1), so it shows around the
// opaque cards and editor, not through them; make those translucent if it should show through.
export async function enableHydra(): Promise<void> {
  // hydra-synth (and a dependency of it) reads Node's `global`; browsers only have globalThis.
  if (!('global' in globalThis)) Object.assign(globalThis, { global: globalThis })
  const [{ default: Hydra }, hydra, core] = await Promise.all([
    import('hydra-synth'),
    import('@strudel/hydra'),
    import('@strudel/core'),
  ])
  Object.assign(globalThis, { Hydra })
  const initHydra = (options: Record<string, unknown> = {}) =>
    hydra.initHydra({ ...options, ...NO_REMOTE })
  await initHydra()
  document.getElementById('hydra-canvas')?.style.setProperty('z-index', '-1')
  // User code can call initHydra() and H() too, always with the local copy.
  await core.evalScope({ initHydra, H: hydra.H, clearHydra: hydra.clearHydra })
}

export async function disableHydra(): Promise<void> {
  const hydra = await import('@strudel/hydra')
  hydra.clearHydra()
}
