# P03 · Motor de ejercicios

**Rama:** `feat/p03-exercise-engine` · **Leer antes:** `docs/specs/03-exercise-engine.md`, `src/features/theory/*` (P01), `docs/specs/01-curriculum.md` (M01–M02).

## Objetivo

Generar y calificar preguntas de teoría de forma pura, reproducible y correcta por construcción.

## Tareas

- [x] `src/lib/random.ts`: `createRng(seed: string): Rng` con `next()`, `int(min, max)`, `pick(arr)`, `shuffle(arr)`, `weighted(entries)`. Hash de string (cyrb53 o FNV-1a) + mulberry32. Test: la misma semilla da la misma secuencia y la distribución de `int` es aproximadamente uniforme en 10 000 muestras.
- [x] `src/features/exercises/types.ts`: `Question`, `InputSpec`, `InputVia`, `Answer`, `Response`, `Grade`, `Generator<P>` como en el spec.
- [x] `grade.ts`: `grade(question, response): Grade` con deletreo estricto o enarmónico, retroalimentación específica ("suena bien, pero en Re mayor se escribe F♯") y normalización de texto (minúsculas, tildes, espacios) usando los parsers de P01.
- [x] `registry.ts`: mapa `id → Generator`, `generateQuestion(entry: MixEntry, seed, usedIds)` y `buildSet(mix, count, seedPrefix)`, que elige por peso y evita duplicados por `Question.key` (hasta 20 reintentos por pregunta; si no se puede, lanza un error claro, porque es un bug del contenido).
- [x] Generadores de M01–M02 (un archivo por generador en `generators/`): `note-name`, `enharmonic`, `semitone-count`, `interval-name`, `interval-build`, `interval-invert`, `ear-interval`, `rhythm-match`, `scale-spelling`, `key-signature`, `scale-degree`, `relative-key`. Cada uno con `parseParams` que valida su `params` del JSON.
- [x] Cada pregunta trae su `explanation` útil (no "La respuesta es X": muestra el porqué, p. ej. "Do→Mi son 4 semitonos = tercera mayor").
- [x] Los ejercicios de oído ponen en `audio` un código Strudel válido (`note("c4 e4").s("piano")` para melódico ascendente, `note("[c4,e4]")` armónico), con tónica aleatoria entre `C3` y `C5`.
- [x] `rhythm-match`: las opciones son mini-notation equivalentes entre sí en apariencia pero distintas en onsets. Los distractores se generan alterando una subdivisión.
- [x] Tests por generador: 200 semillas, la respuesta concuerda con `tonal`, `grade(q, respuestaCanónica).correct === true`, una respuesta mal deletreada da `correct: false` cuando es estricta, y el `prompt` y la `explanation` no están vacíos.
- [x] Completa en `curriculum.test.ts` el chequeo de "cada generator existe y sus params son válidos".

## Aceptación

- `buildSet` de cada `test.mix` de M01–M02 produce 10 preguntas sin duplicados para 100 semillas distintas.
- `pnpm test` en verde, sin DOM.

## Commit

`feat: seeded question generators and grading for belts 1–2`

## Desviaciones

- **`Answer` mantiene 3 variantes** (`choice`/`pitch-classes`/`text`) como en el spec. Los intervalos y los nombres de nota entran como `text`: `grade` intenta, en orden, `parseIntervalInput`, `parseNoteInput` (comparando `pitchClass` canónico) y por último texto normalizado. Así `3M`/`M3`/`tercera mayor` y `Do#`/`C#`/`C♯` se aceptan sin añadir tipos de respuesta. El texto libre (nombres de grado) se guarda ya normalizado en `accepted`.
- **Deletreo por generador**: `note-name` es `enharmonic` (nombrar una tecla no distingue C♯/D♭); `enharmonic` usa `text` con el otro deletreo en `accepted`, así repetir la nota del enunciado cuenta como error. `scale-spelling`, `interval-build`, `scale-degree` (modo nota) y `relative-key` son `strict`.
- **`key-signature` y `ear-interval`/`rhythm-match` son opción múltiple** (`choice`): la armadura y el oído se responden eligiendo, no escribiendo. `scale-degree` alterna (semilla) entre pedir la nota del grado (`note`, estricto) y el nombre funcional (`text`), este último solo en mayor.
- **`rhythm-match` usa 8 slots por defecto** (corcheas en 4/4), no 4: con 4 solo hay ~7 patrones distintos y M01-T04 pide 10 preguntas sin repetir. El `key` es la cadena de onsets; los distractores invierten un slot que no sea el tiempo fuerte.
- **Un solo `generators.test.ts` por tabla** (200 semillas × un caso representativo por generador y params de M01–M02) en vez de un test por archivo: misma cobertura (respuesta válida en `tonal`, canónica `correct`, mal deletreo `false` cuando es estricto, `prompt`/`explanation` no vacíos), menos repetición. Los generadores sí van un archivo cada uno.
- **`interval-build` e `interval-invert` existen** aunque ningún mix de M01–M02 los use todavía (el plan los lista como entregables de la fase); el chequeo de currículo solo exige los que aparecen en un mix.
- `grade` recibe `question` + `response` y lee `question.input.ordered` para las escalas (no hay un flag aparte en `Answer`).
- Tests: 68 pasan + 2 `todo` (soluciones de katas P05, código de lecciones P05/P08). `ci:check` verde (la última corrida la hace el dueño).
