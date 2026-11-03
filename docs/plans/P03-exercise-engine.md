# P03 · Motor de ejercicios

**Rama:** `feat/p03-exercise-engine` · **Leer antes:** `docs/specs/03-exercise-engine.md`, `src/features/theory/*` (P01), `docs/specs/01-curriculum.md` (M01–M02).

## Objetivo

Generar y calificar preguntas de teoría de forma pura, reproducible y correcta por construcción.

## Tareas

- [ ] `src/lib/random.ts`: `createRng(seed: string): Rng` con `next()`, `int(min, max)`, `pick(arr)`, `shuffle(arr)`, `weighted(entries)`. Hash de string (cyrb53 o FNV-1a) + mulberry32. Test: la misma semilla da la misma secuencia y la distribución de `int` es aproximadamente uniforme en 10 000 muestras.
- [ ] `src/features/exercises/types.ts`: `Question`, `InputSpec`, `InputVia`, `Answer`, `Response`, `Grade`, `Generator<P>` como en el spec.
- [ ] `grade.ts`: `grade(question, response): Grade` con deletreo estricto o enarmónico, retroalimentación específica ("suena bien, pero en Re mayor se escribe F♯") y normalización de texto (minúsculas, tildes, espacios) usando los parsers de P01.
- [ ] `registry.ts`: mapa `id → Generator`, `generateQuestion(entry: MixEntry, seed, usedIds)` y `buildSet(mix, count, seedPrefix)`, que elige por peso y evita duplicados por `Question.key` (hasta 20 reintentos por pregunta; si no se puede, lanza un error claro, porque es un bug del contenido).
- [ ] Generadores de M01–M02 (un archivo por generador en `generators/`): `note-name`, `enharmonic`, `semitone-count`, `interval-name`, `interval-build`, `interval-invert`, `ear-interval`, `rhythm-match`, `scale-spelling`, `key-signature`, `scale-degree`, `relative-key`. Cada uno con `parseParams` que valida su `params` del JSON.
- [ ] Cada pregunta trae su `explanation` útil (no "La respuesta es X": muestra el porqué, p. ej. "Do→Mi son 4 semitonos = tercera mayor").
- [ ] Los ejercicios de oído ponen en `audio` un código Strudel válido (`note("c4 e4").s("piano")` para melódico ascendente, `note("[c4,e4]")` armónico), con tónica aleatoria entre `C3` y `C5`.
- [ ] `rhythm-match`: las opciones son mini-notation equivalentes entre sí en apariencia pero distintas en onsets. Los distractores se generan alterando una subdivisión.
- [ ] Tests por generador: 200 semillas, la respuesta concuerda con `tonal`, `grade(q, respuestaCanónica).correct === true`, una respuesta mal deletreada da `correct: false` cuando es estricta, y el `prompt` y la `explanation` no están vacíos.
- [ ] Completa en `curriculum.test.ts` el chequeo de "cada generator existe y sus params son válidos".

## Aceptación

- `buildSet` de cada `test.mix` de M01–M02 produce 10 preguntas sin duplicados para 100 semillas distintas.
- `pnpm test` en verde, sin DOM.

## Commit

`feat: seeded question generators and grading for belts 1–2`

## Desviaciones
