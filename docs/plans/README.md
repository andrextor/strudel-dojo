# Planes de construcción

Fases en orden. Cada fase es autocontenida: dice qué leer, qué construir, cómo verificar y cuándo está terminada. Están escritas para que las ejecute un agente de Claude Code sin más contexto que este repo (y `../test-maria-del-oceano` como referencia).

| Fase | Plan | Resultado |
|------|------|-----------|
| P00 | [Scaffold y design system](P00-scaffold.md) | Astro + Preact + Tailwind 4 + Biome + tests corriendo; tokens, layout y fuentes; deploy vacío en Vercel. |
| P01 | [Núcleo de teoría](P01-theory-core.md) | `features/theory`: parseo de notas (latina/americana), deletreo, intervalos, escalas, acordes, transporte. |
| P02 | [Modelo de contenido](P02-content-model.md) | Colecciones Astro con zod, módulo M01 en esqueleto, `curriculum.test.ts`. |
| P03 | [Motor de ejercicios](P03-exercise-engine.md) | RNG con semilla, registro de generadores, calificación, generadores de M01–M02. |
| P04 | [Progreso, perfiles y persistencia](P04-progress-profiles.md) | `rules.ts`, perfiles, storage, respaldo, XP/racha derivados. |
| P05 | [Motor Strudel](P05-strudel-engine.md) | Spike, motor, editor CodeMirror, visuales, evaluación en Node, aserciones de katas. |
| P06 | [Componentes musicales](P06-music-ui.md) | Teclado, diapasón, pentagrama, `QuestionCard` con todas las entradas, MIDI. |
| P07 | [Páginas y flujos](P07-pages-flows.md) | Todas las rutas del spec 07 navegables de punta a punta. |
| P08 | [Contenido M01–M02](P08-content-m01-m02.md) | Dos cinturones completos: lecciones, práctica, pruebas, katas y combates. |
| P09 | [Sensei](P09-sensei.md) | `/api/sensei/{hint,review,explain}` y la UI. |
| P10 | [Repaso, oído, ubicación y pulido](P10-review-polish.md) | Repaso espaciado, gimnasio de oído, prueba de ubicación, ceremonia de cinturón, rendimiento y a11y. |
| P11 | [Receta de contenido M03–M10](P11-content-recipe.md) | Procedimiento repetible para cada cinturón restante (una rama/PR por módulo). |
| P12 | [Gimnasio de diapasón](P12-guitar-gym.md) | `/diapason`: la guitarra real entra por la interfaz de audio; notas en todas las cuerdas, escala mayor por posiciones, intervalos, arpegios y "Encuentra la nota". |
| P13 | [Teoría sin depender de Strudel](P13-theory-progression.md) | Tema = prueba, módulo = temas + examen de cinturón. La ubicación pasa a ser el mismo examen. Sin mover contenido. |
| P14 | [Curso Strudel](P14-strudel-course.md) | 12 etapas en `/strudel`: katas y combates movidos, reglas propias, inicio con dos cursos. |
| P15 | [Separar las lecciones y completar S01–S02](P15-split-lessons.md) | Lecciones de teoría sin código, una lección por unidad de Strudel y las unidades nuevas de ritmo y sonido. |
| P16 | [M10 sin Strudel y cierre](P16-m10-closure.md) | Temas de timbre y tensión de M10, práctica en unidades y documentación final. |
| P17 | [Sincronización con Supabase](P17-cloud-sync.md) | El progreso viaja solo entre dispositivos, con `localStorage` como caché y enlace por correo. |
| P18 | Compañero del dojo | Criatura que lleva tu cinturón, reacciona a resultados y racha, y baila con tu patrón. Reglas en `DESIGN.md`. |

P05 y P06 pueden ir en paralelo tras P04. P08 necesita P07. P09 puede ir antes que P08 si se prefiere. P13–P16 van en orden y siguen `docs/specs/09-two-courses.md`.

## Protocolo para el agente

1. Lee `CLAUDE.md`, el plan de la fase y los specs que el plan lista en "Leer antes".
2. Crea la rama `feat/pNN-<slug>` desde `main` actualizado.
3. Trabaja en el orden de las tareas. Marca `- [x]` en este repo a medida que terminas cada una (el plan actualizado va en el PR).
4. Si un spec está mal o una API real difiere, corrige el spec en el mismo PR y anótalo en "Desviaciones" al final del plan.
5. Antes de abrir el PR, `pnpm ci:check` debe estar verde. Revisa la UI en 390 px y 1440 px cuando la fase la toque, con el navegador si está disponible.
6. Commit con Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`). El cuerpo es una lista de lo que cambió para el usuario, como en `../test-maria-del-oceano`.
7. Abre el PR con `gh pr create`: resumen, cómo probar y desviaciones. No hagas merge sin que el dueño lo pida.

## Definición de terminado (todas las fases)

- `pnpm ci:check` en verde.
- Sin `any`, sin hex fuera de `@theme`, sin `console.log` olvidados.
- La lógica pura nueva tiene tests.
- El copy nuevo está en español y sigue las reglas de `DESIGN.md`.
- Los criterios de aceptación del plan están verificados y descritos en el PR.
