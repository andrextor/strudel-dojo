# P09 · Sensei

**Rama:** `feat/p09-sensei` · **Leer antes:** `docs/specs/06-ai-sensei.md`. **Carga la skill `claude-api` antes de escribir código.** En la referencia: `src/lib/claude.ts`, `src/lib/rate-limit.ts`, `src/pages/api/pista.ts`, `src/features/review/hint.ts` y sus tests.

## Objetivo

Pistas, revisión de combates y explicación de código con Claude, opcionales y seguras.

## Tareas

- [x] `src/lib/claude.ts`: constantes de modelo con su porqué, cliente perezoso que devuelve `null` sin clave, `json()`, `claudeError()` con mensajes en español (adaptados a "el Sensei").
- [x] `src/lib/rate-limit.ts`: copia de la referencia con su nota `ponytail:`.
- [x] `features/sensei/types.ts`, `contracts.ts`: parsers de request (type guards, límites de tamaño) y tipos de respuesta.
- [x] `features/sensei/hint-guard.ts`: `revealsAnswer(hint, question)` normaliza y busca la respuesta canónica (notas en ambos sistemas, intervalo corto y largo, cifrado, índice/texto de opción). Tests con pistas que la revelan y otras que no.
- [x] `features/sensei/score.ts`: puntaje ponderado de la rúbrica calculado en el servidor (puro, con test).
- [x] `/api/sensei/hint`, `/api/sensei/review`, `/api/sensei/explain` con `prerender = false`, structured outputs, system prompts del spec (código del usuario como datos delimitados), manejo de `refusal`, rate limits y respuesta 503 sin clave.
- [x] `/api/sensei/status` (GET, prerender false): `{ enabled: boolean }`, para que la UI sepa si mostrar los botones sin exponer nada.
- [x] UI: "Pedir pista al Sensei" en QuestionCard (prueba: una por pregunta y la mitad de XP; práctica: ilimitadas) y en KataView; tarjeta de revisión en BossView con "Escuchar variación" (validada con `evaluatePattern`); "Explícame este código" en `/dojo` y en `<Example>`.
- [x] Estados de carga (`LoaderCircle`), error con reintento y estado sin clave.

## Aceptación

- Sin `ANTHROPIC_API_KEY`: no aparece ningún botón del Sensei y el combate sigue siendo autoevaluable.
- Con la clave, en local: una pista no revela la respuesta en 10 pruebas manuales de `interval-name` y `scale-spelling`; una revisión de combate devuelve los 4 criterios y el puntaje coincide con el cálculo ponderado.
- Un código de 9 000 caracteres responde 413 con un mensaje claro.

## Commit

`feat: Sensei hints, boss reviews and code explanations with Claude`

## Desviaciones

- Contratos más estrictos que el spec: las pistas de kata y la revisión mandan solo `kataId`/`bossId` y el código. El servidor busca el contenido y corre las aserciones (y el resumen del patrón) en Node, así el navegador no puede inventar fallos, rúbrica ni pesos. Spec 06 actualizado.
- `score.ts` no se creó: el puntaje ponderado ya existía y estaba probado como `rubricScore` en `rules.ts` (P07); la ruta de revisión lo usa. El modelo solo puntúa cada criterio (0–10, redondeado y acotado en el servidor) y faltar un criterio es 422.
- `hint-guard.ts` reconoce notas en latino y americano (con ♯/#/b/♭, palabras y dobles), intervalos (3M, M3, tercera mayor, 5J/5P/P5), números en cifra y en palabra, nombres de grado y el texto de la opción, e ignora lo que ya dice el enunciado. Las notas naturales cuentan solo con mayúscula y fuera del inicio de frase, porque "la", "mi", "si", "re" y "do" son palabras comunes. Tests con pistas que revelan y que no.
- `persist.ts` exporta `readInput`, `readAnswer` y `readResponse` para que los contratos reutilicen los mismos parsers.
- Las rutas validan cuerpo (`content-length` y luego 32 KB) y forma antes de mirar la clave, para que un código de 9 000 caracteres dé 413 también sin clave.
- Pistas en prueba: una por pregunta; si la pregunta ya tiene una respuesta guardada con pista, la tarjeta no ofrece otra y la nueva respuesta sigue marcada `hinted`. Pedir pista sin responder y volver a la pregunta permite pedir otra: es un borde menor, anotado.
- El combate con clave conserva la autoevaluación al lado de la revisión del Sensei; la insignia dice "aprobado por el Sensei" o "autoevaluado".
- Prompts: el código va numerado dentro de `<code>`, y todo lo que viene del aprendiz va en etiquetas tratadas como datos. Tras la prueba real se agregó que respete la dirección del intervalo (una pista contó de la segunda nota a la primera) y que diga "el enunciado" (una dijo "la brief").
- `@anthropic-ai/sdk@1.1.0` (igual que la referencia) con `client.beta.messages.parse` + `betaJSONSchemaOutputFormat`. La revisión usa `fallbacks: "default"` (Sonnet 5.5); Haiku 5.5 no tiene fallback del servidor. Esfuerzo `medium` en pistas y revisión, `low` en explicaciones.
- El build ahora genera una función de servidor (25 MB) y Vercel avisa que el Node local es 23: el proyecto pide 24 (`.nvmrc`). Es del entorno, no del código.
- Verificado con la clave real: 10 pistas de `interval-name` y `scale-spelling`, ninguna da la respuesta; una revisión del combate M01 devolvió los 4 criterios y su puntaje (6,5) coincide con el cálculo ponderado; pista de kata sin solución; explicación línea por línea; en la UI, la pista de prueba quedó guardada como `hinted: true` y la tarjeta de revisión mostró puntaje, criterios, pasos y "Escuchar variación". Sin clave (`ANTHROPIC_API_KEY=` vacío): `status` da `enabled: false`, las rutas 503, y no aparece ningún botón del Sensei; el combate se autoevalúa.
