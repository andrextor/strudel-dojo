# P04 · Progreso, perfiles y persistencia

**Rama:** `feat/p04-progress-profiles` · **Leer antes:** `docs/specs/05-progression.md`, y en la referencia `src/features/progress/{rules,persist,store,points,use-app-data}.ts` y sus tests.

## Objetivo

Toda la lógica de avance, perfiles y almacenamiento, pura y probada, más el hook que usan las islas.

## Tareas

- [x] `features/progress/types.ts`: `ProgressState`, `TestAttempt`, `KataRecord`, `BossRecord`, `SkillStat`, `Scroll`, `Prefs` (spec 05; `SenseiReview` se importa de `features/sensei/types.ts`, que se crea aquí solo con el tipo).
- [x] `rules.ts`: `passes`, `percentOf`, `topicStatus`, `kataStatus`, `moduleStatus`, `isTopicPassed`, `isModulePassed`, `bossUnlocked`, `placementAvailable`, `recommendedNext`, `startTest(scope, mix, count, now, rng)`, `answerQuestion`, `submitTest(attempt, now)`, `recordKata`, `recordBoss`. Todas puras, con `now` y `rng` inyectados.
- [x] `points.ts`: XP derivado y `beltFor(progress, curriculum)` con las rayas. `streak.ts`: racha en días según zona horaria local (los tests pasan la zona o fechas ya locales).
- [x] `persist.ts`: `parseProgress(unknown)` defensivo (sin `any`), `emptyProgress()`, `createBackup`, `mergeBackup` (por id, sin borrar, el intento entregado gana), y la pareja código↔respaldo: `encodeBackup(backup): string` (JSON → base64 url-safe con prefijo `sdojo1:`) y `decodeBackup(text): Backup | null` que valida el prefijo y reusa `parseProgress`. Puro, sin DOM (el portapapeles lo maneja la isla en P07).
- [x] `features/profiles/profiles.ts`: `parseProfiles`, `createProfile(name, color, now, rng)` (nombre de 1 a 24 caracteres, sin duplicados ignorando mayúsculas), `removeProfile`, `setActive`.
- [x] `store.ts`: lectura/escritura en `localStorage` con las claves del spec, más un aviso único si el almacenamiento falla.
- [x] `use-progress.ts`: hook Preact que expone el perfil activo, el progreso y acciones; sincroniza entre islas y pestañas (`BroadcastChannel('dojo')` + evento `storage`).
- [x] Tests: las 10 reglas del spec 05, una por una; repetir una prueba aprobada no suma XP si no mejora el mejor intento; ubicación aprobada vs reprobada; 8/10 aprueba y 7/10 no con 80 %; un tema no queda aprobado con la prueba aprobada y una kata pendiente; el combate solo se desbloquea con todos los temas; merge de respaldo idempotente (aplicarlo dos veces no cambia nada); un respaldo corrupto (archivo o código) se rechaza con un mensaje en español; `decodeBackup(encodeBackup(b))` devuelve `b` y un código sin el prefijo `sdojo1:` se rechaza; racha a través de medianoche y de un día sin actividad.

## Aceptación

- Cobertura de todas las funciones exportadas de `rules.ts`, `persist.ts`, `points.ts`, `streak.ts` y `profiles.ts`.
- Ningún `localStorage` fuera de `store.ts`/`lib/storage.ts`.

## Commit

`feat: progression rules, local profiles and backup merge`

## Desviaciones

- **`submitTest(attempt, passPercent, now)`**: recibe el `passPercent` porque `TestAttempt` (spec 05) no lo guarda; sale del `test`/`placement` del currículo.
- **Reglas extra en `rules.ts`** que las islas necesitan: `isModuleUnlocked`, `openAttempt`/`saveAttempt` (regla 9), `placementAdvice` (regla 6, temas sugeridos por las `skill` falladas), `canSeeSolution`/`markSolutionSeen` (regla 10), `recordSubmission`, `recordPractice` y `bumpSkill` (Leitner simple: acierto sube una caja hasta 5, error vuelve a 1; la selección del repaso sigue siendo de P10 en `features/review/schedule.ts`).
- **`ProgressState.backedUpAt`** (nuevo, `string | null`) guarda la última descarga de respaldo para el recordatorio de 14 días de `/progreso`. Añadido al spec 05.
- **XP**: cuentan pruebas y ubicaciones, cada una por su mejor intento entregado (por XP, no por aciertos, para que la pista cuente). Los temas aprobados por ubicación también dan su bono de tema. Sin módulo aprobado el cinturón es `null` (la UI muestra "sin cinturón").
- **Racha**: el día de hoy sin actividad no corta la racha hasta que termina; `localDate` usa `Intl` con zona opcional para los tests.
- **Respaldo**: `parseBackup` (objeto), `readBackupFile` (texto JSON) y `decodeBackup` (código) devuelven `Backup | null`; `mergeBackup(current, backup)` da el error en español (`BACKUP_INVALID`) si recibe `null`, así archivo y código comparten mensaje y motor. `mergeProgress` es la fusión pura. El código no se comprime (`ponytail:` en `persist.ts`).
- **Perfiles**: duplicados ignorando mayúsculas pero no tildes (`Ivan` ≠ `Iván`). Crear un perfil lo deja activo. `BELTS` pasó a `curriculum/belts.ts` para que `profiles.ts` no meta zod en el bundle del cliente; `schema.ts` lo re-exporta.
- **`storage.ts`**: `writeItem` devuelve `boolean` y hay `removeItem`; `store.ts` marca `storageFailed()` en el primer fallo y el hook lo expone para el aviso único.
- **`use-progress.ts`**: `updateProgress` y `updateProfiles` releen del almacenamiento antes de aplicar el cambio (dos islas no se pisan); borrar un perfil desde `updateProfiles` borra su progreso. `writeProgress(id, p)` sirve para restaurar un respaldo como perfil nuevo.
- **Excepción a "ningún `localStorage` fuera de store/storage"**: el tema claro/oscuro de P00 (`ThemeToggle.astro`, script inline de `BaseLayout.astro`) lo lee directo porque corre antes del primer pintado.
- Fixtures de tests compartidas en `progress/test-helpers.ts` (leen el currículo real de disco). Tests: 97 pasan + 2 `todo`.
