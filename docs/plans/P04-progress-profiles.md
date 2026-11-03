# P04 · Progreso, perfiles y persistencia

**Rama:** `feat/p04-progress-profiles` · **Leer antes:** `docs/specs/05-progression.md`, y en la referencia `src/features/progress/{rules,persist,store,points,use-app-data}.ts` y sus tests.

## Objetivo

Toda la lógica de avance, perfiles y almacenamiento, pura y probada, más el hook que usan las islas.

## Tareas

- [ ] `features/progress/types.ts`: `ProgressState`, `TestAttempt`, `KataRecord`, `BossRecord`, `SkillStat`, `Scroll`, `Prefs` (spec 05; `SenseiReview` se importa de `features/sensei/types.ts`, que se crea aquí solo con el tipo).
- [ ] `rules.ts`: `passes`, `percentOf`, `topicStatus`, `kataStatus`, `moduleStatus`, `isTopicPassed`, `isModulePassed`, `bossUnlocked`, `placementAvailable`, `recommendedNext`, `startTest(scope, mix, count, now, rng)`, `answerQuestion`, `submitTest(attempt, now)`, `recordKata`, `recordBoss`. Todas puras, con `now` y `rng` inyectados.
- [ ] `points.ts`: XP derivado y `beltFor(progress, curriculum)` con las rayas. `streak.ts`: racha en días según zona horaria local (los tests pasan la zona o fechas ya locales).
- [ ] `persist.ts`: `parseProgress(unknown)` defensivo (sin `any`), `emptyProgress()`, `createBackup`, `mergeBackup` (por id, sin borrar, el intento entregado gana).
- [ ] `features/profiles/profiles.ts`: `parseProfiles`, `createProfile(name, color, now, rng)` (nombre de 1 a 24 caracteres, sin duplicados ignorando mayúsculas), `removeProfile`, `setActive`.
- [ ] `store.ts`: lectura/escritura en `localStorage` con las claves del spec, más un aviso único si el almacenamiento falla.
- [ ] `use-progress.ts`: hook Preact que expone el perfil activo, el progreso y acciones; sincroniza entre islas y pestañas (`BroadcastChannel('dojo')` + evento `storage`).
- [ ] Tests: las 9 reglas del spec 05, una por una; ubicación aprobada vs reprobada; 8/10 aprueba y 7/10 no con 80 %; un tema no queda aprobado con la prueba aprobada y una kata pendiente; el combate solo se desbloquea con todos los temas; merge de respaldo idempotente (aplicarlo dos veces no cambia nada); un respaldo corrupto se rechaza con un mensaje en español; racha a través de medianoche y de un día sin actividad.

## Aceptación

- Cobertura de todas las funciones exportadas de `rules.ts`, `persist.ts`, `points.ts`, `streak.ts` y `profiles.ts`.
- Ningún `localStorage` fuera de `store.ts`/`lib/storage.ts`.

## Commit

`feat: progression rules, local profiles and backup merge`

## Desviaciones
