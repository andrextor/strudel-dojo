# 01 · Currículo

Diez cinturones. Cada uno tiene 4 temas, y cada tema une teoría (T) con una pista Strudel (S). Los ids son estables: módulo `M01`…`M10`, tema `M01-T01`, kata `M01-T01-K1`, combate `M01-BOSS`.

Leyenda de tipos de ejercicio (definidos en `03-exercise-engine.md`): `choice`, `note`, `note-set`, `interval`, `chord`, `roman`, `transpose`, `staff-read`, `ear-interval`, `ear-chord`, `ear-scale`, `ear-melody`, `rhythm`. Las katas usan las aserciones de `04-strudel-engine.md`.

Cada tema define: objetivos medibles, generadores de práctica/prueba, 1–3 katas, y la habilidad (`skill`) que alimenta el repaso espaciado.

Las listas de "Habilidades" de cada módulo son las de teoría. Los generadores de oído alimentan sus propias habilidades transversales: `interval-ear`, `chord-ear`, `mode-ear` y `melodic-dictation` (ver catálogo en `03-exercise-engine.md`). Un tema que tenga práctica de oído las agrega a su `skills`.

---

## M01 · Cinturón blanco · Reactivar fundamentos

Calibrado para quien ya leyó partitura: va rápido y rellena huecos. Tiene prueba de ubicación.

| Tema | Teoría | Strudel |
|------|--------|---------|
| T01 Notas y alteraciones | Nombres latinos y americanos (Do=C), sostenidos, bemoles, dobles, enarmonía, ubicar notas en teclado y diapasón (afinación estándar). | Primeros sonidos: `s("bd hh sd hh")`, `bank`, tempo con `.cpm()`. |
| T02 Tonos, semitonos y escala cromática | Semitono/tono en teclado y trastes, escala cromática ascendente (♯) y descendente (♭). | `note("c d e f")`, octavas (`c3`, `c4`), `note` con números MIDI (60 = Do central). |
| T03 Intervalos | Número + calidad (2m…8J), conteo de semitonos, intervalos en teclado y en mástil (formas de guitarra), inversión de intervalos. | Mini-notation: `~`, `*`, `[ ]`, `< >`, `,` (polifonía) para tocar intervalos armónicos y melódicos. |
| T04 Ritmo y métrica | Figuras y silencios, compases simples y compuestos, subdivisión, síncopa, tresillo. Relación figura ↔ ciclo de Strudel. | Ciclos, `/`, `!`, `@`, `?`, ritmos euclidianos `bd(3,8)`. |

- Habilidades: `note-naming`, `semitones`, `interval-quality`, `rhythm-reading`.
- Ejercicios: `note` (texto, solfeo, teclado, diapasón), `staff-read`, `interval`, `ear-interval` (2M, 3M, 4J, 5J, 8J primero), `rhythm` (elegir el patrón mini-notation equivalente a una figura).
- **Combate M01**: un beat de 4 compases con bombo, caja y hi-hat más una línea de 8 notas que use al menos 3 intervalos distintos. Rúbrica: ritmo coherente, uso de mini-notation variada, intervalos pedidos presentes (aserción), musicalidad.

## M02 · Cinturón amarillo · Escala mayor y tonalidades

| Tema | Teoría | Strudel |
|------|--------|---------|
| T01 Construir la escala mayor | Fórmula T-T-S-T-T-T-S, deletreo correcto en las 15 tonalidades (una letra por grado). | `n("0 1 2 3 4 5 6 7").scale("C:major")`, cambiar tónica. |
| T02 Armaduras y círculo de quintas | Orden de sostenidos (Fa Do Sol Re La Mi Si) y bemoles, leer armaduras, círculo de quintas, tonalidades vecinas. | `scale("<C G D A>:major")`, alternancia por ciclo. |
| T03 Grados y funciones de nombre | Tónica, supertónica, mediante, subdominante, dominante, superdominante, sensible; grados en números. | `.slow`, `.fast`, `.rev`, `.palindrome` sobre grados. |
| T04 Relativa menor y menor natural | Relativa (6.º grado), fórmula de la menor natural, armadura compartida. | `scale("A:minor")`, melodía en mayor que se vuelve menor. |

- Habilidades: `major-scale-spelling`, `key-signatures`, `scale-degrees`, `relative-minor`.
- **Combate M02**: melodía de 8 compases sobre un bajo, compases 1–4 en Sol mayor y 5–8 en su relativa, Mi menor. Aserciones: todas las notas en la armadura de Sol, bajo Sol en los compases 1–4 y Mi en los 5–8 (`rootsPerBar`), al menos 3 intervalos distintos. (La tonalidad es fija: el contenido es estático; sortearla queda para cuando el combate pueda generarse.)

## M03 · Cinturón naranja · Acordes y campo armónico

| Tema | Teoría | Strudel |
|------|--------|---------|
| T01 Tríadas | Mayor, menor, disminuida, aumentada: construcción por terceras y por intervalos desde la raíz. | `note("[c,e,g]")`, `chord("C Am F G")`. |
| T02 Inversiones y voicings | Fundamental, 1.ª y 2.ª inversión, cifrado con barra (C/E), voicings cerrados/abiertos, formas CAGED en guitarra. | `.voicing()`, `anchor`, `mode`. |
| T03 Campo armónico mayor | I ii iii IV V vi vii°, cifrado romano y americano, calidad por grado. | `n("0 3 4 0").chord(...)` / progresiones con `<>`. |
| T04 Campo armónico menor | i ii° III iv v VI VII en menor natural; por qué aparece el V mayor (adelanto de M09). | `arp`, `struct`, patrones de acompañamiento. |

- Habilidades: `triad-quality`, `inversions`, `diatonic-chords-major`, `diatonic-chords-minor`.
- Ejercicios: `chord` (deletrear, nombrar), `roman`, `ear-chord` (M/m/dim/aum).
- **Combate M03**: acompañamiento de 4 acordes diatónicos con voicing y arpegio, más un bajo en raíces. Aserción: cada ciclo coincide con el set de notas del acorde declarado.

## M04 · Cinturón verde · Función armónica y progresiones

| Tema | Teoría | Strudel |
|------|--------|---------|
| T01 Tónica, subdominante, dominante | Grupos funcionales, tensión y reposo, tritono del V. | `stack()` capas: bajo, acordes, batería. |
| T02 Cadencias | Auténtica perfecta/imperfecta, plagal, rota, semicadencia. | Cadencias como frases de 2 ciclos con `<>` anidado. |
| T03 Progresiones clásicas | I–V–vi–IV, I–vi–IV–V, ii–V–I, blues de 12 compases. | `arrange()`, `cat`, `seq`, forma de 12 compases. |
| T04 Armonizar una melodía | Elegir acordes por notas de la melodía, ritmo armónico. | Melodía y acordes sincronizados; `mask`, `euclid` para comping. |

- Habilidades: `harmonic-function`, `cadences`, `common-progressions`, `harmonization`.
- **Combate M04**: blues de 12 compases completo (batería, bajo caminante simple, acordes). Aserción: la secuencia de raíces por compás es la forma del blues.

## M05 · Cinturón azul · Transporte y círculo aplicado

| Tema | Teoría | Strudel |
|------|--------|---------|
| T01 Transportar por intervalo | Mover melodías y acordes conservando el deletreo correcto. | `.transpose()`, `.add(note(...))`. |
| T02 Transportar entre tonalidades | Por grados, capo en guitarra, instrumentos transpositores (B♭, E♭, F). | `scaleTranspose`, cambiar `scale` y mantener grados. |
| T03 Modulación básica | Tonos vecinos, acorde pivote, dominante de la nueva tonalidad. | Secciones con `arrange` en dos tonalidades. |
| T04 El círculo como mapa | Ciclos de quintas, ii–V encadenados, relaciones de tonalidad. | Generar ciclos con `<>` y `.add` incremental. |

- Habilidades: `transpose-interval`, `transpose-key`, `modulation`, `circle-of-fifths`.
- **Combate M05**: tomar una melodía dada, presentarla en la tonalidad original, transportarla a la dominante y volver. Aserción `matchesReference` por sección con transporte.

## M06 · Cinturón morado · Modos griegos

| Tema | Teoría | Strudel |
|------|--------|---------|
| T01 Modos como rotaciones | Jónico…locrio desde los grados de la mayor (relativos). | `scale("D:dorian")`, comparar con `C:major` desde D. |
| T02 Nota característica | Dórico (6M), frigio (2m), lidio (4♯), mixolidio (7m), eólico (6m), locrio (5♭). | Vamps de un acorde con la nota característica acentuada. |
| T03 Modos paralelos | Todos desde la misma tónica, ordenados de más brillante a más oscuro. | `scale("<C:lydian C:ionian C:mixolydian C:dorian ...>")`. |
| T04 Progresiones modales | i–IV dórico, I–♭VII mixolidio, i–♭II frigio, I–II lidio; drones y pedales. | Drones con `sustain` largo, `room`, `lpf`. |

- Habilidades: `mode-spelling`, `characteristic-note`, `parallel-modes`, `modal-progressions`.
- Ejercicios: `note-set` (deletrear modos), `ear-scale` (identificar el modo), `choice` (la nota característica).
- **Combate M06**: pieza modal de 16 compases en un modo sorteado que resalte su nota característica. Aserción: notas dentro del modo y nota característica presente en al menos el 10 % de los eventos melódicos.

## M07 · Cinturón marrón · Séptimas, extensiones y conducción de voces

| Tema | Teoría | Strudel |
|------|--------|---------|
| T01 Acordes de séptima | maj7, 7, m7, m7♭5, dim7, mMaj7. | `chord("Cmaj7 Dm7 G7")`. |
| T02 Campo armónico con séptimas | Imaj7 iim7 iiim7 IVmaj7 V7 vim7 viim7♭5. | Progresiones diatónicas con `.voicing()`. |
| T03 Tensiones | 9, 11, 13; disponibles vs evitadas por calidad de acorde. | Diccionarios de voicings, `dict`. |
| T04 Conducción de voces | Notas guía (3 y 7), movimiento mínimo, ii–V–I con guide tones. | Dos voces independientes en `stack`, `pianoroll` para ver el movimiento. |

- Habilidades: `seventh-chords`, `diatonic-sevenths`, `tensions`, `voice-leading`.
- **Combate M07**: ii–V–I en tres tonalidades con conducción de voces mínima. Aserción: el salto máximo de cada voz entre acordes es de 2 semitonos o menos.

## M08 · Cinturón rojo · Armonía avanzada

| Tema | Teoría | Strudel |
|------|--------|---------|
| T01 Dominantes secundarias | V/ii, V/IV, V/V, V/vi; resolución. | Insertar dominantes en una progresión base. |
| T02 Intercambio modal | Préstamos de la menor paralela (iv, ♭VI, ♭VII, ♭III). | Comparar versiones con `<>` y `sometimes`. |
| T03 Sustitución tritonal | ♭II7 por V7, ii–V relacionados. | Reharmonizar un ii–V–I. |
| T04 Disminuidos de paso y cromatismo | Disminuidos de paso, cromatismo en el bajo. | Bajo cromático con `.add` y `segment`. |

- Habilidades: `secondary-dominants`, `modal-interchange`, `tritone-sub`, `passing-chords`.
- **Combate M08**: reharmonizar una melodía dada usando al menos una dominante secundaria, un préstamo y una sustitución tritonal (aserciones por acorde), con explicación escrita que revisa el Sensei.

## M09 · Cinturón negro · Escalas avanzadas

| Tema | Teoría | Strudel |
|------|--------|---------|
| T01 Menor armónica y melódica | Construcción, por qué existen, modos clave: frigio dominante, lidio dominante, alterada. | `scale("A:harmonic minor")`, `scale("C:melodic minor")`. |
| T02 Pentatónicas y blues | Mayor/menor pentatónica, blues, las 5 cajas en guitarra. | Solos generados con `irand`, `perlin` sobre la escala. |
| T03 Simétricas | Tonos enteros, disminuida (T-S y S-T), cromática. | Patrones simétricos con `iter`, `ply`. |
| T04 Escala-acorde | Qué escala sobre qué acorde (maj7 → jónico/lidio, 7 → mixolidio/alterada, m7 → dórico…). | Improvisador: la escala cambia con el acorde de cada ciclo. |

- Habilidades: `minor-variants`, `pentatonic-blues`, `symmetric-scales`, `chord-scale`.
- **Combate M09**: solo generativo sobre un ii–V–I menor donde cada acorde usa su escala (aserción por ciclo: notas en la escala correcta).

## M10 · Dan · Composición y live coding

| Tema | Teoría | Strudel |
|------|--------|---------|
| T01 Forma y motivo | Motivo, frase, período; AABA, verso-coro-puente; desarrollo motívico. | `arrange` de secciones; variaciones con `off`, `jux`, `superimpose`. |
| T02 Arreglo en capas | Registro, densidad, contrapunto entre bajo, armonía, melodía y ritmo. | `orbit`, `gain`, `pan`, mezcla por capas. |
| T03 Diseño de sonido | Envolventes, filtros, efectos (reverb, delay, distorsión), sintes vs samples. | `adsr`, `lpf`, `lpq`, `room`, `delay`, `shape`, `vowel`, soundfonts. |
| T04 Performance | Transiciones, tensión/liberación, construir un set en vivo. | Señales (`sine`, `saw`, `rand`, `perlin`), `sometimesBy`, visuales Hydra. |

- **Combate final (Dan)**: pieza original de 2–4 minutos con forma clara, al menos 4 capas, una modulación o préstamo modal, y una sección generativa. La revisa el Sensei con la rúbrica completa y queda en la vitrina del perfil.

---

## Pista auditiva transversal

Desde M01, cada tema incluye un set de oído. Progresión: intervalos melódicos ascendentes → descendentes → armónicos → calidad de tríadas → inversiones → séptimas → modos → progresiones (I–IV–V–vi) → dictado melódico de 4–8 notas. Las notas de referencia suenan con el mismo motor Strudel (piano por defecto, opción guitarra).

## Pista de instrumento

Todos los ejercicios de notas, intervalos, escalas y acordes aceptan respuesta en **teclado**, **diapasón** o **texto**, según la preferencia del perfil. Las lecciones muestran ambos instrumentos lado a lado cuando aplica (formas de escala y acordes en guitarra, digitaciones en piano).

## Fuentes de verdad

- Cálculo musical: [`tonal`](https://github.com/tonaljs/tonal). Nunca se escriben a mano listas de notas en los generadores.
- Strudel: documentación oficial en strudel.cc y metadatos de `@strudel/reference`.
- Si la teoría de este documento contradice a `tonal` (nombres de escala, cifrado), gana `tonal` y se corrige este documento.
