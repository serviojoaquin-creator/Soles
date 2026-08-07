# Soles repository instructions

## Communication

- Explain plans, results, risks, and blockers to the user in Spanish.
- Keep code identifiers, database names, file names, and technical comments in English.
- Ask only questions that materially affect product behavior, security, data loss, or cost.

## Required context

Before changing code, read:

1. `AGENTS.md`.
2. `docs/product-spec.md`.
3. `docs/architecture.md`.
4. `docs/progress.md`.
5. `package.json` and the current test/build configuration.

## Scope discipline

- Implement one approved phase at a time.
- Do not perform unrelated refactors or add speculative dependencies.
- Preserve existing working behavior unless the task explicitly changes it.

## Security

- Treat Server Actions, Server Functions, and Route Handlers as public endpoints.
- Validate input and re-check authentication, trip membership, and role on every mutation.
- RLS is mandatory for every exposed table. Never bypass it in normal flows.
- Never expose, print, modify, or commit secret/service-role keys or `.env.local`.
- Use `@supabase/ssr`; do not use deprecated auth-helper packages.
- `proxy.ts` refreshes sessions but never replaces application authorization.
- Do not trust `getSession().user` for server authorization.

## Database

- Version every schema change as a Supabase migration.
- Use transactions or safe RPCs for trip creation, invite acceptance, ownership transfer, and lifecycle transitions.
- Enforce invariants with database constraints and indexes, not only application checks.
- Regenerate committed database types and update RLS tests after schema or policy changes.

## Frontend

- Use Server Components by default and Client Components only when needed.
- Keep the interface mobile-first, accessible, and complete for loading, empty, error, and success states.
- Never store private signed URLs as durable data.

## Quality gate

Before completing a phase, run the applicable commands and report real results:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e` when applicable
- `npm run build`

## Documentation and handoff

- Update `docs/progress.md` after every phase.
- Record non-obvious decisions in `docs/architecture.md` or an ADR.
- Summarize files, migrations, commands, test results, limitations, and next steps.
- Do not commit or push unless the user explicitly requests it.
