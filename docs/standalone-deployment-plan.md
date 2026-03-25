# Standalone Deployment Plan

Dette dokument beskriver, hvordan bestillingssystemet skal stå som selvstændigt projekt med fælles data med Kundedashboard.

## Mål

- selvstændigt GitHub-repo
- selvstændigt Vercel-projekt
- eget subdomæne
- fælles Supabase-projekt med Kundedashboard

## Anbefalet opsætning

### GitHub

- nyt repo, fx `bestillingssystem`
- indholdet fra `Bestillingsystem/implementation` er projektroden

### Vercel

- nyt projekt koblet til det nye GitHub-repo
- root directory: repo-roden
- miljøvariabler:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `JOTFORM_API_KEY`
  - `ORDERS_JOTFORM_FORM_ID`
  - `DEV_BYPASS_AUTH=false`

### Domæne

- eksempel: `bestilling.hvidbjerg-service.dk`

### Supabase

- samme Supabase-projekt som Kundedashboard
- samme `customers`-tabel
- bestillingssystemets egne tabeller til ordrer, noter, labels og leverandørflow

## Hvordan dashboardet deler data

Kundedashboard kan læse data direkte fra de tabeller, som bestillingssystemet skriver til, eller via views.

Anbefalede læseretninger:

- antal åbne bestillinger pr. kunde
- antal leverede linjer pr. kunde
- udvikling i bestillingsvolumen
- leverandørstatus

## Hvad der mangler før rigtig deployment

1. rydde resterende tegnkodningsfejl
2. oprette det faktiske GitHub-repo
3. forbinde repo til Vercel
4. indsætte miljøvariabler i Vercel
5. køre Supabase-migrationerne i det rigtige miljø
