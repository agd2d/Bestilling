# Kør Fra En Anden Pc

Projektet kan køres fra OneDrive på en anden Windows-pc.

## Vigtig regel

Selve projektmappen må gerne ligge i OneDrive, men disse mapper bør ikke betragtes som fælles projektdata:

- `implementation/node_modules`
- `implementation/.next`

De må gerne eksistere lokalt, men de skal opbygges på hver pc.

## Første opstart på ny pc

1. Åbn mappen:
   - `Bestillingsystem/implementation`
2. Dobbeltklik på:
   - `start-here.cmd`
3. Hvis `.env.local` mangler:
   - den oprettes automatisk
4. Udfyld:
   - `.env.local`
5. Kør derefter:
   - `start-here.cmd` igen

## Hvad scripts gør

- `setup.cmd`
  - tjekker at Node findes
  - kører `npm install`
  - opretter `.env.local` fra `.env.example`, hvis den mangler

- `run-dev.cmd`
  - starter udviklingsserveren med `npm.cmd run dev`

- `run-build-check.cmd`
  - kører en lokal build-test

- `start-here.cmd`
  - kører setup hvis nødvendigt
  - tjekker `.env.local`
  - starter udviklingsserveren

## Hvorfor `.cmd`

På denne maskine ramte vi PowerShells script-policy ved brug af `npm`.
Derfor bruger scriptsene `npm.cmd`, som er mere robust på Windows.

## Miljøfiler

`.env.local` er lokal pr. pc og bør indeholde:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JOTFORM_API_KEY`
- `ORDERS_JOTFORM_FORM_ID`
- `DEV_BYPASS_AUTH=true` hvis du vil teste uden login

## Praktisk anbefaling

Hvis OneDrive giver problemer med låste filer eller cache:

1. luk dev-serveren
2. slet lokalt:
   - `implementation/.next`
   - `implementation/node_modules`
3. kør `setup.cmd` igen

## Codex-kontekst på ny pc

Codex deler ikke automatisk lokal chat-historik mellem maskiner.

For at fortsætte hurtigt på en ny pc, brug disse filer i repoet:

- `docs/project-context.md`
- `docs/continue-in-codex.md`
- `docs/microsoft-graph-mail-setup.md`

De er lavet som projektets fælles hukommelse, så Codex kan sættes ind i arbejdet igen uden den gamle lokale chat.
