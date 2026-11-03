# P10 · Repaso, oído, ubicación y pulido

**Rama:** `feat/p10-review-polish` · **Leer antes:** `docs/specs/03-exercise-engine.md` (repaso espaciado, oído), `docs/specs/05-progression.md` (ubicación), `DESIGN.md` (ceremonia, reduced-motion), `docs/specs/07-architecture.md` (rendimiento, a11y).

## Tareas

- [x] `features/review/schedule.ts`: actualizar la caja Leitner por respuesta (acierto: +1 hasta 5; fallo: vuelve a 1), `dueSkills(stats, unlocked, now)` y `buildReviewSet(...)` de 10 preguntas. Tests con fechas fijas.
- [x] `/repaso`: sesión de 10 preguntas con resultado al final; la tarjeta de inicio muestra "N habilidades para repasar hoy".
- [x] `/oido`: gimnasio auditivo libre por tipo (intervalos, acordes, escalas/modos, dictado), con selección de set y racha de aciertos de la sesión. Solo muestra lo desbloqueado más un "probar lo siguiente".
- [x] Prueba de ubicación: resultado con recomendación por habilidad y la marca `passed_by_placement` en los temas.
- [x] Ceremonia de cinturón (`BeltCeremony.tsx`): SVG del nudo animado, acordes I–IV–I con el engine, "Continuar"; con reduced-motion, estado final sin animación.
- [x] Recordatorio de respaldo (más de 14 días).
- [x] Auditoría a11y (parcial: ver desviaciones): tabular por todas las páginas, lector de pantalla en el teclado y el diapasón (VoiceOver), contraste (`scripts/contrast.mjs`), `lang="es"`, títulos únicos.
- [x] Auditoría de rendimiento: JS inicial de `/` < 120 KB gzip, Strudel/abcjs/Hydra solo donde se usan, Lighthouse móvil en `/` y en una lección (anota las cifras en el PR).
- [x] Hydra opcional en `/dojo` (switch "Visuales Hydra", carga perezosa, aviso de que consume GPU).
- [x] README (sin capturas: ver desviaciones): capturas, cómo desplegar en Vercel y cómo configurar la clave.

## Aceptación

- Un perfil con fallos en `interval-quality` ve esa habilidad primero en `/repaso`.
- Aprobar el combate M01 muestra la ceremonia y el header cambia al cinturón amarillo.
- Lighthouse móvil: Accesibilidad ≥ 95 y Rendimiento ≥ 85 en `/`.

## Commit

`feat: spaced review, ear gym, placement results and belt ceremony`

## Desviaciones

- `schedule.ts` no actualiza la caja: eso ya lo hacía `bumpSkill` en `rules.ts` desde P04 (acierto +1 hasta 5, fallo a 1) y lo usan práctica, prueba, repaso y oído. `schedule.ts` suma `isDue` (caja 1 y 2 al día, 3 a los 3 días, 4 a los 7, 5 a los 14), `priority` (la caja manda: cada caja vale 10 y el atraso suma hasta 10, así que un olvido largo sube como mucho una caja), `dueSkills`, `reviewMixes` (mezclas de práctica de los temas desbloqueados, agrupadas por la habilidad del generador) y `buildReviewSet` (10 preguntas ponderadas, la más urgente primero). Tests con fechas fijas, incluido el de la aceptación (`interval-quality` fallada sale primero).
- Gimnasio de oído: solo intervalos (básicos, mayores y menores, todos con tritono), ascendentes, descendentes o armónicos, con racha de la sesión y "Probar lo siguiente". Acordes, escalas/modos y dictado aparecen como "llega con el cinturón…": sus generadores (`ear-chord`, `ear-scale`, `ear-melody`) se escriben con el contenido de M03 en adelante (spec 03).
- Ubicación: el resultado nombra las habilidades falladas (con `SKILL_NAME_ES`) además de los temas a hacer; los temas ya mostraban "Aprobado por ubicación".
- Ceremonia: diálogo modal (`<dialog>` con `showModal`) que aparece la primera vez que se aprueba un combate, por autoevaluación o por el Sensei. El nudo se dibuja en 1,2 s con `stroke-dashoffset` (excepción a "solo transform y opacity" que ya prevé DESIGN.md); con reduced-motion se muestra atado y los acordes esperan al botón. Los módulos no tienen tonalidad propia: `cadence.ts` asigna una por orden en el círculo de quintas (M01 Do, M02 Sol…), con `ponytail:` y test.
- Recordatorio de respaldo: `needsBackupReminder` (puro, con test) en `/progreso` y ahora también como tarjeta en el inicio, junto a "N habilidades para repasar hoy".
- Hydra: `@strudel/hydra@1.2.6` y `hydra-synth@1.4.0` directos. `initHydra` de Strudel carga `hydra-synth` desde unpkg sin versión; se le pasa un módulo vacío y la copia local como global `Hydra` (y `global` = `globalThis`, que hydra-synth espera de Node). Así nada se descarga de un CDN. El canvas queda detrás de la página (`z-index: -1`) y se ve alrededor de las tarjetas (`ponytail:`). Probado: activar crea el canvas y los globales (`osc`, `initHydra`), sin pedidos a unpkg; apagar lo borra.
- Panel de referencia del Dojo: ya no se desborda a lo ancho con ejemplos largos (lo reportó el dueño), acompaña el scroll en escritorio y su barra usa el color del tema.
- Auditoría a11y: 61 páginas con `lang="es"` y títulos únicos (script sobre el build); Lighthouse accesibilidad 100 en `/` y en una lección; contraste 56 pares OK. No se pudo probar con VoiceOver ni tabular a mano desde el agente; el teclado y el diapasón ya se probaron con teclas reales en P06.
- Rendimiento (Lighthouse 13.6, móvil, build de producción servido en local): `/` rendimiento 90, accesibilidad 100, buenas prácticas 100, SEO 100, LCP 3,6 s, CLS 0,009; lección M01-T03: 99 / 100, LCP 1,7 s, CLS 0,002. El CLS de las lecciones (0,19) venía del cambio de fuente del cuerpo: se precarga Lexend. Precargar también Unbounded empeoraba el LCP. El LCP de `/` es alto porque el selector de perfil se dibuja con JS (depende de `localStorage`); mejorarlo pide un esqueleto estático, queda anotado. JS inicial de `/` sigue en ~45 KB gzip.
- README con despliegue en Vercel y configuración de la clave; sin capturas, porque la captura de pantalla de la extensión del navegador no funciona en este entorno.
