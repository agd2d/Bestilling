# Varebestilling: Route- og sidestruktur

Dette dokument beskriver den anbefalede struktur for modulet `Varebestilling`, så det passer ind i `Kundedashboard`.

## Designprincip

Vi matcher den eksisterende appstruktur:

- Next.js App Router
- server components som standard
- client components kun til interaktion
- Supabase til data
- `app/api/...` til sync og actions

UI-navnet i topmenuen skal være:

- `Varebestilling`

Anbefalet route-prefix:

- `/orders`

Det giver korte URL'er og fleksibilitet, mens navigationsteksten stadig kan være dansk.

## Topmenu

Senere skal dashboardlayoutet udvides med en ny menu:

- `Overblik`
- `Kunder`
- `Varebestilling`

`Varebestilling` skal pege på:

- `/orders`

## Primære routes

### `/orders`

Formål:

- hovedoverblik for varebestilleren
- vise ugens arbejde samlet
- give hurtig adgang til opgaver der kræver handling

Indhold:

- KPI-kort
  - åbne kundebestillinger
  - linjer klar til bestilling
  - linjer der kræver handling
  - mails i indbakke til review

- sektioner
  - `Kræver handling`
  - `Klar til leverandørbestilling`
  - `Seneste ordrebekræftelser`
  - `Seneste leveringer`

Komponenter:

- `OrdersOverviewCards`
- `ActionRequiredList`
- `ReadyForPurchaseList`
- `RecentSupplierInboxList`

### `/orders/requests`

Formål:

- liste over alle kundebestillinger

Indhold:

- søgning
- filtrering på status, kunde, label, leverandør
- sortering på dato og status

Komponenter:

- `OrderRequestFilters`
- `OrderRequestTable`

### `/orders/requests/[id]`

Formål:

- detaljeside for én kundebestilling

Indhold:

- ordrehoved
  - kunde
  - lokation
  - oprettet dato
  - indsendt af
  - overordnet status

- varelinjer
  - varenummer
  - navn
  - antal
  - leverandør
  - linjestatus
  - kræver handling

- labels
- noter
- historik
- relaterede leverandørbestillinger
- leveringsfiler/fotos

Komponenter:

- `OrderRequestHeader`
- `OrderRequestLinesTable`
- `OrderRequestLabels`
- `OrderNotesPanel`
- `RelatedPurchaseOrdersCard`
- `DeliveryArtifactsGallery`

### `/orders/purchase-orders`

Formål:

- liste over samlede leverandørbestillinger

Indhold:

- udkast
- afsendte bestillinger
- filtrering pr. leverandør og status

Komponenter:

- `PurchaseOrderFilters`
- `PurchaseOrderTable`

### `/orders/purchase-orders/new`

Formål:

- bygge en samlet leverandørbestilling fra åbne linjer

Indhold:

- vælg leverandør
- vis alle linjer klar til bestilling
- redigér antal før afsendelse
- generér mailtekst

Komponenter:

- `PurchaseOrderBuilder`
- `PurchaseOrderLinePicker`
- `PurchaseOrderEmailPreview`

### `/orders/purchase-orders/[id]`

Formål:

- detaljeside for én leverandørbestilling

Indhold:

- leverandør
- status
- mailtekst
- afsendelsestidspunkt
- relaterede kundelinjer
- leveringsstatus
- matchede mails

Komponenter:

- `PurchaseOrderHeader`
- `PurchaseOrderLinesTable`
- `PurchaseOrderMailCard`
- `MatchedSupplierMailList`

### `/orders/inbox`

Formål:

- indbakke til ordrebekræftelser og leveringsmails fra Outlook

Indhold:

- liste over importerede mails
- forslag til match mod leverandørbestilling eller kundebestilling
- manuel godkendelse eller afvisning

Komponenter:

- `SupplierInboxFilters`
- `SupplierInboxTable`
- `SupplierMailReviewPanel`

### `/orders/products`

Formål:

- varekartotek

Indhold:

- søgning
- filtrering på aktiv/inaktiv og leverandør
- redigering af varer
- adgang til import

Komponenter:

- `ProductFilters`
- `ProductTable`
- `ProductStatusToggle`

### `/orders/products/import`

Formål:

- Excel-import af varekartotek

Indhold:

- upload
- preview
- importresultat
- fejloversigt

Komponenter:

- `ProductImportUploader`
- `ProductImportPreview`
- `ProductImportResults`

## API-routes

Disse routes matcher stilen i det eksisterende projekt.

### Sync/import

- `POST /api/sync/orders/jotform`
  - henter nye bestillinger fra Jotform

- `POST /api/sync/orders/outlook`
  - henter mails fra delt mailbox

- `POST /api/import/orders/products`
  - importerer Excel-varekatalog

### Actions

- `POST /api/orders/requests/[id]/labels`
  - tilføj eller fjern label

- `POST /api/orders/requests/[id]/notes`
  - opret note

- `POST /api/orders/requests/[id]/status`
  - opdatér ordrestatus

- `POST /api/orders/request-lines/[id]/status`
  - opdatér linjestatus

- `POST /api/orders/purchase-orders`
  - opret samlet leverandørbestilling

- `POST /api/orders/purchase-orders/[id]/status`
  - opdatér leverandørbestilling

- `POST /api/orders/inbox/[id]/review`
  - godkend eller afvis mailmatch

## Foreslået app-struktur

Når modulet senere bygges ind i repoet, kan strukturen se sådan ud:

```text
app/
  (dashboard)/
    orders/
      page.tsx
      requests/
        page.tsx
        [id]/
          page.tsx
      purchase-orders/
        page.tsx
        new/
          page.tsx
        [id]/
          page.tsx
      inbox/
        page.tsx
      products/
        page.tsx
        import/
          page.tsx
  api/
    sync/
      orders/
        jotform/
          route.ts
        outlook/
          route.ts
    import/
      orders/
        products/
          route.ts
    orders/
      purchase-orders/
        route.ts
        [id]/
          status/
            route.ts
      requests/
        [id]/
          labels/
            route.ts
          notes/
            route.ts
          status/
            route.ts
      request-lines/
        [id]/
          status/
            route.ts
      inbox/
        [id]/
          review/
            route.ts
```

## Foreslået komponentstruktur

```text
components/
  orders/
    OrdersOverviewCards.tsx
    ActionRequiredList.tsx
    ReadyForPurchaseList.tsx
    OrderRequestFilters.tsx
    OrderRequestTable.tsx
    OrderRequestHeader.tsx
    OrderRequestLinesTable.tsx
    OrderRequestLabels.tsx
    OrderNotesPanel.tsx
    PurchaseOrderBuilder.tsx
    PurchaseOrderTable.tsx
    PurchaseOrderLinesTable.tsx
    PurchaseOrderEmailPreview.tsx
    SupplierInboxTable.tsx
    SupplierMailReviewPanel.tsx
    ProductTable.tsx
    ProductImportUploader.tsx
```

## Hvad der bør bygges først i UI

Første UI-runde bør være:

1. `/orders`
2. `/orders/requests`
3. `/orders/requests/[id]`

Begrundelse:

- de sider giver hurtigt værdi for den interne varebestiller
- de bygger direkte oven på Jotform-importen
- de kan bruges før Outlook-indbakke og leverandørbestillings-builder er færdige

## Næste konkrete trin

Når denne struktur er godkendt, er næste logiske byggetrin:

1. definere Excel-importformatet for produkter
2. eller begynde på den tekniske Jotform sync-route

Hvis vi vil arbejde helt strukturelt videre, er Excel-importformatet det mest naturlige næste dokument.
