# P11 · Receta de contenido para M03–M10

Un módulo por rama y por PR: `feat/content-mNN-<cinturon>` (p. ej. `feat/content-m03-orange`). Repite esta receta para cada uno, en orden, sin saltarte ninguno, porque cada módulo se apoya en el anterior.

**Leer antes:** la sección del módulo en `docs/specs/01-curriculum.md`, `docs/specs/02-content-model.md`, `docs/specs/03-exercise-engine.md` (catálogo), `docs/specs/04-strudel-engine.md` (aserciones), y el PR de P08 como ejemplo de calidad.

## Receta

1. **Generadores nuevos.** Lista los generadores que pide el módulo y no existen (p. ej. M03: `chord-spelling`, `chord-name`, `diatonic-chord`, `ear-chord`). Impleméntalos con el estándar de P03 (200 semillas por test, explicación útil, deletreo estricto).
2. **Aserciones nuevas.** Si el combate o las katas necesitan una aserción que no existe, agrégala a `assertions.ts` con su test y documéntala en la tabla del spec 04.
3. **Funciones de Strudel.** Revisa en `@strudel/reference` que existan las funciones que pide el módulo (`voicing`, `arrange`, `scaleTranspose`…) con esa firma. Si no, ajusta el spec 01 y anótalo.
4. **Lecciones.** Cuatro MDX con el estándar de P08 ("En 30 segundos", ejemplos que suenan, teclado y diapasón, `<StrudelRef>` por cada función nueva, "Para la prueba necesitas…").
5. **Mixes.** Práctica y prueba por tema. La prueba incluye al menos un 20 % de preguntas de habilidades de módulos anteriores (repaso intercalado).
6. **Katas.** 2–3 por tema, con `solution` válida y dificultad creciente.
7. **Combate y ubicación.** El combate según el spec 01 (rúbrica de 4 criterios, `passScore` 7). La prueba de ubicación tiene 20 preguntas al 90 %.
8. **Estado.** Cambia `status` a `"ready"`.
9. **Verificación.** `pnpm ci:check` en verde, recorrido manual del módulo completo y revisión musical contra `tonal`.
10. **PR.** Título `feat: <cinturón> belt — <título del módulo>`, con la lista de generadores y aserciones nuevas y las desviaciones del spec.

## Checklist por módulo

| Módulo | Generadores nuevos (mínimo) | Aserciones nuevas probables | Hecho |
|--------|-----------------------------|-----------------------------|-------|
| M03 Naranja | chord-spelling, chord-name (con inversiones), diatonic-chord, ear-chord | — (chordPerCycle ya existe) | [x] |
| M04 Verde | harmonic-function, cadence-id, progression-roman, harmonize-note | rootsPerBar (ya existe) | [x] |
| M05 Azul | transpose (by interval, by key), capo, modulation-pivot | matchesReference con `transposeBy` (ya existe) | [x] |
| M06 Morado | mode-spelling, characteristic-note, ear-scale (modos), modal-progression | characteristicNoteRatio (ya existe) | [x] |
| M07 Marrón | chord-spelling (séptimas), diatonic-chord (sevenths), tension-available, guide-tones | maxVoiceLeap (ya existe) | [x] |
| M08 Rojo | secondary-dominant, borrowed-chord, tritone-sub, reharm-choice | chordFunctionAt (nueva: verifica que el acorde del ciclo i sea V/x, préstamo o subV) | [x] |
| M09 Negro | minor-variants, pentatonic-box, symmetric-scale, chord-scale | scalePerCycle (nueva: notas del ciclo i dentro de la escala i) | [x] |
| M10 Dan | form-id, layer-count, sound-design-choice | sectionsDistinct (nueva), layerCount (nueva) | [x] |

### M03 (rama `feat/content-m03-orange`)

- Generadores nuevos: `chord-spelling` (tríadas de las cuatro calidades, deletreo estricto, `spellAll` por params), `chord-name` (opciones con inversiones y calidades vecinas; las notas van en `marked`), `diatonic-chord` y `diatonic-chord-minor` (dos ids, uno por modo, para que cada uno registre su habilidad; pregunta el acorde de un grado o el grado de un acorde) y `ear-chord` (calidad de oído, con inversiones opcionales; habilidad nueva `chord-ear`). Los cuatro pasan el test de 200 semillas. Helpers en `theory/chords.ts`: `spellTriad`, `triadSymbol`, `diatonicTriads` (mayor y menor natural), con test.
- Hechos de Strudel verificados: el diccionario de `voicing` no conoce `Cdim` (en el código se escribe `Co`) y `C+` rompe la mini-notation (se escribe `Caug`); en las aserciones `chordPerCycle` usa el cifrado de `tonal` (`C#dim`). Para apilar terceras dentro de una escala, el `add` va sobre la cadena de números: `n("<0 … 6>".add("[0,2,4]"))`; sobre `n(…)` suma al control y no a los grados. `dict` no está en `@strudel/reference`; M03 no lo necesita.
- Combate con progresión fija (I–vi–IV–V en Do) para poder comprobarla: `chordPerCycle` más `rootsPerBar` para el bajo.
- La prueba de cada tema incluye 20–30 % de preguntas de módulos anteriores (intervalos, grados, relativas, escalas).
- El test de currículo ahora lista los módulos listos (`READY`) en vez de fijar M01 y M02.

### Referencia de Strudel en español (pedido del dueño, en esta misma rama)

- `scripts/translate-reference.mjs` traduce una vez las 507 descripciones de `@strudel/reference` con Claude Haiku 5.5 (lotes de 25, salidas estructuradas, el código entre comillas invertidas intacto) y escribe `src/features/strudel/ref-es.json` (70 KB, versionado; la app nunca llama a Claude para esto). Sin `--force` solo traduce lo que falte.
- El panel de referencia del Dojo muestra el español (y busca en español); las fichas `<StrudelRef>` de las lecciones muestran el español con el original en inglés plegado debajo. `InlineCode` (nuevo, en `components/ui`) pinta el `código`; lo usan también los mensajes de las aserciones.
- Un test exige traducción para cada función documentada (y comillas invertidas balanceadas): si se actualiza `@strudel/reference`, el test pide volver a correr el script.
- La traducción de `anchor` corrigió una explicación mía en M03-T02: `anchor` fija la nota más aguda del voicing (por defecto c5), no "alrededor de qué nota" se acomoda.

### M04–M10 (rama `feat/content-m04-m10`, escritos en paralelo por un agente por módulo)

Base común preparada antes: cada módulo registra sus generadores en `generators/mNN.ts` (`erase.ts` sacado del registro), el arnés de 200 semillas vive en `exercises/check-generators.ts` (ahora exige ≥ 12 preguntas distintas por caso, configurable), cada combate tiene su pieza de referencia en `curriculum/boss-solutions/mNN.ts` (solo test), el test de currículo deriva qué módulos están listos (deben ser un prefijo M01…Mk) y el test del registro arma las pruebas de los 10 módulos con 100 semillas y la ubicación con 30. Aserciones nuevas (spec 04): `chordFunctionAt`, `scalePerCycle`, `sectionsDistinct`, `layerCount`. `scaleName` acepta los dos puntos de Strudel (`A:harmonic:minor`). El gimnasio de oído ahora tiene intervalos, acordes, modos y dictado, cada ejercicio abierto por el tema o cinturón que lo enseña.

Generadores por módulo:
- **M04**: `harmonic-function` (sin iii, que es ambiguo), `cadence-id` (lectura u oído; la voz de arriba del acorde final distingue la auténtica perfecta de la imperfecta), `progression-roman`, `blues-bar`, `harmonize-note`. Funciones nuevas: `cat`, `seq`, `arrange`, `mask`.
- **M05**: `transpose-melody`, `transpose-key`, `capo`, `transposing-instrument` (B♭, E♭, F), `modulation-pivot`, `circle-of-fifths`. Funciones: `transpose`, `scaleTranspose`, `arrange`.
- **M06**: `mode-spelling`, `characteristic-note` (nota escrita, no opción), `parallel-mode`, `ear-scale` (habilidad `mode-ear`), `modal-progression`, `ear-melody` (habilidad `melodic-dictation`). Funciones: `gain`, `sustain` (nivel de la envolvente, no duración), `lpf`, `room`.
- **M07**: `seventh-spelling`, `diatonic-seventh`, `tension-available` (regla: una tensión a semitono de una nota del acorde se evita), `guide-tones`, `guide-tone-resolution`. Funciones: `mode("root")`, `dictionary` (`lefthand`, `guidetones`).
- **M08**: `secondary-dominant`, `borrowed-chord`, `tritone-sub`, `passing-chord` (en vez de `reharm-choice`). Funciones: `sometimes`, `segment`.
- **M09**: `minor-variant`, `pentatonic-spelling`, `symmetric-scale` (tónicas elegidas para que el deletreo de `tonal` no use dobles), `chord-scale`. Funciones: `irand`, `segment`, `perlin`, `range`, `ply`, `iter`. No hay generador de cajas pentatónicas: las cinco cajas van en la lección con el diapasón.
- **M10**: `motif-transform` (habilidad form), `layer-role`, `sound-design` (13 funciones en las dos direcciones), `performance-signal`. Funciones: `arrange`, `off`, `jux`, `superimpose`, efectos y señales.

Desviaciones comunes: todos los combates usan una tonalidad o modo fijo (el contenido es estático). M04: el combate comprueba la raíz de cada compás del blues, no la batería ni el bajo caminante (van en la rúbrica). M05: el combate compara la voz de arriba compás a compás (`noteSequence` highest), porque `matchesReference` compara la pieza entera y fallaría con acompañamiento. M07: II–V–I en Do, Si♭ y La♭ con `maxVoiceLeap` 2; `pianoroll` solo como ficha (el evaluador de Node no tiene `@strudel/draw`). M08: el V/IV solo cuenta como séptima (Do mayor solo es la tónica); el préstamo usa la menor natural. M09: el acorde de tónica del combate es Am6 (Am7 choca con la menor melódica). M10: `sectionsDistinct` cuenta ciclos distintos, así que es `usesFunction arrange` lo que obliga a escribir secciones; la duración de 2–4 minutos no se puede comprobar.

Hechos de Strudel encontrados (los usan las lecciones):
- El diccionario de `voicing` rechaza `Cmaj7` y `CmMaj7` (usar `C^7`, `Cm^7`), `Cdim` y `Cdim7` (usar `Co`, `Co7`). Algunos acordes quedan sin la quinta (`D7`, `Dm7`, `D♭7`): las katas que los necesitan completos usan `note("[…]")` o `mode("root")`.
- Las escalas con espacio se escriben con dos puntos: `harmonic:minor`, `melodic:minor`, `whole:tone`, `minor:pentatonic`…
- `usesFunction` no ve `sine` ni `perlin` (se usan sin paréntesis): las katas piden `range`.
- Las funciones aleatorias (`irand`, `perlin`, `rand`) son deterministas por ciclo al consultar, así que las aserciones sobre ellas son reproducibles.
- `fastcat` y `dict` no están en `@strudel/reference`; `dictionary` sí.

Pendiente menor: el formateador de notas de las aserciones nombra una nota fuera de escala por su enarmónico (un C♯ sale "D♭"). Viene de antes.
