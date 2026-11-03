# P08 · Contenido de los cinturones blanco y amarillo

**Rama:** `feat/p08-content-m01-m02` · **Leer antes:** `docs/specs/01-curriculum.md` (M01, M02, pista auditiva y de instrumento), `docs/specs/02-content-model.md` (reglas de lecciones), el tutorial oficial de Strudel (strudel.cc, secciones "First Sounds", "First Notes", "First Effects", "Pattern Effects" y "Mini-Notation"), `docs/specs/00-product.md` (perfil del dueño).

## Objetivo

M01 y M02 completos y pulidos: 8 lecciones, mixes de práctica/prueba afinados, 2–3 katas por tema, la prueba de ubicación de M01 y los dos combates.

## Calibración

El dueño toca guitarra y piano, lee partitura y figuras, y conoce la escala mayor de forma básica: M01 debe sentirse como un repaso **ágil**, no como empezar desde cero. Su hijo puede no tener esa base: cada lección arranca con un "En 30 segundos" (lo esencial) y deja el detalle en secciones plegables. La pista Strudel retoma el tutorial oficial desde cero, pero con ejemplos musicales del tema, no los del tutorial copiados.

## Tareas

- [x] Por tema (8): lección MDX de 5–8 minutos con "En 30 segundos", explicación, al menos 3 `<Listen>`/`<Example>`, teclado **y** diapasón cuando aplique, un `<StrudelRef>` por función Strudel nueva, y un cierre "Para la prueba necesitas…".
- [x] Por tema: `practice.mix` y `test.mix` usando los generadores de P03, con más dificultad en la prueba (más alteraciones, intervalos descendentes, de oído). Prueba de 10 preguntas al 80 %.
- [x] Por tema: 2–3 katas con dificultad creciente, las tres con `solution` válida y mensajes de aserción claros. La última kata del tema mezcla teoría y Strudel (p. ej. "toca la escala de La mayor con `n` + `scale` y acentúa la sensible").
- [x] Prueba de ubicación de M01 (20 preguntas al 90 %) y de M02.
- [x] Combates M01 y M02 tal como el spec 01, con rúbrica de 4 criterios.
- [x] Revisión musical: cada explicación y cada lección se revisan contra `tonal` y con un ejemplo que suena. Que no haya teoría dicha solo de memoria.
- [x] Revisión de copy: tono "chévere, no infantil", "tú", sin asumir edad ni género.

## Aceptación

- `pnpm test` valida todo el contenido (generadores, soluciones de katas, ejemplos de lecciones).
- Recorrido manual de M01 completo sin un solo texto provisional.
- Cada función Strudel usada en una kata aparece antes en una lección del mismo módulo o de uno anterior (incluye un test que lo compruebe con los `usesFunction` y los `<StrudelRef>`/código de lecciones).

## Commit

`feat: complete white and yellow belts content`

## Desviaciones

- Lecciones con `LessonKeyboard`/`LessonFretboard` (nuevos, `components/lesson/`): versiones de solo lectura que se renderizan en build y rotulan solo las notas marcadas, con el deletreo de la lección (B♭, no A♯) o el grado. `Keyboard`/`Fretboard` suman `names` para eso. Los diagramas usan notación latina (la lección es estática; las islas usan la del perfil). Spec 02 actualizado con los props reales (`Callout tone`, `StrudelRef name`, `Staff label`).
- `setcpm`/`setcps` solo existen en el REPL del navegador, no en la evaluación pura: las lecciones enseñan `.cpm()`, que sí. `sound` no está en `@strudel/reference` (es alias de `s`). `n` sin `scale` elige variantes de sample, no alturas: M01-T02 enseña `note` con números MIDI y `n` llega con `scale` en M02-T01. Spec 01 actualizado.
- Combate M02 en tonalidad fija (Sol mayor → Mi menor) con `rootsPerBar` para el cambio en el compás 5. Los combates no tienen `solution` en el contenido; la pieza de referencia de cada uno vive en `curriculum.test.ts` para no mandarla al navegador.
- Tests nuevos de contenido: ningún `starter` aprueba ya (atrapó M01-T01-K3, cuyo inicial `f# f#` pasaba porque la secuencia compara por sonido), cada función de una kata o combate aparece antes en una lección (StrudelRef o código), y ninguna lección sigue provisional.
- `suggest` ya no propone el mismo nombre que falló («¿quisiste decir `setcpm`?» para `setcpm`).
- Los tests de las reglas 2 y 10 suponían una kata por tema; ahora aprueban también las demás.
- La prueba de M02-T04 usa `scale-spelling` con escalas menores, que registra la habilidad `major-scale-spelling` (la del generador). Separarla en `minor-scale-spelling` queda para cuando haya un generador o un parámetro de skill.
- Revisión en Chrome: las 8 lecciones renderizan teclados, diapasones, pentagramas (abcjs con el color del tema), fichas y ejemplos, sin scroll horizontal en 390 px (las tablas anchas hacen scroll dentro de sí). El sonido no lo puede oír el agente; todo el código de las lecciones evalúa en el test.
