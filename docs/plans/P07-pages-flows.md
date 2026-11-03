# P07 · Páginas y flujos

**Rama:** `feat/p07-pages-flows` · **Leer antes:** `docs/specs/07-architecture.md` (rutas), `docs/specs/05-progression.md`, `DESIGN.md` (elementos distintivos), y en la referencia los patrones de `src/pages/*.astro` y de las islas en `src/features/*/`.

## Objetivo

Toda la app navegable de punta a punta con el contenido provisional de P02: crear un perfil, entrar a M01, leer, practicar, rendir una prueba, resolver una kata, desbloquear el combate y aprobarlo autoevaluado.

## Tareas

- [ ] Header como isla (`AppHeader.tsx`): logo, perfil activo (cambiar), cinturón y rayas, XP, racha, botón "Parar todo" (Esc). Fallback estático de la misma altura (sin salto de layout).
- [ ] `/`: "¿Quién entrena hoy?" si no hay perfil activo. Si lo hay: camino de cinturones, tarjeta "Continuar" (tema recomendado), accesos a Repaso, Oído y Dojo. M03–M10 en draft se muestran como "Próximamente".
- [ ] `/m/[module]`: cabecera con cinturón, resumen y progreso; lista de temas con su estado y estrellas/rayas; tarjeta de prueba de ubicación (si aplica); tarjeta de combate (bloqueada / lista / aprobada).
- [ ] `/m/[module]/[topic]`: la lección MDX renderizada estáticamente, debajo `TopicPanel` con pestañas Práctica · Prueba · Katas y su estado. Navegación al tema anterior y siguiente.
- [ ] Práctica (dentro de TopicPanel): preguntas sin fin desde `practice.mix`, contador de la sesión, botón "Terminar".
- [ ] `/m/[module]/[topic]/prueba` (`TestView`): crea o retoma el intento, una pregunta por pantalla con navegación y resumen de contestadas, "Entregar prueba" con confirmación en línea si faltan respuestas, y redirige a `/resultado?intento=`.
- [ ] `/resultado?intento=` (`ResultView`): puntaje grande, aprobado o no (ícono + texto), cada pregunta con tu respuesta, la correcta y su explicación; habilidades a repasar; CTA según el estado ("Practicar las que fallaste", "Siguiente tema", "Ir al combate").
- [ ] `/m/[module]/[topic]/kata/[kata]` (`KataView`): brief, editor con `starter` o el borrador guardado, botón "Probar el código" (evalúa, reproduce y corre aserciones), lista de aserciones con su estado y mensaje, pistas estáticas de la kata (una a la vez) y "Ver solución" que solo se habilita tras 3 intentos fallidos y marca la kata como "aprobada con ayuda" (se guarda, no da XP de kata).
- [ ] `/m/[module]/combate` (`BossView`): igual que kata, más la rúbrica. Sin Sensei: autoevaluación con un control 0–10 por criterio y una casilla de honestidad; con Sensei: queda preparado para P09 (botón deshabilitado con "El Sensei llega pronto").
- [ ] `/m/[module]/ubicacion`: reutiliza `TestView` con `kind: 'placement'`.
- [ ] `/progreso`: estadísticas por habilidad (barra + porcentaje + caja Leitner), historial de intentos, gestión de perfiles, preferencias (notación, instrumento, zurdo, MIDI, volumen) y respaldo (descargar/restaurar).
- [ ] `/dojo`: editor a pantalla completa, visuales, panel de referencia con búsqueda, pergaminos (guardar/abrir/borrar, máx. 20) y exportar a strudel.cc.
- [ ] `/repaso` y `/oido`: páginas con estado vacío ("Disponible pronto") que se llenan en P10.
- [ ] 404 con el estilo del dojo.
- [ ] View transitions (como en la referencia) desactivadas con reduced-motion.

## Aceptación

- Flujo completo en 390 px y 1440 px: crear el perfil "Iván" → M01-T01 → practicar 5 → prueba aprobada → kata aprobada → … → combate M01 autoevaluado → M02 desbloqueado.
- Crear un segundo perfil: arranca de cero y no ve el progreso del primero.
- Descargar respaldo, borrar el perfil, restaurarlo: el progreso vuelve igual.
- JS inicial de `/` < 120 KB gzip (anota la cifra en el PR).

## Commit

`feat: full navigation flow with profiles, tests, katas and boss`

## Desviaciones
