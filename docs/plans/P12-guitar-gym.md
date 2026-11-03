# P12 · Gimnasio de diapasón con guitarra real

**Rama:** `feat/p12-guitar-gym` · **Leer antes:** `docs/specs/08-guitar-gym.md`, `docs/specs/05-progression.md` (datos guardados, `persist.ts`), `DESIGN.md` (diapasón, estados), `src/features/theory/instruments.ts`, `src/components/music/Fretboard.tsx`.

Va después de P10 (no depende de su contenido, pero evita choques en `ProgressState` y el header).

## Tareas

### A · Entrada de audio

- [x] `features/guitar/pitch.ts`: YIN, `hzToMidi`, cents. Tests con seno y diente de sierra sintéticos en Mi2, La2, Do4 y Mi5 (±5 cents), silencio → `null`, ruido → `null`.
- [x] `features/guitar/onset.ts`: tracker de notas nuevas con `holdMs`. Tests: una nota sostenida emite un solo evento; dos notas seguidas emiten dos; el decaimiento no emite.
- [x] `features/guitar/timing.ts`: `judge` con ventana y latencia. Tests en los bordes de la ventana.
- [x] `features/guitar/mic.ts`: lista de entradas, apertura con los tres procesados en `false`, bucle de lectura y cierre limpio (para las pistas al salir de la página).
- [x] `features/guitar/metronome.ts`: clics programados con lookahead, acento, `beatTime(n)`.
- [x] Pantalla de inicio: selector de entrada, medidor de nivel + umbral, afinador, aviso de límites y calibración de latencia (8 clics).

### B · Ejercicio 1: una nota en todas las cuerdas

- [x] `drills.ts`: `buildNoteRound(rng, { pool, count })` sin repetir pitch class; `expectedPitches(pc, string, fretZone)` vía `fretToNote`; secuencia de cuerdas según rango y dirección. Tests: Do en cuerda 5 zona 0–12 = solo Do3; Do en cuerda 1 = solo Do5; Re♭ y Do♯ dan las mismas alturas y distinto texto.
- [x] Máquina de estados de la ronda (pura): `count-in → playing(noteIdx, stringIdx) → error → count-in` y `→ done`. Test: un error en la nota 3 vuelve a la nota 1.
- [x] Vista del ejercicio: nota grande, cuerda actual, pulso visible, puntos de la ronda, diapasón `display` con la posición correcta en rojo tras un error.
- [x] Configuración "por partes": cuerdas, dirección, zona, BPM, notas por ronda, notas elegibles, ayuda visual.
- [x] Resultado: BPM, intentos, "Subir a N+8 BPM", guarda `best`.

### C · Ejercicio 2: escala mayor por posiciones

- [x] `scales.ts`: posiciones `3nps` (7) y `caged` (5) para cualquier tónica con `tonal`. Tests: Sol mayor 3nps posición 1 empieza en cuerda 6 traste 3 y tiene 18 notas; todas las notas pertenecen a la escala; ninguna posición excede 5 trastes de ancho (CAGED).
- [x] Recorridos puros: subir, bajar, subir y bajar, terceras, grupos de 3 y 4. Tests sobre una secuencia de 7 notas.
- [x] Vista: diagrama visible/oculto, tónica marcada, modo con y sin tempo, corcheas.

### D · Integración

- [x] `ProgressState.guitar` opcional y su validación en `persist.ts` (dato corrupto → valores por defecto, sin perder el resto). Actualiza spec 05.
- [x] Ruta `src/pages/diapason.astro` con `GuitarGym` `client:only="preact"` y enlace en el header.
- [x] `docs/plans/README.md`: fila de P12.

## Aceptación

- Con una guitarra por la interfaz, el afinador muestra la nota correcta de las 6 cuerdas al aire.
- Ejercicio 1 con Do, cuerdas 5→1, 60 BPM: tocar Do3, Do4, Do4, Do4, Do5 a tiempo avanza; tocar Re en la cuerda 3 reinicia la ronda desde la primera nota.
- Una ronda de 5 notas sin errores muestra el resultado y queda guardada tras recargar.
- Escala de Sol mayor, posición 1 de 3nps, subir y bajar: la secuencia correcta termina el ejercicio; una nota fuera de la escala lo reinicia.
- Sin permiso de micrófono, `/diapason` explica cómo darlo y no rompe nada.
- Strudel no se carga en `/diapason` (el metrónomo es Web Audio directo).

## Commit

`feat: fretboard gym with live guitar input, note-on-every-string and major scale drills`

## Desviaciones

- Ejercicios extra (pedido del dueño): **Intervalos** (desde una nota dada en las cuerdas 6–4, tócala y luego la nota a ese intervalo, en cualquier cuerda; altura exacta), **Arpegios** (fundamental, tercera, quinta y octava de una tríada, en cualquier cuerda y octava pero siempre subiendo) y **Encuentra la nota** (sin metrónomo: una cuerda y una nota al azar, mide cuánto tardas; un error muestra dónde estaba y sigue).
- Todos los ejercicios con tempo comparten una sola pantalla (`TempoDrill`): un ejercicio es una lista de segmentos y cada paso dice qué alturas acepta (`accepts(midi, anterior)`), así que la máquina de estados y el metrónomo son los mismos para notas, escala, intervalos y arpegios.
- El enlace va en los accesos del inicio, junto a "Oído": el header no tiene navegación.
- CAGED: cinco cajas de 5 trastes que empiezan en la cuerda 6 sobre los grados 7, 2, 3, 5 y 6; cada altura una vez, de grave a agudo. Para 3 notas por cuerda, la posición k empieza en el grado k (la 1 en la tónica).
- El detector de ataques también emite cuando la misma nota se vuelve a pulsar (un salto de nivel), porque el ejercicio 1 pide la misma altura en cuerdas seguidas (Do4 en las cuerdas 4, 3 y 2).
- La calibración toca 8 clics a 60 BPM y guarda la mediana del desfase entre cada nota y su clic; el ajuste manual queda visible.
- En corcheas, la cuenta de entrada es de 8 pasos (un compás).
- Pruebas: YIN con senos y dientes de sierra (Mi2, La2, Do4, Mi5 a ±5 cents), silencio y ruido; ataques; `judge` en los bordes; alturas por cuerda (Do en la 5 = Do3, en la 1 = Do5, C♯ = D♭); la máquina de la ronda (un error en la nota 3 vuelve a la 1); posiciones (Sol mayor 3nps posición 1 en la cuerda 6 traste 3 con 18 notas; CAGED ≤ 5 trastes en cinco tónicas); recorridos; los pasos de intervalos y arpegios; y el bloque `guitar` del progreso (validación y fusión).
- No verificado: con una guitarra real (afinador, ejercicios y calibración), porque el agente no tiene micrófono ni guitarra. La página renderiza sin errores, sin scroll horizontal y sin cargar los paquetes de Strudel.
