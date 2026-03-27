# Projektkontekst

Dette dokument er lavet for at kunne fortsætte arbejdet i Codex på en ny pc uden at være afhængig af lokal chat-historik.

## Projekt

- Navn: `Bestillingssystem`
- GitHub: `https://github.com/agd2d/Bestilling`
- Vercel: `https://bestilling-rose.vercel.app`
- App-mappe: `implementation`
- Prototype-mappe: `prototype`

## Formål

Systemet håndterer:

- import af kundebestillinger fra Jotform
- kundebestillinger i `Varebestilling`
- overgang til `Leverandørordre`
- leverandørordrer med ordrenummer og statusflow
- faktureringstrin i `Fakturering til kunde`
- leverandørkartotek og varekatalog
- deling af data med `Kundedashboard` via samme Supabase-projekt

## Teknisk setup

- Frontend: Next.js App Router
- Database: Supabase
- Hosting: Vercel
- Mailafsendelse: Microsoft Graph
- Kildedata for kundebestillinger: Jotform

## Vigtig struktur

- `implementation/app/orders`
  - kundebestillinger
- `implementation/app/purchase-orders`
  - leverandørordrer
- `implementation/app/customer-invoicing`
  - fakturering til kunde
- `implementation/app/products`
  - varekatalog
- `implementation/app/suppliers`
  - leverandørkartotek
- `implementation/app/api/sync/orders/jotform`
  - Jotform import

## Nuvarande workflow

1. Jotform importerer kundebestillinger.
2. Brugeren afklarer varelinjer i `Varebestilling`.
3. Brugeren trykker `Send til ordre`.
4. Bestillingen flyttes fra `Varebestilling` til `Leverandørordre`.
5. Leverandørordre oprettes som rigtig ordre med ordrenummer.
6. Mail kan previewes, redigeres og sendes til leverandøren.
7. Leverandørordre kan opdateres gennem statusflowet:
   - `Ordre afgivet`
   - `Bekræftet af leverandør`
   - `Modtaget ved kunde`
8. Ved `Modtaget ved kunde` flyttes ordren til `Fakturering til kunde`.

## Seneste vigtige funktioner

- Kundebestillinger flyttes mellem `Varebestilling` og `Leverandørordre`
- Leverandørordrer får ordrenummer og låses
- Nye varelinjer går i ny kladde, ikke i lukket ordre
- Leverandør-mail sendes via Microsoft Graph
- Mail-preview kan redigeres før afsendelse
- Leverandørkartotek bruges som kilde til mailadresser

## Seneste commit

- `f4359ca`
- Beskrivelse: `Add editable purchase order mail preview`

## Miljøvariabler

Vigtige miljøvariabler:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JOTFORM_API_KEY`
- `ORDERS_JOTFORM_FORM_ID`
- `DEV_BYPASS_AUTH`
- `MICROSOFT_GRAPH_TENANT_ID`
- `MICROSOFT_GRAPH_CLIENT_ID`
- `MICROSOFT_GRAPH_CLIENT_SECRET`
- `MICROSOFT_GRAPH_SENDER_USER_ID`

## Arbejdsregler der er blevet brugt i projektet

- ændringer laves i det selvstændige `Bestillingssystem`, ikke i `Kundedashboard`
- prototype opdateres sammen med større UI-flowændringer
- brugerflader holdes enkle og arbejdsorienterede
- data skal kunne bruges senere i dashboard/statistik

## Hvis du åbner projektet på en ny pc

Bed Codex om at læse:

1. `docs/project-context.md`
2. `docs/run-from-another-pc.md`
3. `docs/microsoft-graph-mail-setup.md`

Derefter kan du skrive:

`Læs projektkonteksten og fortsæt udviklingen i Bestillingssystem.`
