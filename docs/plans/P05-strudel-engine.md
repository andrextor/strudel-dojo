# P05 · Motor Strudel

**Rama:** `feat/p05-strudel-engine` · **Leer antes:** `docs/specs/04-strudel-engine.md` completo, `DESIGN.md` (editor y visuales), el ejemplo oficial `packages/core/examples/vite-vanilla-repl-cm6` del repo de Strudel (Codeberg `uzu/strudel`; espejo GitHub `tidalcycles/strudel`), los READMEs de `@strudel/core`, `@strudel/transpiler`, `@strudel/codemirror`, `@strudel/draw`, `@strudel/webaudio`, `@strudel/soundfonts`, `@strudel/midi` y `@strudel/reference`.

## Objetivo

Un motor propio de Strudel: evaluar código, reproducir, visualizar, editar con CodeMirror, y validar katas consultando eventos tanto en el navegador como en Node.

## Tareas

### 1. Spike (antes de todo)
- [ ] Instala los paquetes `@strudel/*` del spec en versión exacta (la misma minor para todos si es posible).
- [ ] Página temporal `src/pages/_spike.astro` con una isla que reproduzca el ejemplo `vite-vanilla-repl-cm6`: editor, play/stop, highlight y pianoroll.
- [ ] Script `node --test` mínimo que, en Node, evalúe `note("c3 [e3,g3]").s("piano")` con `@strudel/core` + `mini` + `tonal` + `transpiler` (sin webaudio) y haga `queryArc(0, 1)`. Si Node no puede importar algún paquete (por dependencias del navegador), identifica cuáles y evalúa en Node solo con core + mini + tonal + transpiler, registrando stubs vacíos para las funciones de salida (`s`, `gain`… son controles de core, deberían funcionar).
- [ ] Anota en Desviaciones las APIs reales encontradas (nombres de exports, orden de init, cómo se registran samples y soundfonts) y **corrige el spec 04** donde difiera. Borra `_spike.astro` al terminar la fase.

### 2. Núcleo puro
- [ ] `evaluate.ts`: `evaluatePattern(code): { ok: true; pattern } | { ok: false; error: DojoError }`, usando transpiler + `evaluate` de core con un scope controlado.
- [ ] `errors.ts`: mapea errores de sintaxis (acorn), referencias desconocidas ("`scael` no existe, ¿quisiste decir `scale`?" con distancia de Levenshtein sobre los nombres de `@strudel/reference`), mini-notation mal cerrada y errores de runtime a mensajes en español con línea.
- [ ] `query.ts`: `queryEvents(pattern, cycles): NoteEvent[]` (solo onsets, ordenados, con tope de 5 000 eventos), `summarize(events, cycles): PatternSummary`.
- [ ] `assertions.ts`: las 15 aserciones del spec, cada una `(events, source, params) => AssertionResult`. `usesFunction` analiza el código sin comentarios ni strings (tokenizado simple o acorn, que ya trae el transpiler).
- [ ] Tests: cada aserción con un caso que pasa y otro que falla, con el mensaje esperado; `matchesReference` con transporte; el tope de eventos; errores típicos de principiante (paréntesis, comillas, función mal escrita).
- [ ] En `curriculum.test.ts`: cada `solution` de kata y combate pasa sus aserciones, y cada `starter` evalúa sin error.

### 3. Navegador
- [ ] `engine.ts`: singleton perezoso `getEngine()` que importa dinámicamente los paquetes, hace `evalScope`, registra samples y soundfonts una sola vez, y expone `play(code, { onTrigger })`, `stop()`, `hushAll()` y `isAudioReady()`. Reproducir en un editor detiene el anterior.
- [ ] Desbloqueo de audio: la primera interacción ejecuta `initAudioOnFirstClick` (o equivalente); hasta entonces la UI muestra "Activar sonido".
- [ ] `StrudelEditor.tsx`: CodeMirror 6 con las extensiones de `@strudel/codemirror`, un tema propio a partir de las variables CSS (sin hex), atajos `Mod-Enter`/`Mod-.`, highlight de eventos, selector de visual (pianoroll/punchcard/scope) con `@strudel/draw` y panel de error. Props: `initialCode`, `onCodeChange`, `onEvaluate(result)`, `visual`, `compact`.
- [ ] `Listen.tsx` y `Example.tsx` para las lecciones (spec 02).
- [ ] `StrudelRef.tsx`: ficha de una función (nombre, descripción, ejemplos) desde `@strudel/reference`, con el ejemplo reproducible.
- [ ] Botón global "Parar todo" + tecla `Esc` (registrado en el header en P07; aquí expone `hushAll`).

## Aceptación

- En el navegador: escribir `n("0 2 4 <6 7>").scale("D:dorian").s("piano")`, pulsar `Mod-Enter`, se escucha, se resalta la nota que suena y el pianoroll dibuja.
- En Node: `pnpm test` valida todas las soluciones de kata de M01–M02 que existan.
- La página `/` sigue sin descargar ningún chunk de Strudel (verifícalo en el network panel o en el reporte de build).

## Commit

`feat: own Strudel engine with CodeMirror editor, visuals and kata assertions`

## Desviaciones
