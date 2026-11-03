# 08 · Gimnasio de diapasón (guitarra real)

Sesiones para aprender el diapasón tocando la guitarra de verdad. La guitarra entra por la interfaz de audio (o el micrófono) y la app escucha qué nota sonó y cuándo. Vive en `/diapason`, fuera de los cinturones: es práctica libre, como `/oido`.

## ¿Se puede con lo que hay?

Sí, sin dependencias nuevas.

| Pieza | Estado |
|-------|--------|
| Cálculo de notas por cuerda y traste | Ya existe: `fretToNote`, `noteToFrets`, `STANDARD_TUNING` en `features/theory/instruments.ts`. |
| Dibujar el diapasón con estados | Ya existe: `components/music/Fretboard.tsx` (modos, estados `active/correct/wrong`, zurdo). |
| Nombre de nota según la notación del perfil | Ya existe: `NoteName.tsx`, `formatNote`. |
| Azar reproducible | Ya existe: `lib/random.ts` (`createRng`, `freshRng`). |
| Entrada de audio | **Nuevo.** `getUserMedia` + `AnalyserNode` de Web Audio. Lo traen todos los navegadores, Safari incluido. Necesita HTTPS (Vercel) o `localhost`. |
| Detección de altura | **Nuevo.** YIN en TypeScript puro (~80 líneas), con tests sobre señales sintéticas. Sin librería. |
| Metrónomo | **Nuevo.** Clic con un `OscillatorNode` programado en el mismo `AudioContext` que escucha, así el pulso y la nota tocada comparten reloj. |

### Límites conocidos (decir la verdad en la UI)

- **No se puede saber en qué cuerda se tocó una nota, solo su altura.** Do4 suena igual en la cuerda 4 traste 10, en la 3 traste 5 y en la 2 traste 1. La app valida la **altura exacta (nota + octava)** que esa cuerda puede dar en la zona de trastes elegida. Para la cuerda 5 y la 1 la octava ya delata la cuerda; para 4, 3 y 2 de Do no. Se dice en la pantalla de inicio: "La app oye la nota y la octava, no la cuerda. La cuerda la pones tú." `ponytail:` techo = honor del alumno en cuerdas que comparten altura; mejora = pastilla hexafónica/MIDI de guitarra (entrada MIDI ya existe).
- **Monofónico.** Una nota a la vez. Sin acordes.
- **Latencia.** Interfaz + navegador suman 10–60 ms. Hay un ajuste de **calibración** (ms) en la pantalla del ejercicio: toca 8 clics de prueba, la app mide el desfase medio y lo guarda en `prefs.guitar.latencyMs`. El ajuste manual queda visible.

## Entrada de audio (`features/guitar/`)

| Archivo | Puro | Qué hace |
|---------|------|----------|
| `pitch.ts` | sí | `detectPitch(buffer: Float32Array, sampleRate): { hz, clarity } \| null` (YIN). `hzToMidi(hz)`, redondeo a semitono y `cents` de desvío. |
| `onset.ts` | sí | `createOnsetTracker({ minRms, holdMs })`: convierte el flujo de lecturas `(time, rms, midi)` en eventos `{ time, midi }` cuando una nota nueva se estabiliza (misma `midi` durante `holdMs`, por defecto 40 ms). Ignora el decaimiento de la nota anterior. |
| `timing.ts` | sí | `judge(beatTime, event, { windowMs, latencyMs })` → `'on-time' \| 'early' \| 'late'`. |
| `drills.ts` | sí | Generación y validación de los ejercicios (abajo). |
| `scales.ts` | sí | Digitaciones de escala mayor sobre el diapasón (abajo). |
| `mic.ts` | no | `listGuitarInputs()` (`enumerateDevices`), `openGuitarInput(deviceId)` con `echoCancellation`, `noiseSuppression` y `autoGainControl` en **false** (si no, el navegador destroza la señal de la guitarra). Bucle con `requestAnimationFrame` que lee el analizador (`fftSize` 2048) y alimenta `onset`. |
| `metronome.ts` | no | Programa clics por adelantado (lookahead de 100 ms) y expone `beatTime(n)`. Acento en el primer tiempo del compás. |

El detector acepta 70–1400 Hz (Mi2 a Fa6, traste 24 de la cuerda 1). Lectura con `clarity < 0.85` o `rms < minRms` = silencio. `minRms` se ajusta con un medidor de nivel en la pantalla de inicio (el "knob" para cada interfaz).

## Ejercicio 1 · Una nota en todas las cuerdas

Sale una nota (p. ej. **Do**). Al pulso del metrónomo tocas esa nota en la cuerda 5, 4, 3, 2 y 1, una por tiempo.

- **Ronda:** un set de N notas (por defecto 5). Cada nota = una cuenta de entrada de un compás (4 clics) + 5 tiempos, uno por cuerda.
- **Sorteo:** pitch classes sin repetir dentro de la ronda. Conjunto elegible: `Naturales` · `Con sostenidos` · `Con bemoles` · `Todas` (naturales + ♯ + ♭). La nota se muestra con su deletreo (Do♯ no es Re♭ en pantalla, aunque suene igual).
- **Validación por tiempo:** la nota esperada es cualquier altura que `fretToNote(cuerda, traste)` dé con el traste dentro de la zona elegida. Correcto = altura en ese conjunto **y** `judge` = `on-time` (ventana ±120 ms por defecto, ajustable 60–200).
- **Error:** nota equivocada, tarde, antes de tiempo o silencio. Cualquier error **reinicia la ronda desde la primera nota** con una nueva cuenta de entrada. El diapasón marca en rojo dónde estaba la nota correcta durante un tiempo.
- **Fin:** la ronda completa sin un error. Pantalla final: BPM, notas, intentos que costó y "Subir a N+8 BPM".
- **Por partes:** la sesión se configura con
  - cuerdas: rango continuo (por defecto 5→1; también 6→1, 5→3, 3→1…) y dirección (`grave→agudo`, `agudo→grave`, `ida y vuelta`);
  - zona de trastes: `0–5`, `5–9`, `7–12`, `0–12`;
  - BPM: 40–160 (por defecto 60);
  - notas por ronda: 3–12.
- **Ayuda visual:** `Mostrar posiciones` (resalta en el diapasón dónde está la nota en cada cuerda) apagado por defecto; si se usa, el resultado lo dice.

## Ejercicio 2 · Escala mayor por posiciones

Aprender la escala mayor en distintas zonas del mástil, subiendo y bajando.

- **Digitación:** `scales.ts` genera posiciones con `tonal` (`Scale.get('C major')`) y `fretToNote`, sin listas de notas a mano:
  - `3 notas por cuerda`: 7 posiciones, una por grado de inicio en la cuerda 6.
  - `CAGED`: 5 formas (sobre las mismas notas, ventana de 4–5 trastes).
  - Devuelve `FretPosition[]` ordenado de grave a agudo, más la altura exacta de cada nota.
- **Recorridos** (patrones sobre la secuencia de la posición): `subir`, `bajar`, `subir y bajar`, `terceras` (1-3, 2-4…), `grupos de 3` (1-2-3, 2-3-4…), `grupos de 4`. Cada patrón es una función pura `(notes) => notes`.
- **Validación:** aquí la digitación fija cada altura, así que se compara la **altura exacta** nota a nota, al pulso. Una nota por tiempo (o dos con `corcheas`).
- **Error:** igual que el ejercicio 1 (reinicia el recorrido). Opción `Practicar sin tempo`: sin metrónomo, solo valida la secuencia, para aprender la forma primero.
- **Progresión sugerida** dentro de la pantalla: posición con diagrama visible → misma posición sin diagrama → siguiente posición → unir dos posiciones (subir en una, bajar en la otra) → otra tonalidad.
- **Tonalidad:** cualquier tónica; la tónica se marca distinto en el diagrama.

## Persistencia

Se añade a `ProgressState` (spec 05) un campo opcional, validado en `persist.ts` como el resto:

```ts
guitar?: {
  latencyMs: number                       // calibración
  minRms: number                          // umbral de entrada
  deviceId: string | null
  best: Record<DrillKey, { bpm: number; at: string; helped: boolean }>
}
// DrillKey: 'notes:5-1:0-12:all' | 'scale:3nps:2:up-down' … (ejercicio + configuración)
```

Sin XP en esta fase: el gimnasio no es parte del camino de cinturones. Si después cuenta, se suma como `practiceDays` (una ronda limpia = 10 respuestas correctas).

## UI

- Ruta `/diapason`, isla `GuitarGym` con `client:only="preact"` (usa `localStorage` y el micrófono). Enlace en el header junto a "Oído".
- Pantalla de inicio: elegir entrada de audio, medidor de nivel con el umbral, afinador (nota + cents, útil para comprobar que la señal llega) y el aviso de límites.
- En el ejercicio: la nota grande con `NoteName`, la cuerda actual resaltada, el pulso visible (no solo audible), la ronda como puntos (`●●○○○`) y el diapasón debajo en modo `display`.
- Sin permiso de micrófono: mensaje con cómo habilitarlo; el resto de la app no se ve afectado.
- Reduced-motion: el pulso se marca con cambio de color, sin animación.
