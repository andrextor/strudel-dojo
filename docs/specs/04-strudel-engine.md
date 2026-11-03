# 04 · Motor Strudel

No se embebe `<strudel-repl>` ni `<strudel-editor>`. Se arma un motor propio con los paquetes de Strudel, porque hace falta:
1. **validar katas** consultando los eventos del patrón (`queryArc`), no solo oírlos;
2. un editor con la estética del dojo, resaltado del evento que suena y errores en español;
3. visuales (pianoroll, scope, punchcard, Hydra) sincronizados con el teclado/diapasón propios de la app;
4. entrada MIDI y un solo motor de audio para lecciones, oído, katas y dojo libre.

## Paquetes

| Paquete | Para qué |
|---------|----------|
| `@strudel/core` | Patrones, `queryArc`, `evaluate`, `evalScope`, scheduler (`repl`). |
| `@strudel/mini` | Mini-notation. |
| `@strudel/tonal` | `scale`, `chord`, `voicing`, `transpose`, `scaleTranspose`. |
| `@strudel/transpiler` | Convierte el código del usuario (strings dobles → mini, `return` implícito, ubicaciones para resaltar). |
| `@strudel/webaudio` | Salida de audio (superdough), `samples`, `initAudioOnFirstClick`, `getAudioContext`. |
| `@strudel/soundfonts` | Instrumentos GM (piano, guitarra, etc.) para que las lecciones suenen a instrumento real. |
| `@strudel/codemirror` | Extensiones de CodeMirror 6: resaltado de mini-notation, flash, highlight de eventos activos, autocompletado. |
| `@strudel/draw` | `pianoroll`, `punchcard`, `scope`, `spiral` sobre canvas. |
| `@strudel/midi` | Entrada Web MIDI (y salida opcional). |
| `@strudel/hydra` | Visuales generativos. **Lazy**: solo se carga en el Dojo libre y en M10. |
| `@strudel/reference` | Metadatos de todas las funciones documentadas: fichas `<StrudelRef>`, autocompletado y panel de ayuda. Exporta `{ reference }` (sin export por defecto) con `reference.docs[]` (JSDoc: `name`, `description` en **HTML y en inglés**, `examples`). La ficha muestra un resumen en español escrito por nosotros (opcional, prop `summary`), la traducción completa de la descripción (`features/strudel/ref-es.json`, generada una vez con `scripts/translate-reference.mjs`) y, plegada, la descripción original en inglés. Es HTML del paquete, no del usuario, pero igual se renderiza en build, no en la isla. |

Todos se fijan a una versión exacta. Las versiones publicadas **no comparten minor**: se instala el conjunto que se referencia entre sí con versión exacta (a noviembre de 2026: `core`, `mini`, `tonal`, `transpiler`, `draw` y `hydra` en `1.2.6`; `webaudio`, `soundfonts`, `codemirror` y `midi` en `1.3.0`, que dependen de `core@1.2.6`; `reference` en `1.2.2`). Antes de escribir el motor, la fase P05 hace un **spike** reproduciendo el ejemplo oficial `examples/codemirror-repl` del repo de Strudel (Codeberg `uzu/strudel`; el de GitHub `tidalcycles/strudel` ya no es la fuente principal) dentro de una isla Astro. Para Node, la referencia es `examples/headless-repl`. Si alguna API de este documento no coincide con la del paquete, gana el paquete y se actualiza este documento en el mismo PR.

Hechos verificados en Node 23 con `core`/`mini`/`tonal`/`transpiler` (antes de P05):
- `@strudel/core` importa `@kabelsalat/web@0.4.1`, que no declara `exports` y cuyo `main` es CJS, así que Node falla con `does not provide an export named 'SalatRepl'` (Vite no falla porque lee `module`). Se arregla con `pnpm patch @kabelsalat/web@0.4.1`, agregando `"exports": { ".": { "import": "./dist/index.mjs", "require": "./dist/index.js" } }`. El parche queda en `patches/` con un comentario `ponytail:` que diga que se quita cuando el upstream publique `exports`.
- Con eso, `await evalScope(core, mini, tonal)` + `await evaluate(code, transpiler)` devuelve `{ pattern }`, y `pattern.queryArc(0, 1).filter((h) => h.hasOnset())` da los haps. Al cargar imprime `cannot use window: not in browser?`, y es inofensivo.
- Los valores no vienen normalizados: `note("c3")` da `"c3"` (string en minúsculas), `n("0").scale("D:dorian")` da `"D3"` (octava 3 por defecto) y `chord("C").voicing()` da varias notas en el mismo onset.
- Los errores llegan como excepciones: mini-notation o JS mal cerrado → `Unexpected token (1:13)`; función inexistente → `ReferenceError: scael is not defined`.
- `@strudel/soundfonts` **no se puede importar en el servidor** (`window is not defined`, por `soundfont2`): solo con import dinámico dentro del motor del navegador.
- `@strudel/tonal` y `@strudel/codemirror` traen su propio `@tonaljs/tonal@^4`, mientras la app usa `tonal@6`. La teoría de la app y el análisis de eventos usan siempre `tonal@6`; Strudel solo produce los eventos. Si un nombre de escala de Strudel no existe en `tonal@6`, el test de katas lo detecta.

Licencia: todos son **AGPL-3.0-or-later**, y este repo es AGPL-3.0 (`LICENSE`). El pie de página enlaza al código fuente, como pide la AGPL para una publicación web. El piano por defecto (Salamander Grand Piano, de Alexander Holm) es **CC-BY 3.0** y exige atribución: va en el pie o en `/progreso`, en una línea de créditos.

## Estructura (`src/features/strudel/`)

```
engine.ts        # singleton de navegador: init perezoso, evalScope, samples, play/stop/hush
evaluate.ts      # PURO (corre en Node también): código → Pattern | error en español
query.ts         # PURO: Pattern → NoteEvent[] normalizados para aserciones y visuales
assertions.ts    # PURO: aserciones de katas
errors.ts        # PURO: traduce errores de sintaxis/runtime a mensajes accionables
StrudelEditor.tsx  # isla: CodeMirror + botones + visual + panel de resultados
Listen.tsx, Example.tsx, StrudelRef.tsx
```

`evaluate.ts`, `query.ts` y `assertions.ts` no tocan el DOM ni el audio: los tests de Node validan las soluciones de las katas con ellos.

### Inicialización (navegador)

- Perezosa: nada de Strudel se carga hasta que una isla lo necesita (import dinámico). La página de inicio no descarga Strudel.
- El `AudioContext` solo arranca tras un gesto del usuario; el primer "Reproducir" (o `Mod-Enter`) lo desbloquea. Hasta entonces el botón dice "Activar sonido". El motor crea su propio contexto y lo pasa con `setAudioContext`, y lo reanuda de forma síncrona en el gesto, porque `initAudio` de superdough 1.3.0 nunca llama `resume()`.
- `evalScope(core, mini, tonal, webaudio, draw, ...)` una sola vez. Los sonidos se registran al iniciar copiando el subconjunto necesario de `website/src/repl/prebake.mjs` de Strudel: `registerSynthSounds()`, `piano` (`samples('https://strudel.b-cdn.net/piano.json', 'https://strudel.b-cdn.net/piano/')`), la batería por defecto (`uzu-drumkit`, con lo que `bd`, `sd` y `hh` funcionan sin `bank`; el mapa `Dirt-Samples` de strudel.cc son sonidos exóticos y no se registra), `tidal-drum-machines` con su `aliasBank` (para `bank("RolandTR909")`) y `registerSoundfonts()` (guitarra: `gm_acoustic_guitar_nylon`). Todo `audio` y todo ejemplo del contenido usa solo esos sonidos. El navegador los cachea.
- Un solo scheduler global: reproducir en un editor detiene los demás. `Esc` o el botón "Parar todo" del header llama `hush()`.

### Editor (`StrudelEditor`)

- CodeMirror 6 con las extensiones de `@strudel/codemirror` y un tema propio hecho con los tokens de `DESIGN.md`.
- Atajos: `Ctrl/Cmd+Enter` evaluar y reproducir, `Ctrl/Cmd+.` parar, mostrados en la UI.
- Resaltado de los eventos que suenan dentro del código (highlight de mini-notation).
- Debajo del editor, una visual elegible: **pianoroll** (por defecto en katas de notas), **punchcard** (ritmo), **scope**. Junto a ella, el `Keyboard`/`Fretboard` de la app ilumina las notas que suenan, alimentado por `onTrigger`/haps.
- Errores: mensaje en español con línea y sugerencia ("Falta cerrar un paréntesis en la línea 3"). El texto original va en un `<details>` para quien quiera verlo.
- Borradores: el código de cada kata se guarda en el progreso del perfil al evaluar, y se restaura al volver.
- Botón "Restaurar inicio" (vuelve a `starter`) con confirmación en línea, no `confirm()`.

## Validación de katas

```ts
interface NoteEvent {
  begin: number; end: number            // en ciclos (fracciones → number)
  cycle: number                         // Math.floor(begin)
  midi: number | null                   // de note/n+scale/freq; null para samples sin altura
  pitchClass: string | null             // deletreo del patrón, normalizado con tonal ("c3" → "C", "f#" → "F#")
  sound: string | null                  // s / bank resueltos
  voice?: number                        // índice dentro de un acorde (por orden de altura)
}
```

`query.ts` llama a `pattern.queryArc(0, cycles)` y conserva solo los eventos con `hasOnset()`. Convierte `note`, `n`+`scale` y `freq` a midi/pitchClass con `tonal`.

### Aserciones

Cada una devuelve `{ pass: boolean; message: string }` en español, y el mensaje dice qué falta, no solo que falló.

| type | Params | Pasa si |
|------|--------|---------|
| `usesFunction` | `names[]` | El código fuente (sin comentarios ni strings) llama a todas esas funciones. |
| `avoidsFunction` | `names[]` | No las usa (p. ej. prohibir `note` cuando se pide `n` + `scale`). |
| `soundsInclude` | `names[]` | Cada sonido aparece al menos una vez. |
| `eventsPerCycle` | `min`, `max`, `filter?` | Cuenta de eventos por ciclo dentro del rango. |
| `notesWithinScale` | `scale` (`"D dorian"`), `minRatio?` | Todas (o la fracción pedida) las alturas pertenecen a la escala. |
| `pitchClassesInclude` | `pitchClasses[]` | Aparecen todas. |
| `noteSequence` | `pitchClasses[]`, `voice: all|lowest|highest`, `cycle?` | El orden de onsets coincide. |
| `chordPerCycle` | `chords[]` (cifrados) | En cada ciclo i, el set de pitch classes sonando = el acorde i (sin importar inversión ni voicing). |
| `harmonicIntervals` | `interval`, `minRatio` | Fracción de onsets simultáneos que forman ese intervalo. |
| `distinctMelodicIntervals` | `min` | Cantidad de intervalos melódicos distintos en la voz superior. |
| `maxVoiceLeap` | `semitones` | Entre acordes consecutivos, ninguna voz salta más que eso. |
| `rootsPerBar` | `roots[]` | Raíz (nota más grave) por ciclo coincide (blues, progresiones). |
| `rhythmEquals` | `reference` (mini-notation) | Los onsets por ciclo coinciden con los de la referencia. |
| `matchesReference` | `code`, `transposeBy?` | Mismos eventos (altura, inicio, duración) que el patrón de referencia, opcionalmente transportado. |
| `characteristicNoteRatio` | `mode`, `minRatio` | Fracción de eventos melódicos que son la nota característica del modo. |

Si la evaluación falla (error de sintaxis o de runtime), la kata muestra el error y no corre ninguna aserción. Para evitar bucles infinitos y patrones gigantes, `query.ts` corta en 5 000 eventos y, de pasar ese tope, devuelve un error claro.

### Resumen para el Sensei

`summarize(events, cycles)` produce un resumen compacto (tonalidad estimada, rango, eventos por ciclo, acordes por ciclo, sonidos usados). Se envía a Claude junto con el código para que la revisión se base en lo que realmente suena.

## Lecciones

- `<Listen code>`: reproduce sin editor, con un botón de play/stop y el pianoroll mini.
- `<Example code>`: editor compacto (sin panel de aserciones), con su visual.
- Los ejemplos de las lecciones se validan en un test: cada `code` de `<Listen>`/`<Example>` debe evaluarse sin error en Node. El test extrae los bloques con una regex sobre los `.mdx`.

## Dojo libre (`/dojo`)

Editor a pantalla completa, panel de referencia (`@strudel/reference`, búsqueda), visuales seleccionables, Hydra opcional, entrada MIDI. Guarda hasta 20 "pergaminos" (snippets con nombre) por perfil. Exporta un pergamino como `.js` o como enlace a strudel.cc (el formato `#base64` de strudel.cc). No importa enlaces que se ejecuten solos.

## MIDI

Web MIDI API directa (`features/midi/midi.ts`): para leer note-on/off no hace falta `@strudel/midi`, que queda para la salida MIDI de patrones en el Dojo libre. Cuando hay un dispositivo:
- En ejercicios con `via` que incluye `midi`, tocar notas responde (acordes = notas simultáneas dentro de 80 ms).
- En `ear-melody`, se toca la melodía directamente.
- Si el navegador no tiene Web MIDI (Safari iOS), la opción no aparece y se explica por qué en las preferencias.

## Sonido de una vez

Las preguntas de oído y las teclas del instrumento no usan el scheduler en bucle: `playOnce(code, { slow, firstOnly })` evalúa el código, toma el primer ciclo (`firstCycle` en `query.ts`) y entrega cada hap a `superdough` con su tiempo absoluto (ciclo de 2 s, el `cps` 0.5 por defecto). Suena una vez y termina solo; antes llama a `hushAll()` para respetar la regla de "uno suena a la vez".
