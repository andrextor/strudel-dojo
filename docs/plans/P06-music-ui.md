# P06 · Componentes musicales

**Rama:** `feat/p06-music-ui` · **Leer antes:** `DESIGN.md` (teclado, diapasón y estados), `docs/specs/03-exercise-engine.md` (`InputSpec`, `InputVia`), `docs/specs/04-strudel-engine.md` (MIDI), `docs/specs/07-architecture.md` (accesibilidad).

## Objetivo

Los instrumentos interactivos y la tarjeta de pregunta que admite todas las formas de respuesta.

## Tareas

- [x] `components/music/Keyboard.tsx`: SVG, rango configurable (por defecto C3–B4 en móvil y C2–C6 en escritorio), con modos `display` (resalta), `select-one`, `select-many` y `play` (suena al tocar vía engine), etiquetas opcionales (nombre / grado / ninguno) y estados `active|selected|correct|wrong` con ícono. Teclado: flechas para moverse, Enter/Espacio para seleccionar; `role="group"` y cada tecla `role="button"` con `aria-pressed` y `aria-label` ("Do sostenido 4").
- [x] Selección de deletreo en teclas negras: cuando la pregunta exige deletreo estricto, tocar una tecla negra abre un mini-selector `C♯ / D♭` (y para blancas con enarmónico relevante, p. ej. `E♯/F`, solo si el ejercicio lo pide).
- [x] `components/music/Fretboard.tsx`: 6 cuerdas, afinación configurable, trastes 0–15 con scroll horizontal en móvil (`tabIndex={0}`), marcadores, zurdo opcional (preferencia), mismos modos y estados que el teclado. Las cuerdas al aire seleccionables.
- [x] `components/music/Staff.tsx`: abcjs perezoso, colores desde variables CSS, clave de sol y de fa. Solo lectura.
- [x] `components/music/NoteName.tsx`: muestra la nota según la preferencia de notación del perfil.
- [x] `features/midi/midi.ts` + `use-midi.ts`: detecta soporte, lista dispositivos, emite note-on/off y agrupa acordes (80 ms). Sin soporte → `supported: false` con motivo.
- [x] `features/exercises/QuestionCard.tsx`: muestra `prompt`, `staff`/`audio` si existen (botones Repetir / Más lento / Primera nota), la entrada según `input.kind` y los `via` permitidos que elija el usuario (pestañas Teclado · Diapasón · Texto · MIDI, recordando la última por perfil), y el botón "Responder". En práctica, muestra el resultado y la explicación al instante; en prueba, solo guarda.
- [x] `components/ui/`: `BeltBadge` (cinturón SVG con rayas), `StatusBadge` (ícono + texto), `ProgressBar`, `Tabs`, `Callout`, `XpCounter` y `StreakBadge`.
- [x] Página temporal `/_ui` con todos los componentes en todos sus estados (se borra en P07 o queda detrás de `import.meta.env.DEV`).

## Aceptación

- Responder "escribe la escala de Re mayor" con el teclado exige elegir F♯ y C♯ en las teclas negras; con texto acepta `re mi fa# sol la si do#`.
- Todo operable sin ratón; foco visible; sin scroll horizontal de página en 390 px (el diapasón hace scroll dentro de su contenedor).
- Con un teclado MIDI conectado (Chrome), tocar una tríada responde una pregunta de acorde.

## Commit

`feat: interactive keyboard, fretboard, staff and multi-input question card`

## Desviaciones

- La galería vive en `/ui` (Astro ignora páginas con `_`), en `features/ui-gallery/`; P07 la borra.
- `Question.marked` (nuevo, opcional): notas que el instrumento muestra resaltadas. `note-name` lo usa y se responde por texto, porque tocar la tecla resaltada no prueba nada. Spec 03 actualizado.
- `Prefs` suma `lefty` (diapasón zurdo) y `via` (última entrada elegida en una tarjeta, por perfil); `readPrefs` los valida. Spec 05 actualizado.
- MIDI con la Web MIDI API directa, sin `@strudel/midi` (spec 04 actualizado). Un acorde = note-ons dentro de 80 ms (`chordGrouper`, con test). Un conjunto sin orden se responde solo al completar el acorde; una melodía, al llegar a `count`. La pestaña MIDI solo aparece si el navegador tiene Web MIDI.
- Audio de las preguntas con `playOnce` (un ciclo directo a superdough, sin bucle); "Más lento" estira el ciclo ×2 en vez de reescribir el código con `.slow(2)`. Mismo efecto.
- Deletreo en el instrumento: con `spelling: 'strict'` las teclas negras preguntan `C♯ / D♭`. `InputSpec` suma `spellAll` (note y note-set): los cuatro generadores estrictos (`scale-spelling`, `scale-degree`, `interval-build`, `relative-key`) recorren todas las respuestas posibles de sus params y, si alguna lleva E♯, C♭ o dobles, todas las teclas preguntan en todas sus preguntas. Así el teclado no delata qué pregunta trae una nota rara (con test). Spec 03 actualizado.
- Colores de teclas: tokens nuevos `key-white` / `key-black`, fijos en ambos temas como un piano real.
- En SVG, Preact escribe los atributos tal cual: hay que usar `tabindex` en minúscula (con `tabIndex` ninguna tecla recibía foco).
- En modo `display` el instrumento no nombra lo marcado: la etiqueta la pone quien lo usa, para no regalar la respuesta a un lector de pantalla.
- Verificado en Chrome por script y teclas reales: escala de Re mayor con el teclado pide Fa♯ y Do♯ y da "Correcto"; con texto, `re mi fa# sol la si do#` es correcto y `re mi solb …` da "Suena bien, pero el deletreo no"; flechas, Enter, selector y Esc funcionan con el foco de vuelta en la tecla; sin scroll horizontal a 390 px (el diapasón y las pestañas hacen scroll dentro de su caja); el pentagrama toma el color del tema. MIDI con un dispositivo real queda por probar a mano (no hay teclado conectado aquí).
