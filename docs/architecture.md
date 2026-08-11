# Arquitectura de Soles

## Estado

Documento iniciado en la Fase 1 y actualizado hasta la auditoría local de la Fase 10.

## Componentes

1. **Next.js App Router** funciona como frontend y Backend for Frontend.
2. **Supabase Auth** mantiene identidad y sesiones SSR mediante cookies.
3. **Supabase PostgreSQL** será la fuente de verdad y aplicará RLS.
4. **Supabase Storage** conservará avatares y fotografías en buckets privados.
5. **Supabase Realtime** se agregará únicamente después de estabilizar el CRUD.
6. **Vercel** alojará la aplicación en Preview y Production.

## Límites de confianza

- Navegador: no confiable. Toda entrada puede ser manipulada.
- Proxy: renueva sesión y puede hacer redirecciones optimistas; no autoriza datos.
- Server Components, Actions y Route Handlers: vuelven a verificar identidad, membresía y rol.
- PostgreSQL/RLS: última barrera de autorización.
- Service-role: reservado para administración excepcional fuera de los flujos normales.

## Decisiones de Fase 1

- Next.js 16.2.11, React 19.2.8 y TypeScript 6.0.3 con versiones exactas y compatibles con las herramientas de calidad.
- `postcss` 8.5.22 y `sharp` 0.35.0 se fijan mediante `overrides` porque la versión estable de Next.js todavía declara versiones transitivas alcanzadas por avisos de seguridad. El build verifica compatibilidad; el override debe revisarse al actualizar Next.js.
- App Router con código bajo `src/`.
- `src/proxy.ts` al mismo nivel que `src/app`, como requiere Next.js moderno.
- Server Components por defecto; la base de esta fase no necesita estado cliente.
- Clientes Supabase creados dentro de funciones, nunca como instancias globales evaluadas durante el build.
- Las rutas autenticadas no se cachearán de forma compartida cuando se implemente Auth.
- La interfaz utiliza una dirección visual cálida, privada y mobile-first, sin apariencia de red social pública.
- La identidad de marca se denomina **Soles** y utiliza una paleta inspirada en el atardecer: crema cálido, coral, naranja solar y violeta profundo. El isotipo actual es provisorio y se reemplazará cuando se reciba el logo definitivo.
- No se usa una entidad `groups`: `trip_members` representará el grupo de cada viaje.

## Decisiones de Fase 2

- El modelo se versiona en dos migraciones: estructura e invariantes primero; autorización, guards y RPC después.
- Las siete tablas expuestas (`profiles`, `trips`, `trip_members`, `trip_invites`, `activities`, `photos` y `comments`) tienen RLS habilitado y no conceden acceso a `anon`.
- Un índice único parcial impide más de un owner y un constraint trigger diferible comprueba que cada viaje termine la transacción con exactamente uno.
- Crear viajes, crear/aceptar invitaciones, transferir ownership y cambiar el ciclo de vida usan funciones transaccionales `SECURITY DEFINER` con `search_path` vacío y grants explícitos.
- Los guards de escritura impiden alterar identidades, autoría o relaciones sensibles mediante updates directos, incluso cuando una política RLS permite editar el recurso.
- Los helpers que evitan recursión RLS viven en el esquema `private`; reciben el identificador del viaje y siempre obtienen la identidad desde `auth.uid()`.
- Las invitaciones persisten exclusivamente un hash SHA-256 hexadecimal en minúsculas. El token original debe generarse y conservarse solo durante la construcción del enlace en el servidor.
- La fecha y hora local de una actividad se guardan separadas de su zona IANA. Triggers validan la zona contra PostgreSQL.
- Los clientes Supabase usan el tipo `Database` versionado. Este tipo se regenerará con Supabase CLI al aplicar las migraciones al primer proyecto de desarrollo.
- Storage y sus policies no forman parte de esta fase; se implementarán junto con uploads privados en la Fase 7.

## Decisiones de Fase 3

- Supabase Auth usa email y contraseña con cookies SSR mediante `@supabase/ssr`; no se incorpora otro proveedor de identidad.
- `proxy.ts` renueva la sesión, pero el layout autenticado y cada mutación vuelven a validar al usuario con `getUser()`.
- El callback PKCE acepta únicamente destinos internos relativos. `NEXT_PUBLIC_SITE_URL` define el origen permitido de los enlaces enviados por email.
- Los formularios se validan con Zod en Server Actions. Los mensajes públicos usan códigos conocidos y no reflejan errores internos de Supabase.
- La recuperación de contraseña devuelve una respuesta neutral para no confirmar si un email posee una cuenta.
- Un trigger sobre `auth.users` crea el perfil con el nombre recibido al registrarse y la migración también cubre usuarios preexistentes.
- Los avatares viven en el bucket privado `avatars`, con límite de 2 MB y tipos JPEG, PNG o WebP. RLS permite administrar únicamente la carpeta propia y leer avatares de personas con un viaje compartido.
- El servidor valida tamaño, MIME y firma binaria antes del upload. Las URLs firmadas expiran a los cinco minutos y nunca se guardan como datos permanentes.
- El cambio de email queda fuera del MVP porque necesita un flujo de reverificación independiente.

## Decisiones de Fase 4

- El dashboard usa el ciclo de vida y la fecha de inicio: `planning` aparece en Próximos hasta que llega su fecha; desde entonces se muestra En curso hasta que el owner lo finaliza. `completed` alimenta Recuerdos. `trip_members.archived_at` tiene precedencia y mueve el viaje únicamente a Archivados para ese usuario.
- La creación usa exclusivamente `create_trip`, que inserta viaje y owner en una transacción. La edición de datos generales usa updates directos limitados por verificación server-side, RLS y el guard de escritura existente.
- La transición `planning → active` usa `set_trip_status` y vuelve a comprobar el rol owner antes de invocar la RPC. La finalización y reapertura permanecen fuera de esta fase.
- Las consultas autenticadas se resuelven en Server Components dinámicos. Un viaje no accesible por RLS se trata como inexistente para no filtrar identificadores.
- Las portadas viven en el bucket privado `trip-covers`, con límite de 2 MB y tipos JPEG, PNG o WebP. El servidor valida tamaño, MIME y firma binaria; los objetos siguen la ruta `trip_id/uuid.ext` y se muestran mediante URLs firmadas de cinco minutos.
- Reemplazar una portada compensa el fallo de actualización borrando el objeto nuevo. La ruta anterior se elimina únicamente después de persistir la nueva referencia.
- La migración de Storage de Fase 4 queda versionada localmente y necesita un nuevo login de Supabase antes del dry run y push remoto.

## Decisiones de Fase 5

- Los enlaces de invitación usan tokens aleatorios de 256 bits codificados como base64url. El token crudo se devuelve una sola vez al manager y PostgreSQL recibe únicamente su hash SHA-256 hexadecimal.
- Crear y aceptar invitaciones reutiliza `create_trip_invite` y `accept_trip_invite`. La aceptación bloquea la fila antes de validar/consumir usos, por lo que PostgreSQL sigue siendo la autoridad frente a concurrencia y doble aceptación.
- Login y registro aceptan un destino interno validado para volver al enlace de invitación. El callback PKCE conserva ese mismo destino sin permitir orígenes externos.
- Owner y admin pueden crear y revocar invitaciones. Solo owner cambia roles; admin únicamente puede expulsar members. El owner nunca se modifica ni abandona el viaje sin ejecutar `transfer_trip_ownership`.
- Las Server Actions vuelven a comprobar identidad, rol del actor y rol del objetivo antes de mutar. RLS, guards y constraints permanecen como barrera final ante llamadas manipuladas o carreras.
- La lista de invitaciones nunca reconstruye ni muestra tokens anteriores. Solo expone términos, uso, vencimiento y estado a owner/admin.
- La Fase 5 no requiere migraciones nuevas: usa el esquema, índices, RPC y políticas de Fase 2 que ya están aplicados en el proyecto remoto.

## Decisiones de Fase 6

- El itinerario usa `activities` como fuente de verdad y se presenta como una línea de tiempo diaria, sin incorporar un calendario complejo ni depender de Realtime para la corrección.
- La fecha, las horas locales y la zona IANA permanecen separadas. La interfaz no convierte horarios con la zona del navegador o del servidor y PostgreSQL vuelve a validar la zona horaria.
- Las actividades se ordenan de forma determinista por `activity_date`, `start_time` (las actividades sin hora van al final), `position` y `created_at`.
- Las posiciones nuevas dejan saltos de 1000. Reordenar dentro del mismo día y horario cambia una sola fila respecto de su vecina, evitando swaps parciales si una petición se interrumpe.
- Cualquier miembro puede crear actividades. El autor, owner o admin puede editarlas, cambiar su estado, reordenarlas y aplicar borrado lógico; Server Actions y RLS comprueban la misma regla.
- Una fecha fuera del rango del viaje requiere una confirmación explícita. La excepción se conserva exactamente como fue ingresada y no se corrige silenciosamente.
- El CRUD reutiliza constraints, índices, triggers, guards y policies de actividades de Fase 2. La migración correctiva `202607230002_phase_6_timezone_permissions.sql` concede a `authenticated` únicamente la ejecución del helper puro `private.is_valid_timezone(text)`, necesaria para que los triggers acepten escrituras directas; `public` y `anon` continúan revocados.

## Decisiones de Fase 7

- Las fotos viven en el bucket privado `trip-photos`, limitado a 4 MB y a JPEG, PNG o WebP. Los objetos usan exclusivamente la ruta `trip_id/uuid.ext`; una función SQL rechaza cualquier otro formato antes de evaluar membresía.
- La subida usa un Route Handler Node autenticado para poder mostrar progreso real con `XMLHttpRequest`. Vuelve a comprobar sesión y membresía, y nunca usa `service_role`.
- Parsers acotados de `Buffer` inspeccionan el formato real, MIME, dimensiones y animación de JPEG, PNG y WebP. El límite de aplicación nunca puede superar el hard limit del bucket y la ruta no depende de binarios nativos.
- Cantidad por viaje, frecuencia por usuario, tamaño, dimensiones y tamaño de página son configurables por entorno. Sus valores por defecto son 500 fotos por viaje, 10 subidas por minuto, 4 MB, 12000 píxeles por lado y 12 fotos por lote.
- El objeto se crea antes que la fila `photos`; si fallan los metadatos, el servidor elimina inmediatamente el objeto huérfano. El borrado lógico intenta eliminar el objeto privado y registra explícitamente una limpieza manual si Storage falla.
- El álbum crea URLs firmadas de cinco minutos al renderizar y nunca las persiste. La grilla carga lotes incrementales y usa Server Components; solo el formulario con progreso necesita estado cliente.
- Los comentarios de fotos y actividades reutilizan `comments`. El autor, owner o admin puede aplicar borrado lógico; las relaciones, guards y RLS de Fase 2 siguen siendo la autoridad final.
- La interfaz no lee ni muestra EXIF. En el MVP se conserva el archivo original dentro del bucket privado para no degradarlo; antes del lanzamiento debe decidirse y comunicarse si se eliminarán metadatos al normalizar cada imagen.

## Decisiones de Fase 8

- Finalizar y reabrir son transiciones explícitas, confirmadas y exclusivas del owner mediante `set_trip_status`; `completed_at` se define al finalizar y vuelve a `null` al reabrir.
- Un viaje `completed` conserva todas sus filas y objetos privados. Triggers, RLS y policies de Storage bloquean cambios en el viaje, participantes, invitaciones, actividades, fotos y portadas hasta su reapertura.
- Los comentarios permanecen habilitados después de finalizar. Es la única edición de contenido del recuerdo permitida por defecto.
- `trip_members.archived_at` continúa siendo individual: una persona puede archivar o desarchivar su recuerdo sin modificar el estado ni la visibilidad para el resto.
- La vista Recuerdo reúne portada, fechas, participantes, itinerario cronológico, actividades realizadas y álbum usando exclusivamente consultas autenticadas y URLs firmadas temporales.

## Decisiones de Fase 9

- Realtime usa Broadcast from Database sobre un canal privado `trip:<trip_id>`. La policy de `realtime.messages` permite suscribirse únicamente a integrantes autenticados del viaje mediante `private.is_trip_member`.
- Solo `activities`, `photos` y `comments` tienen triggers Realtime. El evento contiene únicamente un identificador de entrega, tabla, operación e identificador de fila; no transmite textos, metadatos de fotos ni el registro completo.
- Broadcast se usa como señal de invalidación. Los Server Components vuelven a consultar PostgreSQL y RLS sigue siendo la fuente de verdad; todos los flujos de mutación conservan su revalidación explícita aunque WebSocket no esté disponible.
- El cliente agrupa eventos simultáneos durante 250 ms, ignora identificadores repetidos por 30 segundos y elimina canal y temporizador al desmontarse.
- Los cambios de experiencia agregan navegación activa con `aria-current`, enlace para saltar al contenido, foco visible uniforme, respeto por movimiento reducido y una salida legible cuando la conexión en vivo no está disponible.

## Decisiones de Fase 10

- El build no depende de descargar fuentes durante la compilación. La interfaz usa una pila tipográfica del sistema con alternativas sans y mono para que desarrollo, CI y producción sean reproducibles sin acceso a Google Fonts.
- La eliminación visible de viajes reutiliza exclusivamente `set_trip_deleted`. La Server Action valida la confirmación, vuelve a comprobar identidad y rol owner, y verifica que la RPC haya escrito `deleted_at`; los recuerdos completados deben reabrirse antes para respetar la protección de solo lectura.
- Los errores de recuperación de contraseña distinguen límites temporales de Supabase sin revelar si existe una cuenta. El registro servidor conserva únicamente código y estado del proveedor, nunca el email ingresado ni el mensaje interno completo.
- Todas las respuestas incorporan encabezados base contra MIME sniffing, embebido en iframes, referers excesivos y permisos de cámara, micrófono o ubicación. Se pospone una CSP estricta hasta definir todos los orígenes necesarios para Supabase Auth, Storage y Realtime.
- La Fase 10 no agrega ni modifica migraciones. Las mejoras de base usan RPC y RLS ya aplicadas remotamente.

## Decisiones de Fase 11

- Un viaje completado sigue siendo un Recuerdo, pero el owner puede habilitar o deshabilitar sus ediciones sin cambiar su estado. La opción inicia deshabilitada. Cuando está activa se conservan los permisos habituales de owner, admin y member; solo el owner puede cambiarla mediante una RPC transaccional.
- La inspección de fotos no depende de binarios nativos: valida firma, MIME real, dimensiones y animación de JPEG, PNG y WebP con parsers acotados de `Buffer`. Esto elimina el punto de fallo de `sharp`/`libvips` en funciones Linux de Vercel, sin relajar las comprobaciones previas a Storage.

- Playwright prueba siempre la superficie pública en viewport de escritorio y móvil, incluida la protección de rutas y la neutralización de redirects externos.
- El recorrido privado requiere tres cuentas confirmadas: owner, member y outsider. Se omite si falta cualquiera de ellas o si `E2E_ALLOW_MUTATIONS` no vale `1`.
- Las credenciales E2E se reciben solo mediante variables privadas del proceso. No se versionan, no se exponen con prefijo `NEXT_PUBLIC_` y nunca deben corresponder a producción.
- El recorrido mutante genera nombres únicos y aplica borrado lógico en un bloque de limpieza. Si la limpieza falla, lo informa sin ocultar el fallo original.
- La prueba valida el flujo navegador → Server Actions/Route Handler → PostgreSQL/Storage → interfaz: viaje, invitación, aislamiento IDOR, actividad, Broadcast privado, foto, comentario, finalización y Recuerdo.
- El despliegue sigue separado de la implementación local. Las migraciones se aplican antes que la aplicación y el rollback de esquema se hace con una migración correctiva, nunca con un reset de producción.

## Estructura por feature

- `features/auth`: autenticación y recuperación.
- `features/trips`: viajes, dashboard y ciclo de vida.
- `features/members`: invitaciones, roles y participantes.
- `features/itinerary`: actividades y orden diario.
- `features/album`: fotos privadas y comentarios.
- `features/memories`: vista cronológica finalizada.

## Pendientes de lanzamiento

- Ejecutar la suite pgTAP/RLS en el stack oficial de Supabase y regenerar los tipos desde la base remota.
- Ejecutar el recorrido Playwright privado con tres cuentas confirmadas y sesiones simultáneas para Auth, aislamiento, uploads y Realtime.
- Definir retención, exportación, backups, recuperación y tratamiento de metadatos EXIF.
