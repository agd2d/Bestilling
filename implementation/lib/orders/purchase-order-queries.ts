import { hasEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";
import {
  formatPurchaseOrderStatus,
  purchaseOrderStatusTone,
} from "@/lib/orders/purchase-order-status-options";

export interface PurchaseDraftLine {
  requestLineId: string;
  customerName: string;
  locationLabel: string;
  productNumber: string;
  productName: string;
  quantity: number;
  unit: string | null;
}

export interface PurchaseDraftGroup {
  supplierId: string;
  supplierName: string;
  supplierEmail: string | null;
  lineCount: number;
  customerCount: number;
  lines: PurchaseDraftLine[];
  emailSubject: string;
  emailBody: string;
}

export interface PurchaseDraftsResult {
  groups: PurchaseDraftGroup[];
  source: "live" | "mock";
  message?: string;
}

export interface SavedPurchaseOrderCard {
  id: string;
  supplierName: string;
  supplierEmail: string | null;
  status: string;
  statusLabel: string;
  statusTone: string;
  lineCount: number;
  customerCount: number;
  createdAt: string;
  sentAt: string | null;
  emailSubject: string | null;
}

export interface SavedPurchaseOrdersResult {
  purchaseOrders: SavedPurchaseOrderCard[];
  source: "live" | "mock";
  message?: string;
}

interface RequestLineRow {
  id: string;
  request_id: string;
  supplier_id: string | null;
  quantity: number;
  unit: string | null;
  resolved_product_number: string | null;
  resolved_product_name: string | null;
  raw_product_number: string | null;
  raw_product_name: string | null;
  line_status: string;
}

interface RequestRow {
  id: string;
  customer_id: string;
  location_label: string;
}

interface CustomerRow {
  id: string;
  name: string | null;
}

interface SupplierRow {
  id: string;
  name: string;
  order_email: string | null;
  email: string | null;
}

interface PurchaseOrderRow {
  id: string;
  supplier_id: string;
  status: string;
  email_subject: string | null;
  created_at: string;
  sent_at: string | null;
}

interface PurchaseOrderLineRow {
  purchase_order_id: string;
  request_line_id: string;
  customer_id: string;
}

const mockDrafts: PurchaseDraftGroup[] = [
  {
    supplierId: "supplier-total-rent",
    supplierName: "Total Rent",
    supplierEmail: "kundeservice@totalrent.dk",
    lineCount: 3,
    customerCount: 2,
    lines: [
      {
        requestLineId: "line-1",
        customerName: "Plejecenter Solhøj",
        locationLabel: "Lokation på kunden - Plejecenter Solhøj",
        productNumber: "TR-10234",
        productName: "Affaldssække 100L",
        quantity: 8,
        unit: "rulle",
      },
      {
        requestLineId: "line-3",
        customerName: "Plejecenter Solhøj",
        locationLabel: "Lokation på kunden - Plejecenter Solhøj",
        productNumber: "TR-44210",
        productName: "Toiletpapir premium",
        quantity: 12,
        unit: "pakke",
      },
      {
        requestLineId: "line-5",
        customerName: "Børnehuset Egebo",
        locationLabel: "Lokation på kunden - Børnehuset Egebo",
        productNumber: "TR-21100",
        productName: "Universalrengøring",
        quantity: 3,
        unit: "dunk",
      },
    ],
    emailSubject: "Bestilling fra Hvidbjerg Service - Total Rent",
    emailBody: "",
  },
];

const mockSavedPurchaseOrders: SavedPurchaseOrderCard[] = [
  {
    id: "po-mock-1",
    supplierName: "Total Rent",
    supplierEmail: "kundeservice@totalrent.dk",
    status: "ready_to_send",
    statusLabel: formatPurchaseOrderStatus("ready_to_send"),
    statusTone: purchaseOrderStatusTone("ready_to_send"),
    lineCount: 12,
    customerCount: 4,
    createdAt: "2026-03-26T08:30:00.000Z",
    sentAt: "2026-03-26T08:35:00.000Z",
    emailSubject: "Bestilling fra Hvidbjerg Service - Total Rent",
  },
  {
    id: "po-mock-2",
    supplierName: "Abena",
    supplierEmail: "ordre@abena.dk",
    status: "completed",
    statusLabel: formatPurchaseOrderStatus("completed"),
    statusTone: purchaseOrderStatusTone("completed"),
    lineCount: 6,
    customerCount: 2,
    createdAt: "2026-03-25T13:20:00.000Z",
    sentAt: "2026-03-25T13:30:00.000Z",
    emailSubject: "Bestilling fra Hvidbjerg Service - Abena",
  },
];

function canUseLiveData() {
  return hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function buildEmailBody(group: Omit<PurchaseDraftGroup, "emailBody" | "emailSubject">) {
  const lineText = group.lines
    .map(
      (line) =>
        `- ${line.productNumber} | ${line.productName} | ${line.quantity} ${line.unit ?? ""} | ${line.customerName} | ${line.locationLabel}`
    )
    .join("\n");

  return [
    `Hej ${group.supplierName},`,
    "",
    "Her kommer ugens samlede bestilling fra Hvidbjerg Service.",
    "",
    lineText,
    "",
    "Bekræft gerne modtagelse og forventet levering.",
    "",
    "Venlig hilsen",
    "Hvidbjerg Service",
  ].join("\n");
}

function withEmailDraft(group: Omit<PurchaseDraftGroup, "emailBody" | "emailSubject">): PurchaseDraftGroup {
  return {
    ...group,
    emailSubject: `Bestilling fra Hvidbjerg Service - ${group.supplierName}`,
    emailBody: buildEmailBody(group),
  };
}

export async function getPurchaseDraftsData(): Promise<PurchaseDraftsResult> {
  if (!canUseLiveData()) {
    return {
      groups: mockDrafts.map((group) => withEmailDraft(group)),
      source: "mock",
      message: "Miljøvariabler mangler stadig, derfor vises mockdata.",
    };
  }

  try {
    const supabase = createAdminClient();
    const [
      { data: lines, error: linesError },
      { data: requests, error: requestsError },
      { data: customers, error: customersError },
      { data: suppliers, error: suppliersError },
      { data: purchaseOrderLines, error: purchaseOrderLinesError },
    ] = await Promise.all([
      supabase
        .from("customer_order_request_lines")
        .select(
          "id, request_id, supplier_id, quantity, unit, resolved_product_number, resolved_product_name, raw_product_number, raw_product_name, line_status"
        )
        .eq("line_status", "ready_for_purchase"),
      supabase.from("customer_order_requests").select("id, customer_id, location_label"),
      supabase.from("customers").select("id, name"),
      supabase.from("suppliers").select("id, name, order_email, email"),
      supabase.from("purchase_order_lines").select("request_line_id"),
    ]);

    const firstError =
      linesError || requestsError || customersError || suppliersError || purchaseOrderLinesError;

    if (firstError) {
      return {
        groups: mockDrafts.map((group) => withEmailDraft(group)),
        source: "mock",
        message: `Live læsning fejlede: ${firstError.message}. Mockdata vises i stedet.`,
      };
    }

    const requestMap = new Map((requests ?? []).map((request) => [request.id, request as RequestRow]));
    const customerMap = new Map((customers ?? []).map((customer) => [customer.id, customer as CustomerRow]));
    const supplierMap = new Map((suppliers ?? []).map((supplier) => [supplier.id, supplier as SupplierRow]));
    const alreadyGrouped = new Set(
      ((purchaseOrderLines ?? []) as PurchaseOrderLineRow[]).map((line) => line.request_line_id)
    );

    const grouped = new Map<string, Omit<PurchaseDraftGroup, "emailBody" | "emailSubject">>();

    for (const line of (lines ?? []) as RequestLineRow[]) {
      if (!line.supplier_id || alreadyGrouped.has(line.id)) {
        continue;
      }

      const supplier = supplierMap.get(line.supplier_id);
      const request = requestMap.get(line.request_id);
      const customer = request ? customerMap.get(request.customer_id) : null;

      if (!supplier || !request) {
        continue;
      }

      const current =
        grouped.get(line.supplier_id) ??
        {
          supplierId: supplier.id,
          supplierName: supplier.name,
          supplierEmail: supplier.order_email ?? supplier.email ?? null,
          lineCount: 0,
          customerCount: 0,
          lines: [],
        };

      current.lines.push({
        requestLineId: line.id,
        customerName: customer?.name ?? "Ukendt kunde",
        locationLabel: request.location_label,
        productNumber: line.resolved_product_number ?? line.raw_product_number ?? "-",
        productName: line.resolved_product_name ?? line.raw_product_name ?? "Ukendt vare",
        quantity: line.quantity,
        unit: line.unit,
      });
      current.lineCount += 1;
      current.customerCount = new Set(current.lines.map((draftLine) => draftLine.customerName)).size;

      grouped.set(line.supplier_id, current);
    }

    return {
      groups: Array.from(grouped.values())
        .sort((a, b) => b.lineCount - a.lineCount)
        .map((group) => withEmailDraft(group)),
      source: "live",
      message: "Leverandørkladder er bygget fra linjer klar til bestilling.",
    };
  } catch (error) {
    return {
      groups: mockDrafts.map((group) => withEmailDraft(group)),
      source: "mock",
      message:
        error instanceof Error
          ? `Live læsning fejlede: ${error.message}. Mockdata vises i stedet.`
          : "Live læsning fejlede. Mockdata vises i stedet.",
    };
  }
}

export async function getSavedPurchaseOrdersData(params?: {
  status?: string;
}): Promise<SavedPurchaseOrdersResult> {
  const filteredMock = params?.status
    ? mockSavedPurchaseOrders.filter((purchaseOrder) => purchaseOrder.status === params.status)
    : mockSavedPurchaseOrders;

  if (!canUseLiveData()) {
    return {
      purchaseOrders: filteredMock,
      source: "mock",
      message: "Miljøvariabler mangler stadig, derfor vises mockdata.",
    };
  }

  try {
    const supabase = createAdminClient();
    let purchaseOrdersQuery = supabase
      .from("purchase_orders")
      .select("id, supplier_id, status, email_subject, created_at, sent_at")
      .order("created_at", { ascending: false });

    if (params?.status) {
      purchaseOrdersQuery = purchaseOrdersQuery.eq("status", params.status);
    }

    const [
      { data: purchaseOrders, error: purchaseOrdersError },
      { data: purchaseOrderLines, error: purchaseOrderLinesError },
      { data: suppliers, error: suppliersError },
      { data: customers, error: customersError },
    ] = await Promise.all([
      purchaseOrdersQuery,
      supabase.from("purchase_order_lines").select("purchase_order_id, request_line_id, customer_id"),
      supabase.from("suppliers").select("id, name, order_email, email"),
      supabase.from("customers").select("id, name"),
    ]);

    const firstError = purchaseOrdersError || purchaseOrderLinesError || suppliersError || customersError;

    if (firstError) {
      return {
        purchaseOrders: filteredMock,
        source: "mock",
        message: `Live læsning fejlede: ${firstError.message}. Mockdata vises i stedet.`,
      };
    }

    const supplierMap = new Map((suppliers ?? []).map((supplier) => [supplier.id, supplier as SupplierRow]));
    const customerMap = new Map((customers ?? []).map((customer) => [customer.id, customer as CustomerRow]));
    const lineMap = new Map<string, PurchaseOrderLineRow[]>();

    for (const line of (purchaseOrderLines ?? []) as PurchaseOrderLineRow[]) {
      const current = lineMap.get(line.purchase_order_id) ?? [];
      current.push(line);
      lineMap.set(line.purchase_order_id, current);
    }

    const cards = ((purchaseOrders ?? []) as PurchaseOrderRow[]).map((purchaseOrder) => {
      const supplier = supplierMap.get(purchaseOrder.supplier_id);
      const lines = lineMap.get(purchaseOrder.id) ?? [];
      const customerIds = new Set(lines.map((line) => customerMap.get(line.customer_id)?.id ?? line.customer_id));

      return {
        id: purchaseOrder.id,
        supplierName: supplier?.name ?? "Ukendt leverandør",
        supplierEmail: supplier?.order_email ?? supplier?.email ?? null,
        status: purchaseOrder.status,
        statusLabel: formatPurchaseOrderStatus(purchaseOrder.status),
        statusTone: purchaseOrderStatusTone(purchaseOrder.status),
        lineCount: lines.length,
        customerCount: customerIds.size,
        createdAt: purchaseOrder.created_at,
        sentAt: purchaseOrder.sent_at,
        emailSubject: purchaseOrder.email_subject,
      };
    });

    return {
      purchaseOrders: cards,
      source: "live",
      message: params?.status
        ? "Leverandørordrer er filtreret på valgt flowtrin."
        : "Gemte leverandørordrer vises fra databasen.",
    };
  } catch (error) {
    return {
      purchaseOrders: filteredMock,
      source: "mock",
      message:
        error instanceof Error
          ? `Live læsning fejlede: ${error.message}. Mockdata vises i stedet.`
          : "Live læsning fejlede. Mockdata vises i stedet.",
    };
  }
}
