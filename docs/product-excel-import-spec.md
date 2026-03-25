# Excel Import Spec: Varekatalog

Dette dokument beskriver, hvordan varekataloget skal importeres fra Excel til varebestillingsmodulet.

## Formål

- gøre det nemt at indlæse eksisterende varer fra Excel
- kunne opdatere eksisterende varer via varenummer
- registrere fejl og ufuldstændige rækker uden at miste sporbarhed
- forberede data til Jotform-import og leverandørbestillinger

## Importmål

Excel-importen skal skrive til:

- `suppliers`
- `products`

Og logge til:

- `product_import_batches`
- `product_import_errors`

## Filformat

Første version bør acceptere:

- `.xlsx`
- `.xls`
- `.csv`

Første sheet i Excel-filen bruges som standard.

## Påkrævede kolonner

Kolonnenavne i filen bør være:

- `varenummer`
- `varenavn`
- `leverandør`
- `pris`
- `enhed`
- `aktiv`

Kolonnerne kan godt komme i en anden rækkefølge, så længe overskrifterne matcher.

## Eksempel

```text
varenummer | varenavn              | leverandør | pris  | enhed | aktiv
TR-10234   | Affaldssække 100L     | Total Rent | 89,50 | rulle | ja
AB-2811    | Engangshandsker       | Abena      | 45,00 | pakke | ja
TR-99881   | Specialklud blå       | Total Rent | 12,00 | stk   | nej
```

## Mapping til database

### `suppliers`

Kolonnen `leverandør` bruges til opslag eller oprettelse af leverandør.

Regler:

1. trim tekst
2. match case-insensitive på `suppliers.name`
3. hvis leverandør ikke findes, opret ny leverandør som aktiv

### `products`

Kolonnemapping:

- `varenummer` -> `products.product_number`
- `varenavn` -> `products.name`
- `leverandør` -> `products.supplier_id`
- `pris` -> `products.default_price`
- `enhed` -> `products.unit`
- `aktiv` -> `products.is_active`

## Upsert-regler

Primær nøgle for import er:

- `product_number`

Hvis varenummer findes i forvejen:

- opdatér navn
- opdatér leverandør
- opdatér pris
- opdatér enhed
- opdatér aktiv-status

Hvis varenummer ikke findes:

- opret ny vare

## Valideringsregler

### `varenummer`

- påkrævet
- må ikke være tomt
- trimmes før opslag

### `varenavn`

- påkrævet
- må ikke være tomt

### `leverandør`

- påkrævet
- må ikke være tomt

### `pris`

- valgfri i databasen, men anbefalet i importen
- skal kunne parses som decimaltal
- både `89,50` og `89.50` skal accepteres

Hvis pris ikke kan parses:

- rækken fejler ikke nødvendigvis
- men bør markeres som importfejl i første version, så datakvaliteten holdes høj

### `enhed`

- påkrævet
- eksempler: `stk`, `pakke`, `rulle`, `kasse`

### `aktiv`

skal tolkes fleksibelt:

- `ja`, `true`, `1`, `aktiv` -> `true`
- `nej`, `false`, `0`, `inaktiv` -> `false`

Hvis feltet er tomt:

- default til `true`

## Fejlstrategi

Importen skal være delvist tolerant:

- gyldige rækker importeres
- ugyldige rækker logges i `product_import_errors`
- hele filen må ikke fejle på grund af få dårlige rækker

### Typiske fejl

- manglende varenummer
- manglende varenavn
- manglende leverandør
- ugyldig pris
- ukendt eller ugyldig aktiv-værdi

## Importflow

Anbefalet flow:

1. upload fil
2. parse første sheet
3. vis preview i UI
4. valider alle rækker
5. vis fejl og antal opret/opdater
6. brugeren godkender import
7. systemet opretter en række i `product_import_batches`
8. gyldige rækker upsertes til `products`
9. fejl logges i `product_import_errors`
10. systemet returnerer resultat

## Resultat fra import-route

Ruten bør returnere noget i denne stil:

```json
{
  "success": true,
  "batchId": "uuid",
  "rowCount": 120,
  "createdCount": 18,
  "updatedCount": 97,
  "failedCount": 5
}
```

## Foreslået API-route

- `POST /api/import/orders/products`

Muligt senere flow:

- `POST /api/import/orders/products/preview`
- `POST /api/import/orders/products/commit`

Hvis vi vil have en mere sikker UX, er preview + commit klart bedst.

## Preview-model

Previewet bør vise:

- total antal rækker
- antal nye varer
- antal opdateringer
- antal fejl
- eksempel på fejl pr. række

## Beslutninger for første kodeversion

Jeg anbefaler disse enkle valg først:

1. match kun på eksakt kolonnenavn
2. brug kun første sheet
3. opret leverandør automatisk hvis den ikke findes
4. tillad delvis import med fejllog
5. brug preview før commit

## Prototypekobling

I prototypen bør importen visualiseres med:

- uploadkort
- preview-tabel
- status for nye/opdaterede/fejl
- eksempel på en række med fejl

Det gør det nemt at validere logikken visuelt, før vi bygger rigtig filupload.
