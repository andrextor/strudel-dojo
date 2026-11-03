# P06 · Componentes musicales

**Rama:** `feat/p06-music-ui` · **Leer antes:** `DESIGN.md` (teclado, diapasón y estados), `docs/specs/03-exercise-engine.md` (`InputSpec`, `InputVia`), `docs/specs/04-strudel-engine.md` (MIDI), `docs/specs/07-architecture.md` (accesibilidad).

## Objetivo

Los instrumentos interactivos y la tarjeta de pregunta que admite todas las formas de respuesta.

## Tareas

- [ ] `components/music/Keyboard.tsx`: SVG, rango configurable (por defecto C3–B4 en móvil y C2–C6 en escritorio), con modos `display` (resalta), `select-one`, `select-many` y `play` (suena al tocar vía engine), etiquetas opcionales (nombre / grado / ninguno) y estados `active|selected|correct|wrong` con ícono. Teclado: flechas para moverse, Enter/Espacio para seleccionar; `role="group"` y cada tecla `role="button"` con `aria-pressed` y `aria-label` ("Do sostenido 4").
- [ ] Selección de deletreo en teclas negras: cuando la pregunta exige deletreo estricto, tocar una tecla negra abre un mini-selector `C♯ / D♭` (y para blancas con enarmónico relevante, p. ej. `E♯/F`, solo si el ejercicio lo pide).
- [ ] `components/music/Fretboard.tsx`: 6 cuerdas, afinación configurable, trastes 0–15 con scroll horizontal en móvil (`tabIndex={0}`), marcadores, zurdo opcional (preferencia), mismos modos y estados que el teclado. Las cuerdas al aire seleccionables.
- [ ] `components/music/Staff.tsx`: abcjs perezoso, colores desde variables CSS, clave de sol y de fa. Solo lectura.
- [ ] `components/music/NoteName.tsx`: muestra la nota según la preferencia de notación del perfil.
- [ ] `features/midi/midi.ts` + `use-midi.ts`: detecta soporte, lista dispositivos, emite note-on/off y agrupa acordes (80 ms). Sin soporte → `supported: false` con motivo.
- [ ] `features/exercises/QuestionCard.tsx`: muestra `prompt`, `staff`/`audio` si existen (botones Repetir / Más lento / Primera nota), la entrada según `input.kind` y los `via` permitidos que elija el usuario (pestañas Teclado · Diapasón · Texto · MIDI, recordando la última por perfil), y el botón "Responder". En práctica, muestra el resultado y la explicación al instante; en prueba, solo guarda.
- [ ] `components/ui/`: `BeltBadge` (cinturón SVG con rayas), `StatusBadge` (ícono + texto), `ProgressBar`, `Tabs`, `Callout`, `XpCounter` y `StreakBadge`.
- [ ] Página temporal `/_ui` con todos los componentes en todos sus estados (se borra en P07 o queda detrás de `import.meta.env.DEV`).

## Aceptación

- Responder "escribe la escala de Re mayor" con el teclado exige elegir F♯ y C♯ en las teclas negras; con texto acepta `re mi fa# sol la si do#`.
- Todo operable sin ratón; foco visible; sin scroll horizontal de página en 390 px (el diapasón hace scroll dentro de su contenedor).
- Con un teclado MIDI conectado (Chrome), tocar una tríada responde una pregunta de acorde.

## Commit

`feat: interactive keyboard, fretboard, staff and multi-input question card`

## Desviaciones
