# P01 · Núcleo de teoría

**Rama:** `feat/p01-theory-core` · **Leer antes:** `docs/specs/03-exercise-engine.md` (reglas de calificación), `docs/specs/01-curriculum.md` (vocabulario), la documentación de `tonal` (Note, Interval, Scale, Chord, Key, Mode, RomanNumeral, Progression).

## Objetivo

`src/features/theory/`: una capa fina y pura sobre `tonal` con lo que el resto de la app necesita y `tonal` no da tal cual: parsear la entrada del usuario (incluido el solfeo), mostrar nombres en notación latina o americana, nombres de intervalo en español y comparar deletreos.

## Tareas

- [x] `notes.ts`
  - `parseNoteInput(input): { pitchClass: string; octave: number | null } | null`: acepta `C#`, `c#4`, `Do#`, `do sostenido`, `Sib`, `si bemol`, `B♭`, `F𝄪`, `Ebb`, `mib`, espacios y mayúsculas mezcladas. Cuidado: `b` sola es Si, `bb` es Si♭, `sib` es Si♭.
  - `formatNote(pc, notation: 'latin' | 'american')` → `Do♯` / `C♯` (con unicode).
  - `sameSpelling(a, b)` y `sameSound(a, b)` (chroma).
  - `parseNoteList(input)` separando por espacios, comas o guiones.
- [x] `intervals.ts`
  - `parseIntervalInput`: `5J`, `5P`, `P5`, `quinta justa`, `3M`, `M3`, `tercera mayor`, `2m`, `segunda menor`, `4A`/`4aum`, `5d`/`5dim`, `8J`; devuelve el nombre `tonal` (`5P`).
  - `formatInterval(name, 'short' | 'long')` → `5J` / `quinta justa`.
  - `intervalBetween(a, b)` y `transposeNote(note, interval)` (delegan en tonal).
- [x] `scales.ts`: `spellScale(tonic, type)`, `modeOf(scale, degree)`, `characteristicNote(mode, tonic)` (dórico → 6.º, frigio → 2.º, lidio → 4.º, mixolidio → 7.º, eólico → 6.º, locrio → 5.º), `keySignature(key)` → `{ accidentals: string[]; count; type: 'sharp'|'flat' }`, `relativeMinor`/`relativeMajor`.
- [x] `chords.ts`: `spellChord(symbol)`, `parseChordInput` (acepta `Cmaj7`, `CΔ7`, `C7M`, `Do maj7`, `Cm`, `C-`, `Cdim`, `C°`, `Cø`, `Cm7b5`), `identifyChord(notes)` → símbolos candidatos con inversión (`C/E`), `diatonicChords(key, { sevenths })` con romano y cifrado.
- [x] `transpose.ts`: `transposeSequence(notes, interval)`, `transposeToKey(notes, fromKey, toKey)` conservando el deletreo de la tonalidad destino, y `capoShape(chord, capoFret)` para guitarra.
- [x] `instruments.ts`: `STANDARD_TUNING`, `fretToNote(string, fret, tuning)`, `noteToFrets(pc, tuning, maxFret)`, `keyboardRange(lowMidi, highMidi)`.
- [x] `es.ts`: diccionario de nombres en español (calidades de intervalo, tipos de escala y de acorde, nombres de grados). Úsalo en lugar de strings repetidos.
- [x] Tests (`*.test.ts` junto a cada archivo) con casos borde: dobles alteraciones, `Cb`/`E#`/`B#`, las 15 tonalidades mayores y sus relativas, enarmonías de escalas (`F# major` vs `Gb major`), solfeo con y sin tildes.

## Aceptación

- Cobertura de las 15 tonalidades mayores y menores en `spellScale` y `keySignature`, comparadas contra `tonal`.
- `parseNoteInput` tiene una tabla de casos con al menos 40 entradas, incluidas inválidas (`H`, `do##b`, `""`).
- Sin dependencias del DOM. `pnpm test` en verde.

## Commit

`feat: music theory core over tonal with Spanish input parsing`

## Desviaciones

- **Nombres canónicos de intervalo**: `tonal` normaliza a la forma número-primero (`3M`, `5P`, `4A`). `parseIntervalInput` acepta las dos (`M3`/`3M`, `P5`/`5P`, `5J`) y devuelve siempre la canónica de `tonal`. `formatInterval('short')` usa la convención española con `J` para justa (`5J`), `long` da `quinta justa`.
- **`keySignature(tonic, mode)`** en vez de `keySignature(key)`: segundo parámetro `'major' | 'minor'` (por defecto mayor), más claro que parsear la calidad del string. La armadura de una menor se calcula con `Key.minorKey`, que ya da `alteration`. Las alteraciones se derivan del orden de sostenidos/bemoles.
- **`capoShape`** usa deletreo enarmónico simple (bemoles vía midi), no CAGED. Lleva comentario `ponytail:` con el techo.
- **Unicode y solfeo**: `tonal` no parsea `♯ ♭ 𝄪 𝄫`, ni solfeo, ni latino; `parseNoteInput`/`parseChordInput`/`parseIntervalInput` normalizan todo eso a ASCII antes de delegar. `tonal` sí acepta `x` (doble sostenido), `°`, `ø`, `-`, `Δ`, pero **no** `Δ7` ni `7M`: el normalizador de acordes los convierte a `maj7`.
- **`index.ts`** reexporta la capa para un solo punto de import.
- 29 tests en verde; `pnpm ci:check` verde.
