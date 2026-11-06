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

- [ ] Autoriza crear el proyecto en Supabase. Usa uno de los proyectos activos del plan gratis.
- [ ] Elige el correo de la cuenta familiar.
- [ ] Tiene dónde guardar la contraseña de la base.

## Tareas

### Base de datos local

- [ ] `supabase` como dependencia de desarrollo, con versión fija, y scripts `db:start`, `db:stop`, `db:reset`, `test:db`.
- [ ] `supabase/config.toml`: `project_id = "strudel-dojo"`, puertos 544xx, `enable_signup = false`, Storage, Realtime y Edge desactivados.
- [ ] Plantilla de correo con `{{ .Token }}` y asunto en español.
- [ ] Migración con la tabla, RLS, permisos y trigger del spec.
- [ ] pgTAP:
  - [ ] un usuario no ve ni modifica filas de otro;
  - [ ] `anon` no accede;
  - [ ] la restricción de tamaño rechaza una fila enorme;
  - [ ] `updated_at` cambia al actualizar.

### Fusión

- [ ] `ProgressState.deletedScrolls`, con lectura defensiva en `persist.ts`, `deleteScroll` y fusión. Tests: un pergamino borrado no vuelve, uno editado después de borrarse sí, y un respaldo viejo sigue siendo válido.
- [ ] `features/sync/reconcile.ts`, puro. Tests:
  - [ ] perfil nuevo en cada lado;
  - [ ] mismo nombre con ids distintos;
  - [ ] perfil borrado en otro dispositivo;
  - [ ] borrado local pendiente;
  - [ ] sin diferencias no hay escrituras;
  - [ ] la fusión es idempotente.

### Sincronización

- [ ] `features/sync/client.ts`: crea el cliente con `import()`, envía y verifica el código, cierra sesión.
- [ ] `features/sync/engine.ts`: lee filas, aplica `reconcile`, sube comparando `revision` y reintenta hasta 3 veces.
- [ ] Renombrar un perfil local al id remoto mueve su clave `dojo_progress_v1:<id>` y conserva `activeProfileId`.
- [ ] `store.ts`: `saveProgress` y `saveProfiles` marcan pendiente en `dojo_sync_v1`. Aplicar datos remotos no marca.
- [ ] Disparadores de la tabla "Cuándo sincroniza". Una sola sincronización a la vez; las pestañas se coordinan con `navigator.locks` si existe.
- [ ] `use-progress.ts`: borrar un perfil lo agrega a `pendingDeletes`.

### Interfaz

- [ ] Indicador en `AppHeader`, solo con sesión, sin mover el layout.
- [ ] Sección "Sincronización" en `/progreso`: correo, código, estado, "Sincronizar ahora" y "Cerrar sesión".
- [ ] Errores en español: código incorrecto, código vencido, demasiados intentos, sin conexión.
- [ ] Revisión en 390 px y 1440 px, en tema claro y oscuro.

### Proyecto remoto

- [ ] Crear el proyecto con `supabase projects create`, en `us-east-1`, en la organización del dueño. La contraseña se genera aleatoria y se le entrega para su gestor; no entra al repo.
- [ ] `supabase link`, `supabase db push --linked` y `supabase config push`.
- [ ] Crear la cuenta familiar con la API de administración.
- [ ] El dueño agrega `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_PUBLISHABLE_KEY` en Vercel y vuelve a desplegar.

### Documentación

- [ ] Spec 00: quitar "Cuentas, login, sincronización en la nube" de fuera de alcance.
- [ ] Spec 05 (`deletedScrolls`), spec 07 (carpetas y dependencia) y `.env.example`.
- [ ] `README.md` y `CLAUDE.md`: comandos `db:*`, y `docs/specs/10-cloud-sync.md` en la tabla "Antes de tocar algo".

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
