# P10 · Repaso, oído, ubicación y pulido

**Rama:** `feat/p10-review-polish` · **Leer antes:** `docs/specs/03-exercise-engine.md` (repaso espaciado, oído), `docs/specs/05-progression.md` (ubicación), `DESIGN.md` (ceremonia, reduced-motion), `docs/specs/07-architecture.md` (rendimiento, a11y).

## Tareas

- [ ] `features/review/schedule.ts`: actualizar la caja Leitner por respuesta (acierto: +1 hasta 5; fallo: vuelve a 1), `dueSkills(stats, unlocked, now)` y `buildReviewSet(...)` de 10 preguntas. Tests con fechas fijas.
- [ ] `/repaso`: sesión de 10 preguntas con resultado al final; la tarjeta de inicio muestra "N habilidades para repasar hoy".
- [ ] `/oido`: gimnasio auditivo libre por tipo (intervalos, acordes, escalas/modos, dictado), con selección de set y racha de aciertos de la sesión. Solo muestra lo desbloqueado más un "probar lo siguiente".
- [ ] Prueba de ubicación: resultado con recomendación por habilidad y la marca `passed_by_placement` en los temas.
- [ ] Ceremonia de cinturón (`BeltCeremony.tsx`): SVG del nudo animado, acordes I–IV–I con el engine, "Continuar"; con reduced-motion, estado final sin animación.
- [ ] Recordatorio de respaldo (más de 14 días).
- [ ] Auditoría a11y: tabular por todas las páginas, lector de pantalla en el teclado y el diapasón (VoiceOver), contraste (`scripts/contrast.mjs`), `lang="es"`, títulos únicos.
- [ ] Auditoría de rendimiento: JS inicial de `/` < 120 KB gzip, Strudel/abcjs/Hydra solo donde se usan, Lighthouse móvil en `/` y en una lección (anota las cifras en el PR).
- [ ] Hydra opcional en `/dojo` (switch "Visuales Hydra", carga perezosa, aviso de que consume GPU).
- [ ] README: capturas, cómo desplegar en Vercel y cómo configurar la clave.

## Aceptación

- Un perfil con fallos en `interval-quality` ve esa habilidad primero en `/repaso`.
- Aprobar el combate M01 muestra la ceremonia y el header cambia al cinturón amarillo.
- Lighthouse móvil: Accesibilidad ≥ 95 y Rendimiento ≥ 85 en `/`.

## Commit

`feat: spaced review, ear gym, placement results and belt ceremony`

## Desviaciones
