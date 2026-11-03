# P12 · Gimnasio de diapasón con guitarra real

**Rama:** `feat/p12-guitar-gym` · **Leer antes:** `docs/specs/08-guitar-gym.md`, `docs/specs/05-progression.md` (datos guardados, `persist.ts`), `DESIGN.md` (diapasón, estados), `src/features/theory/instruments.ts`, `src/components/music/Fretboard.tsx`.

Va después de P10 (no depende de su contenido, pero evita choques en `ProgressState` y el header).

## Tareas

### A · Entrada de audio

- [ ] `features/guitar/pitch.ts`: YIN, `hzToMidi`, cents. Tests con seno y diente de sierra sintéticos en Mi2, La2, Do4 y Mi5 (±5 cents), silencio → `null`, ruido → `null`.
- [ ] `features/guitar/onset.ts`: tracker de notas nuevas con `holdMs`. Tests: una nota sostenida emite un solo evento; dos notas seguidas emiten dos; el decaimiento no emite.
- [ ] `features/guitar/timing.ts`: `judge` con ventana y latencia. Tests en los bordes de la ventana.
- [ ] `features/guitar/mic.ts`: lista de entradas, apertura con los tres procesados en `false`, bucle de lectura y cierre limpio (para las pistas al salir de la página).
- [ ] `features/guitar/metronome.ts`: clics programados con lookahead, acento, `beatTime(n)`.
- [ ] Pantalla de inicio: selector de entrada, medidor de nivel + umbral, afinador, aviso de límites y calibración de latencia (8 clics).

### B · Ejercicio 1: una nota en todas las cuerdas

- [ ] `drills.ts`: `buildNoteRound(rng, { pool, count })` sin repetir pitch class; `expectedPitches(pc, string, fretZone)` vía `fretToNote`; secuencia de cuerdas según rango y dirección. Tests: Do en cuerda 5 zona 0–12 = solo Do3; Do en cuerda 1 = solo Do5; Re♭ y Do♯ dan las mismas alturas y distinto texto.
- [ ] Máquina de estados de la ronda (pura): `count-in → playing(noteIdx, stringIdx) → error → count-in` y `→ done`. Test: un error en la nota 3 vuelve a la nota 1.
- [ ] Vista del ejercicio: nota grande, cuerda actual, pulso visible, puntos de la ronda, diapasón `display` con la posición correcta en rojo tras un error.
- [ ] Configuración "por partes": cuerdas, dirección, zona, BPM, notas por ronda, notas elegibles, ayuda visual.
- [ ] Resultado: BPM, intentos, "Subir a N+8 BPM", guarda `best`.

### C · Ejercicio 2: escala mayor por posiciones

- [ ] `scales.ts`: posiciones `3nps` (7) y `caged` (5) para cualquier tónica con `tonal`. Tests: Sol mayor 3nps posición 1 empieza en cuerda 6 traste 3 y tiene 18 notas; todas las notas pertenecen a la escala; ninguna posición excede 5 trastes de ancho (CAGED).
- [ ] Recorridos puros: subir, bajar, subir y bajar, terceras, grupos de 3 y 4. Tests sobre una secuencia de 7 notas.
- [ ] Vista: diagrama visible/oculto, tónica marcada, modo con y sin tempo, corcheas.

### D · Integración

- [ ] `ProgressState.guitar` opcional y su validación en `persist.ts` (dato corrupto → valores por defecto, sin perder el resto). Actualiza spec 05.
- [ ] Ruta `src/pages/diapason.astro` con `GuitarGym` `client:only="preact"` y enlace en el header.
- [ ] `docs/plans/README.md`: fila de P12.

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
