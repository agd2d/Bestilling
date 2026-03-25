import { hasEnv } from "@/lib/env";
import { defaultOrderLabels, OrderLabelOption } from "@/lib/orders/order-labels";
import {
  mockOrders,
  mockProducts,
  mockSuppliers,
  MockOrder,
  MockOrderLine,
  ProductOption,
  SupplierOption,
} from "@/lib/orders/mock-orders";
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
  product_id: string | null;
  raw_product_number: string | null;
  raw_product_name: string | null;
  quantity: number;
  supplier_id: string | null;
  unit: string | null;
  resolved_product_number: string | null;
  resolved_product_name: string | null;
  line_status: string;
  needs_action: boolean;
}

interface SupplierRow {
  id: string;
  name: string;
}

interface ProductRow {
  id: string;
  product_number: string;
  name: string;
  supplier_id: string | null;
  unit: string | null;
}

interface LabelRow {
  id: string;
  name: string;
  color: string;
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
  availableLabels: OrderLabelOption[];
  availableProducts: ProductOption[];
  availableSuppliers: SupplierOption[];
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
    productId: line.product_id,
    supplierId: line.supplier_id,
    productNumber: line.resolved_product_number ?? line.raw_product_number ?? "-",
    productName: line.resolved_product_name ?? line.raw_product_name ?? "Ukendt vare",
    quantity: line.quantity,
    supplier: line.supplier_id ? suppliers.get(line.supplier_id) ?? "Ukendt" : "Ukendt",
    unit: line.unit,
    rawStatus: line.line_status,
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
      requestId: row.request_id,
      author: row.author_user_id ? "Bruger" : "System",
      note: row.note,
      createdAt: formatDate(row.created_at),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function buildProductOptions(products: ProductRow[], suppliers: SupplierRow[]): ProductOption[] {
  const supplierMap = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));

  return products.map((product) => ({
    id: product.id,
    productNumber: product.product_number,
    name: product.name,
    supplierId: product.supplier_id,
    supplierName: product.supplier_id
      ? supplierMap.get(product.supplier_id) ?? "Ukendt leverandør"
      : "Ukendt leverandør",
    unit: product.unit,
  }));
}

function getMockNotes(): OrderNoteItem[] {
  return mockOrderNotes.map((note) => ({
    id: note.id,
    requestId: note.requestId,
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
      availableLabels: defaultOrderLabels,
      availableProducts: mockProducts,
      availableSuppliers: mockSuppliers,
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
      { data: products, error: productsError },
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
          "id, request_id, product_id, raw_product_number, raw_product_name, quantity, supplier_id, unit, resolved_product_number, resolved_product_name, line_status, needs_action"
        ),
      supabase.from("suppliers").select("id, name"),
      supabase.from("products").select("id, product_number, name, supplier_id, unit").order("product_number"),
      supabase.from("order_labels").select("id, name, color"),
      supabase.from("request_label_links").select("request_id, label_id"),
      supabase.from("order_notes").select("id, request_id, note, created_at, author_user_id"),
    ]);

    const firstError =
      requestsError ||
      customersError ||
      linesError ||
      suppliersError ||
      productsError ||
      labelsError ||
      requestLabelsError ||
      notesError;

    if (firstError) {
      return {
        orders: mockOrders,
        notes: getMockNotes(),
        availableLabels: defaultOrderLabels,
        availableProducts: mockProducts,
        availableSuppliers: mockSuppliers,
        source: "mock",
        message: `Live læsning fejlede: ${firstError.message}. Mockdata vises i stedet.`,
      };
    }

    const supplierRows = (suppliers ?? []) as SupplierRow[];

    return {
      orders: buildLiveOrders({
        requests: (requests ?? []) as OrderRequestRow[],
        customers: (customers ?? []) as CustomerRow[],
        lines: (lines ?? []) as RequestLineRow[],
        suppliers: supplierRows,
        labels: (labels ?? []) as LabelRow[],
        requestLabels: (requestLabels ?? []) as RequestLabelRow[],
      }),
      notes: buildLiveNotes((notes ?? []) as OrderNoteRow[]),
      availableLabels: ((labels ?? []) as LabelRow[]).map((label) => ({
        id: label.id,
        name: label.name,
        color: label.color,
      })),
      availableProducts: buildProductOptions((products ?? []) as ProductRow[], supplierRows),
      availableSuppliers: supplierRows.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
      })),
      source: "live",
      message: "Data hentes nu fra Supabase.",
    };
  } catch (error) {
    return {
      orders: mockOrders,
      notes: getMockNotes(),
      availableLabels: defaultOrderLabels,
      availableProducts: mockProducts,
      availableSuppliers: mockSuppliers,
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
  const notes = result.notes.filter((note) => note.requestId === id);

  return {
    ...result,
    order,
    notes,
  };
}
