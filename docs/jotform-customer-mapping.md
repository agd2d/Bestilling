# Jotform Customer Mapping

Denne fil styrer, hvordan lokationer fra Jotform skal matches mod `customers` i `Kundedashboard`.

## Formål

- Jotform må ikke selv gætte endeligt på kunden
- vi vil have et styret aliaslag i `customer_import_aliases`
- samme kundeliste som `Kundedashboard` skal bruges som sandhedskilde

## Filer

- mappingfil: [jotform-customer-mapping.csv](C:/Users/jonat/Hvidbjerg%20Service/Hvidbjerg%20Service%20-%20F%C3%A6llesdrev%20-%20Dokumenter/Udvikling%20-%20Software/Privat-kontor-pc/Bestillingsystem/docs/jotform-customer-mapping.csv)
- importscript: [apply-jotform-customer-mapping.mjs](C:/Users/jonat/Hvidbjerg%20Service/Hvidbjerg%20Service%20-%20F%C3%A6llesdrev%20-%20Dokumenter/Udvikling%20-%20Software/Privat-kontor-pc/Bestillingsystem/implementation/scripts/apply-jotform-customer-mapping.mjs)

## Sådan arbejder vi

1. Jotform `Lokation på kunden` bliver læst ind.
2. Systemet prøver først direkte match mod `customers`.
3. Hvis der ikke er match, viser dry-run forslag.
4. Den godkendte kobling skrives i CSV-filen.
5. Scriptet opretter aliaser i `customer_import_aliases`.

## Kolonner i CSV

- `source`
  - skal være `jotform`

- `alias_value`
  - præcis den tekst som kommer fra Jotform

- `suggested_customer_name`
  - forslag fra systemet

- `suggested_customer_id`
  - id for forslaget

- `approved_customer_name`
  - den kunde du endeligt vælger

- `approved_customer_id`
  - id på den kunde der skal bruges i importen

- `note`
  - fri note til afklaringer

## Regel

Scriptet importerer kun rækker, hvor `approved_customer_id` er udfyldt.

Det betyder:

- forslag kan ligge klar uden at påvirke importen
- du kan godkende én kunde ad gangen
- Jotform-importen bliver mere sikker
