# Despliegue controlado de Soles

Esta guía prepara el lanzamiento sin asumir que un proyecto remoto existente es producción. Ningún comando de esta sección debe ejecutarse contra datos reales sin confirmar primero el entorno.

## Entornos

| Entorno    | Aplicación               | Supabase                                | Datos permitidos                 |
| ---------- | ------------------------ | --------------------------------------- | -------------------------------- |
| Local      | `localhost:3000`         | Desarrollo local o remoto de desarrollo | Datos descartables               |
| Preview    | URL de Preview de Vercel | Proyecto Supabase de staging            | Cuentas E2E y datos descartables |
| Production | Dominio definitivo       | Proyecto Supabase de producción         | Datos reales                     |

Preview y Production no deben compartir base de datos, Storage ni cuentas de prueba.

## Variables de aplicación

Configurar por separado en Development, Preview y Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SOLES_MAX_PHOTO_BYTES`
- `SOLES_MAX_PHOTO_WIDTH`
- `SOLES_MAX_PHOTO_HEIGHT`
- `SOLES_MAX_PHOTOS_PER_TRIP`
- `SOLES_PHOTO_UPLOADS_PER_MINUTE`
- `SOLES_PHOTO_PAGE_SIZE`

La publishable key puede llegar al navegador porque RLS protege los recursos. No configurar una secret key ni `service_role` en la aplicación.

Las variables `E2E_*` pertenecen exclusivamente al runner de pruebas y nunca deben configurarse en Production.

## URLs de Supabase Auth

En cada proyecto Supabase, configurar como Site URL el origen correspondiente y permitir callbacks con esta forma:

- Local: `http://localhost:3000/auth/callback`
- Preview: `https://<preview-host>/auth/callback`
- Production: `https://<dominio-final>/auth/callback`

La aplicación vuelve a validar destinos internos; esta allowlist del proveedor es una barrera adicional.

## Control previo

```bash
npm ci
npm run format
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Antes de usar el flujo E2E mutante, confirmar que la URL y las tres cuentas pertenecen a staging.

## Migraciones

Vincular explícitamente el proyecto correcto y revisar el identificador antes de continuar:

```bash
npx supabase login
npx supabase link --project-ref <project-ref-confirmado>
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list --linked
```

El dry run debe enumerar únicamente migraciones versionadas y ya revisadas. Si aparece una diferencia inesperada, detenerse sin ejecutar `db push`.

## Orden de despliegue

1. Crear o confirmar el proyecto Supabase del entorno.
2. Configurar Auth, URLs permitidas, buckets privados, cuotas y alertas.
3. Aplicar y verificar migraciones.
4. Regenerar y revisar tipos de base de datos.
5. Configurar variables en Vercel.
6. Desplegar Preview y ejecutar smoke, E2E privado y comprobación manual móvil.
7. Promover a Production solo con los controles aprobados.

## Verificación posterior

- Registro, confirmación de email, login y recuperación funcionan con el dominio real.
- Un tercero autenticado obtiene 404 ante UUID de otro viaje.
- Portadas, avatares y fotos requieren membresía y usan URLs firmadas breves.
- Invitaciones vencidas, revocadas, agotadas o de otro email fallan de forma segura.
- Realtime actualiza actividades, fotos y comentarios sin reemplazar el CRUD.
- Finalizar conserva datos, habilita Recuerdo y reabrir restaura ediciones.
- Los encabezados de seguridad aparecen en respuestas de Production.

## Rollback

- Aplicación: volver a promover el último deployment estable de Vercel.
- Variables: restaurar el conjunto anterior y volver a desplegar.
- Base: no usar `db reset` ni editar manualmente producción. Crear y revisar una migración correctiva compatible con los datos ya escritos.
- Storage: no borrar buckets u objetos como parte de un rollback de código.
- Incidente de privacidad: suspender nuevas escrituras, revocar el acceso afectado, preservar logs seguros y evaluar notificación antes de reanudar.

## Decisiones pendientes antes de Production

- Retención y eliminación de cuentas/contenido.
- Backups, restauración probada y objetivos RPO/RTO.
- Exportación de recuerdos y portabilidad de datos.
- Conservación o eliminación de EXIF al normalizar imágenes.
- Cuotas, alertas de almacenamiento y transferencia, y modelo económico.
- Política de privacidad y términos de uso.
