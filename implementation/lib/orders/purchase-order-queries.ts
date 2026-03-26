import { hasEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

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

interface PurchaseOrderLineRow {
  request_line_id: string;
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
