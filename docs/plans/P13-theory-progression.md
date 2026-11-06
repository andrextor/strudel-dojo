# P13 · Teoría sin depender de Strudel

**Rama:** `feat/two-courses` (P13–P16 van en una sola rama, un commit por tarea) · **Leer antes:** `docs/specs/09-two-courses.md` (Curso Teoría, Decisiones), `docs/specs/05-progression.md`, `src/features/progress/rules.ts`.

Esta fase no mueve contenido. Cambia las reglas para que la teoría se apruebe sola. Al terminar, las katas y los combates siguen donde están, pero ya no bloquean la teoría. Se puede publicar sola. `bossUnlocked` sigue igual, pero como ahora depende de temas aprobados por prueba, el combate abre sin katas hasta que P14 lo mueva.

## Tareas

- [ ] `schema.ts`: `placement` pasa a `exam` con `questions`, `skipPercent`, `passPercent` y `mix`; obligatorio en módulos `ready`.
- [ ] `modules/m01.json` … `m10.json`: renombrar `placement` a `exam`, con `skipPercent: 90` y `passPercent: 80`.
- [ ] `rules.ts`:
  - [ ] Regla T1: `isTopicEarned` depende solo de la prueba.
  - [ ] Regla T3: `isModulePassed` = examen aprobado, o todos los temas aprobados y combate aprobado.
  - [ ] Regla T2: `examPassPercent(p, module)` devuelve `passPercent` con todos los temas aprobados y `skipPercent` si no.
  - [ ] `placementAvailable` pasa a `examAvailable`. `NextStep` gana `{ kind: 'exam'; moduleId }`.
  - [ ] `recommendedNext`: temas pendientes, luego el examen. El combate deja de ser un paso recomendado.
  - [ ] `bossUnlocked` no cambia todavía: se elimina en P14.
  - [ ] Regla T6: `newlyPassedModule(before, after, curriculum)`.
- [ ] `rules.test.ts`:
  - [ ] Un tema con prueba aprobada y katas pendientes está aprobado.
  - [ ] 16/20 aprueba con todos los temas y no aprueba con temas pendientes; 18/20 aprueba en los dos casos.
  - [ ] Un perfil con temas y combate aprobados conserva el módulo sin examen.
  - [ ] `newlyPassedModule` detecta el examen, el combate y la última prueba de tema con el combate ya ganado, y devuelve `null` si el módulo ya estaba aprobado.
  - [ ] Progreso monotónico: un perfil construido con las reglas viejas no pierde ningún tema ni módulo.
- [ ] `paths.ts`: `placementHref` pasa a `examHref` (`/m/[module]/examen`). Renombrar la página `ubicacion.astro` a `examen.astro`.
- [ ] `TestView.tsx`: calcula el umbral al entregar con `examPassPercent`. El título y el aviso dicen "Examen de cinturón" y explican los dos umbrales. Al entregar, en una prueba o en el examen, usa `newlyPassedModule`: si hay módulo recién aprobado muestra `BeltCeremony` y "Continuar" lleva al resultado; si no, va directo como hoy.
- [ ] `BossView.tsx`: reemplaza `passed && !win` por `newlyPassedModule` en sus dos caminos (autoevaluación y Sensei).
- [ ] `ResultView.tsx`: copy de examen y CTA al siguiente módulo. Tras aprobar una prueba, el CTA es el siguiente tema o el examen; quitar "Ir a las katas del tema", que con T1 ya no se alcanza.
- [ ] Renombrar `placement` en el resto de archivos que lo usan: `progress/labels.ts`, `progress-view/ProgressView.tsx`, `progress/test-helpers.ts`, `exercises/registry.test.ts`, `curriculum/curriculum.test.ts` y `curriculum/paths.test.ts`. El copy pasa a "Aprobado por examen" y "Examen ·".
- [ ] `ModuleView.tsx`: tarjeta "Examen de cinturón", con el umbral vigente y el mejor intento. Las katas y el combate se muestran como opcionales.
- [ ] `TopicPanel.tsx`: la pestaña Katas deja de presentarse como requisito.
- [ ] `Home.tsx`: la tarjeta "Continuar" maneja el paso `exam`.
- [ ] Specs: spec 05 (reglas 2, 4, 5 y 6), spec 02 (`exam`), spec 07 (ruta), `DESIGN.md` (ceremonia al ganar el cinturón, ícono `Compass` del examen). Tabla de `CLAUDE.md`: agregar `docs/specs/09-two-courses.md`.

## Aceptación

- Con solo pruebas aprobadas, sin una sola kata, un perfil termina M01 con el examen al 80 % y M02 se desbloquea.
- Aprobar el examen al 90 % sin hacer temas salta el módulo, igual que la ubicación.
- Un respaldo exportado antes de esta fase se restaura sin perder cinturones.
- `/m/m01/examen` funciona, y la ceremonia aparece una sola vez por cinturón, también al recargar `/resultado`.

## Cierre

`pnpm test`, `pnpm lint` y `pnpm typecheck` mientras se trabaja. **No correr `pnpm ci:check`:** el dueño lo corre una sola vez, al terminar P16.

## Commit

`feat: theory passes on tests and a belt exam, katas no longer gate it`

## Desviaciones
