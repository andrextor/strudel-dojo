# P00 · Scaffold y design system

**Rama:** `feat/p00-scaffold` · **Leer antes:** `CLAUDE.md`, `DESIGN.md`, `docs/specs/07-architecture.md`, y en `../test-maria-del-oceano`: `package.json`, `astro.config.ts`, `biome.json`, `tsconfig.json`, `src/styles/global.css`, `src/layouts/BaseLayout.astro`, `src/components/ui/button.ts`, `src/lib/storage.ts`.

## Objetivo

Un proyecto Astro vacío pero con todo listo: tooling idéntico a la referencia, los tokens de `DESIGN.md` en `@theme`, el layout base con header y pie, una página de inicio provisional y el deploy en Vercel funcionando.

## Tareas

- [x] `package.json` con `packageManager` pnpm, `engines.node >= 24` y los scripts de la referencia (`dev`, `build`, `preview`, `typecheck`, `lint`, `lint:fix`, `test`, `ci:check`). En el script `test`, el glob debe usar `"src/**/*.test.ts"`.
- [x] Dependencias con versión exacta: `astro`, `@astrojs/preact`, `@astrojs/vercel`, `@astrojs/mdx`, `preact`, `tailwindcss`, `@tailwindcss/vite`, `lucide-preact`, `@fontsource-variable/unbounded`, `@fontsource-variable/lexend`, `@fontsource-variable/jetbrains-mono`, `tonal`. Dev: `@astrojs/check`, `@biomejs/biome`, `typescript`, `@types/node`. Usa las versiones de la referencia donde coincidan; las nuevas, en su última estable. Si pnpm bloquea paquetes recientes por `minimumReleaseAge`, sigue el patrón de `pnpm-workspace.yaml` de la referencia.
- [x] `astro.config.ts`: preact, mdx, tailwind vite plugin, `vercel({ maxDuration: 60 })` y `env.schema.ANTHROPIC_API_KEY` opcional secreto de servidor.
- [x] `tsconfig.json` extendiendo `astro/tsconfigs/strictest` con JSX de Preact (igual que la referencia).
- [x] `biome.json`: copia el de la referencia y actualiza `$schema` a la versión instalada.
- [x] `src/styles/global.css`: `@import "tailwindcss"` y un `@theme` con **todos** los tokens de `DESIGN.md` (colores dojo, cinturones, fondos de estado con `color-mix`, glow, radios, fuentes). Base: `color-scheme: dark`, fondo `dojo-ink` con la rejilla y el degradado del spec, cuerpo de 17 px, `:focus-visible` neón, la regla de reduced-motion de la referencia y la utility `enter`.
- [x] `scripts/contrast.mjs`: lee los hex del `@theme`, calcula el contraste WCAG de cada par declarado en la tabla de `DESIGN.md` y falla si alguno queda por debajo de 4.5 (texto) o 3 (UI). Agrégalo a `ci:check`. La fórmula: luminancia relativa sRGB y `(L1 + 0.05) / (L2 + 0.05)`.
- [x] `src/lib/storage.ts` (copia de la referencia). `random.ts` llega en P03: no crees archivos vacíos.
- [x] `src/components/ui/button.ts` con las variantes de `DESIGN.md` y su test mínimo de clases.
- [x] `src/layouts/BaseLayout.astro`: importa fuentes y CSS, meta (`theme-color` = `dojo-ink`), `<title>{title} · Strudel Dojo</title>`, header provisional (logo con texto "Strudel Dojo" en `font-display`, sin isla todavía) y pie con "Hecho con Strudel (AGPL-3.0) · Código fuente" enlazando a `https://github.com/andrextor/strudel-dojo`.
- [x] `public/favicon.svg`: un torii o nudo de cinturón simple en `#ff6b3d` sobre `#0d0e17`.
- [x] `src/pages/index.astro` provisional: título, subtítulo y una muestra del design system (botones, badges de cinturón, tipografías) que sirva de "storybook" mientras tanto. Se reemplaza en P07.
- [x] `.vscode/extensions.json` recomendando Astro y Biome.
- [x] Conecta Vercel: el dueño importa el repo en Vercel (déjalo escrito en el PR). Verifica que `pnpm build` produzca `.vercel/output`.

## Aceptación

- `pnpm ci:check` en verde (lint, typecheck, test, contrast, build).
- `pnpm dev` muestra la página de muestra con fondo tinta, las tres fuentes cargadas, foco neón visible al tabular y sin scroll horizontal en 390 px.
- Ningún hex fuera del `@theme` (verificable con `grep -rn "#[0-9a-fA-F]\{6\}" src --include=*.tsx --include=*.astro`).

## Commit

`chore: scaffold Astro, Tailwind design tokens and tooling`

## Desviaciones

- **Tema claro/automático (cambio de alcance a pedido del dueño).** El spec decía oscuro único; ahora hay selector **oscuro / claro / automático** (`components/ui/ThemeToggle.astro`, `data-theme` + `localStorage` `dojo_theme`, script anti-flash en el `<head>`). Se añadió una paleta clara (versiones joya) y `scripts/contrast.mjs` revisa **los dos temas** (56 pares). Actualizados `DESIGN.md` (reglas 3, tablas de color) y `docs/specs/00-product.md`. El editor Strudel y los visuales se afinarán para claro en P05.
- **Cinturones independientes del tema.** El texto sobre cinturones pasó de `dojo-ink` a un token fijo `belt-on` (`#0d0e17`), y el negro usa `belt-white`, para que el contraste aguante en ambos temas sin invertir los colores literales de los cinturones.
- **Versiones.** Node 24 (`engines`), `astro` 7.4.2, `@astrojs/vercel` 11.0.16 y `typescript` 6.0.3 como la referencia; `@astrojs/mdx` 8.1.2 (nuevo, compatible con astro ^7.2.10). No se necesitó `pnpm-workspace.yaml` con `minimumReleaseAgeExclude`: no hay `minimumReleaseAge` global activo y todos los paquetes son suficientemente antiguos. Se añade si CI de otra máquina lo bloquea.
- **`theme-color`.** Son dos `<meta>` con `media` (uno por tema): no pueden leer una variable CSS, así que llevan hex literal. Es la única excepción de hex fuera de `@theme`, aparte del favicon.
- **Fondo.** A pedido del dueño se quitó la cuadrícula de 32px (cansaba la vista); quedó solo el degradado radial suave (violeta arriba, torii abajo-derecha), estático, derivado de tokens con `color-mix`.
- **Verificación visual.** `pnpm ci:check` queda verde. No se pudo tomar captura con la extensión de Chrome (timeout de inyección reproducible, reportado); revisar a ojo con `pnpm dev` en 390 px y 1440 px y probar el toggle de tema.
- **Vercel.** Falta que el dueño importe el repo en Vercel. `pnpm build` ya produce `.vercel/output`.
