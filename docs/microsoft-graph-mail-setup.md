# Microsoft Graph mail setup

For at `Send ordre-mail` kan sende direkte fra bestillingssystemet, skal Vercel have fire miljøvariabler fra en Microsoft Entra app med Graph-adgang.

## Vercel status

Disse miljøvariabler mangler lige nu i projektet `bestilling`:

- `MICROSOFT_GRAPH_TENANT_ID`
- `MICROSOFT_GRAPH_CLIENT_ID`
- `MICROSOFT_GRAPH_CLIENT_SECRET`
- `MICROSOFT_GRAPH_SENDER_USER_ID`

## Det der skal oprettes i Microsoft

1. Opret en app registration i Microsoft Entra ID.
2. Opret en client secret til appen.
3. Giv appen Graph application permission:
   - `Mail.Send`
4. Giv admin consent.
5. Vælg den mailbox/bruger der skal sende fra, fx `bestilling@hvidbjerg-service.dk`.
6. Brug mailboxens bruger-id eller e-mail som `MICROSOFT_GRAPH_SENDER_USER_ID`.

## Værdier der skal ind i Vercel

- `MICROSOFT_GRAPH_TENANT_ID`
  - Tenant ID fra Microsoft Entra
- `MICROSOFT_GRAPH_CLIENT_ID`
  - Application (client) ID fra app registration
- `MICROSOFT_GRAPH_CLIENT_SECRET`
  - Secret value, ikke secret ID
- `MICROSOFT_GRAPH_SENDER_USER_ID`
  - Typisk `bestilling@hvidbjerg-service.dk`

## Kommandoer

Kør i `implementation`:

```powershell
npx vercel env add MICROSOFT_GRAPH_TENANT_ID
npx vercel env add MICROSOFT_GRAPH_CLIENT_ID
npx vercel env add MICROSOFT_GRAPH_CLIENT_SECRET
npx vercel env add MICROSOFT_GRAPH_SENDER_USER_ID
```

Når de er sat, redeploy projektet:

```powershell
npx vercel --prod
```

## Lokal test

Til lokal test kan de samme værdier også sættes i `.env.local`.

Når opsætningen er klar, bør disse kontroller være grønne:

- `GET /api/health/env`
- `Send ordre-mail` på en gemt leverandørordre

## Vigtig note

Koden er allerede bygget til Microsoft Graph. Det er kun credentials og Graph-tilladelserne, der mangler.
