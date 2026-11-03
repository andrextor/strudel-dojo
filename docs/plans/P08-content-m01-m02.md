# P08 · Contenido de los cinturones blanco y amarillo

**Rama:** `feat/p08-content-m01-m02` · **Leer antes:** `docs/specs/01-curriculum.md` (M01, M02, pista auditiva y de instrumento), `docs/specs/02-content-model.md` (reglas de lecciones), el tutorial oficial de Strudel (strudel.cc, secciones "First Sounds", "First Notes", "First Effects", "Pattern Effects" y "Mini-Notation"), `docs/specs/00-product.md` (perfil del dueño).

## Objetivo

M01 y M02 completos y pulidos: 8 lecciones, mixes de práctica/prueba afinados, 2–3 katas por tema, la prueba de ubicación de M01 y los dos combates.

## Calibración

El dueño toca guitarra y piano, lee partitura y figuras, y conoce la escala mayor de forma básica: M01 debe sentirse como un repaso **ágil**, no como empezar desde cero. Su hijo puede no tener esa base: cada lección arranca con un "En 30 segundos" (lo esencial) y deja el detalle en secciones plegables. La pista Strudel retoma el tutorial oficial desde cero, pero con ejemplos musicales del tema, no los del tutorial copiados.

## Tareas

- [ ] Por tema (8): lección MDX de 5–8 minutos con "En 30 segundos", explicación, al menos 3 `<Listen>`/`<Example>`, teclado **y** diapasón cuando aplique, un `<StrudelRef>` por función Strudel nueva, y un cierre "Para la prueba necesitas…".
- [ ] Por tema: `practice.mix` y `test.mix` usando los generadores de P03, con más dificultad en la prueba (más alteraciones, intervalos descendentes, de oído). Prueba de 10 preguntas al 80 %.
- [ ] Por tema: 2–3 katas con dificultad creciente, las tres con `solution` válida y mensajes de aserción claros. La última kata del tema mezcla teoría y Strudel (p. ej. "toca la escala de La mayor con `n` + `scale` y acentúa la sensible").
- [ ] Prueba de ubicación de M01 (20 preguntas al 90 %) y de M02.
- [ ] Combates M01 y M02 tal como el spec 01, con rúbrica de 4 criterios.
- [ ] Revisión musical: cada explicación y cada lección se revisan contra `tonal` y con un ejemplo que suena. Que no haya teoría dicha solo de memoria.
- [ ] Revisión de copy: tono "chévere, no infantil", "tú", sin asumir edad ni género.

## Aceptación

- `pnpm test` valida todo el contenido (generadores, soluciones de katas, ejemplos de lecciones).
- Recorrido manual de M01 completo sin un solo texto provisional.
- Cada función Strudel usada en una kata aparece antes en una lección del mismo módulo o de uno anterior (incluye un test que lo compruebe con los `usesFunction` y los `<StrudelRef>`/código de lecciones).

## Commit

`feat: complete white and yellow belts content`

## Desviaciones
