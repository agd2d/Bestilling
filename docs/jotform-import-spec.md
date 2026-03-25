# Jotform Import Spec

Dette dokument beskriver, hvordan en Jotform-bestilling skal importeres til varebestillingsmodulet.

## Formål

- Hver Jotform-submission skal automatisk blive til én `customer_order_request`
- Hver varelinje i formularen skal blive til én `customer_order_request_line`
- Kunden skal kunne spores sikkert hele vejen til leverandørbestilling og senere statistik
- Ukendte varer må ikke blokere hele importen, men skal markeres til handling

## Arbejdshypotese

Bestillingsformularen indeholder altid en kundereference i formatet:

`Lokation på kunden - [kundenavn]`

Derudover indeholder formularen varenummer pr. linje.

## Importmodel

En Jotform-submission mappes sådan:

- 1 submission = 1 række i `customer_order_requests`
- 1 varelinje = 1 række i `customer_order_request_lines`

Hvis submissionen indeholder varer fra flere leverandører, bliver det først splittet senere, når interne brugere samler linjer til `purchase_orders`.

## Foreslåede Jotform-felter

De konkrete Jotform-ID'er kender vi ikke endnu, så denne mapping er baseret på semantiske feltnavne. Når den rigtige formular er tilgængelig, kan vi sætte de præcise Jotform-feltnumre ind.

### Headerfelter

- `location_on_customer`
  - eksempel: `Lokation på kunden - Kunde A`
  - bruges til kundeopslag og som `location_label`

- `submitted_by_name`
  - navn på assistent eller intern medarbejder
  - gemmes på ordrehovedet

- `submitted_by_email`
  - valgfrit
  - gemmes på ordrehovedet

- `delivery_address`
  - valgfrit, hvis adressen ikke allerede kan udledes fra kunden
  - gemmes på ordrehovedet

- `requested_delivery_date`
  - valgfrit
  - gemmes på ordrehovedet

- `internal_or_customer_note`
  - valgfrit
  - gemmes som `internal_note` på ordrehovedet

### Linjefelter

Hver varelinje forventes at indeholde:

- `product_number`
- `product_name`
- `quantity`
- `unit`

Hvis formularen bruger en repeatable sektion, importeres hver række som en selvstændig linje.

## Mapping til database

### `customer_order_requests`

- `customer_id`
  - findes via opslag på `customers`

- `source`
  - fast værdi: `jotform`

- `source_submission_id`
  - submission id fra Jotform

- `status`
  - starter som `created`

- `submitted_by_name`
  - fra formularfelt

- `submitted_by_email`
  - fra formularfelt

- `location_label`
  - original streng fra formularen

- `delivery_address`
  - fra formular eller kundedata

- `requested_delivery_date`
  - fra formular

- `internal_note`
  - fra formular

- `imported_at`
  - tidspunkt for import

### `customer_order_request_lines`

- `request_id`
  - reference til ordrehovedet

- `line_number`
  - fortløbende nummer 1..n inden for submissionen

- `raw_product_number`
  - direkte fra Jotform

- `raw_product_name`
  - direkte fra Jotform

- `quantity`
  - direkte fra Jotform, konverteret til numerisk værdi

- `unit`
  - fra formular eller fallback fra produktkartotek

- `product_id`
  - sættes hvis varenummer matcher `products.product_number`

- `supplier_id`
  - sættes fra produktets leverandør hvis match findes

- `resolved_product_number`
  - udfyldes med produktnummer fra kartoteket hvis match findes

- `resolved_product_name`
  - udfyldes med produktnavn fra kartoteket hvis match findes

- `price_for_stats`
  - sættes til kundespecifik pris hvis den findes, ellers produktets standardpris

- `line_status`
  - `ready_for_purchase` hvis produktmatch findes
  - `draft_needed` hvis produkt ikke kan matches

- `needs_action`
  - `false` ved sikkert match
  - `true` ved ukendt eller tvetydigt match

- `action_reason`
  - eksempel: `unknown_product_number`

- `draft_product_suggestion`
  - JSON med forslag til ny varekladde hvis varen ikke findes

- `customer_label_snapshot`
  - kopi af lokationsfeltet fra submissionen

## Kundeopslag

Første version af kundeopslag bør være simpel og sikker:

1. Tag hele værdien fra `location_on_customer`
2. Match den mod en kunde i `customers`
3. Hvis der ikke findes eksakt match, markeres hele submissionen som krævende handling

### Anbefalet robust strategi

Vi bør senere have et separat aliaslag, fx en tabel som:

- `customer_import_aliases`
  - `id`
  - `customer_id`
  - `source`
  - `alias_value`

Så kan Jotform-importen matche på aliaser i stedet for kun kundens primære navn.

## Produktopslag

Primær nøgle for opslag er:

- `product_number`

Importregler:

1. Find produkt på `products.product_number`
2. Hvis produkt findes, forbind linjen til produktet
3. Hvis produkt ikke findes:
   - opret linjen alligevel
   - sæt `needs_action = true`
   - sæt `line_status = 'draft_needed'`
   - opret `draft_product_suggestion` med de rå data

## Fejlscenarier

### Kunde ikke fundet

Submissionen må ikke importeres som normal ordre uden kunde.

Forslag:

- log fejlen i sync-respons
- gem submissionen i en senere `import_inbox` eller særskilt fejllog

Til første kodeversion anbefales en lille fejl-tabel:

- `order_import_errors`
  - source
  - source_submission_id
  - error_type
  - error_message
  - raw_payload

### Vare ikke fundet

Ordren importeres stadig, men den konkrete linje markeres til manuel handling.

### Mængde ugyldig

Hvis `quantity` ikke kan parses:

- marker linjen som `needs_action = true`
- sæt `action_reason = 'invalid_quantity'`

## Idempotens

Jotform-importen skal kunne køres flere gange uden dubletter.

Det sikres ved:

- unik nøgle på `customer_order_requests (source, source_submission_id)`
- importen springer kendte submissions over

## Foreslået API-flow

Ny route senere:

- `POST /api/sync/orders/jotform`

Flow:

1. Hent submissions fra Jotform API
2. Filtrér allerede importerede submissions fra
3. Parse headerfelter
4. Slå kunde op
5. Opret `customer_order_requests`
6. Parse varelinjer
7. Slå produkter op på varenummer
8. Opret `customer_order_request_lines`
9. Returnér statistik: importerede ordrer, importerede linjer, linjer med handling påkrævet

## Output fra sync-ruten

Ruten bør returnere noget i denne stil:

```json
{
  "success": true,
  "importedRequests": 12,
  "importedLines": 47,
  "actionRequiredLines": 3,
  "skippedExisting": 5,
  "failedCustomerMatches": 1
}
```

## Afklaringer før implementering

Disse punkter bør verificeres mod den rigtige formular, før vi koder sync-ruten:

1. Det præcise Jotform-felt-id for `Lokation på kunden - [kundenavn]`
2. Hvordan varelinjer er repræsenteret i formularen
3. Om `delivery_address` findes som selvstændigt felt
4. Om `unit` altid sendes med, eller skal hentes fra produktkartoteket
