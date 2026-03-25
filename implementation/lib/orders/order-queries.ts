import { hasEnv } from "@/lib/env";
import { mockOrders, MockOrder, MockOrderLine } from "@/lib/orders/mock-orders";
import { mockOrderNotes } from "@/lib/orders/mock-notes";
import { OrderNoteItem } from "@/lib/orders/order-notes-actions";
import { formatOrderStatus } from "@/lib/orders/status-options";
import { createAdminClient } from "@/lib/supabase/server";

interface OrderRequestRow {
  id: string;
  customer_id: string;
  location_label: string;
  submitted_by_name: string | null;
  created_at: string;
  status: string;
}

interface CustomerRow {
  id: string;
  name: string | null;
}

interface RequestLineRow {
  id: string;
  request_id: string;
  raw_product_number: string | null;
  raw_product_name: string | null;
  quantity: number;
  supplier_id: string | null;
  line_status: string;
  needs_action: boolean;
}

interface SupplierRow {
  id: string;
  name: string;
}

interface LabelRow {
  id: string;
  name: string;
}

interface RequestLabelRow {
  request_id: string;
  label_id: string;
}

interface OrderNoteRow {
  id: string;
  request_id: string;
  note: string;
  created_at: string;
  author_user_id: string | null;
}

export interface OrdersDataResult {
  orders: MockOrder[];
  notes: OrderNoteItem[];
  source: "live" | "mock";
  message?: string;
}

function canUseLiveData() {
  return hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function formatLineStatus(status: string) {
  switch (status) {
    case "draft_needed":
      return "Kladde nødvendig";
    case "ready_for_purchase":
      return "Klar til bestilling";
    case "included_in_purchase_order":
      return "Samlet til bestilling";
    default:
      return formatOrderStatus(status);
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapLiveLine(line: RequestLineRow, suppliers: Map<string, string>): MockOrderLine {
  return {
    id: line.id,
    productNumber: line.raw_product_number ?? "-",
    productName: line.raw_product_name ?? "Ukendt vare",
    quantity: line.quantity,
    supplier: line.supplier_id ? suppliers.get(line.supplier_id) ?? "Ukendt" : "Ukendt",
    status: formatLineStatus(line.line_status),
    needsAction: line.needs_action,
  };
}

function buildLiveOrders(params: {
  requests: OrderRequestRow[];
  customers: CustomerRow[];
  lines: RequestLineRow[];
  suppliers: SupplierRow[];
  labels: LabelRow[];
  requestLabels: RequestLabelRow[];
}) {
  const customerMap = new Map(
    params.customers.map((customer) => [customer.id, customer.name ?? "Ukendt kunde"])
  );
  const supplierMap = new Map(params.suppliers.map((supplier) => [supplier.id, supplier.name]));
  const labelMap = new Map(params.labels.map((label) => [label.id, label.name]));

  return params.requests.map((request) => {
    const lines = params.lines
      .filter((line) => line.request_id === request.id)
      .map((line) => mapLiveLine(line, supplierMap));

    const labels = params.requestLabels
      .filter((item) => item.request_id === request.id)
      .map((item) => labelMap.get(item.label_id))
      .filter((value): value is string => Boolean(value));

    return {
      id: request.id,
      locationLabel: request.location_label,
      customerName: customerMap.get(request.customer_id) ?? "Ukendt kunde",
      submittedBy: request.submitted_by_name ?? "Ukendt",
      createdAt: formatDate(request.created_at),
      rawStatus: request.status,
      status: formatOrderStatus(request.status),
      labels,
      lineCount: lines.length,
      actionRequiredCount: lines.filter((line) => line.needsAction).length,
      lines,
    };
  });
}

function buildLiveNotes(rows: OrderNoteRow[]): OrderNoteItem[] {
  return rows
    .map((row) => ({
      id: row.id,
      author: row.author_user_id ? "Bruger" : "System",
      note: row.note,
      createdAt: formatDate(row.created_at),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getMockNotes(): OrderNoteItem[] {
  return mockOrderNotes.map((note) => ({
    id: note.id,
    author: note.author,
    note: note.note,
    createdAt: note.createdAt,
  }));
}

export async function getOrdersListData(): Promise<OrdersDataResult> {
  if (!canUseLiveData()) {
    return {
      orders: mockOrders,
      notes: getMockNotes(),
      source: "mock",
      message: "Miljøvariabler mangler stadig, derfor vises mockdata.",
    };
  }

  try {
    const supabase = createAdminClient();
    const [
      { data: requests, error: requestsError },
      { data: customers, error: customersError },
      { data: lines, error: linesError },
      { data: suppliers, error: suppliersError },
      { data: labels, error: labelsError },
      { data: requestLabels, error: requestLabelsError },
      { data: notes, error: notesError },
    ] = await Promise.all([
      supabase
        .from("customer_order_requests")
        .select("id, customer_id, location_label, submitted_by_name, created_at, status")
        .order("created_at", { ascending: false }),
      supabase.from("customers").select("id, name"),
      supabase
        .from("customer_order_request_lines")
        .select(
          "id, request_id, raw_product_number, raw_product_name, quantity, supplier_id, line_status, needs_action"
        ),
      supabase.from("suppliers").select("id, name"),
      supabase.from("order_labels").select("id, name"),
      supabase.from("request_label_links").select("request_id, label_id"),
      supabase.from("order_notes").select("id, request_id, note, created_at, author_user_id"),
    ]);

    const firstError =
      requestsError ||
      customersError ||
      linesError ||
      suppliersError ||
      labelsError ||
      requestLabelsError ||
      notesError;

    if (firstError) {
      return {
        orders: mockOrders,
        notes: getMockNotes(),
        source: "mock",
        message: `Live læsning fejlede: ${firstError.message}. Mockdata vises i stedet.`,
      };
    }

    return {
      orders: buildLiveOrders({
        requests: (requests ?? []) as OrderRequestRow[],
        customers: (customers ?? []) as CustomerRow[],
        lines: (lines ?? []) as RequestLineRow[],
        suppliers: (suppliers ?? []) as SupplierRow[],
        labels: (labels ?? []) as LabelRow[],
        requestLabels: (requestLabels ?? []) as RequestLabelRow[],
      }),
      notes: buildLiveNotes((notes ?? []) as OrderNoteRow[]),
      source: "live",
      message: "Data hentes nu fra Supabase.",
    };
  } catch (error) {
    return {
      orders: mockOrders,
      notes: getMockNotes(),
      source: "mock",
      message:
        error instanceof Error
          ? `Live læsning fejlede: ${error.message}. Mockdata vises i stedet.`
          : "Live læsning fejlede. Mockdata vises i stedet.",
    };
  }
}

export async function getOrderByIdData(id: string) {
  const result = await getOrdersListData();
  const order = result.orders.find((item) => item.id === id) ?? null;
  const notes =
    result.source === "live"
      ? result.notes
      : result.notes.filter((note) =>
          mockOrderNotes.some((mock) => mock.requestId === id && mock.id === note.id)
        );

  return {
    ...result,
    order,
    notes,
  };
}
