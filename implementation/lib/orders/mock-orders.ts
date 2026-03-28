export interface MockOrderLine {
  id: string;
  productId?: string | null;
  supplierId?: string | null;
  productNumber: string;
  productName: string;
  quantity: number;
  supplier: string;
  unit?: string | null;
  rawStatus: string;
  status: string;
  needsAction: boolean;
}

export interface MockOrder {
  id: string;
  customerId: string;
  locationLabel: string;
  customerName: string;
  submittedBy: string;
  createdAt: string;
  rawStatus: string;
  status: string;
  labels: string[];
  lineCount: number;
  actionRequiredCount: number;
  lines: MockOrderLine[];
}

export interface ProductOption {
  id: string;
  productNumber: string;
  name: string;
  supplierId: string | null;
  supplierName: string;
  unit: string | null;
  billingCategory?: "material_cost" | "resale_consumable";
}

export interface SupplierOption {
  id: string;
  name: string;
}

export const mockSuppliers: SupplierOption[] = [
  { id: "supplier-total-rent", name: "Total Rent" },
  { id: "supplier-abena", name: "Abena" },
];

export const mockProducts: ProductOption[] = [
  {
    id: "product-tr-10234",
    productNumber: "TR-10234",
    name: "Affaldssække 100L",
    supplierId: "supplier-total-rent",
    supplierName: "Total Rent",
    unit: "rulle",
    billingCategory: "resale_consumable",
  },
  {
    id: "product-tr-44210",
    productNumber: "TR-44210",
    name: "Toiletpapir premium",
    supplierId: "supplier-total-rent",
    supplierName: "Total Rent",
    unit: "pakke",
    billingCategory: "resale_consumable",
  },
  {
    id: "product-ab-2811",
    productNumber: "AB-2811",
    name: "Engangshandsker",
    supplierId: "supplier-abena",
    supplierName: "Abena",
    unit: "pakke",
    billingCategory: "resale_consumable",
  },
  {
    id: "product-tr-21100",
    productNumber: "TR-21100",
    name: "Universalrengøring",
    supplierId: "supplier-total-rent",
    supplierName: "Total Rent",
    unit: "dunk",
    billingCategory: "material_cost",
  },
];

export const mockOrders: MockOrder[] = [
  {
    id: "req-2026-031",
    customerId: "customer-solhoj",
    locationLabel: "Lokation på kunden - Plejecenter Solhøj",
    customerName: "Plejecenter Solhøj",
    submittedBy: "Maria Hansen",
    createdAt: "2026-03-24 09:12",
    rawStatus: "created",
    status: "Kræver handling",
    labels: ["afventer afklaring", "haste"],
    lineCount: 4,
    actionRequiredCount: 1,
    lines: [
      {
        id: "line-1",
        productId: "product-tr-10234",
        supplierId: "supplier-total-rent",
        productNumber: "TR-10234",
        productName: "Affaldssække 100L",
        quantity: 8,
        supplier: "Total Rent",
        unit: "rulle",
        rawStatus: "ready_for_purchase",
        status: "Klar til bestilling",
        needsAction: false,
      },
      {
        id: "line-2",
        productId: null,
        supplierId: null,
        productNumber: "TR-99881",
        productName: "Ukendt vare fra Jotform",
        quantity: 2,
        supplier: "Ukendt",
        unit: "stk",
        rawStatus: "draft_needed",
        status: "Kladde nødvendig",
        needsAction: true,
      },
      {
        id: "line-3",
        productId: "product-tr-44210",
        supplierId: "supplier-total-rent",
        productNumber: "TR-44210",
        productName: "Toiletpapir premium",
        quantity: 12,
        supplier: "Total Rent",
        unit: "pakke",
        rawStatus: "ready_for_purchase",
        status: "Klar til bestilling",
        needsAction: false,
      },
      {
        id: "line-4",
        productId: "product-ab-2811",
        supplierId: "supplier-abena",
        productNumber: "AB-2811",
        productName: "Engangshandsker",
        quantity: 5,
        supplier: "Abena",
        unit: "pakke",
        rawStatus: "ready_for_purchase",
        status: "Klar til bestilling",
        needsAction: false,
      },
    ],
  },
  {
    id: "req-2026-032",
    customerId: "customer-egebo",
    locationLabel: "Lokation på kunden - Børnehuset Egebo",
    customerName: "Børnehuset Egebo",
    submittedBy: "Anne Kristensen",
    createdAt: "2026-03-24 10:08",
    rawStatus: "created",
    status: "Oprettet",
    labels: ["haste"],
    lineCount: 3,
    actionRequiredCount: 0,
    lines: [
      {
        id: "line-5",
        productId: "product-tr-21100",
        supplierId: "supplier-total-rent",
        productNumber: "TR-21100",
        productName: "Universalrengøring",
        quantity: 3,
        supplier: "Total Rent",
        unit: "dunk",
        rawStatus: "ready_for_purchase",
        status: "Klar til bestilling",
        needsAction: false,
      },
      {
        id: "line-6",
        productId: null,
        supplierId: "supplier-total-rent",
        productNumber: "TR-30110",
        productName: "Mikrofiberklud grøn",
        quantity: 20,
        supplier: "Total Rent",
        unit: "stk",
        rawStatus: "ready_for_purchase",
        status: "Klar til bestilling",
        needsAction: false,
      },
      {
        id: "line-7",
        productId: null,
        supplierId: "supplier-abena",
        productNumber: "AB-8890",
        productName: "Nitrilhandsker small",
        quantity: 4,
        supplier: "Abena",
        unit: "pakke",
        rawStatus: "ready_for_purchase",
        status: "Klar til bestilling",
        needsAction: false,
      },
    ],
  },
  {
    id: "req-2026-033",
    customerId: "customer-enghaven",
    locationLabel: "Lokation på kunden - Enghaven Skole",
    customerName: "Enghaven Skole",
    submittedBy: "Jonatan",
    createdAt: "2026-03-23 16:41",
    rawStatus: "sent_to_supplier",
    status: "Afsendt",
    labels: ["restordre"],
    lineCount: 2,
    actionRequiredCount: 0,
    lines: [
      {
        id: "line-8",
        productId: null,
        supplierId: "supplier-total-rent",
        productNumber: "TR-55521",
        productName: "Papirhåndklæder",
        quantity: 10,
        supplier: "Total Rent",
        unit: "kasse",
        rawStatus: "supplier_confirmed",
        status: "Godkendt af leverandør",
        needsAction: false,
      },
      {
        id: "line-9",
        productId: null,
        supplierId: "supplier-total-rent",
        productNumber: "TR-66110",
        productName: "Sæbedispenser refill",
        quantity: 6,
        supplier: "Total Rent",
        unit: "stk",
        rawStatus: "supplier_confirmed",
        status: "Godkendt af leverandør",
        needsAction: false,
      },
    ],
  },
];
