# 05 · Progresión, perfiles y persistencia

Todas las reglas viven en `src/features/progress/rules.ts` como funciones puras con tests, igual que en `test-maria-del-oceano`. La UI nunca decide si algo está aprobado; pregunta a `rules.ts`.

## Reglas

1. `M01` empieza desbloqueado. Un módulo se desbloquea cuando su `prerequisite` está aprobado.
2. **Tema aprobado** = prueba aprobada (`correct * 100 >= passPercent * total`, enteros, sin redondeo). Las katas no intervienen (ver `09-two-courses.md`).
3. Dentro de un módulo desbloqueado, los temas se pueden hacer en cualquier orden. El currículo sugiere un orden y la UI marca el "siguiente recomendado".
4. **Módulo aprobado** = examen de cinturón aprobado, **o** todos los temas aprobados y el combate `Mnn-BOSS` aprobado (aserciones + rúbrica `>= passScore`). Esta segunda opción conserva los cinturones ya ganados y sigue vigente.
5. La ceremonia de cinturón aparece cuando un módulo pasa a aprobado, sea por el examen, por el combate o por la última prueba de tema (`newlyPassedModule`).
6. **Examen de cinturón**: disponible en cada módulo desbloqueado y todavía no aprobado (para saltar M01 y M02 se aprueba el examen de M01 y luego el de M02). El umbral se decide al entregar: con todos los temas aprobados vale `passPercent` (80); con temas pendientes, `skipPercent` (90), y los temas quedan `passedByPlacement`. Si no se aprueba, el resultado indica qué temas conviene hacer según los errores por `skill`. En el almacenamiento el intento sigue siendo `kind: 'placement'`.
7. Los intentos de prueba son ilimitados (las preguntas se generan). Tras reprobar, la pantalla de resultado propone repasar la lección y practicar las habilidades falladas antes del siguiente intento, sin bloquear.
8. Las respuestas y explicaciones de una **prueba** solo se muestran al entregarla. En **práctica** se muestran al responder cada pregunta.
9. Una prueba abierta se guarda pregunta por pregunta: si se cierra la pestaña, se retoma.
10. **Kata con ayuda**: "Ver solución" se habilita tras 3 intentos fallidos. Ver la solución no aprueba nada: la kata se aprueba igual que siempre, al pasar las aserciones con tu código, pero queda `helped: true` y no da XP de kata. Cuenta como aprobada para el tema.

## Estados

```ts
type TopicStatus = 'locked' | 'not_started' | 'in_progress' | 'passed' | 'passed_by_placement'
type ModuleStatus = 'locked' | 'available' | 'exam_ready' | 'passed' | 'draft'
type KataStatus = 'not_started' | 'attempted' | 'passed'
```

## Datos guardados (por perfil)

```ts
interface ProgressState {
  version: 1
  attempts: TestAttempt[]               // pruebas y exámenes
  katas: Record<KataId, KataRecord>     // { code, attempts, passedAt: string | null, helped, solutionSeen }
  bosses: Record<BossId, BossRecord[]>  // historial de envíos con revisión
  skillStats: Record<Skill, SkillStat>  // repaso espaciado
  practiceDays: Record<LocalDate, { answered: number; correct: number }>  // LocalDate = 'YYYY-MM-DD' local; base del XP de práctica y la racha
  scrolls: Scroll[]                     // pergaminos del Dojo libre (máx. 20)
  prefs: Prefs                          // instrumento preferido, notación (latina/americana), MIDI, sonido, zurdo (`lefty`) y la última entrada elegida en una pregunta (`via`)
  backedUpAt: string | null             // última descarga de respaldo (recordatorio de 14 días)
  guitar?: GuitarState                  // gimnasio de diapasón (spec 08): latencia, umbral, entrada y mejor BPM por ejercicio; un dato corrupto vuelve a los valores por defecto sin tocar el resto, y al fusionar respaldos gana el mejor BPM
}

interface TestAttempt {
  id: string
  kind: 'test' | 'placement'
  scopeId: string                       // topicId o moduleId
  startedAt: string; submittedAt: string | null
  questions: Question[]                 // snapshot completo: se puede revisar aunque cambie el generador
  responses: (Response | null)[]
  correct: number | null; passed: boolean | null
}

interface BossRecord {
  submittedAt: string
  code: string
  assertions: { type: string; pass: boolean; message: string }[]
  review: SenseiReview | null           // ver 06-ai-sensei.md
  selfAssessed: boolean
  score: number; passed: boolean
}
```

Los puntos (XP) y la racha **se derivan** de lo guardado y nunca se almacenan, así no pueden desincronizarse:
- XP: 10 por pregunta correcta en prueba (5 si se pidió pista), contando solo el **mejor intento entregado** de cada prueba, para que repetirla no infle el XP; 2 por correcta en práctica, con tope de 100 por día de `practiceDays`; 30 por kata aprobada sin ayuda; 100 por tema; 300 por combate.
- Racha: días consecutivos con al menos una actividad calificada (`submittedAt`, `passedAt` de kata, o un día de `practiceDays` con `answered >= 10`).
- El rango visible es el cinturón del último módulo aprobado. Las "rayas" (stripes, 0–4) del cinturón siguiente cuentan los temas aprobados de ese módulo.

## Perfiles

```ts
interface Profile { id: string; name: string; color: BeltColor; createdAt: string }
```

- `localStorage`: `dojo_profiles_v1` guarda `Profile[]` y el `activeProfileId`; `dojo_progress_v1:<profileId>` guarda un `ProgressState`.
- Al entrar sin perfil se muestra "¿Quién entrena hoy?" con las tarjetas de los perfiles y "Nuevo perfil". Sin contraseñas: es un dispositivo compartido de confianza.
- El header muestra el perfil activo; cambiar de perfil es un clic.
- Borrar un perfil pide escribir su nombre (confirmación en línea, no `confirm()`) y antes ofrece descargar su respaldo.

## Persistencia

- `src/lib/storage.ts` envuelve `localStorage` con try/catch (copiar el de `test-maria-del-oceano`). Si el almacenamiento falla, la app sigue funcionando y avisa una vez que el progreso no se guardará.
- `persist.ts` parsea defensivamente (sin `any`; `unknown` + type guards). Datos corruptos no rompen la app: se descarta lo inválido y se conserva lo válido.
- Un hook `use-progress.ts` es la única forma de leer/escribir desde las islas, y difunde los cambios (evento `storage` + `BroadcastChannel`) para que el header y otras pestañas se actualicen.

## Respaldo

- El objeto de respaldo es `{ kind: 'strudel-dojo-backup', version: 1, exportedAt, profile, progress }`. Hay dos formas de sacarlo y meterlo, las dos sobre el **mismo** objeto y el **mismo** motor de fusión:
  - **Archivo JSON**: "Descargar respaldo" baja el `.json`; "Restaurar desde archivo" lo lee.
  - **Código**: "Copiar código" pone el respaldo como texto (JSON → base64 url-safe, con prefijo `sdojo1:`) en el portapapeles; "Pegar código" lo restaura. Es para pasar el progreso **entre dispositivos** (p. ej. laptop → celular) sin manejar archivos: se comparte el texto por el medio que sea. Si el texto no empieza por `sdojo1:` o no decodifica a un respaldo válido, se rechaza con un mensaje en español, igual que un archivo corrupto.
- "Restaurar respaldo" (desde archivo o código) **fusiona** sin borrar: intentos y registros por id, un intento entregado gana sobre su copia abierta, y los pergaminos se unen por id. En `katas` gana el registro aprobado (y, entre dos aprobados, el más antiguo); en `skillStats`, el de `lastSeen` más reciente; en `practiceDays`, el máximo por día; en `bosses`, la unión por `submittedAt`. Si la unión deja más de 20 pergaminos se conservan todos, y no se pueden guardar nuevos hasta bajar de 20. Se puede restaurar como perfil nuevo o sobre el actual.
- Recordatorio suave en `/progreso` si pasaron más de 14 días sin descargar respaldo.
