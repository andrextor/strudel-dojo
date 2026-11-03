# 07 · Arquitectura

Mismo stack y convenciones que `test-maria-del-oceano`, porque ya se probó en producción con Vercel. Las diferencias están marcadas con **≠**.

## Stack

| Pieza | Elección | Nota |
|-------|----------|------|
| Framework | Astro 7 (estático + rutas API) | Igual que la referencia. |
| Islas | Preact + `@astrojs/preact` | Igual. |
| Estilos | Tailwind 4 (`@tailwindcss/vite`, tokens en `@theme`) | Igual. |
| Contenido | **≠** Colecciones de contenido Astro + `@astrojs/mdx` | El contenido es nuestro y se valida en build. |
| Teoría | **≠** `tonal` | Cálculo musical. |
| Audio y patrones | **≠** paquetes `@strudel/*` | Ver `04-strudel-engine.md`. |
| Pentagrama | **≠** `abcjs` | Solo lectura de partitura; carga perezosa. |
| Íconos | `lucide-preact` | Igual. |
| Fuentes | `@fontsource-variable/*` | Ver `DESIGN.md`. |
| IA | `@anthropic-ai/sdk` | Igual patrón. |
| Deploy | `@astrojs/vercel` | **≠** `maxDuration: 60` (no hay generación larga). |
| Calidad | Biome 2 (2 espacios, comillas simples, sin `;`, `noExplicitAny: error`), `astro check` en modo `strictest`, `node --test` con strip-types | Igual. |
| Paquetes | pnpm | Igual (`packageManager` fijado). |
| Node | 24 (`.nvmrc`) | Igual. |

Versiones: se fijan exactas en `package.json`. La base son las de la referencia (astro 7.4.2, preact 11.0.1, tailwind 4.3.3, biome 2.6.2, @anthropic-ai/sdk 1.1.0, lucide-preact 1.61.0) más la última estable de cada paquete nuevo al momento de P00.

## Rutas

Este proyecto **no usa query strings para ids**, a diferencia de la referencia: el contenido es estático y conocido en build, así que cada tema tiene su página generada con `getStaticPaths`. Solo el estado (progreso) vive en el cliente.

Los segmentos son los ids en minúsculas y sin prefijo repetido: `M01-T03-K1` → `/m/m01/t03/kata/k1`. `combate` y `ubicacion` son rutas estáticas y ganan sobre `[topic]`. Los módulos `draft` no generan páginas de tema.

| Ruta | Isla principal | Contenido |
|------|----------------|-----------|
| `/` | `Home` | Selector de perfil la primera vez; luego, el camino de cinturones, "Continuar" y la racha. |
| `/m/[module]` | `ModuleView` | Temas con su estado, prueba de ubicación y combate. |
| `/m/[module]/[topic]` | lección MDX (estática) + `TopicPanel` | Lección arriba; abajo, pestañas Práctica · Prueba · Katas. |
| `/m/[module]/[topic]/prueba` | `TestView` | Prueba calificada. |
| `/m/[module]/[topic]/kata/[kata]` | `KataView` | Editor, brief, aserciones en vivo, pista. |
| `/m/[module]/combate` | `BossView` | Editor, rúbrica, envío al Sensei. |
| `/m/[module]/ubicacion` | `TestView` (placement) | Prueba de ubicación. |
| `/resultado?intento=` | `ResultView` | El intento es dinámico (cliente), por eso usa query. |
| `/repaso` | `ReviewSession` | Repaso espaciado. |
| `/oido` | `EarGym` | Entrenamiento auditivo libre por tipo. |
| `/dojo` | `DojoRepl` | REPL libre. |
| `/progreso` | `ProgressView` | Estadísticas por habilidad, perfiles, respaldo, preferencias. |
| `/api/sensei/{hint,review,explain}` | — | `prerender = false`. |

## Carpetas

```
src/
  pages/                    # solo rutas
  layouts/BaseLayout.astro
  content/                  # modules/*.json, lessons/*.mdx
  content.config.ts         # esquemas zod
  components/
    ui/                     # Button (buttonClass), BeltBadge, ProgressBar, StatusBadge, Tabs, Callout…
    music/                  # Keyboard, Fretboard, Staff, NoteName (latina/americana según prefs)
  features/
    theory/                 # parseNoteInput, deletreo, intervalos, helpers sobre tonal (puro)
    exercises/              # generators/*, grade.ts, registry.ts, Question UI (QuestionCard.tsx)
    strudel/                # engine, evaluate, query, assertions, errors, editor e islas de lección
    curriculum/             # acceso tipado a las colecciones + curriculum.test.ts
    progress/               # rules, persist, store, use-progress, points, streak
    profiles/               # perfiles, selector
    review/                 # repaso espaciado (schedule.ts)
    sensei/                 # contratos, hint guard, cliente fetch
    <view>/                 # una carpeta por isla grande (home, module, topic, test, kata, boss, result, dojo…)
  lib/                      # storage, random, claude, rate-limit, json
  styles/global.css         # @theme con los tokens
```

Regla de dependencias: `features/theory`, `features/exercises` (salvo `.tsx`), `features/strudel/{evaluate,query,assertions,errors}`, `features/progress/{rules,persist,points}` y `features/review/schedule` son **puros**: sin DOM, sin `astro:*`, importables desde `node --test`. Los tests importan `.ts` con extensión explícita.

## Rendimiento

- La página de inicio y las lecciones no descargan Strudel hasta que el usuario pulsa reproducir (import dinámico dentro de la isla).
- Hydra y abcjs se cargan solo donde se usan.
- Presupuesto: JS inicial de `/` por debajo de 120 KB gzip. P07 lo mide con el reporte de build.

## Seguridad

- El código Strudel del usuario se ejecuta en su propio navegador (como en strudel.cc). Nunca se ejecuta código que venga de una URL u otra fuente sin que el usuario lo vea y pulse reproducir.
- Las rutas API validan el tamaño y la forma del body (type guards, sin `any`) y aplican rate limit.
- Sin datos personales: un perfil es solo un nombre y un color.

## Accesibilidad

- WCAG AA: contraste verificado en `DESIGN.md`, foco visible, todo operable por teclado.
- El teclado musical y el diapasón son operables con flechas + Enter, tienen `aria-label` con el nombre de la nota y anuncian la nota seleccionada.
- Los ejercicios de oído siempre ofrecen repetir; las animaciones respetan `prefers-reduced-motion`.
