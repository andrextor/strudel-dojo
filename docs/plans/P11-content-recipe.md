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
| M03 Naranja | chord-spelling, chord-name (con inversiones), diatonic-chord, ear-chord | — (chordPerCycle ya existe) | [ ] |
| M04 Verde | harmonic-function, cadence-id, progression-roman, harmonize-note | rootsPerBar (ya existe) | [ ] |
| M05 Azul | transpose (by interval, by key), capo, modulation-pivot | matchesReference con `transposeBy` (ya existe) | [ ] |
| M06 Morado | mode-spelling, characteristic-note, ear-scale (modos), modal-progression | characteristicNoteRatio (ya existe) | [ ] |
| M07 Marrón | chord-spelling (séptimas), diatonic-chord (sevenths), tension-available, guide-tones | maxVoiceLeap (ya existe) | [ ] |
| M08 Rojo | secondary-dominant, borrowed-chord, tritone-sub, reharm-choice | chordFunctionAt (nueva: verifica que el acorde del ciclo i sea V/x, préstamo o subV) | [ ] |
| M09 Negro | minor-variants, pentatonic-box, symmetric-scale, chord-scale | scalePerCycle (nueva: notas del ciclo i dentro de la escala i) | [ ] |
| M10 Dan | form-id, layer-count, sound-design-choice | sectionsDistinct (nueva), layerCount (nueva) | [ ] |
