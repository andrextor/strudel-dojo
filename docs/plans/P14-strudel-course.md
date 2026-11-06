# P14 · Curso Strudel: modelo, reglas y rutas

**Rama:** `feat/two-courses` (P13–P16 van en una sola rama, un commit por tarea) · **Leer antes:** `docs/specs/09-two-courses.md` (Curso Strudel, Etapas y clasificación), `docs/specs/02-content-model.md`, `docs/specs/06-ai-sensei.md`, `docs/specs/07-architecture.md`, `DESIGN.md`. Necesita P13.

Esta fase mueve katas y combates a las 12 etapas y abre `/strudel`. Las lecciones se separan en P15: mientras tanto `lesson` es opcional y la unidad enlaza a la lección de teoría de origen.

Las unidades que solo tienen katas nuevas (S01-U02, S01-U04, S02-U01) entran en P15. Mientras tanto, cada unidad movida enlaza a la lección del tema del que viene su primera kata.

## Tareas

### Modelo y contenido

- [ ] `schema.ts`: `stageSchema`, `unitSchema` y las regex de ids del spec 09. `lesson` opcional en esta fase. `moduleSchema` pierde `katas` y `boss`.
- [ ] `content.config.ts`: colección `stages`.
- [ ] Script de un solo uso (en el scratchpad, no se versiona) que lee las tablas del spec 09 y genera `src/content/stages/s01.json` … `s12.json`, moviendo katas y combates sin alterarlos. Lo escrito a mano se limita a títulos, `summary`, `goal`.
- [ ] Rúbrica de M01-BOSS: "los intervalos del módulo" pasa a "los intervalos de la etapa". Es el único cambio a un combate movido.
- [ ] Combates nuevos `S01-BOSS` y `S02-BOSS`, con rúbrica de 4 criterios, `passScore: 7` y pieza de referencia en `curriculum/boss-solutions/`.
- [ ] Adaptar las 3 katas marcadas en el spec: M01-T04-K2 (sin "corcheas"), M10-T03-K2 y M10-T03-K3 (con `note`). Conservan su id.
- [ ] `curriculum/index.ts`: `getStages`, y `findKata` y `findBoss` buscando en etapas.
- [ ] `curriculum.test.ts`:
  - [ ] Las pruebas de katas y combates recorren etapas.
  - [ ] Validaciones nuevas del spec 09: `requires` existe, cadena de etapas, lista fija de 120 katas y 10 combates.
  - [ ] La regla "función mostrada antes" se desactiva en esta fase con un comentario y vuelve en P15.

### Reglas

- [ ] `rules.ts`: `isStageUnlocked`, `isStagePassed`, `stageStatus`, `isUnitPassed`, `unitStatus`, `missingTheory`, `stageBossUnlocked`, `recommendedStrudel`. Eliminar `bossUnlocked`.
- [ ] `isModulePassed`: el combate se busca como `` `${module.id}-BOSS` `` en `progress.bosses`.
- [ ] `points.ts`: el XP de combate sale de `progress.bosses`.
- [ ] `types.ts`: `StageStatus` y `UnitStatus`.
- [ ] `rules.test.ts`:
  - [ ] S01 abierta en un perfil vacío, S02 cerrada hasta aprobar S01.
  - [ ] Una unidad con `requires` pendiente da `needs_theory`, y `missingTheory` lista esos temas.
  - [ ] Un tema aprobado por examen abre la unidad.
  - [ ] Un perfil con katas de M03 aprobadas ve S05 desbloqueada aunque S01 no esté aprobada, y esas unidades abiertas (reglas S1 y S2).
  - [ ] El combate abre con todas las unidades aprobadas y la etapa se aprueba con él.
  - [ ] `recommendedStrudel` salta una unidad en `needs_theory` si hay otra abierta, y devuelve esa unidad con sus temas si no hay ninguna.
- [ ] `points.test.ts`: los 300 por combate siguen sumando, incluidos los ids viejos y un `S01-BOSS`.

### Rutas e islas

- [ ] `paths.ts`: `strudelHref`, `stageHref`, `unitHref`, `kataHref` (`/strudel/kata/m02-t01-k1`), `bossHref` por etapa. Actualizar `paths.test.ts`.
- [ ] Páginas nuevas: `strudel/index.astro`, `strudel/[stage]/index.astro`, `strudel/[stage]/[unit].astro`, `strudel/[stage]/combate.astro`, `strudel/kata/[kata].astro`.
- [ ] Eliminar `m/[module]/combate.astro` y `m/[module]/[topic]/kata/[kata].astro`.
- [ ] `features/strudel-course/`: `StrudelHome.tsx`, `StageView.tsx`, `UnitPanel.tsx`. Reusar `StatusBadge`, `ProgressBar` y los patrones de `ModuleView` y `TopicPanel`.
- [ ] `KataView.tsx` y `BossView.tsx`: reciben etapa y unidad en lugar de módulo y tema. Los candados distinguen `locked` de `needs_theory`, y este último enlaza a los temas.
- [ ] `BossView.tsx`: la ceremonia aparece solo si `newlyPassedModule` devuelve un módulo. Quitar "Ganaste el cinturón" de los dos mensajes de aprobado: el texto dice que ganaste el combate o la etapa.
- [ ] `ModuleView.tsx` y `ResultView.tsx`: sin combate ni enlaces a katas.
- [ ] `TopicPanel.tsx`: pestañas Práctica · Prueba, sin el hash `#katas`, más "Practícalo en Strudel" con la lista que la página calcula en build. `topicStatus` deja de mirar katas para `in_progress`.
- [ ] `Home.tsx`: dos tarjetas "Continuar" y acceso directo a Strudel. Revisar si `AppHeader` necesita enlace.
- [ ] `api/sensei/review.ts`: busca el combate en etapas y arma las habilidades según el spec 09. El prompt usa `Stage:` en lugar de `Belt:`. `hint.ts` no cambia si `findKata` queda con la misma firma.
- [ ] `sensei/contracts.ts`: las regex de `kataId` y `bossId` aceptan los ids `Snn-Unn-Kn` y `Snn-BOSS`. Agregar los dos casos a `contracts.test.ts`.
- [ ] Specs: 01 (Estado de implementación), 02 (etapas), 05 (reglas S1–S6), 06 (búsqueda del combate), 07 (rutas y carpetas).

## Aceptación

- Un perfil vacío entra a `/strudel`, resuelve katas de S01 y no ve nada exigiendo teoría hasta S03.
- En S03-U01 sin M01-T01 aprobado, la unidad dice qué tema falta y enlaza a él.
- Con un respaldo que tenga katas y combates aprobados, todos siguen aprobados, el XP no baja y el cinturón no cambia.
- El Sensei revisa un combate viejo (M03-BOSS) y uno nuevo (S01-BOSS).
- Ganar M03-BOSS con los temas de M03 aprobados da el cinturón con ceremonia. Ganar S01-BOSS no muestra ceremonia.
- `/strudel`, una etapa, una unidad y una kata se revisan en 390 px y 1440 px.
- El JS inicial de `/` sigue por debajo de 120 KB gzip, y Strudel no se carga en `/`.

## Cierre

P14 y P15 se publican juntas (spec 09, Despliegue).

`pnpm test`, `pnpm lint` y `pnpm typecheck` mientras se trabaja. **No correr `pnpm ci:check`:** el dueño lo corre una sola vez, al terminar P16.

## Commit

`feat: strudel course with twelve stages, katas and bosses moved out of the belts`

## Desviaciones
