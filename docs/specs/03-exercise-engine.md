# 03 · Motor de ejercicios de teoría

Los ejercicios de teoría **se generan** en lugar de escribirse a mano. Un generador recibe parámetros y una semilla y devuelve una pregunta con su respuesta, calculada con `tonal`. Por eso la práctica es infinita, nunca se recicla en silencio y es correcta por construcción. (Era la limitación principal del banco fijo de `test-maria-del-oceano`.)

Todo vive en `src/features/exercises/` como TypeScript puro con tests al lado, sin DOM.

## Tipos

```ts
type Seed = string                      // reproducible: `${topicId}:${attemptId}:${index}`

interface Question {
  id: string                            // = seed
  key: string                           // contenido canónico (p. ej. "interval-name:C4>E4"); dos preguntas con la misma key son la misma pregunta
  generator: string                     // id del generador
  skill: string
  prompt: string                        // español, puede incluir notación
  input: InputSpec                      // cómo se responde
  audio?: string                        // código Strudel a reproducir (ejercicios de oído)
  staff?: string                        // ABC a dibujar
  answer: Answer                        // respuesta canónica
  explanation: string                   // se muestra tras responder (práctica) o al entregar (prueba)
}

type InputSpec =
  | { kind: 'choice'; options: string[] }
  | { kind: 'note'; via: InputVia[] }                       // una nota
  | { kind: 'note-set'; via: InputVia[]; ordered: boolean; count?: number }
  | { kind: 'text'; placeholder: string }                   // cifrados, romanos, nombres de intervalo
  | { kind: 'rhythm'; options: string[] }                   // mini-notation candidatas

type InputVia = 'keyboard' | 'fretboard' | 'text' | 'midi'

type Answer =
  | { kind: 'choice'; index: number }
  | { kind: 'pitch-classes'; notes: string[]; spelling: 'strict' | 'enharmonic' }
  | { kind: 'text'; accepted: string[] }                    // ya normalizados

interface Generator<P> {
  id: string
  skill: string
  parseParams(raw: unknown): P | null   // valida los params del JSON
  generate(params: P, rng: Rng): Question
}

type Response =
  | { kind: 'choice'; index: number; hinted?: boolean }
  | { kind: 'notes'; notes: string[]; hinted?: boolean }    // nombres ya deletreados (o alturas con nombre elegido)
  | { kind: 'text'; value: string; hinted?: boolean }

type Grade = { correct: boolean; feedback?: string }        // feedback: p. ej. "Sonido correcto, deletreo incorrecto: en Re mayor es F♯, no G♭."
```

`grade(question, response)` es una función pura en `grade.ts` que despacha por `answer.kind`.

## Reglas de calificación

- **Deletreo estricto por defecto** en escalas, acordes y armaduras: en Sol mayor el 7.º grado es F♯, nunca G♭. Si la respuesta suena bien pero está mal deletreada, cuenta como **incorrecta**, con `feedback` que lo explica. Solo con `spelling: 'enharmonic'` (ejercicios de teclado de M01-T01 y de oído) se acepta cualquier enarmónico.
- El teclado y el MIDI no deletrean, solo dan alturas. Cuando la respuesta es estricta y se responde desde el teclado, la UI pide elegir el nombre (p. ej. F♯/G♭) en las teclas negras, o el ejercicio limita `via` a `text` y `fretboard`+nombre. El generador declara qué `via` admite.
- La entrada de texto acepta americano (`C#`, `Bb`), latino (`Do#`, `Sib`, `sol`), símbolos unicode (`♯`, `♭`, `𝄪`, `𝄫`) y mayúsculas/minúsculas mezcladas. `parseNoteInput` en `features/theory/` es el único parser.
- Intervalos: se aceptan `5J`, `5P`, `quinta justa`, `P5`; tercera mayor como `3M`, `M3`, `tercera mayor`.
- Calificación de la prueba: aritmética entera, sin redondeo: `correct * 100 >= passPercent * total`. 8/10 aprueba con 80 %, 7/10 no.

## RNG con semilla

`src/lib/random.ts`: un PRNG pequeño (mulberry32 o sfc32) con semilla string hasheada. Sirve para reproducir una pregunta guardada, escribir tests deterministas y evitar repetir preguntas idénticas dentro de un mismo intento (el registro compara `key`, no `id`, porque cada `id` es una semilla distinta y nunca se repite; si la `key` ya salió, reintenta con la semilla `${seed}:r${n}` hasta 20 veces). Un `mix` cuyo espacio de preguntas sea menor que `questions` es un error de contenido: el test de currículo lo detecta.

## Catálogo inicial de generadores

| id | Skill | Qué pregunta | Params |
|----|-------|--------------|--------|
| `note-name` | note-naming | Nombra la nota marcada (teclado/diapasón/pentagrama) o márcala. | `range`, `accidentals: none|sharps|flats|all`, `via` |
| `enharmonic` | note-naming | Enarmónico de X. | `allowDouble` |
| `semitone-count` | semitones | Semitonos entre dos notas. | `maxSemitones` |
| `interval-name` | interval-quality | Nombra el intervalo entre dos notas. | `maxInterval`, `qualities`, `direction` |
| `interval-build` | interval-quality | Nota a un intervalo X de Y. | igual |
| `interval-invert` | interval-quality | Inversión de un intervalo. | — |
| `scale-spelling` | *-scale-spelling | Escribe la escala X. | `scales[]`, `tonics[]` |
| `key-signature` | key-signatures | Armadura ↔ tonalidad (mayor o relativa menor). | `maxAccidentals`, `minor` |
| `relative-key` | relative-minor | Relativa menor/mayor de X. | `maxAccidentals` |
| `scale-degree` | scale-degrees | ¿Cuál es el grado N / el nombre funcional en X? | `scales[]` |
| `chord-spelling` | triad-quality / seventh-chords | Deletrea el acorde X. | `types[]`, `tonics[]` |
| `chord-name` | idem | Nombra el acorde de estas notas (incluye inversiones). | `types[]`, `inversions` |
| `diatonic-chord` | diatonic-chords-* | Acorde del grado N en la tonalidad X (romano ↔ cifrado). | `key`, `sevenths` |
| `transpose` | transpose-* | Transporta la melodía/acorde por un intervalo o a otra tonalidad. | `by: interval|key`, `length` |
| `mode-spelling` | mode-spelling | Escribe el modo X desde Y. | `modes[]` |
| `characteristic-note` | characteristic-note | ¿Cuál es la nota característica de X? | `modes[]` |
| `secondary-dominant` | secondary-dominants | V/x en la tonalidad Y. | `targets[]` |
| `chord-scale` | chord-scale | Escala para el acorde X en contexto Y. | — |
| `ear-interval` | interval-ear | Escucha e identifica el intervalo. | `set[]`, `direction: up|down|harmonic` |
| `ear-chord` | chord-ear | Calidad del acorde escuchado. | `types[]`, `inversions` |
| `ear-scale` | mode-ear | ¿Qué escala/modo suena? | `scales[]` |
| `ear-melody` | melodic-dictation | Toca en el teclado la melodía escuchada. | `length`, `scale`, `maxLeap` |
| `rhythm-match` | rhythm-reading | ¿Qué mini-notation suena como esta figura? | `meter`, `subdivision` |

Los generadores de los módulos posteriores se añaden en su fase de contenido. Cada generador nuevo trae su test con al menos 200 semillas, verificando que la respuesta sea válida según `tonal` y que el `prompt` no esté vacío.

## Ejercicios de oído

La pregunta trae `audio`: código Strudel (p. ej. `note("c4 e4").s("piano")`) que reproduce el motor de `04-strudel-engine.md`. La tónica y el registro se sortean para que no se adivine por altura absoluta. Botones: "Repetir", "Más lento" (`.slow(2)`) y "Solo la primera nota". Se puede repetir sin penalización.

## Repaso espaciado

Cada respuesta en prueba o práctica actualiza `skillStats[skill]` (cuenta de aciertos y errores, última vez vista, caja Leitner 1–5). La sesión de "Repaso" toma 10 preguntas de las habilidades **ya desbloqueadas**, ponderando caja baja y tiempo desde la última vista. Las fórmulas viven en `features/review/schedule.ts` con tests.
