# Implementation Runbook

Dette dokument beskriver, hvad der mangler for at køre den isolerede implementation lokalt.

## Placering

Appen ligger i:

- `Bestillingsystem/implementation`

Hvis du vil køre den fra en anden pc via OneDrive, se også:

- `docs/run-from-another-pc.md`

## Krævede miljøvariabler

Kopiér `.env.example` til `.env.local` og udfyld:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JOTFORM_API_KEY`
- `ORDERS_JOTFORM_FORM_ID`
- `DEV_BYPASS_AUTH=true` hvis du vil teste uden login i det isolerede miljø

## Første lokale opstart

1. installer dependencies hvis miljøet er nyt
2. opret `.env.local`
3. kør `npm run dev`
4. åbn forsiden
5. kald `GET /api/health/env`
6. kald `POST /api/sync/orders/jotform?dryRun=true`
7. kald `POST /api/sync/orders/jotform`

## Hvad er rigtigt wired nu

- Next.js appstruktur
- Supabase SSR server-klient
- Supabase service role admin-klient
- Jotform sync-route
- dry-run preview af Jotform sync
- health-endpoint for miljøstatus
- miljøvalidering
- dependencies installeret lokalt i dette arbejdsmiljø
- production build verificeret

## Hvad mangler stadig før ægte end-to-end test

- Supabase-tabeller skal være oprettet
- rigtig Jotform field mapping skal verificeres mod formularen
- appen skal have en gyldig login-cookie eller bruge `DEV_BYPASS_AUTH=true`
