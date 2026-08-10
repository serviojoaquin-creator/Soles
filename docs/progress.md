# Progreso de Soles

## Fase 1 - Base del repositorio

Estado: completada el 22 de julio de 2026.

### Alcance

- Scaffold Next.js App Router con TypeScript strict y Tailwind CSS.
- Versiones estables exactas y lockfile npm.
- Documentación base y reglas permanentes del repositorio.
- Estructura de rutas y features.
- Layout responsive y estados vacíos iniciales.
- Clientes Supabase browser/server y renovación de sesión en `proxy.ts`.
- Scripts de lint, typecheck, tests, formato y build.

### Decisiones

- El scaffold se generó con Next.js estable y npm.
- Las credenciales Supabase no son necesarias para compilar la Fase 1.
- Las páginas autenticadas son estructura visual únicamente hasta la Fase 3.
- No se creó todavía el modelo de viajes, migraciones ni RLS.

### Implementado

- Landing cálida y responsive con propuesta de valor específica.
- Shell de aplicación con sidebar de escritorio y navegación inferior móvil.
- Rutas públicas y autenticadas previstas por el producto, con estados vacíos honestos en lugar de datos simulados.
- Clientes Supabase para navegador y servidor.
- `src/proxy.ts` con renovación de sesión mediante `getClaims()` y propagación de headers privados/no-store.
- Configuración sin secretos mediante `.env.example`.
- Prueba unitaria inicial para la navegación.
- Dependencias exactas y `package-lock.json`.

### Versiones principales

- Next.js 16.2.11.
- React 19.2.8.
- TypeScript 6.0.3.
- `@supabase/ssr` 0.12.3.
- `@supabase/supabase-js` 2.110.8.

### Verificación real

- `npm run format`: correcto.
- `npm run lint`: correcto.
- `npm run typecheck`: correcto.
- `npm test`: 1 archivo y 1 prueba aprobados.
- `npm run build`: build de producción correcto; 16 rutas generadas y Proxy detectado.
- `npm audit`: 0 vulnerabilidades después de fijar versiones transitivas seguras de PostCSS y Sharp.
- `npm run test:e2e`: no ejecutado; la Fase 1 todavía no contiene recorridos funcionales E2E.

### Limitaciones esperadas

- Login, registro y recuperación son estructura visual hasta la Fase 3.
- No existe todavía esquema SQL, RLS ni datos de viajes; pertenecen a la Fase 2.
- No se configuró un proyecto Supabase real ni despliegue.

## Ajuste de marca - Soles

- Producto renombrado de Trip Memory a Soles.
- Paleta actualizada a tonos de atardecer con contraste accesible.
- Isotipo provisorio preparado para ser reemplazado por el logo definitivo del usuario.
- Metadata, documentación, navegación y textos visibles actualizados.

## Fase 2 - Modelo de datos, migraciones y RLS

Estado: en progreso desde el 22 de julio de 2026.

### Implementado localmente

- Siete tablas del MVP con enums, claves foráneas, checks, índices y borrado lógico.
- Validación de zonas horarias IANA y coherencia de relaciones entre viajes, actividades, fotos y comentarios.
- Invariante transaccional de exactamente un owner por viaje.
- RLS en todas las tablas expuestas y permisos explícitos sin acceso para usuarios anónimos.
- Matriz de roles owner/admin/member mediante helpers privados sin recursión RLS.
- RPC atómicas para crear viajes, crear y aceptar invitaciones, transferir ownership, cambiar el estado y realizar borrado lógico.
- Guards que bloquean cambios directos de identidad, autoría, ownership, términos de invitación y ciclo de vida.
- Tipos TypeScript del esquema conectados a los tres clientes Supabase.
- Suite SQL pgTAP para esquema, invariantes, invitaciones, ownership y aislamiento RLS.
- Pruebas unitarias que mantienen el contrato mínimo de las migraciones.

### Verificación local

- Ambas migraciones se aplicaron correctamente en un runtime PostgreSQL aislado.
- El flujo crear viaje → invitar → aceptar → aislar tercero → transferir ownership → activar viaje fue correcto bajo RLS.
- `npm run format`, `npm run lint` y `npm run typecheck`: correctos.
- `npm test`: 2 archivos y 12 pruebas aprobados.
- `npm run build`: compilación de producción correcta; 16 rutas generadas y Proxy detectado.
- `npm run test:e2e`: no aplicable todavía; la Fase 2 no agrega recorridos de interfaz.
- La suite pgTAP está preparada, pero todavía no se ejecutó dentro del stack oficial de Supabase.

### Pendiente para completar la fase

- Ejecutar `supabase test db` en el stack oficial de Supabase.
- Regenerar `src/types/database.ts` desde la base aplicada y confirmar que no existan diferencias.

### Integración remota

- Supabase CLI 2.109.1 quedó instalada como dependencia de desarrollo y el repositorio se vinculó al proyecto `kvopmhzmrresafzrzsmp`.
- `supabase db push --dry-run` enumeró exactamente las tres migraciones versionadas sin errores SQL.
- `supabase db push` aplicó `202607220001_phase_2_schema.sql`, `202607220002_phase_2_security.sql` y `202607220003_phase_3_auth_profiles.sql` en ese orden.
- Una consulta remota de solo lectura confirmó `public.profiles`, su FK a `auth.users`, la función y el trigger de provisioning, RLS en las siete tablas, las tres versiones de migración y ausencia de grants o policies para `anon`/`public`.
- Se verificaron 23 policies remotas: 19 sobre las tablas del producto y 4 sobre objetos del bucket privado `avatars`.
- Una solicitud REST con publishable key pero sin usuario autenticado recibió `401`, comportamiento esperado que confirma que `profiles` no funciona como directorio público.
- Validación final después del push: lint y typecheck correctos, 5 archivos con 24 pruebas aprobadas y build de producción correcto con 18 rutas.

## Fase 3 - Autenticación y perfil

Estado: implementación local completada el 22 de julio de 2026; integración real pendiente.

### Implementado localmente

- Registro con nombre visible, email, contraseña y confirmación por correo cuando Supabase la requiera.
- Inicio y cierre de sesión con cookies SSR.
- Recuperación de acceso, callback PKCE con redirect interno seguro y cambio de contraseña.
- Protección server-side de todo el grupo de rutas autenticadas.
- Validaciones Zod y mensajes seguros que no exponen errores internos ni permiten enumerar cuentas.
- Creación automática y backfill de perfiles desde `auth.users`.
- Edición del nombre visible y visualización del email verificado.
- Upload, reemplazo y eliminación de avatar con validación binaria, compensación básica y URLs firmadas breves.
- Bucket privado `avatars` con límite de 2 MB, formatos permitidos y policies RLS por propietario/viaje compartido.
- Identidad de la cuenta y cierre de sesión disponibles en navegación móvil y de escritorio.

### Verificación local

- Las tres migraciones se aplican juntas en un PostgreSQL aislado.
- El flujo RLS de viajes de Fase 2 continúa funcionando después de agregar el trigger de perfiles y las policies de avatares.
- Se agregaron pruebas unitarias para validaciones, redirects, mensajes y contrato de migración.
- Se agregó una suite pgTAP para provisioning de perfiles y configuración privada de avatares.
- `npm run format`, `npm run lint` y `npm run typecheck`: correctos.
- `npm test`: 4 archivos y 21 pruebas aprobados.
- `npm run build`: compilación de producción correcta; 18 rutas generadas y Proxy detectado.
- `npm audit`: 0 vulnerabilidades después de incorporar Zod 4.4.3.
- `npm run test:e2e`: pendiente porque requiere un proyecto Supabase conectado y cuentas de prueba.
- La URL y la publishable key del proyecto de desarrollo quedaron configuradas únicamente en `.env.local`, archivo excluido del repositorio.
- Supabase Auth respondió correctamente y el build detectó la configuración local.
- El endpoint de `profiles` respondió como tabla inexistente, confirmando que las migraciones todavía no fueron aplicadas al proyecto remoto.
- La configuración pública de Auth confirmó que el registro por email está habilitado y exige confirmar el correo antes del primer ingreso.
- Los formularios de contraseña permiten mostrar u ocultar el valor con un control accesible, y los errores de Auth distinguen confirmación pendiente, límites de intentos y configuración incompleta.

### Pendiente de integración

- Ejecutar las suites pgTAP en Supabase.
- Configurar las URLs permitidas de Auth y verificar registro, confirmación y recuperación con emails reales.
- Probar upload y lectura de avatares contra Supabase Storage.

## Fase 4 - Viajes y dashboard

Estado: implementación local y migración remota completadas el 23 de julio de 2026.

### Implementado localmente

- Dashboard real con Próximos, En curso, Recuerdos y Archivados, derivado del estado explícito del viaje y del archivado individual.
- Estados vacíos por sección, feedback seguro, loading y error boundary para las rutas autenticadas.
- Creación de viaje mediante la RPC transaccional `create_trip`, incluyendo nombre, descripción, destino, fechas, zona horaria IANA y portada opcional.
- Resumen privado del viaje con portada firmada, estado, rol, fechas, zona horaria y cantidad de integrantes.
- Edición de datos generales para owner/admin con comprobación server-side, RLS y guards de base.
- Transición `planning → active` reservada al owner mediante `set_trip_status`.
- Archivado y desarchivado sobre `trip_members.archived_at`, limitado a la membresía del usuario actual.
- Bucket privado `trip-covers` con límite de 2 MB, formatos JPEG/PNG/WebP y policies separadas para lectura de miembros y escritura de owner/admin.
- Validación de fechas reales, orden de fechas, zonas IANA, MIME, tamaño y firma binaria de portadas; URLs firmadas de cinco minutos y compensación de uploads fallidos.
- Invitaciones, administración de participantes, itinerario, álbum, comentarios y finalización permanecen fuera de la fase.

### Verificación local

- `npm run format`: correcto.
- `npm run lint`: correcto.
- `npm run typecheck`: correcto.
- `npm test`: 7 archivos y 33 pruebas aprobados.
- `npm run build`: build de producción correcto; 18 rutas y Proxy detectados.

### Integración remota

- La migración `202607230001_phase_4_trip_covers.sql` fue revisada por dry run y aplicada al proyecto remoto junto con la corrección de Fase 6.

## Fase 5 - Invitaciones y participantes

Estado: implementación local completada el 23 de julio de 2026.

### Implementado

- Generación server-side de tokens criptográficos de 256 bits y persistencia exclusiva del hash SHA-256 mediante la RPC existente.
- Invitaciones con email opcional normalizado, rol admin/member, vencimiento de 1 a 30 días y límite de 1 a 25 usos.
- Presentación única del enlace crudo con control para copiar; el listado posterior no puede reconstruirlo ni mostrarlo.
- Aceptación transaccional con validación de formato, sesión, expiración, revocación, email, usos y membresía previa.
- Continuidad segura desde invitación hacia login, registro, confirmación por email y regreso al enlace mediante destinos internos validados.
- Lista privada de participantes con avatar, nombre, rol y fecha de ingreso.
- Cambio de roles reservado al owner, expulsión de members por admin y de no-owners por owner, y salida voluntaria para admin/member.
- Transferencia atómica de ownership a un integrante existente, con elección del nuevo rol del owner anterior y confirmación explícita.
- Listado y revocación de invitaciones para owner/admin con estados Activa, Vencida, Agotada y Revocada.
- Revalidación de identidad y permisos en cada Server Action, además de RLS y guards de PostgreSQL.

### Seguridad y concurrencia

- `accept_trip_invite` bloquea la invitación con `FOR UPDATE` antes de consumir un uso; una carrera no puede superar `max_uses`.
- El owner no puede ser expulsado ni abandonar sin transferir, y el índice/trigger diferible mantiene exactamente un owner.
- Un admin no puede modificar owner/admin ni transferir ownership.
- Los errores públicos son genéricos y no reflejan detalles del proveedor ni estados privados de una invitación.

### Verificación local

- `npm run format`: correcto.
- `npm run lint`: correcto.
- `npm run typecheck`: correcto.
- `npm test`: 9 archivos y 47 pruebas aprobados.
- `npm run build`: build de producción correcto; 18 rutas y Proxy detectados.
- `npm run test:e2e`: pendiente; requiere dos cuentas confirmadas y datos de prueba en Supabase.

### Migraciones

- La Fase 5 no agrega migraciones: reutiliza las RPC, constraints, guards y policies aplicadas en Fase 2.

## Fase 6 - Itinerario

Estado: implementación local completada el 23 de julio de 2026.

### Implementado

- Línea de tiempo por día, horario local y posición, con actividades sin hora al final.
- Creación y edición con fecha, horas opcionales, zona IANA, lugar y descripción.
- Confirmación explícita para fechas fuera del rango del viaje.
- Estados Planificada, Realizada y Cancelada, reordenamiento y borrado lógico.
- Escritura limitada al autor o a owner/admin, además de las policies RLS existentes.

### Verificación local

- `npm run format`, `npm run lint` y `npm run typecheck`: correctos.
- `npm test`: 11 archivos y 57 pruebas aprobados.
- `npm run build`: build de producción correcto; 18 rutas y Proxy detectados.
- `npm run test:e2e`: pendiente; requiere cuentas confirmadas y datos reales en Supabase.

### Migraciones

- `202607230002_phase_6_timezone_permissions.sql` corrige el permiso de ejecución del helper de zona IANA usado por los triggers de viajes y actividades. Solo `authenticated` recibe `EXECUTE`; `public` y `anon` permanecen revocados.
- El dry run remoto enumeró únicamente la portada privada pendiente de Fase 4 y esta corrección. Ambas migraciones se aplicaron correctamente al proyecto `kvopmhzmrresafzrzsmp` el 23 de julio de 2026.

## Fase 7 - Álbum privado y comentarios

Estado: completada local y remotamente el 23 de julio de 2026; E2E real pendiente.

### Implementado

- Bucket privado `trip-photos` con hard limit de 4 MB, tipos JPEG/PNG/WebP y rutas exactas `trip_id/uuid.ext`.
- Policies de Storage para lectura y subida de miembros, y borrado por uploader u owner/admin, sin acceso para `anon` o `public`.
- Subida autenticada con progreso, cancelación, reintento y mensajes seguros en español.
- Verificación del formato real, coincidencia MIME, tamaño, dimensiones y rechazo de imágenes animadas mediante `sharp`.
- Límites configurables de tamaño, dimensiones, cantidad por viaje, frecuencia por usuario y carga incremental.
- Persistencia de metadatos en `photos`, asociación opcional con una actividad y compensación inmediata si falla el insert.
- Grilla responsive con lotes incrementales y URLs firmadas privadas de cinco minutos que nunca se guardan en la base.
- Comentarios en fotos y actividades, con borrado lógico por autor, owner o admin.
- Borrado lógico de fotos y eliminación del objeto privado, con aviso y log explícito si Storage requiere limpieza manual.

### Verificación local

- `npm run format`, `npm run lint` y `npm run typecheck`: correctos.
- `npm test`: 14 archivos y 69 pruebas aprobados.
- Las pruebas nuevas cubren permisos, moderación, objetivos de comentarios, archivo inválido, MIME falso, límites, bucket privado, paths y ausencia de `service_role`.
- `npm run build`: build de producción correcto; 19 rutas y Proxy detectados, incluida la nueva ruta autenticada de upload.
- La pantalla real se verificó en localhost a ancho móvil: sin overflow horizontal, errores de consola ni fallos al cargar el álbum y el itinerario.
- `npm run test:e2e`: pendiente; requiere dos cuentas confirmadas y fotos reales en Supabase.

### Integración remota

- El dry run enumeró exclusivamente `202607230003_phase_7_private_photos.sql` y la migración se aplicó al proyecto `kvopmhzmrresafzrzsmp`.
- La verificación remota confirmó la versión de migración, el bucket privado `trip-photos`, el hard limit de 4 MB, los tres MIME permitidos, ambas funciones auxiliares y exactamente tres policies de Storage.
- No existen policies de fotos para `anon` o `public`.

## Pendientes transversales

- Ejecutar pgTAP/RLS en el stack oficial de Supabase y regenerar los tipos de base desde el esquema remoto.
- Completar E2E con cuentas confirmadas para Auth, viajes, invitaciones, itinerario, álbum, recuerdos y Realtime.
- Definir retención, exportación, backups, recuperación y tratamiento de metadatos EXIF antes del lanzamiento público.

## Fase 8 - Recuerdos y ciclo de vida

Estado: completada local y remotamente el 23 de julio de 2026; E2E con varias cuentas pendiente.

### Implementado

- Finalización y reapertura explícitas, confirmadas y reservadas al owner mediante la RPC transaccional existente.
- `completed_at` verificado después de cada transición y revalidación de dashboard y todas las vistas del viaje.
- Recuerdos de solo lectura en aplicación, tablas y Storage; comentarios y archivo individual permanecen habilitados.
- Vista Recuerdo con portada, fechas, participantes, resumen, itinerario cronológico, actividades realizadas y álbum privado.
- Navegación y tarjetas de dashboard orientadas directamente al Recuerdo cuando el viaje está completado.
- Pruebas de permisos, confirmación, transición, reapertura y conservación de actividades, fotos y comentarios.

### Pendiente

- Probar el flujo completo con cuentas reales: owner finaliza/reabre, admin y member no pueden hacerlo, comentarios siguen funcionando y el archivo es individual.

### Verificación local

- `npm run format`, `npm run lint` y `npm run typecheck`: correctos.
- `npm test`: 15 archivos y 75 pruebas aprobados.
- `npm run build`: build de producción correcto; 19 rutas y Proxy detectados, incluida la vista autenticada `/trips/[tripId]/memory`.
- Localhost responde en el puerto 3000 y la pantalla autenticada verificada no presenta errores de aplicación.

### Integración remota

- El dry run enumeró exclusivamente `202607230004_phase_8_memory_read_only.sql` y la migración se aplicó correctamente al proyecto `kvopmhzmrresafzrzsmp`.
- La verificación remota confirmó la versión de migración, ambas funciones auxiliares, cinco triggers de protección, ocho policies públicas y cinco policies de Storage.
- Todos los viajes completados tienen `completed_at`; los comentarios siguen habilitados, el archivo permanece por integrante y no existen policies del recuerdo para `anon` o `public`.

### Corrección de borrados lógicos

- Se detectó que los updates directos de `deleted_at` eran rechazados al combinar la representación de PostgREST con las policies SELECT que ocultan filas borradas.
- La migración `202607230005_fix_soft_delete_rpcs.sql` incorpora funciones transaccionales `SECURITY DEFINER` con `search_path` vacío y comprobaciones internas de identidad, membresía, rol y estado del viaje.
- Comentarios, fotos y actividades usan estas RPC; la aplicación conserva sus controles previos y registra errores de Supabase en formato legible.
- Verificación local: 16 archivos y 78 pruebas aprobados.
- La migración remota quedó aplicada y verificada: las tres funciones son `SECURITY DEFINER`, usan `search_path` vacío, `authenticated` puede ejecutarlas y `anon` permanece bloqueado.
- Queda únicamente la comprobación manual de los botones reales con contenido de prueba.

## Fase 9 - Realtime, concurrencia y experiencia

Estado: completada local y remotamente el 23 de julio de 2026; prueba con dos sesiones reales pendiente.

### Implementado

- Canal Broadcast privado y separado por viaje, autorizado mediante RLS de `realtime.messages` y membresía real en `trip_members`.
- Triggers exclusivamente sobre `activities`, `photos` y `comments`, con payload de invalidación reducido que no incluye contenido privado.
- Revalidación del Server Component al recibir cambios; PostgreSQL y RLS siguen siendo la fuente de verdad y todas las mutaciones conservan revalidación propia.
- Deduplicación de entregas por 30 segundos, agrupación de cambios concurrentes en una recarga y cleanup de canal/temporizador al desmontar.
- Estado visible de conexión con fallback manual, sin bloquear el CRUD si Realtime falla.
- Navegación activa con `aria-current`, enlace para saltar al contenido, landmarks sin `<main>` anidados, foco visible, movimiento reducido y formulario de comentarios adaptable a pantallas angostas.

### Verificación local

- `npm run format`, `npm run lint` y `npm run typecheck`: correctos.
- `npm test`: 18 archivos y 85 pruebas aprobados.
- Las pruebas nuevas cubren allowlist de tablas, autorización privada, ausencia de `service_role`, revalidación tras mutaciones, deduplicación, concurrencia y cleanup.
- `npm run build`: build de producción correcto.
- Localhost queda activo en el puerto 3000. La inspección visual automatizada fue bloqueada por la política del navegador y debe completarse manualmente a ancho móvil y escritorio.

### Integración remota

- `202607230006_phase_9_private_realtime.sql` crea la función de broadcast, tres triggers y una policy SELECT de canal privado para integrantes autenticados.
- El primer push encontró que el rol de migraciones no es owner de la tabla administrada `realtime.messages`. PostgreSQL revirtió por completo el intento; una consulta de solo lectura confirmó migración ausente, cero triggers, función ausente y policy ausente, mientras RLS ya estaba activo.
- Se eliminó exclusivamente el `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` innecesario, se agregó una prueba de regresión y el nuevo dry run enumeró solo la migración de Fase 9.
- El push corregido finalizó correctamente. La verificación remota confirmó la versión, la función `SECURITY DEFINER` con `search_path` seguro y sin ejecución cliente, exactamente tres triggers sobre las tablas aprobadas, RLS activo y la policy privada sin acceso `anon`/`public`.

## Fase 10 - Auditoría integral y preparación de lanzamiento

Estado: auditoría local completada el 7 de agosto de 2026; validación E2E remota pendiente.

### Hallazgos corregidos

- El build dependía de descargar Geist desde Google Fonts. Se reemplazó por una pila tipográfica local del sistema y se agregó una prueba de regresión para garantizar compilaciones sin esa dependencia de red.
- La RPC segura `set_trip_deleted` existía desde la Fase 2, pero faltaba el flujo de interfaz. El owner ahora puede aplicar borrado lógico con confirmación explícita; server y PostgreSQL vuelven a comprobar permisos, y un recuerdo completado debe reabrirse antes.
- Recuperación de contraseña ahora distingue límites temporales de envío y registra únicamente código/estado seguro del proveedor para diagnóstico, sin exponer emails ni permitir enumeración de cuentas.
- Se agregaron encabezados globales `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`.
- Se confirmó que `.env.local` contiene URL, publishable key y URL local del sitio, y que no contiene una clave `service_role`.

### Verificación local

- Formato: correcto.
- Lint: correcto.
- Typecheck: correcto.
- Pruebas: 19 archivos y 88 pruebas aprobados.
- Build de producción: correcto; 19 rutas y Proxy detectados.
- Supabase CLI: versión 2.109.1 disponible con telemetría desactivada para el entorno restringido.
- No se agregaron migraciones ni se modificó la base remota.

### Validaciones manuales pendientes

- Renovar el login de Supabase CLI para volver a consultar el historial remoto; la sesión anterior no quedó persistida.
- Configurar y confirmar las URLs permitidas de Auth, y probar registro, confirmación y recuperación con emails reales.
- Ejecutar la suite E2E ya preparada con tres cuentas confirmadas para validar invitaciones, Realtime, aislamiento de un tercero, uploads privados, comentarios, finalización, reapertura y limpieza.
- Definir retención, exportación, backups, recuperación y política de eliminación de metadatos EXIF antes de producción.

## Fase 11 - Validación E2E y preparación de despliegue

Estado: infraestructura local implementada el 7 de agosto de 2026; recorrido privado con tres cuentas y despliegue real pendientes.

### Implementado

- Playwright 1.62 versionado como dependencia de desarrollo, con scripts para instalar Chromium y ejecutar la suite.
- Proyectos separados para escritorio, móvil y flujo crítico, con capturas y trazas solo ante fallos.
- Pruebas públicas de landing, login, registro, recuperación, protección de dashboard y bloqueo de redirects externos.
- Recorrido privado preparado para owner, member y outsider: creación, invitación, aislamiento 404, actividad con actualización Realtime, foto privada, comentario, finalización, Recuerdo y limpieza por borrado lógico.
- Doble seguro contra mutaciones accidentales: seis credenciales E2E completas y `E2E_ALLOW_MUTATIONS=1`.
- Guía de despliegue con separación de entornos, variables, redirects, orden de migraciones, verificación y rollback.

### Verificación local inicial

- Playwright sobre Chrome instalado: 6 pruebas públicas aprobadas en escritorio y móvil.
- Flujo privado: 1 prueba omitida de forma intencional porque todavía no se proporcionaron tres cuentas exclusivas de prueba ni autorización de mutaciones.
- No se modificó Supabase ni se desplegó la aplicación.

### Pendiente para cerrar la fase

- Crear o proporcionar tres cuentas confirmadas en un proyecto Supabase de pruebas, nunca en producción.
- Ejecutar el recorrido privado completo con `E2E_ALLOW_MUTATIONS=1` y revisar sus trazas ante cualquier fallo.
- Renovar el login de Supabase CLI, ejecutar pgTAP/RLS y regenerar los tipos desde el esquema remoto.
- Aprobar el entorno destino antes de vincular o desplegar Vercel y Supabase.

### Corrección posterior al despliegue

- Los registros de producción mostraron que la ruta de subida de fotos fallaba al cargar `sharp` porque faltaba `libvips-cpp.so.8.18.3`; no era un fallo de permisos de Supabase ni del bucket privado.
- Se declararon como dependencias opcionales directas los paquetes Linux x64 de `sharp` y `libvips`, además del trazado ya existente. Vercel instalará el binario compatible durante su build Linux.
- Verificación local posterior: `npm run lint`, `npm run typecheck`, `npm test` (19 archivos, 90 pruebas) y `npm run build` correctos. Falta comprobar una subida real después del próximo despliegue de producción.

### Opción de edición en Recuerdos

- El owner puede decidir si un viaje finalizado se mantiene protegido o admite ediciones sin dejar de estar en Recuerdos. La opción inicia deshabilitada y se cambia únicamente mediante la RPC `set_trip_completed_editing`.
- La migración local `202608100001_completed_trip_editing_option.sql` agrega `trips.allow_completed_edits`, actualiza las protecciones de RLS, Storage, triggers y RPCs de borrado lógico. No se aplicó todavía al proyecto remoto.
- Verificación local: `npm run lint`, `npm run typecheck`, `npm test` (20 archivos, 94 pruebas) y `npm run build` correctos.
