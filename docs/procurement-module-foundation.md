# Varebestilling: Fundament

Dette er første trin i varebestillingsmodulet, bygget op imod `Kundedashboard` uden at røre det eksisterende projekt.

## Mål

- Bruge den eksisterende `customers`-tabel som fælles kundekilde
- Holde kunden identificerbar gennem hele flowet
- Modtage kundebestillinger fra Jotform
- Samle varelinjer til leverandørbestillinger
- Klargøre Outlook-indbakke til manuel godkendelse af ordrebekræftelser

## Centrale modelvalg

- `customer_order_requests` er den oprindelige kundebestilling
- `customer_order_request_lines` holder varelinjerne og er den vigtigste sporingsenhed
- `purchase_orders` er den samlede interne leverandørbestilling
- `purchase_order_lines` kobler kundelinjer til den faktiske leverandørbestilling
- `supplier_mail_inbox` er en separat indbakke til senere Microsoft 365 sync
- ukendte varer markeres med `needs_action = true` og kan få `draft_product_suggestion`

## Hvorfor denne opdeling

- Den gør det muligt at spore én kundelinje fra Jotform til leverandør og levering
- Den understøtter, at én kundebestilling kan deles på flere leverandører
- Den passer til eksisterende projektstil, hvor data hentes ind via server-side sync-routes og gemmes i Supabase

## Første næste trin

Når denne model er godkendt, er næste praktiske skridt:

1. Lave en konkret feltmapping fra Jotform til `customer_order_requests` og `customer_order_request_lines`
2. Definere Excel-importformat for `products`
3. Tegne route-struktur for `/orders` i samme stil som `Kundedashboard`
