# 10 · Sincronización en la nube

La app se usa en dos dispositivos: teoría en el celular y Strudel en la laptop. Las unidades de Strudel dependen de la teoría aprobada, así que el progreso tiene que viajar solo. Este spec cumple la condición del spec 00 para agregar cuentas: "un segundo dispositivo diario".

## Decisión

**Supabase guarda la copia de verdad y `localStorage` queda como caché local.**

- La app sigue leyendo y escribiendo en `localStorage`, de forma síncrona. `rules.ts`, `useProgress` y las islas no cambian de forma.
- Un módulo aparte sube y baja cambios por detrás.
- Sin sesión, o sin variables de entorno, la app funciona igual que hoy y no se ve nada de sincronización. Es el mismo patrón del Sensei sin clave.

Quitar `localStorage` se descartó: rompe el uso sin conexión, exige login para entrar y obliga a volver asíncrona toda la capa de progreso.

## Fuera de alcance

| No se hace | Motivo |
|------------|--------|
| Tiempo real entre dispositivos | Basta sincronizar al abrir y al volver a la app. |
| Validar progreso en el servidor | Es autoaprendizaje; el spec 00 descarta el anti-trampa. |
| Mover contenido a la base | El contenido se valida en build y vive en el repo. |
| Una cuenta por persona | Una cuenta por familia; los perfiles siguen sin contraseña. |
| Registro abierto | La app es pública y el plan gratis tiene límites. Ver "Seguridad". |
| Subir solo los cambios | Se sube el JSON entero. Ver "Límites conocidos". |

## Modelo de datos

Una sola tabla. Cada fila es un perfil con su progreso entero.

```sql
create table public.profile_progress (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  profile_id text not null check (char_length(profile_id) between 1 and 64),
  name text not null check (char_length(name) between 1 and 24),
  color text not null,
  created_at timestamptz not null,
  progress jsonb not null,
  revision integer not null default 1 check (revision > 0),
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, profile_id),
  constraint progress_size check (pg_column_size(progress) < 4000000)
);
```

- RLS activa, con políticas de `select`, `insert`, `update` y `delete` para `authenticated` con `(select auth.uid()) = user_id`.
- `anon` no tiene permisos sobre la tabla.
- Un trigger mantiene `updated_at`.
- `deleted_at` es un borrado suave: sin él, otro dispositivo volvería a subir un perfil borrado.

`progress` tiene la forma de `ProgressState`. Al bajar pasa por `parseProgress`, igual que un respaldo: lo que viene de la red es `unknown`.

## Sesión

- Entrada con **enlace por correo** (`signInWithOtp`, `shouldCreateUser: false`), sin contraseñas.
- Un código de 6 dígitos sería más cómodo en el celular, pero exige cambiar la plantilla del correo, y el plan gratis no lo permite sin un proveedor SMTP propio. El dueño prefirió no agregar otra cuenta.
- La entrada está en `/progreso` y también en "¿Quién entrena hoy?": un dispositivo nuevo entra con su correo y baja sus perfiles, sin crear ni adivinar nombres. El enlace vuelve a la página donde se pidió (`additional_redirect_urls` con `/**`).
- El enlace vuelve a la misma página. Usa el flujo implícito: la sesión llega en el hash de la URL y queda en el navegador que abrió el enlace, así que hay que abrirlo en el mismo donde se usa la app. Pasa una vez por dispositivo.
- `site_url` y `additional_redirect_urls` deben incluir la URL de producción.
- La sesión queda en `localStorage`, gestionada por `supabase-js`.
- "Cerrar sesión" detiene la sincronización y **conserva** los datos locales.

## Algoritmo

La lógica vive en `features/sync/reconcile.ts`: es pura, no toca red ni `localStorage`, y tiene tests.

```ts
reconcile(local: LocalProfile[], remote: RemoteRow[], pendingDeletes: string[]): {
  profiles: Profile[]          // lo que queda en este dispositivo
  renames: Record<string, string>  // id local → id remoto
  writes: Upload[]             // filas por subir, con su revision esperada
  removals: string[]           // perfiles borrados en otro dispositivo
}
```

1. **Emparejar.** Por `profile_id`. Si no hay coincidencia, por nombre con `sameName`, entre filas no borradas: la laptop y el celular crearon "Iván" con ids distintos, y deben ser el mismo perfil. Gana el id remoto.
2. **Fusionar.** `mergeProgress(local, remoto)`, la misma función de "Restaurar respaldo". Es monótona: una kata aprobada sigue aprobada y no se pierden intentos.
3. **Bajar.** Un perfil remoto que no existe aquí se crea.
4. **Subir.** Solo si el resultado difiere de lo que ya hay en la fila.
5. **Borrar.** Un perfil con `deleted_at` se elimina aquí. Un borrado local va a `pendingDeletes` hasta confirmarse.

### Escrituras concurrentes

Cada subida es una comparación de `revision`:

```
update … set progress = …, revision = revision + 1
where profile_id = … and revision = <la que leí>
```

Si no actualiza ninguna fila, otro dispositivo escribió primero: se relee, se fusiona y se reintenta, hasta 3 veces. Como la fusión es monótona, reintentar siempre converge.

### Cambio necesario en `mergeProgress`

`mergeProgress` nunca borra, y eso rompe un caso que con respaldos manuales casi no se nota: **un pergamino borrado volvería desde el otro dispositivo.**

`ProgressState` gana `deletedScrolls?: Record<string, string>` (id → fecha). `deleteScroll` lo escribe, la fusión une las dos listas y descarta un pergamino cuyo `updatedAt` no sea posterior a su fecha de borrado. El campo es opcional: los respaldos viejos siguen siendo válidos.

## Cuándo sincroniza

| Momento | Acción |
|---------|--------|
| Al cargar una página con sesión | Sincroniza. |
| Al volver a la app (`visibilitychange`) | Sincroniza, como máximo una vez por minuto. |
| Tras un cambio local | Marca pendiente; sube 10 s después del último cambio. |
| Al ocultar la app | Si hay pendientes, intenta subir. Puede fallar: queda para la próxima vez. |
| Al recuperar conexión (`online`) | Sincroniza si hay pendientes. |
| "Sincronizar ahora" | Sincroniza de inmediato. |

La marca de pendiente vive en `localStorage` (`dojo_sync_v1`), para sobrevivir a recargas. La escribe `saveProgress`, que sigue siendo síncrono. Al aplicar datos remotos no se marca pendiente, y se avisa por el `BroadcastChannel` existente para que las islas recarguen.

## Interfaz

- **Header:** un indicador con `Cloud`, `RefreshCw` o `CloudOff` y su `aria-label`: "Sincronizado", "Sincronizando…", "Sin conexión" o "No se pudo sincronizar". Solo aparece con sesión.
- **`/progreso`, sección "Sincronización":**
  - sin sesión: correo → código;
  - con sesión: correo, hora de la última sincronización, "Sincronizar ahora" y "Cerrar sesión".
- Un fallo de red nunca bloquea nada ni interrumpe una prueba.
- El respaldo manual se queda: sigue siendo la salida si Supabase no está disponible.

## Rendimiento

`@supabase/supabase-js` se importa con `import()` y solo si hay sesión o se abre la sección de `/progreso`. Sin sesión no se descarga. El presupuesto de JS inicial de `/` no cambia.

## Seguridad

- La clave pública va en el cliente; RLS es lo que protege los datos. La clave secreta y la contraseña de la base nunca entran al repo ni a Vercel.
- **Registro cerrado** (`enable_signup = false`). El repo y la app son públicos: con registro abierto, cualquiera podría guardar datos en este proyecto. La cuenta familiar se crea una vez, a mano.
- La restricción `progress_size` limita cuánto puede guardar una fila.
- No se guardan datos personales de un menor: el nombre de perfil puede ser un apodo. El único dato personal es el correo de la cuenta.

## Variables

| Variable | Dónde | Nota |
|----------|-------|------|
| `PUBLIC_SUPABASE_URL` | `.env`, Vercel | Pública. |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env`, Vercel | Pública. |
| `SUPABASE_DB_PASSWORD` | Gestor de contraseñas del dueño | Solo para `supabase link` y `db push`. |

Sin las dos primeras, la sincronización no aparece.

## Pruebas

| Capa | Cómo |
|------|------|
| `reconcile.ts`, `mergeProgress` | `node --test`, sin red. |
| RLS y esquema | pgTAP con `supabase test db`, igual que `../beekeeper`. Exige Docker, así que va en `pnpm test:db` y no en `ci:check`. |
| Flujo completo | Stack local de Supabase y dos perfiles de navegador. |

El stack local usa puertos propios (544xx), porque `beekeeper` ocupa los 543xx.

## Límites conocidos

- **Tamaño:** cada intento guarda sus preguntas completas, así que el JSON crece con el uso y se sube entero. Lleva `ponytail:` con el techo. Si se acerca al límite, recortar intentos viejos o subir por partes.
- **Prueba abierta en dos dispositivos:** las respuestas sin entregar no se combinan; gana la copia local.
- **Plan gratis:** el proyecto puede pausarse si pasa mucho tiempo sin uso, y el correo incluido tiene un límite bajo por hora. Con dos personas y sesiones largas no debería notarse.
- **Otras personas:** quien despliegue el código sin estas variables no ve nada de esto.
