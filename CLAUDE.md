# CLAUDE.md

Guía para Claude Code (claude.ai/code) cuando trabaja en este repositorio.

## Proyecto

**Strudel Dojo**: app para aprender teoría musical completa y live coding con Strudel, organizada en 10 cinturones (módulos) de 4 temas. Cada tema tiene lección (MDX con ejemplos que suenan), práctica generada ilimitada, prueba calificada y katas Strudel validadas automáticamente. Cada módulo cierra con un combate creativo que revisa el Sensei (Claude). Tiene perfiles locales (dueño + su hijo), con el progreso en `localStorage`. Se despliega en Vercel.

El copy visible está en español; código, identificadores, nombres de archivo y comentarios van en **inglés**. Los comentarios son solo para lógica no obvia.

## Antes de tocar algo, lee

| Si vas a tocar… | Lee |
|-----------------|-----|
| Cualquier cosa (primera vez) | `docs/specs/00-product.md`, `docs/specs/07-architecture.md` |
| Contenido, módulos, lecciones | `docs/specs/01-curriculum.md`, `docs/specs/02-content-model.md` |
| Generadores, calificación, oído | `docs/specs/03-exercise-engine.md` |
| Strudel, editor, katas, audio | `docs/specs/04-strudel-engine.md` |
| Progreso, perfiles, respaldo | `docs/specs/05-progression.md` |
| Rutas API / Claude | `docs/specs/06-ai-sensei.md` (y carga la skill `claude-api`) |
| UI | `DESIGN.md` |

Los specs son requisitos. Si la implementación necesita desviarse (porque una API real de Strudel o de `tonal` difiere), actualiza el spec en el mismo PR y dilo en la descripción.

## Planes

El trabajo se ejecuta por fases en `docs/plans/` (índice y protocolo en `docs/plans/README.md`). Cada fase es una rama `feat/pNN-<slug>` y un PR. Marca las casillas del plan a medida que avanzas.

## Comandos (objetivo tras P00)

```bash
pnpm install
pnpm dev                 # http://localhost:4321
pnpm lint / lint:fix     # Biome
pnpm typecheck           # astro check
pnpm test                # node --test sobre src/**/*.test.ts (strip-types, sin framework)
pnpm build               # salida Vercel en .vercel/output
pnpm ci:check            # lint + typecheck + test + build — debe quedar verde en cada PR
```

Solo pnpm. Los tests importan `.ts` con extensión explícita y no importan módulos virtuales de Astro (`astro:*`) ni componentes; leen el contenido desde disco.

## Reglas de código

- TypeScript estricto (`astro/tsconfigs/strictest`). **Prohibido `any`**: usa `unknown` con type guards.
- Biome con 2 espacios, comillas simples, sin punto y coma y trailing commas.
- La lógica pura (`features/theory`, `features/exercises`, `features/strudel/{evaluate,query,assertions,errors}`, `features/progress/{rules,persist,points}`, `features/review/schedule`) no toca DOM, audio ni `astro:*`, y tiene `.test.ts` al lado.
- El cálculo musical siempre pasa por `tonal`; nada de listas de notas escritas a mano en la lógica.
- Las páginas en `src/pages/` son solo rutas: cada una monta una isla Preact (`client:only="preact"` cuando depende de `localStorage`, `client:visible` en lecciones).
- Strudel se carga de forma perezosa (import dinámico) y nunca en la carga inicial de `/`.
- Atajos deliberados con techo conocido llevan un comentario `ponytail:` que nombra el techo y la mejora.

## Proyecto de referencia

`../test-maria-del-oceano` usa el mismo stack y patrones (storage seguro, `persist.ts` defensivo, `rules.ts` puro, `lib/claude.ts`, rate limit, Biome, `node --test`). Cuando un spec dice "igual que la referencia", mira ahí.

## Licencia

AGPL-3.0, porque Strudel es AGPL. El repo es público y el pie de página enlaza al código fuente.
