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
  orderNumber: string;
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

export interface PurchaseOrderDetailLine {
  id: string;
  customerName: string;
  locationLabel: string;
  productNumber: string;
  productName: string;
  quantity: number;
  unit: string | null;
  lineStatus: string;
}

export interface PurchaseOrderDetailResult {
  purchaseOrder: {
    id: string;
    orderNumber: string;
    supplierName: string;
    supplierEmail: string | null;
    status: string;
    statusLabel: string;
    statusTone: string;
    createdAt: string;
    sentAt: string | null;
    emailSubject: string | null;
    emailBody: string | null;
    lineCount: number;
    customerCount: number;
  } | null;
  lines: PurchaseOrderDetailLine[];
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
  status: string;
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
  email_body: string | null;
  created_at: string;
  sent_at: string | null;
}

interface PurchaseOrderLineRow {
  id: string;
  purchase_order_id: string;
  request_line_id: string;
  customer_id: string;
  quantity: number;
  unit: string | null;
  line_status: string;
}

interface PurchaseOrderRequestLineRow {
  id: string;
  request_id: string;
  raw_product_number: string | null;
  raw_product_name: string | null;
  resolved_product_number: string | null;
  resolved_product_name: string | null;
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
    orderNumber: "HS-20260326-0830-TR01",
    supplierName: "Total Rent",
    supplierEmail: "kundeservice@totalrent.dk",
    status: "sent",
    statusLabel: formatPurchaseOrderStatus("sent"),
    statusTone: purchaseOrderStatusTone("sent"),
    lineCount: 12,
    customerCount: 4,
    createdAt: "2026-03-26T08:30:00.000Z",
    sentAt: "2026-03-26T08:35:00.000Z",
    emailSubject: "[HS-20260326-0830-TR01] Bestilling fra Hvidbjerg Service - Total Rent",
  },
  {
    id: "po-mock-2",
    orderNumber: "HS-20260325-1320-AB01",
    supplierName: "Abena",
    supplierEmail: "ordre@abena.dk",
    status: "partially_delivered",
    statusLabel: formatPurchaseOrderStatus("partially_delivered"),
    statusTone: purchaseOrderStatusTone("partially_delivered"),
    lineCount: 6,
    customerCount: 2,
    createdAt: "2026-03-25T13:20:00.000Z",
    sentAt: "2026-03-25T13:30:00.000Z",
    emailSubject: "[HS-20260325-1320-AB01] Bestilling fra Hvidbjerg Service - Abena",
  },
];

const mockPurchaseOrderDetails: Record<
  string,
  { purchaseOrder: PurchaseOrderDetailResult["purchaseOrder"]; lines: PurchaseOrderDetailLine[] }
> = {
  "po-mock-1": {
    purchaseOrder: {
      id: "po-mock-1",
      orderNumber: "HS-20260326-0830-TR01",
      supplierName: "Total Rent",
      supplierEmail: "kundeservice@totalrent.dk",
      status: "sent",
      statusLabel: formatPurchaseOrderStatus("sent"),
      statusTone: purchaseOrderStatusTone("sent"),
      createdAt: "2026-03-26T08:30:00.000Z",
      sentAt: "2026-03-26T08:35:00.000Z",
      emailSubject: "[HS-20260326-0830-TR01] Bestilling fra Hvidbjerg Service - Total Rent",
      emailBody: "Ordrenummer: HS-20260326-0830-TR01\n\nEksempel på samlet mailtekst til leverandøren.",
      lineCount: 3,
      customerCount: 2,
    },
    lines: [
      {
        id: "pol-mock-1",
        customerName: "Plejecenter Solhøj",
        locationLabel: "Lokation på kunden - Plejecenter Solhøj",
        productNumber: "TR-10234",
        productName: "Affaldssække 100L",
        quantity: 8,
        unit: "rulle",
        lineStatus: "sent",
      },
      {
        id: "pol-mock-2",
        customerName: "Plejecenter Solhøj",
        locationLabel: "Lokation på kunden - Plejecenter Solhøj",
        productNumber: "TR-44210",
        productName: "Toiletpapir premium",
        quantity: 12,
        unit: "pakke",
        lineStatus: "sent",
      },
      {
        id: "pol-mock-3",
        customerName: "Børnehuset Egebo",
        locationLabel: "Lokation på kunden - Børnehuset Egebo",
        productNumber: "TR-21100",
        productName: "Universalrengøring",
        quantity: 3,
        unit: "dunk",
        lineStatus: "sent",
      },
    ],
  },
};

function canUseLiveData() {
  return hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function extractPurchaseOrderNumber(id: string, createdAt: string, emailSubject: string | null) {
  const match = emailSubject?.match(/^\[([^\]]+)\]/);

  if (match?.[1]) {
    return match[1];
  }

  const date = new Date(createdAt);
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate()
  ).padStart(2, "0")}`;

  return `HS-${datePart}-${id.slice(0, 6).toUpperCase()}`;
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
      { data: purchaseOrders, error: purchaseOrdersError },
    ] = await Promise.all([
      supabase
        .from("customer_order_request_lines")
        .select(
          "id, request_id, supplier_id, quantity, unit, resolved_product_number, resolved_product_name, raw_product_number, raw_product_name, line_status"
        )
        .eq("line_status", "ready_for_purchase"),
      supabase.from("customer_order_requests").select("id, customer_id, location_label, status"),
      supabase.from("customers").select("id, name"),
      supabase.from("suppliers").select("id, name, order_email, email"),
      supabase.from("purchase_order_lines").select("request_line_id, purchase_order_id"),
      supabase.from("purchase_orders").select("id, status"),
    ]);

    const firstError =
      linesError ||
      requestsError ||
      customersError ||
      suppliersError ||
      purchaseOrderLinesError ||
      purchaseOrdersError;

    if (firstError) {
      return {
        groups: mockDrafts.map((group) => withEmailDraft(group)),
        source: "mock",
        message: `Live læsning fejlede: ${firstError.message}. Mockdata vises i stedet.`,
      };
    }

    const requestMap = new Map(
      ((requests ?? []) as RequestRow[])
        .filter((request) => request.status === "sent_to_supplier")
        .map((request) => [request.id, request])
    );
    const customerMap = new Map(
      ((customers ?? []) as CustomerRow[]).map((customer) => [customer.id, customer])
    );
    const supplierMap = new Map(
      ((suppliers ?? []) as SupplierRow[]).map((supplier) => [supplier.id, supplier])
    );
    const activePurchaseOrderIds = new Set(
      ((purchaseOrders ?? []) as PurchaseOrderRow[])
        .filter((purchaseOrder) => purchaseOrder.status !== "cancelled")
        .map((purchaseOrder) => purchaseOrder.id)
    );
    const alreadyGrouped = new Set(
      ((purchaseOrderLines ?? []) as PurchaseOrderLineRow[])
        .filter((line) => activePurchaseOrderIds.has(line.purchase_order_id))
        .map((line) => line.request_line_id)
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
      message: "Nye leverandørkladder er bygget fra varelinjer, som endnu ikke ligger i en lukket ordre.",
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
      .select("id, supplier_id, status, email_subject, email_body, created_at, sent_at")
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
      supabase
        .from("purchase_order_lines")
        .select("id, purchase_order_id, request_line_id, customer_id, quantity, unit, line_status"),
      supabase.from("suppliers").select("id, name, order_email, email"),
      supabase.from("customers").select("id, name"),
    ]);

    const firstError =
      purchaseOrdersError || purchaseOrderLinesError || suppliersError || customersError;

    if (firstError) {
      return {
        purchaseOrders: filteredMock,
        source: "mock",
        message: `Live læsning fejlede: ${firstError.message}. Mockdata vises i stedet.`,
      };
    }

    const supplierMap = new Map(
      ((suppliers ?? []) as SupplierRow[]).map((supplier) => [supplier.id, supplier])
    );
    const customerMap = new Map(
      ((customers ?? []) as CustomerRow[]).map((customer) => [customer.id, customer])
    );
    const lineMap = new Map<string, PurchaseOrderLineRow[]>();

    for (const line of (purchaseOrderLines ?? []) as PurchaseOrderLineRow[]) {
      const current = lineMap.get(line.purchase_order_id) ?? [];
      current.push(line);
      lineMap.set(line.purchase_order_id, current);
    }

    const cards = ((purchaseOrders ?? []) as PurchaseOrderRow[]).map((purchaseOrder) => {
      const supplier = supplierMap.get(purchaseOrder.supplier_id);
      const lines = lineMap.get(purchaseOrder.id) ?? [];
      const customerIds = new Set(
        lines.map((line) => customerMap.get(line.customer_id)?.id ?? line.customer_id)
      );

      return {
        id: purchaseOrder.id,
        orderNumber: extractPurchaseOrderNumber(
          purchaseOrder.id,
          purchaseOrder.created_at,
          purchaseOrder.email_subject
        ),
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
        : "Lukkede og åbne leverandørordrer vises fra databasen.",
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

export async function getPurchaseOrderDetailData(
  purchaseOrderId: string
): Promise<PurchaseOrderDetailResult> {
  if (!canUseLiveData()) {
    const mockDetail = mockPurchaseOrderDetails[purchaseOrderId] ?? null;

    return {
      purchaseOrder: mockDetail?.purchaseOrder ?? null,
      lines: mockDetail?.lines ?? [],
      source: "mock",
      message: mockDetail
        ? "Mockdetaljer vises, fordi live data ikke er tilgængelige."
        : "Leverandørordren blev ikke fundet i mockdata.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { data: purchaseOrder, error: purchaseOrderError } = await supabase
      .from("purchase_orders")
      .select("id, supplier_id, status, email_subject, email_body, created_at, sent_at")
      .eq("id", purchaseOrderId)
      .maybeSingle();

    if (purchaseOrderError) {
      return {
        purchaseOrder: null,
        lines: [],
        source: "mock",
        message: `Live læsning fejlede: ${purchaseOrderError.message}.`,
      };
    }

    if (!purchaseOrder) {
      return {
        purchaseOrder: null,
        lines: [],
        source: "live",
        message: "Leverandørordren blev ikke fundet.",
      };
    }

    const [
      { data: purchaseOrderLines, error: purchaseOrderLinesError },
      { data: suppliers, error: suppliersError },
      { data: customers, error: customersError },
    ] = await Promise.all([
      supabase
        .from("purchase_order_lines")
        .select("id, purchase_order_id, request_line_id, customer_id, quantity, unit, line_status")
        .eq("purchase_order_id", purchaseOrderId),
      supabase.from("suppliers").select("id, name, order_email, email"),
      supabase.from("customers").select("id, name"),
    ]);

    const firstError = purchaseOrderLinesError || suppliersError || customersError;

    if (firstError) {
      return {
        purchaseOrder: null,
        lines: [],
        source: "mock",
        message: `Live læsning fejlede: ${firstError.message}.`,
      };
    }

    const requestLineIds = ((purchaseOrderLines ?? []) as PurchaseOrderLineRow[]).map(
      (line) => line.request_line_id
    );

    const { data: requestLines, error: requestLinesError } = await supabase
      .from("customer_order_request_lines")
      .select(
        "id, request_id, raw_product_number, raw_product_name, resolved_product_number, resolved_product_name"
      )
      .in("id", requestLineIds);

    if (requestLinesError) {
      return {
        purchaseOrder: null,
        lines: [],
        source: "mock",
        message: `Live læsning fejlede: ${requestLinesError.message}.`,
      };
    }

    const requestIds = Array.from(
      new Set(((requestLines ?? []) as PurchaseOrderRequestLineRow[]).map((line) => line.request_id))
    );

    const { data: requests, error: requestsError } = await supabase
      .from("customer_order_requests")
      .select("id, customer_id, location_label, status")
      .in("id", requestIds);

    if (requestsError) {
      return {
        purchaseOrder: null,
        lines: [],
        source: "mock",
        message: `Live læsning fejlede: ${requestsError.message}.`,
      };
    }

    const requestLineMap = new Map(
      ((requestLines ?? []) as PurchaseOrderRequestLineRow[]).map((line) => [line.id, line])
    );
    const requestMap = new Map(
      ((requests ?? []) as RequestRow[]).map((request) => [request.id, request])
    );
    const supplierMap = new Map(
      ((suppliers ?? []) as SupplierRow[]).map((supplier) => [supplier.id, supplier])
    );
    const customerMap = new Map(
      ((customers ?? []) as CustomerRow[]).map((customer) => [customer.id, customer])
    );

    const detailLines = ((purchaseOrderLines ?? []) as PurchaseOrderLineRow[]).map((line) => {
      const requestLine = requestLineMap.get(line.request_line_id);
      const request = requestLine ? requestMap.get(requestLine.request_id) : null;
      const customer = customerMap.get(line.customer_id);

      return {
        id: line.id,
        customerName: customer?.name ?? "Ukendt kunde",
        locationLabel: request?.location_label ?? "Ukendt lokation",
        productNumber:
          requestLine?.resolved_product_number ?? requestLine?.raw_product_number ?? "-",
        productName:
          requestLine?.resolved_product_name ?? requestLine?.raw_product_name ?? "Ukendt vare",
        quantity: Number(line.quantity ?? 0),
        unit: line.unit ?? null,
        lineStatus: line.line_status ?? "draft",
      };
    });

    const uniqueCustomerCount = new Set(detailLines.map((line) => line.customerName)).size;
    const supplier = supplierMap.get((purchaseOrder as PurchaseOrderRow).supplier_id);

    return {
      purchaseOrder: {
        id: (purchaseOrder as PurchaseOrderRow).id,
        orderNumber: extractPurchaseOrderNumber(
          (purchaseOrder as PurchaseOrderRow).id,
          (purchaseOrder as PurchaseOrderRow).created_at,
          (purchaseOrder as PurchaseOrderRow).email_subject
        ),
        supplierName: supplier?.name ?? "Ukendt leverandør",
        supplierEmail: supplier?.order_email ?? supplier?.email ?? null,
        status: (purchaseOrder as PurchaseOrderRow).status,
        statusLabel: formatPurchaseOrderStatus((purchaseOrder as PurchaseOrderRow).status),
        statusTone: purchaseOrderStatusTone((purchaseOrder as PurchaseOrderRow).status),
        createdAt: (purchaseOrder as PurchaseOrderRow).created_at,
        sentAt: (purchaseOrder as PurchaseOrderRow).sent_at,
        emailSubject: (purchaseOrder as PurchaseOrderRow).email_subject,
        emailBody: (purchaseOrder as PurchaseOrderRow).email_body,
        lineCount: detailLines.length,
        customerCount: uniqueCustomerCount,
      },
      lines: detailLines,
      source: "live",
      message: "Leverandørordren er hentet fra databasen.",
    };
  } catch (error) {
    return {
      purchaseOrder: null,
      lines: [],
      source: "mock",
      message:
        error instanceof Error ? `Live læsning fejlede: ${error.message}.` : "Live læsning fejlede.",
    };
  }
}
