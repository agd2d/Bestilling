# Jotform Product Seed

Denne del bruges til at oprette et første varekatalog direkte fra Jotform-formularens inventory-felter.

## Formål

- få `products` fyldt hurtigt, så Jotform-linjer kan matches
- bruge formularens egne varenumre som første katalogkilde
- gemme et CSV-udtræk, som senere kan renses og afløses af rigtig Excel-import

## Script

- script: [sync-jotform-products.mjs](C:/Users/jonat/Hvidbjerg%20Service/Hvidbjerg%20Service%20-%20F%C3%A6llesdrev%20-%20Dokumenter/Udvikling%20-%20Software/Privat-kontor-pc/Bestillingsystem/implementation/scripts/sync-jotform-products.mjs)

## Kommando

Kør i [implementation](C:/Users/jonat/Hvidbjerg%20Service/Hvidbjerg%20Service%20-%20F%C3%A6llesdrev%20-%20Dokumenter/Udvikling%20-%20Software/Privat-kontor-pc/Bestillingsystem/implementation):

```bash
npm run sync:jotform-products
```

## Hvad scriptet gør

1. læser Jotform-spørgsmålene fra ordreformularen
2. finder alle inventory-widgets med varenummer i feltteksten
3. udleder:
   - `product_number`
   - `name`
   - foreløbig `unit`
4. opretter leverandøren `Jotform katalog`, hvis den ikke findes
5. upserter produkter i `products`
6. skriver et udtræk til:
   - [jotform-products-seed.csv](C:/Users/jonat/Hvidbjerg%20Service/Hvidbjerg%20Service%20-%20F%C3%A6llesdrev%20-%20Dokumenter/Udvikling%20-%20Software/Privat-kontor-pc/Bestillingsystem/docs/jotform-products-seed.csv)

## Vigtig note

Dette er et startkatalog, ikke den endelige master.

Det betyder:

- `default_price` sættes ikke endnu
- `unit` er første gæt
- leverandør sættes midlertidigt til `Jotform katalog`

Når I senere har den rigtige Excel-fil, kan den overtage som egentlig masterimport.
