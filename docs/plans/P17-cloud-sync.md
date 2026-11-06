# P17 · Sincronización con Supabase

**Rama:** `feat/p17-cloud-sync` · **Leer antes:** `docs/specs/10-cloud-sync.md`, `docs/specs/05-progression.md` (respaldo y fusión), `src/features/progress/persist.ts`, `use-progress.ts`, y como referencia de Supabase `../beekeeper` (`supabase/config.toml`, `supabase/tests/`, `docs/deploy.md`, scripts `db:*`).

Un commit por tarea. `pnpm test`, `pnpm lint` y `pnpm typecheck` mientras se trabaja. **No correr `pnpm ci:check`:** el dueño lo corre al final.

## Regla de seguridad: `landak-apiario` está en producción

La CLI tiene acceso a la organización donde vive `landak-apiario`, el proyecto de `../beekeeper`, que está en producción.

- `../beekeeper` es solo de lectura: se copia desde ahí, nunca se ejecuta nada dentro.
- Los comandos de Supabase se corren solo desde este repo.
- Antes de `link`, `db push` o `config push`, comprobar que el ref sea el de `strudel-dojo` (`supabase/.temp/project-ref`), y pasarlo explícito cuando el comando lo admita. El ref de `landak-apiario` nunca se usa.
- Ningún comando sobre proyectos existentes: ni `projects delete`, ni `secrets`, ni `db reset --linked`.
- No usar `supabase stop --all` ni tocar los contenedores `supabase_*_beekeeper`.

## Antes de empezar: decisiones del dueño

- [x] Autoriza crear el proyecto en Supabase. Usa uno de los proyectos activos del plan gratis.
- [x] Elige el correo de la cuenta familiar.
- [x] Tiene dónde guardar la contraseña de la base.

## Tareas

### Base de datos local

- [x] `supabase` como dependencia de desarrollo, con versión fija, y scripts `db:start`, `db:stop`, `db:reset`, `test:db`.
- [x] `supabase/config.toml`: `project_id = "strudel-dojo"`, puertos 544xx, `enable_signup = false`, Storage, Realtime y Edge desactivados.
- [x] Migración con la tabla, RLS, permisos y trigger del spec.
- [x] pgTAP:
  - [x] un usuario no ve ni modifica filas de otro;
  - [x] `anon` no accede;
  - [x] la restricción de tamaño rechaza una fila enorme;
  - [x] `updated_at` cambia al actualizar.

### Fusión

- [x] `ProgressState.deletedScrolls`, con lectura defensiva en `persist.ts`, `deleteScroll` y fusión. Tests: un pergamino borrado no vuelve, uno editado después de borrarse sí, y un respaldo viejo sigue siendo válido.
- [x] `features/sync/reconcile.ts`, puro. Tests:
  - [x] perfil nuevo en cada lado;
  - [x] mismo nombre con ids distintos;
  - [x] perfil borrado en otro dispositivo;
  - [x] borrado local pendiente;
  - [x] sin diferencias no hay escrituras;
  - [x] la fusión es idempotente.

### Sincronización

- [x] `features/sync/client.ts`: crea el cliente con `import()`, envía y verifica el código, cierra sesión.
- [x] `features/sync/engine.ts`: lee filas, aplica `reconcile`, sube comparando `revision` y reintenta hasta 3 veces.
- [x] Renombrar un perfil local al id remoto mueve su clave `dojo_progress_v1:<id>` y conserva `activeProfileId`.
- [x] `store.ts`: `saveProgress` y `saveProfiles` marcan pendiente en `dojo_sync_v1`. Aplicar datos remotos no marca.
- [x] Disparadores de la tabla "Cuándo sincroniza". Una sola sincronización a la vez; las pestañas se coordinan con `navigator.locks` si existe.
- [x] `use-progress.ts`: borrar un perfil lo agrega a `pendingDeletes`.

### Interfaz

- [x] Indicador en `AppHeader`, solo con sesión, sin mover el layout.
- [x] Sección "Sincronización" en `/progreso`: correo, enlace, estado, "Sincronizar ahora" y "Cerrar sesión".
- [x] Errores en español: enlace vencido, correo sin cuenta, demasiados intentos, sin conexión.
- [ ] Revisión en 390 px y 1440 px, en tema claro y oscuro.

### Proyecto remoto

- [x] Crear el proyecto con `supabase projects create`, en `us-east-1`, en la organización del dueño. La contraseña se genera aleatoria y se le entrega para su gestor; no entra al repo.
- [x] `supabase link`, `supabase db push --linked` y `supabase config push`.
- [ ] Crear la cuenta familiar: la crea el dueño en el panel de Supabase.
- [x] El dueño agrega `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_PUBLISHABLE_KEY` en Vercel y vuelve a desplegar.

### Documentación

- [x] Spec 00: quitar "Cuentas, login, sincronización en la nube" de fuera de alcance.
- [x] Spec 05 (`deletedScrolls`), spec 07 (carpetas y dependencia) y `.env.example`.
- [x] `README.md` y `CLAUDE.md`: comandos `db:*`, y `docs/specs/10-cloud-sync.md` en la tabla "Antes de tocar algo".

## Aceptación

- Sin variables de entorno, la app se comporta igual que hoy y no descarga `supabase-js`.
- Aprobar una prueba en un navegador la muestra en otro al volver a la app, y abre la unidad de Strudel que la pedía.
- Dos perfiles "Iván" creados por separado quedan en uno solo, sin perder progreso de ninguno.
- Con la red cortada, una prueba se completa y se sube sola al volver la conexión.
- Dos dispositivos que escriben a la vez terminan con la unión de los dos cambios.
- Un perfil o un pergamino borrado no reaparece.
- Cerrar sesión conserva los datos locales.
- Un usuario autenticado no puede leer filas de otro (pgTAP).
- Un correo sin cuenta no puede registrarse.

## Commit final

`feat: sync progress across devices with supabase`

## Desviaciones

- Entrada con enlace en vez de código: el plan gratis no deja cambiar la plantilla del correo sin SMTP propio (spec 10, Sesión).
- `enable_signup = false` va solo en `[auth]`. En `[auth.email]` apagaría por completo el acceso por correo.
- La cuenta familiar la crea el dueño en el panel de Supabase.
