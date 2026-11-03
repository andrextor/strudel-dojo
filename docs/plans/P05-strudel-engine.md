# P05 · Motor Strudel

**Rama:** `feat/p05-strudel-engine` · **Leer antes:** `docs/specs/04-strudel-engine.md` completo, `DESIGN.md` (editor y visuales), los ejemplos oficiales `examples/codemirror-repl` y `examples/headless-repl` y `website/src/repl/prebake.mjs` del repo de Strudel (Codeberg `uzu/strudel`), los READMEs de `@strudel/core`, `@strudel/transpiler`, `@strudel/codemirror`, `@strudel/draw`, `@strudel/webaudio`, `@strudel/soundfonts`, `@strudel/midi` y `@strudel/reference`.

## Objetivo

Un motor propio de Strudel: evaluar código, reproducir, visualizar, editar con CodeMirror, y validar katas consultando eventos tanto en el navegador como en Node.

## Tareas

### 1. Spike (antes de todo)
- [x] Instala los paquetes `@strudel/*` en las versiones exactas del spec 04. No fuerces una sola minor: cada paquete fija sus hermanos con versión exacta.
- [x] `pnpm patch @kabelsalat/web@0.4.1` con el campo `exports` del spec 04 (sin él, Node no puede importar `@strudel/core`).
- [x] Página temporal `src/pages/_spike.astro` con una isla que reproduzca `examples/codemirror-repl`: editor, play/stop, highlight y pianoroll, con los sonidos del spec 04 (incluido `piano`).
- [x] Test `node --test` mínimo que evalúe `note("c3 [e3,g3]").s("piano")` con `core` + `mini` + `tonal` + `transpiler` y haga `queryArc(0, 1)`. Ya está verificado que funciona con el parche (spec 04, "Hechos verificados"); este test lo deja fijado en CI.
- [x] Anota en Desviaciones las APIs reales encontradas (nombres de exports, orden de init, cómo se registran samples y soundfonts) y **corrige el spec 04** donde difiera. Borra `_spike.astro` al terminar la fase.

### 2. Núcleo puro
- [x] `evaluate.ts`: `evaluatePattern(code): { ok: true; pattern } | { ok: false; error: DojoError }`, usando transpiler + `evaluate` de core con un scope controlado.
- [x] `errors.ts`: mapea errores de sintaxis (acorn), referencias desconocidas ("`scael` no existe, ¿quisiste decir `scale`?" con distancia de Levenshtein sobre los nombres de `@strudel/reference`), mini-notation mal cerrada y errores de runtime a mensajes en español con línea.
- [x] `query.ts`: `queryEvents(pattern, cycles): NoteEvent[]` (solo onsets, ordenados, con tope de 5 000 eventos), `summarize(events, cycles): PatternSummary`.
- [x] `assertions.ts`: las 15 aserciones del spec, cada una `(events, source, params) => AssertionResult`. `usesFunction` analiza el código sin comentarios ni strings (tokenizado simple o acorn, que ya trae el transpiler).
- [x] Tests: cada aserción con un caso que pasa y otro que falla, con el mensaje esperado; `matchesReference` con transporte; el tope de eventos; errores típicos de principiante (paréntesis, comillas, función mal escrita).
- [x] En `curriculum.test.ts`: cada `solution` de kata y combate pasa sus aserciones, y cada `starter` evalúa sin error.

### 3. Navegador
- [x] `engine.ts`: singleton perezoso `getEngine()` que importa dinámicamente los paquetes, hace `evalScope`, registra samples y soundfonts una sola vez, y expone `play(code, { onTrigger })`, `stop()`, `hushAll()` y `isAudioReady()`. Reproducir en un editor detiene el anterior.
- [x] Línea de créditos de sonidos en el pie (piano Salamander, CC-BY 3.0, Alexander Holm).
- [x] Desbloqueo de audio: la primera interacción ejecuta `initAudioOnFirstClick` (o equivalente); hasta entonces la UI muestra "Activar sonido".
- [x] `StrudelEditor.tsx`: CodeMirror 6 con las extensiones de `@strudel/codemirror`, un tema propio a partir de las variables CSS (sin hex), atajos `Mod-Enter`/`Mod-.`, highlight de eventos, selector de visual (pianoroll/punchcard/scope) con `@strudel/draw` y panel de error. Props: `initialCode`, `onCodeChange`, `onEvaluate(result)`, `visual`, `compact`.
- [x] `Listen.tsx` y `Example.tsx` para las lecciones (spec 02).
- [x] `StrudelRef.tsx`: ficha de una función (nombre, descripción, ejemplos) desde `@strudel/reference`, con el ejemplo reproducible.
- [x] Botón global "Parar todo" + tecla `Esc` (registrado en el header en P07; aquí expone `hushAll`).

## Aceptación

- En el navegador: escribir `n("0 2 4 <6 7>").scale("D:dorian").s("piano")`, pulsar `Mod-Enter`, se escucha, se resalta la nota que suena y el pianoroll dibuja.
- En Node: `pnpm test` valida todas las soluciones de kata de M01–M02 que existan.
- La página `/` sigue sin descargar ningún chunk de Strudel (verifícalo en el network panel o en el reporte de build).

## Commit

`feat: own Strudel engine with CodeMirror editor, visuals and kata assertions`

## Desviaciones

**APIs reales (spike)**
- `@strudel/reference` no tiene export por defecto: `import { reference } from '@strudel/reference'`; algunas entradas de `docs` no traen `name`. `@strudel/transpiler` exporta `transpiler` (y `evaluate`). Ningún paquete trae tipos: `features/strudel/strudel.d.ts` declara solo la superficie usada, con `unknown` en los valores.
- Orden de init en el navegador: `evalScope(core, mini, tonal, webaudio, draw, codemirror)` → `setAudioContext(ctx propio)` → prebake (`registerSynthSounds`, `registerSoundfonts` por import dinámico, `samples(piano)`, `samples(uzu-drumkit)`, `samples(tidal-drum-machines)`, y después `aliasBank(tidal-drum-machines-alias.json)`).
- `bd`/`sd`/`hh` sin `bank` salen de **`uzu-drumkit`**; el mapa `Dirt-Samples` de strudel.cc son sonidos exóticos (casio, crow, wind…) y no se registra. Spec 04 corregido.
- **Bug de superdough 1.3.0**: `initAudio` nunca reanuda el contexto (`(!audioCtx) instanceof OfflineAudioContext` siempre es falso). El motor crea su propio `AudioContext`, se lo pasa con `setAudioContext` y `unlockAudio()` lo reanuda de forma síncrona dentro del gesto (clic o `Mod-Enter`, capturado en el contenedor del editor). Spec 04 corregido.
- `StrudelMirror` (de `@strudel/codemirror`, lo que usa el ejemplo `codemirror-repl`) ya trae highlight de eventos, el drawer, la regla "solo uno suena" (evento `start-repl`) y `repl-stop`. Solo mantiene la ventana de dibujo si el patrón tiene painters, así que `editPattern` le pone un `onPaint` vacío (o `.analyze(1)` para la onda) y el dibujo va en `onDraw` con `__pianoroll`/`drawTimeScope`. Trae `Ctrl/Alt-Enter` y `Ctrl/Alt-.`; se agregan `Mod-Enter`/`Mod-.` con `Prec.highest` y el tema propio reemplaza el compartimento `theme`.
- `StrudelMirror` guarda sus ajustes en `localStorage` (`codemirror-settings`, vía nanostores), crea un `<canvas id="test-canvas">` fijo y pone la clase `dark` en `<html>`: inofensivo, el tema de la app usa `data-theme`.

**Diferencias con el plan**
- `evaluatePattern` es **async** (`Promise<EvalResult>`): `evaluate` de Strudel lo es. Strudel se importa dinámicamente dentro de `loadScope()`, así que ningún archivo lo carga al importarse.
- `queryEvents` devuelve `{ ok, events } | { ok: false, error }` y consulta ciclo a ciclo para cortar en 5 000 sin reventar memoria (`fast(100000)` genera 200 000 eventos en un ciclo).
- Aserciones: `checkAssertion(a, events, source, cycles)` es async porque `rhythmEquals` y `matchesReference` evalúan su referencia; `runKata(code, assertions, cycles)` hace todo el flujo (si la evaluación falla no corre ninguna). Alturas comparadas por sonido (chroma), no por deletreo. `noteSequence` sin `cycle` mira el primer ciclo. `eventsPerCycle.filter` filtra por sonido o pitch class. `characteristicNoteRatio.mode` lleva tónica (`"D dorian"`).
- Los combates no tienen `solution` en el esquema (son creativos): el test de currículo evalúa su `starter`. También queda activo el test de `<Listen>`/`<Example>` de las lecciones (regex sobre los `.mdx`; hoy no hay ejemplos, P08 los agrega).
- `StrudelRef` es **`.astro`** (se renderiza en build, como pide el spec 04) con un `<Listen client:visible>` para el ejemplo.
- `Esc` → `hushAll()` queda registrado globalmente por el motor al cargar; el botón del header es de P07.
- Atajos visibles bajo el editor: `Mod-Enter` (reproduce o aplica cambios sin cortar), `Mod-.`, `Esc`, y los de CodeMirror (`Mod-A`, `Mod-Z`, rehacer, `Mod-/`, `Mod-]`/`Mod-[`, `Alt-↑/↓`).
- Astro ignora páginas con `_`: el spike vivió en `src/pages/spike.astro` y se borró antes del commit.
- `@codemirror/{view,state,language}` y `@lezer/highlight` pasan a dependencias directas en la misma versión exacta que usa `@strudel/codemirror` (sin duplicados) para el tema.
- `@strudel/hydra` no se instala todavía (solo Dojo libre y M10, P10). `@strudel/midi` queda instalado para P06/P10.
- Verificación en navegador por script y teclas reales (la captura de pantalla de la extensión falló en todas las páginas): `Mod-Enter` suena con el contexto `running`, resalta la nota que suena, el pianoroll y la onda pintan, `Listen` detiene al editor, `Esc`/`Mod-.` paran. El audio en sí no lo puede oír el agente. `/` no carga ningún script.
