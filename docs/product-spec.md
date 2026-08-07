# Soles - Especificación del producto

Fuente: `Prompt_Maestro_Codex_TripMemory_VERSION_FINAL.pdf`, versión revisada en julio de 2026.

## Visión

Soles es una aplicación privada y colaborativa en la que cada viaje funciona como su propio grupo. Una persona crea el viaje, invita amigos o familiares, organiza actividades por día y los integrantes autorizados suben fotografías y comentarios.

Al finalizar, el viaje se transforma en un Recuerdo navegable con portada, fechas, participantes, itinerario y álbum compartido.

**Propuesta de valor:** planificar juntos, vivir el viaje y conservar en un único lugar la historia que construyó el grupo.

El MVP no promete almacenamiento eterno. La conservación depende del servicio, las cuentas, backups, retención, exportación y un modelo económico sostenible.

## Principios de producto

- El grupo es el propio viaje mediante `trip_members`; no existe una tabla `groups` en el MVP.
- Archivar es una preferencia individual guardada en `trip_members.archived_at`.
- Eliminar un viaje desde la interfaz produce borrado lógico.
- El ciclo de vida usa estados explícitos: `planning`, `active` y `completed`.
- Las actividades conservan fecha y hora local junto con una zona horaria IANA.
- Realtime mejora la colaboración, pero nunca sustituye el CRUD ni PostgreSQL como fuente de verdad.
- Las fotografías son privadas; no se persisten URLs públicas ni URLs firmadas.
- La experiencia debe sentirse cálida y privada, no como una red social pública.

## Alcance del MVP

1. Registro, inicio y cierre de sesión, y recuperación de contraseña.
2. Perfil con nombre visible y avatar.
3. Dashboard con Próximos, En curso, Recuerdos y Archivados.
4. Crear y editar viajes con nombre, descripción, destino, portada, fechas y zona horaria.
5. Roles `owner`, `admin` y `member`.
6. Invitaciones por enlace seguro con expiración, revocación y límite de usos.
7. Participantes, cambios de rol y expulsión según permisos.
8. Itinerario diario con horario local, ubicación, estado y orden.
9. Álbum privado con descripción y asociación opcional a una actividad.
10. Comentarios en fotografías y actividades.
11. Realtime para actividades, fotografías y comentarios después de estabilizar el CRUD.
12. Finalizar y reabrir viajes sin perder contenido.
13. Archivar un viaje únicamente para el usuario actual.
14. Interfaz en español, responsive y accesible.

## Fuera del MVP

- Chat y mensajes directos.
- Videos, HEIC y edición automática.
- Gastos, pagos, reservas y marketplace.
- Mapas complejos y seguimiento GPS.
- Inteligencia artificial y recomendaciones.
- Red social pública, seguidores o feed.
- Aplicación nativa y modo offline.
- Grupos reutilizables de contactos.
- Garantía comercial de almacenamiento permanente.

## Roles y permisos

### Owner

- Ve y edita todo el viaje.
- Invita, cambia roles, expulsa y modera contenido.
- Transfiere ownership, finaliza, reabre y solicita borrado lógico.
- Nunca puede abandonar el viaje sin transferir ownership.

### Admin

- Ve todo el viaje.
- Edita datos generales, itinerario y contenido.
- Invita y administra members.
- Nunca modifica, expulsa ni degrada al owner.
- No transfiere ownership ni finaliza/elimina el viaje.

### Member

- Ve el contenido del viaje.
- Crea actividades y modifica el contenido propio.
- Sube fotos y comenta.
- Archiva para sí mismo y puede abandonar si no es owner.

## Flujos críticos

1. Crear viaje y owner en una única transacción.
2. Crear invitación con token criptográfico; guardar únicamente su hash.
3. Aceptar invitación de forma atómica validando expiración, revocación, email, usos y membresía previa.
4. Transferir ownership sin permitir cero ni dos owners.
5. Conservar fecha, hora local y zona IANA en cada mutación de itinerario.
6. Subir a Storage privado, validar el archivo, guardar metadatos y compensar fallos parciales.
7. Finalizar sin mover ni borrar actividades, fotos o comentarios.
8. Archivar actualizando solo la membresía del usuario actual.

## Stack

- Next.js App Router y TypeScript strict.
- `@supabase/ssr` y `@supabase/supabase-js`.
- Tailwind CSS y componentes accesibles selectivos.
- Supabase PostgreSQL, Auth, Storage y Realtime.
- Zod para validación.
- Server Functions con FormData para formularios simples.
- Vitest, Testing Library, Playwright y pruebas SQL/RLS.
- Vercel para aplicación; Supabase para servicios gestionados.
- npm cuando el repositorio parte vacío.

## Arquitectura

- Next.js actúa como Backend for Frontend; no habrá backend separado en el MVP.
- Server Components por defecto; Client Components únicamente para interacción, APIs del navegador, uploads y Realtime.
- Server Actions y Route Handlers se consideran endpoints públicos.
- `proxy.ts` renueva la sesión, pero no autoriza acciones ni datos.
- La identidad de servidor se verifica con `getClaims()` o `getUser()`.
- Validaciones, permisos y transiciones se centralizan por dominio.
- Las operaciones críticas se realizan mediante RPC transaccionales.
- Las respuestas autenticadas nunca se almacenan en caché compartida.
- Los tipos de base de datos generados por Supabase CLI se versionan.

## Modelo mínimo

### `profiles`

- `id uuid` PK/FK a `auth.users(id)`
- `display_name text not null`
- `avatar_path text null`
- timestamps y `deleted_at`

### `trips`

- `id uuid` PK
- `created_by uuid` FK a profiles
- nombre, descripción, destino y `cover_path`
- `start_date`, `end_date`, `default_timezone`
- estado `planning | active | completed`
- `completed_at`, `deleted_at`, timestamps
- check `end_date >= start_date`

### `trip_members`

- PK compuesta `trip_id + user_id`
- rol `owner | admin | member`
- `joined_at`, `archived_at`
- índice único parcial: un solo owner por viaje

### `trip_invites`

- `id`, `trip_id`, `token_hash unique`
- `invited_email` opcional
- rol `admin | member`; nunca owner
- expiración, máximo de usos, contador y revocación
- creador y timestamp

### `activities`

- viaje, creador, título y descripción
- fecha, horas locales y timezone IANA
- ubicación y coordenadas opcionales
- estado `planned | done | cancelled`
- posición, timestamps y borrado lógico
- una actividad que atraviesa días se divide en dos

### `photos`

- viaje, actividad opcional y uploader
- `storage_path unique`, nombre original, MIME y tamaño
- dimensiones, descripción, `taken_at`, timestamp y borrado lógico

### `comments`

- viaje y autor
- exactamente uno de `photo_id` o `activity_id`
- cuerpo, timestamps y borrado lógico
- trigger que garantiza un objetivo del mismo viaje

## Constraints e índices

- Un solo owner por viaje y ninguna transición que deje cero owners.
- Invitaciones con `max_uses > 0` y `use_count` entre 0 y `max_uses`.
- `num_nonnulls(photo_id, activity_id) = 1`.
- Relaciones de fotos, actividades y comentarios consistentes con `trip_id`.
- Índices en FKs y consultas frecuentes por viaje, fecha, estado y creación.
- Borrado lógico en todos los recursos visibles desde la aplicación.
- `created_by` conserva auditoría; el owner canónico vive en `trip_members`.

## Seguridad

- RLS en todas las tablas del esquema expuesto.
- Un usuario solo lee viajes y contenido de los que es miembro.
- `profiles` no funciona como directorio público.
- Helpers `SECURITY DEFINER` mínimos en esquema privado para evitar recursión.
- `search_path` fijo, validación de `auth.uid()` y grants explícitos.
- La publishable key puede estar en cliente; una secret/service-role key nunca.
- Tokens de invitación con suficiente entropía, no persistidos en texto plano ni registrados.
- Redirecciones Auth limitadas a una allowlist interna.
- Bucket privado y rutas con prefijo `trip_id` más identificador impredecible.
- JPEG, PNG y WebP; validación de extensión, MIME declarado, firma real, tamaño y dimensiones.
- URLs firmadas de vida corta o entrega autenticada.
- Limpieza/compensación de objetos huérfanos.
- Sin EXIF visible; política de metadatos antes de lanzamiento.
- Límites configurables de tamaño, cantidad y frecuencia.

## Pantallas

Públicas:

- Landing.
- Registro.
- Inicio de sesión.
- Recuperación y cambio de contraseña.
- Aceptación de invitación.

Autenticadas:

- Dashboard.
- Crear viaje.
- Resumen, itinerario, álbum, participantes y configuración del viaje.
- Vista Recuerdo.
- Perfil.

## Experiencia y accesibilidad

- Formatos `es-AR`.
- Diseño mobile-first con navegación compacta en teléfono.
- Navegación lateral u horizontal en escritorio.
- Estados loading, empty, error y success.
- Progreso, reintento y mensajes claros para fotografías.
- Confirmación para expulsar, transferir, finalizar, reabrir o borrar.
- Teclado, focus visible, labels, contraste y alt text.
- Ningún estado depende exclusivamente del color.
- Fechas mostradas en el huso de la actividad o del viaje.

## Criterios de aceptación

- Dos usuarios pueden registrarse y compartir un viaje privado.
- Un tercero no puede leer datos ni archivos aunque conozca identificadores.
- Invitaciones inválidas fallan de manera segura.
- Nunca existe un viaje con cero owners o más de uno.
- Archivar afecta únicamente al usuario actual.
- El itinerario conserva fechas, horas y zonas IANA.
- Archivos inválidos se rechazan y las fotos se sirven de forma privada.
- Finalizar conserva todo el contenido y habilita la vista Recuerdo.
- El proyecto supera lint, typecheck, pruebas y build de producción.

## Plan aprobado

1. Base del repositorio.
2. Modelo, migraciones y RLS.
3. Autenticación y perfil.
4. Viajes y dashboard.
5. Invitaciones y participantes.
6. Itinerario.
7. Álbum privado y comentarios.
8. Recuerdos y ciclo de vida.
9. Realtime, concurrencia y experiencia.
10. Auditoría y lanzamiento.
