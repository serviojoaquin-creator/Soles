# Supabase

Las migraciones versionadas de las Fases 2 y 3 viven en `migrations/` y las suites SQL/RLS en `tests/`.

No realizar cambios manuales no documentados en el dashboard. El esquema versionado es la fuente de verdad.

## Orden de validación

Con Supabase CLI y Docker disponibles:

1. Iniciar el stack local con `supabase start`.
2. Recrear la base con `supabase db reset`.
3. Ejecutar las pruebas con `supabase test db`.
4. Regenerar los tipos con `supabase gen types typescript --local` y comparar el resultado con `src/types/database.ts`.

En un proyecto remoto de desarrollo, aplicar primero con `supabase db push` y generar los tipos usando el identificador de ese proyecto. Nunca utilizar producción como primer destino de una migración.

Para Auth, configurar en el dashboard la URL del sitio y permitir `/auth/callback` como destino. El bucket privado `avatars` se crea mediante migración; no debe hacerse público manualmente.
