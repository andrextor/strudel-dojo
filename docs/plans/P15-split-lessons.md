# P15 · Separar las lecciones y completar S01–S02

**Rama:** `feat/two-courses` (P13–P16 van en una sola rama, un commit por tarea) · **Leer antes:** `docs/specs/09-two-courses.md` (Cambios de contenido, Etapas y clasificación, Texto de teoría que hay que limpiar), `docs/specs/02-content-model.md` (reglas para escribir lecciones), `docs/specs/04-strudel-engine.md` (aserciones). Necesita P14.

Esta fase saca el código de las 40 lecciones de teoría y crea las lecciones de unidad. De S03 en adelante el contenido se mueve. S01 y S02 sí piden escribir: tres unidades nuevas, 11 katas y los ejemplos de sonido sin acordes. Van aquí y no después porque S03 depende de ellas: `M01-T04-K3` y `M01-BOSS` usan `stack`, que se enseña en S01-U04, y las katas de S02 usan `note`, que se enseña en S02-U01. M10-T03 y M10-T04 se reescriben en P16.

## Tareas

### Lecciones

- [x] Colección `strudelLessons` en `src/content/strudel-lessons/`, con `lessonSchema` por `unit` y `title`. `lesson` pasa a ser obligatorio en cada unidad.
- [x] `strudel/[stage]/[unit].astro` renderiza la lección. Quitar el enlace temporal a la lección de teoría.
- [x] `Listen.tsx`: prop `showCode`, por defecto `false`.
- [x] Extraer cada sección `## Strudel` a la lección de su unidad, según la columna "Lección desde" del spec 09.
- [x] Cada lección de unidad sigue la plantilla: "En 30 segundos", explicación, `<StrudelRef>`, `<Example>`, y un enlace "Viene de teoría" a los temas de `requires`.
- [x] Los `<Listen>` que pasan a lecciones de unidad llevan `showCode`.
- [x] Extracción a mano, sin encabezado que seguir: m06-t04, m08-t01, m08-t03, m09-t01, y los bloques sueltos de m01-t04 y m09-t04.
- [x] m10-t03 y m10-t04 se **copian**, no se cortan: esas dos lecciones siguen enteras hasta que P16 las reescriba.
- [x] Mover o quitar las referencias sueltas de la tabla "Texto de teoría que hay que limpiar", y reescribir las referencias al curso de origen (m08-t01: "como en el cinturón naranja").
- [x] Cada lección de teoría se relee entera después del corte: sin frases huérfanas, con el "Para la prueba necesitas…" correcto y al menos un `<Listen>` por concepto.
- [x] `rhythm-match.ts`: opciones con `●` y `·`, `prompt` y `explanation` sin mini-notation. El audio no cambia. Actualizar su test.
- [x] Revisar con `grep` los `prompt` y `explanation` de los generadores de M01–M09 por términos de Strudel.

### Unidades nuevas de S01 y S02

- [x] S01-U02 Mini-notation: lección con batería y katas S01-U02-K1, K2, K3.
- [x] S01-U03: kata S01-U03-K1 (`/`, `!`, `?`).
- [x] S01-U04 Capas de batería: lección con `stack` y katas S01-U04-K1, K2.
- [x] S02-U01 Sintes y samples: lección con `note` como "letras y octava", y katas S02-U01-K1, K2.
- [x] Katas S02-U02-K1, S02-U03-K1, S02-U04-K1.
- [x] Lecciones de S02-U02 a U04: reescribir con `note` los tres ejemplos de m10-t03 que usan `chord` o `scale`. S02-U04 enseña las 13 funciones que pregunta `sound-design`, incluida `orbit`.
- [x] Ninguna lección de S01 o S02 asume teoría. Los conceptos necesarios se explican en una línea.
- [x] Revisar que S01-BOSS y S02-BOSS se puedan aprobar con lo enseñado en su etapa.

### Tests y specs

- [x] `curriculum.test.ts`:
  - [x] Reactivar "función mostrada antes", recorriendo etapas y unidades en orden, sin excepciones.
  - [x] Las lecciones de teoría no contienen `<Example>`, `<StrudelRef>` ni `## Strudel` (M10-T03 y M10-T04 quedan exceptuadas hasta P16).
  - [x] `SNIPPET` revisa también `strudel-lessons/`.
  - [x] Cada unidad tiene su lección.
- [x] Specs: 02 (colección, `showCode`, regla sin código en teoría), 01 (quitar la columna Strudel de las tablas y apuntar al spec 09), 03 (`rhythm-match`).

## Aceptación

- Ninguna lección de teoría muestra código, ni en desktop.
- Cada lección de teoría se entiende leída sola.
- Cada función que una kata o un combate exige ya apareció en su unidad o antes, y el test lo comprueba sin excepciones.
- Un perfil sin teoría aprobada completa S01 y S02 enteras, combates incluidos.
- Las 131 katas pasan el test de `solution` y `starter`.
- Las islas de Strudel no se cargan en una lección de teoría hasta pulsar reproducir.

## Cierre

`pnpm test`, `pnpm lint` y `pnpm typecheck` mientras se trabaja. **No correr `pnpm ci:check`:** el dueño lo corre una sola vez, al terminar P16.

## Commit

`feat: theory lessons without code, a strudel lesson per unit, rhythm and sound stages complete`

## Desviaciones

- Las lecciones movidas no llevan "En 30 segundos": el encabezado de la unidad ya muestra su objetivo, y repetirlo no aportaba. Sí lo llevan las lecciones nuevas de S01 y S02.
- `details` de teoría se quedan en teoría aunque sigan a una sección `## Strudel`; el de `orbit` se movió a S12-U02.
- S01-U03-K1 solo ejercita `!`: `/` y `?` se explican en la lección, pero son aleatorios o de varios ciclos y no hay aserción que los exija.
- m10-t03 y m10-t04 se reescribieron en P16 en vez de copiarse primero.
