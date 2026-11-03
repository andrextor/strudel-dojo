# P09 · Sensei

**Rama:** `feat/p09-sensei` · **Leer antes:** `docs/specs/06-ai-sensei.md`. **Carga la skill `claude-api` antes de escribir código.** En la referencia: `src/lib/claude.ts`, `src/lib/rate-limit.ts`, `src/pages/api/pista.ts`, `src/features/review/hint.ts` y sus tests.

## Objetivo

Pistas, revisión de combates y explicación de código con Claude, opcionales y seguras.

## Tareas

- [ ] `src/lib/claude.ts`: constantes de modelo con su porqué, cliente perezoso que devuelve `null` sin clave, `json()`, `claudeError()` con mensajes en español (adaptados a "el Sensei").
- [ ] `src/lib/rate-limit.ts`: copia de la referencia con su nota `ponytail:`.
- [ ] `features/sensei/types.ts`, `contracts.ts`: parsers de request (type guards, límites de tamaño) y tipos de respuesta.
- [ ] `features/sensei/hint-guard.ts`: `revealsAnswer(hint, question)` normaliza y busca la respuesta canónica (notas en ambos sistemas, intervalo corto y largo, cifrado, índice/texto de opción). Tests con pistas que la revelan y otras que no.
- [ ] `features/sensei/score.ts`: puntaje ponderado de la rúbrica calculado en el servidor (puro, con test).
- [ ] `/api/sensei/hint`, `/api/sensei/review`, `/api/sensei/explain` con `prerender = false`, structured outputs, system prompts del spec (código del usuario como datos delimitados), manejo de `refusal`, rate limits y respuesta 503 sin clave.
- [ ] `/api/sensei/status` (GET, prerender false): `{ enabled: boolean }`, para que la UI sepa si mostrar los botones sin exponer nada.
- [ ] UI: "Pedir pista al Sensei" en QuestionCard (prueba: una por pregunta y la mitad de XP; práctica: ilimitadas) y en KataView; tarjeta de revisión en BossView con "Escuchar variación" (validada con `evaluatePattern`); "Explícame este código" en `/dojo` y en `<Example>`.
- [ ] Estados de carga (`LoaderCircle`), error con reintento y estado sin clave.

## Aceptación

- Sin `ANTHROPIC_API_KEY`: no aparece ningún botón del Sensei y el combate sigue siendo autoevaluable.
- Con la clave, en local: una pista no revela la respuesta en 10 pruebas manuales de `interval-name` y `scale-spelling`; una revisión de combate devuelve los 4 criterios y el puntaje coincide con el cálculo ponderado.
- Un código de 9 000 caracteres responde 413 con un mensaje claro.

## Commit

`feat: Sensei hints, boss reviews and code explanations with Claude`

## Desviaciones
