# Bestillingssystem

Dette er det selvstændige bestillingssystem til Hvidbjerg Service.

Projektet er bygget som en separat Next.js-app, men følger samme logik og overordnede struktur som `Kundedashboard`.

## Formål

- importere kundebestillinger fra Jotform
- håndtere varer, status, noter og senere labels
- samle bestillinger pr. leverandør
- dele data med Kundedashboard via samme Supabase-projekt

## Arkitektur

- frontend: selvstændigt Vercel-projekt
- database: fælles Supabase med Kundedashboard
- auth: kan deles via Supabase
- dataflow: bestillingssystem skriver data, dashboard læser statistik og status

## Vigtige dele

- `app/orders`
  - ordreoversigt og ordredetalje
- `app/api/sync/orders/jotform`
  - Jotform dry run og import
- `app/api/orders/requests/[id]/status`
  - statusændring
- `app/api/orders/requests/[id]/notes`
  - noter

## Lokal opstart

- kør `start-here.cmd`

## Deployment

Se:

- `../docs/run-from-another-pc.md`
- `../docs/implementation-runbook.md`
- `../docs/project-context.md`
- `../docs/continue-in-codex.md`
