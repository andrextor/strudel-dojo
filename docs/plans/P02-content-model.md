# P02 · Modelo de contenido

**Rama:** `feat/p02-content-model` · **Leer antes:** `docs/specs/02-content-model.md`, `docs/specs/01-curriculum.md` (M01), documentación de colecciones de contenido de Astro 7 (`src/content.config.ts`, loaders `glob`/`file`, `astro/zod`).

## Objetivo

Las colecciones `modules` y `lessons` con esquemas que rechacen contenido inválido en build, acceso tipado desde las islas, y el esqueleto de M01–M10 para que la navegación exista desde ya.

## Tareas

- [x] `src/content.config.ts`: colección `modules` (JSON, loader `glob` sobre `src/content/modules/*.json`) y `lessons` (MDX, `glob` sobre `src/content/lessons/*.mdx`), con los esquemas zod de Module, Topic, Kata, Boss, Placement, Assertion (unión discriminada por `type`) y MixEntry exactamente como en el spec 02.
- [x] Assertion se tipa como unión discriminada con los params de cada tipo de `docs/specs/04-strudel-engine.md`. Exporta el tipo TS inferido desde `features/curriculum/types.ts` (sin duplicarlo a mano: `z.infer`), **o**, si los tests en Node no pueden importar `astro/zod`, define los esquemas con `zod` directo en `features/curriculum/schema.ts` y reúsalos en `content.config.ts`. Elige lo que funcione con `node --test` y anótalo en Desviaciones.
- [x] `src/content/modules/m01.json` … `m10.json`: M01 y M02 con `status: "ready"` y todos los temas, pero con katas y mixes **mínimos** válidos (se completan en P08); M03–M10 con `status: "draft"`, títulos, cinturón, resumen y temas con `id`/`title`/`goal`/`skills` según el spec 01 (el esquema `draft` del spec 02 no exige el resto).
- [x] `src/content/lessons/m01-t01.mdx` … `m02-t04.mdx` con frontmatter y un párrafo provisional ("Lección en preparación").
- [x] `src/features/curriculum/index.ts`: `getCurriculum()` (orden por `order`), `findTopic(id)`, `findKata(id)`, `nextTopic(id)`, solo para uso en `.astro` y build. Para las islas, cada página pasa el slice de datos que necesita como props serializables (no se importa la colección en el cliente).
- [x] `src/features/curriculum/curriculum.test.ts`: lee los JSON del disco y verifica todo lo de "Validación extra" del spec 02 que ya sea posible. Lo que depende de P03 (generadores) y de P05 (soluciones de katas) se agrega en esas fases; deja en ese archivo la lista de chequeos pendientes con un `test.todo`.

## Aceptación

- Un JSON con un campo faltante o un `type` de aserción desconocido hace fallar `pnpm build` con un mensaje que nombra el archivo y el campo.
- `pnpm test` valida ids únicos, prefijos, lecciones existentes y la cadena de prerequisitos.

## Commit

`feat: typed curriculum content collections with M01–M10 skeleton`

## Desviaciones

- **Esquemas en `features/curriculum/schema.ts` con `astro/zod`** (no duplicados a mano). Se verificó que `astro/zod` (zod v4) y `astro/loaders` (`glob`) importan limpio en Node con strip-types, así que `content.config.ts` y los tests comparten el mismo esquema sin tocar `astro:*`. No hizo falta instalar `zod` aparte.
- **Unión discriminada por `status` a nivel de módulo** (no de tema): el módulo `ready` lleva temas completos (`topicReadySchema`) + `boss` + `placement?`; el `draft` lleva temas mínimos (`id/title/goal/skills`). Así un `draft` no exige lecciones ni katas, como pide el spec 02. Cada módulo tiene exactamente 4 temas (`.length(4)`).
- **`findBoss(moduleId)`** añadido al acceso tipado (el spec listaba `findTopic/findKata/nextTopic`); `BossView` lo necesitará.
- Los chequeos que dependen de P03 (generadores y params) y P05 (soluciones de katas, ejemplos de lecciones) quedan como `test.todo` en `curriculum.test.ts`.
- 38 tests (35 + 3 todo); build rompe correctamente ante un `type` de aserción desconocido nombrando archivo y ruta; `pnpm ci:check` verde.
