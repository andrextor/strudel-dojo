# P07 · Páginas y flujos

**Rama:** `feat/p07-pages-flows` · **Leer antes:** `docs/specs/07-architecture.md` (rutas), `docs/specs/05-progression.md`, `DESIGN.md` (elementos distintivos), y en la referencia los patrones de `src/pages/*.astro` y de las islas en `src/features/*/`.

## Objetivo

Toda la app navegable de punta a punta con el contenido provisional de P02: crear un perfil, entrar a M01, leer, practicar, rendir una prueba, resolver una kata, desbloquear el combate y aprobarlo autoevaluado.

## Tareas

- [x] Header como isla (`AppHeader.tsx`): logo, perfil activo (cambiar), cinturón y rayas, XP, racha, botón "Parar todo" (Esc). Fallback estático de la misma altura (sin salto de layout).
- [x] `/`: "¿Quién entrena hoy?" si no hay perfil activo. Si lo hay: camino de cinturones, tarjeta "Continuar" (tema recomendado), accesos a Repaso, Oído y Dojo. M03–M10 en draft se muestran como "Próximamente".
- [x] `/m/[module]`: cabecera con cinturón, resumen y progreso; lista de temas con su estado y estrellas/rayas; tarjeta de prueba de ubicación (si aplica); tarjeta de combate (bloqueada / lista / aprobada).
- [x] `/m/[module]/[topic]`: la lección MDX renderizada estáticamente, debajo `TopicPanel` con pestañas Práctica · Prueba · Katas y su estado. Navegación al tema anterior y siguiente.
- [x] Práctica (dentro de TopicPanel): preguntas sin fin desde `practice.mix`, contador de la sesión, botón "Terminar".
- [x] `/m/[module]/[topic]/prueba` (`TestView`): crea o retoma el intento, una pregunta por pantalla con navegación y resumen de contestadas, "Entregar prueba" con confirmación en línea si faltan respuestas, y redirige a `/resultado?intento=`.
- [x] `/resultado?intento=` (`ResultView`): puntaje grande, aprobado o no (ícono + texto), cada pregunta con tu respuesta, la correcta y su explicación; habilidades a repasar; CTA según el estado ("Practicar las que fallaste", "Siguiente tema", "Ir al combate").
- [x] `/m/[module]/[topic]/kata/[kata]` (`KataView`): brief, editor con `starter` o el borrador guardado, botón "Probar el código" (evalúa, reproduce y corre aserciones), lista de aserciones con su estado y mensaje, pistas estáticas de la kata (una a la vez) y "Ver solución", que solo se habilita tras 3 intentos fallidos; desde ahí la kata, al aprobarse, queda `helped: true` (regla 10 del spec 05).
- [x] `/m/[module]/combate` (`BossView`): igual que kata, más la rúbrica. Sin Sensei: autoevaluación con un control 0–10 por criterio y una casilla de honestidad; con Sensei: queda preparado para P09 (botón deshabilitado con "El Sensei llega pronto").
- [x] `/m/[module]/ubicacion`: reutiliza `TestView` con `kind: 'placement'`.
- [x] `/progreso`: estadísticas por habilidad (barra + porcentaje + caja Leitner), historial de intentos, gestión de perfiles, preferencias (notación, instrumento, zurdo, MIDI, volumen) y respaldo: descargar/restaurar archivo **y** "Copiar código" / "Pegar código" para pasar el progreso a otro dispositivo (celular) sin archivos, con aviso de éxito/error.
- [x] `/dojo`: editor a pantalla completa, visuales, panel de referencia con búsqueda, pergaminos (guardar/abrir/borrar, máx. 20) y exportar a strudel.cc.
- [x] `/repaso` y `/oido`: páginas con estado vacío ("Disponible pronto") que se llenan en P10.
- [x] 404 con el estilo del dojo.
- [x] View transitions (como en la referencia) desactivadas con reduced-motion.

## Aceptación

- Flujo completo en 390 px y 1440 px: crear el perfil "Iván" → M01-T01 → practicar 5 → prueba aprobada → kata aprobada → … → combate M01 autoevaluado → M02 desbloqueado.
- Crear un segundo perfil: arranca de cero y no ve el progreso del primero.
- Descargar respaldo, borrar el perfil, restaurarlo: el progreso vuelve igual.
- JS inicial de `/` < 120 KB gzip (anota la cifra en el PR).

## Commit

`feat: full navigation flow with profiles, tests, katas and boss`

## Desviaciones

- Las islas reciben el currículo entero como prop (19 KB de JSON en el HTML). Es pequeño y evita una segunda fuente de verdad; si crece mucho con M03–M10, pasar solo el módulo y un índice.
- `/ui` (galería de P06) y `features/ui-gallery` se borraron.
- Reglas nuevas en `rules.ts`, con test: `bestScore` (mejor intento entregado) y `rubricScore` (autoevaluación del combate: media ponderada 0–10; aprueba con Σ(peso·nota) ≥ passScore·Σpeso, en enteros como las pruebas).
- `registry.ts` suma `pickQuestion` (la pregunta i-ésima de una mezcla); `buildSet` la usa, mismas semillas que antes. La práctica sin fin, cuando agota las preguntas nuevas de la mezcla, vuelve a usarlas en vez de fallar.
- `features/curriculum/paths.ts` (rutas desde ids), `features/curriculum/skills.ts` (nombres en español de cada habilidad; el test de currículo exige uno por skill), `features/exercises/format.ts` (respuesta y respuesta correcta como texto) y `features/dojo/scrolls.ts` (pergaminos, máx. 20, y enlace a strudel.cc), todos con test.
- `StrudelEditor` suma `playLabel` («Probar el código» en katas y combate) y `onReady` (leer y cambiar el código; lo usan el combate y el Dojo).
- Kata: cada evaluación del editor (botón o Mod-Enter) cuenta como intento y guarda el código. La solución viaja en las props de la página (se ve en el código fuente): el contenido es abierto (AGPL) y la regla 10 igual marca `helped` al verla en la app.
- Combate: el borrador no se guarda aparte; el editor abre con el código del último envío.
- Prueba: responder de nuevo una pregunta reemplaza la respuesta guardada; la tarjeta muestra la anterior. El intento se crea una sola vez por visita (con la versión anterior, entregar creaba al instante un intento vacío).
- Preferencias: «volumen» queda como sonido sí/no (`prefs.sound`), que es lo que guarda el modelo. La pestaña MIDI ahora también exige `prefs.midi`.
- Las view transitions ya estaban desde P00 en `global.css` (`navigation: auto`, `none` con reduced-motion).
- JS inicial de `/`: **45,2 KB gzip** (20 archivos, incluidas las islas de cabecera e inicio). Strudel no carga en `/`.
- Verificado en Chrome (script + teclas reales; la captura de pantalla de la extensión no funciona): perfil «Iván» → práctica de 5 en M01-T01 (cuenta en `practiceDays`) → pruebas de T01–T04 aprobadas 10/10 → una prueba reprobada con 1 sin responder (confirmación en línea, retomar tras recargar con 9/10 contestadas) → katas aprobadas; la de T03 tras 3 fallos con «Ver solución» queda «Aprobada con ayuda» (`helped: true`) → combate M01 autoevaluado aprobado → M02 desbloqueado, cinturón amarillo y XP en la cabecera. Segundo perfil «Hijo» arranca de cero. Respaldo por código: copiar, borrar el perfil (confirmación escribiendo el nombre), pegar el código sin perfil activo → «Iván» vuelve con el progreso idéntico byte a byte; un código inválido da el mensaje de error. La descarga y restauración por archivo usan el mismo objeto y la misma fusión, pero no se probaron en el navegador (bajaría un archivo real). Dojo: búsqueda en la referencia, guardar y abrir un pergamino, enlace a strudel.cc. Ninguna página tiene scroll horizontal en 390 px; el recorrido completo corrió en una ventana de escritorio de 1920 px (la extensión no pudo redimensionarla a 1440).
- Bugs encontrados en la prueba y corregidos: el intento vacío al entregar, los controles de la rúbrica que pisaban el valor anterior al moverse rápido, el editor del combate que abría vacío si el último envío no tenía código, la rejilla del Dojo que desbordaba en 390 px y el «Próximamente» repetido para lectores de pantalla.
