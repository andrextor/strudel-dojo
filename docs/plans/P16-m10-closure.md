# P16 · M10 sin Strudel y cierre

**Rama:** `feat/two-courses` (P13–P16 van en una sola rama, un commit por tarea) · **Leer antes:** `docs/specs/09-two-courses.md` (M10), `docs/specs/03-exercise-engine.md`, `docs/plans/P11-content-recipe.md` (estándar de calidad). Necesita P15.

Esta fase reescribe los dos temas de M10 que eran de Strudel, conecta la práctica opcional de las unidades y cierra la documentación.

## Tareas

### Práctica en unidades

- [ ] `practice` de S02-U04 (`sound-design`) y S12-U03 (`performance-signal`), renderizada en `UnitPanel` con `PracticeSession`. `PracticeSession` ya recibe la mezcla por props; su `topicId` solo arma la semilla, así que basta pasarle el id de la unidad.

### M10

- [ ] Generador `timbre-concept` (skill `timbre`): formas de onda, etapas de ADSR, filtros y efectos, sin nombres de funciones.
- [ ] Generador `tension-device` (skill `tension-release`): build-up, corte, pedal, densidad, registro.
- [ ] Los dos cumplen el estándar de P03: 200 semillas, 12 preguntas distintas o más y explicación útil. Nombres en `SKILL_NAME_ES`.
- [ ] Reescribir `m10-t03.mdx` como **Timbre y envolvente** y `m10-t04.mdx` como **Tensión y liberación**, sin código y con `<Listen>`.
- [ ] `m10.json`: títulos, `goal`, `skills`, mezclas de práctica y prueba, y `exam.mix` sin `sound-design` ni `performance-signal`.
- [ ] Quitar la excepción de M10-T03 y M10-T04 en el test de lecciones de `curriculum.test.ts`.

### Cierre del proyecto

- [ ] Specs: 00 (visión, alcance, métricas y tabla de usuarios), 01 (M10 y Pista), 03 (catálogo). Marcar el spec 09 como aplicado.
- [ ] `CLAUDE.md`: descripción del proyecto, tabla "Antes de tocar algo" y reglas de carpetas.
- [ ] `README.md`: describir los dos cursos.
- [ ] Recorrido manual de punta a punta con dos perfiles: uno solo de teoría en 390 px y uno solo de Strudel en laptop, hasta donde lo permita la teoría.

## Aceptación

- Un perfil puede ganar el Dan sin haber abierto una kata.
- Ninguna lección de teoría contiene `<Example>` ni `<StrudelRef>`, sin excepciones en el test.
- `sound-design` y `performance-signal` ya no aparecen en ninguna prueba de teoría.

## Cierre

`pnpm test`, `pnpm lint` y `pnpm typecheck` mientras se trabaja. **No correr `pnpm ci:check`:** el dueño lo corre una sola vez, al terminar P16.

## Commit

`feat: timbre and tension topics for the dan belt, practice in strudel units`

## Desviaciones
