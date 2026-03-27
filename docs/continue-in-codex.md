# Fortsæt I Codex På Ny Pc

Codex deler ikke automatisk lokal chat-historik mellem computere.

Derfor er den sikre metode:

1. Åbn samme projektmappe på den nye pc
2. Start projektet
3. Giv Codex projektkonteksten fra repoet

## Hurtig opstart

1. Åbn:
   - `Bestillingsystem/implementation`
2. Kør:
   - `start-here.cmd`
3. Vent til appen starter

Hvis `node_modules` eller `.next` driller på ny pc:

1. luk serveren
2. slet lokalt:
   - `implementation/node_modules`
   - `implementation/.next`
3. kør `start-here.cmd` igen

## Brug denne prompt i Codex

Kopiér dette ind som første besked på den nye pc:

```text
Læs disse filer først og fortsæt derefter arbejdet i Bestillingssystem:

- docs/project-context.md
- docs/run-from-another-pc.md
- docs/microsoft-graph-mail-setup.md

Arbejd videre i samme stil og samme struktur som det eksisterende projekt.
```

## Hvis du vil fortsætte på en konkret opgave

Tilføj derefter fx:

```text
Næste opgave er:
[skriv opgaven her]
```

Eksempler:

- `Næste opgave er at forbedre faktureringsflowet.`
- `Næste opgave er at bygge historik på leverandørordrer.`
- `Næste opgave er at rydde resterende danske tekstfejl op.`

## Anbefaling

Brug disse filer som fælles hukommelse i repoet i stedet for at stole på lokal chat-historik.
