# Soles

Soles es una aplicación web privada y colaborativa para planificar viajes, compartir fotografías y conservar cada viaje como un recuerdo digital cronológico.

## Estado

El MVP funcional de las Fases 1 a 10 está implementado. La Fase 11 agrega la validación E2E y prepara un despliegue controlado sin usar datos de producción.

## Requisitos

- Node.js 20.9 o superior (se recomienda una versión LTS compatible)
- npm 11 o superior
- Un proyecto Supabase para las fases con datos
- Docker Desktop y Supabase CLI para desarrollo local completo, o un proyecto remoto de desarrollo

## Instalación

```bash
npm install
copy .env.example .env.local
npm run dev
```

Abrí `http://localhost:3000`.

## Variables de entorno

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

La publishable key puede usarse en el navegador porque la protección de datos depende de RLS. Nunca agregues una secret key o service-role key a variables públicas.

## Comandos

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:e2e:install
npm run test:e2e
npm run format
npm run build
npm run start
```

## Supabase

Las migraciones vivirán en `supabase/migrations/` y las pruebas SQL/RLS en `supabase/tests/`.

Flujo local previsto desde la Fase 2:

```bash
npx supabase start
npx supabase db reset
npx supabase test db
npx supabase gen types typescript --local > src/types/database.generated.ts
```

No se realizarán cambios manuales no documentados desde el dashboard de Supabase.

## Pruebas E2E

La superficie pública se prueba en escritorio y móvil. El recorrido privado completo se omite salvo que existan tres cuentas confirmadas y se autoricen mutaciones en un entorno de pruebas.

```powershell
$env:E2E_OWNER_EMAIL="owner-e2e@example.com"
$env:E2E_OWNER_PASSWORD="una-clave-de-prueba"
$env:E2E_MEMBER_EMAIL="member-e2e@example.com"
$env:E2E_MEMBER_PASSWORD="una-clave-de-prueba"
$env:E2E_OUTSIDER_EMAIL="outsider-e2e@example.com"
$env:E2E_OUTSIDER_PASSWORD="una-clave-de-prueba"
$env:E2E_ALLOW_MUTATIONS="1"
npm run test:e2e
```

No uses cuentas ni datos de producción. El recorrido crea un viaje aislado, invita al member, verifica el aislamiento del tercero, actividad, Realtime, foto, comentario y Recuerdo, y finalmente aplica borrado lógico al viaje de prueba.

Si ya hay Chrome instalado y no está el navegador administrado por Playwright, se puede ejecutar con `$env:E2E_BROWSER_CHANNEL="chrome"`.

## Despliegue previsto

- Aplicación: Vercel
- Datos, Auth, Storage y Realtime: Supabase
- Entornos separados para desarrollo/pruebas y producción

La preparación, variables, redirect URLs, migraciones y rollback están documentados en `docs/deployment.md`. El despliegue real requiere aprobación explícita y entornos Supabase separados.

## Documentación

- `docs/product-spec.md`: alcance y reglas del producto.
- `docs/architecture.md`: decisiones técnicas y límites de confianza.
- `docs/progress.md`: estado verificable de cada fase.
- `AGENTS.md`: reglas permanentes para trabajar en el repositorio.
