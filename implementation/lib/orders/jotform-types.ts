export interface JotformAnswer {
  name: string;
  text: string;
  type: string;
  answer?: unknown;
}

export interface JotformSubmission {
  id: string;
  created_at: string;
  status: string;
  answers: Record<string, JotformAnswer>;
}

export interface ParsedOrderLineInput {
  lineNumber: number;
  rawProductNumber: string | null;
  rawProductName: string | null;
  quantity: number | null;
  unit: string | null;
  sourceFieldKey?: string | null;
}

export interface ParsedOrderInput {
  submissionId: string;
  submittedAt: string;
  locationLabel: string | null;
  submittedByName: string | null;
  submittedByEmail: string | null;
  deliveryAddress: string | null;
  requestedDeliveryDate: string | null;
  internalNote: string | null;
  lines: ParsedOrderLineInput[];
  rawAnswers: Record<string, JotformAnswer>;
}

export interface CustomerRecord {
  id: string;
  name: string | null;
}

export interface CustomerAliasRecord {
  customer_id: string;
  alias_value: string;
}

export interface ProductRecord {
  id: string;
  product_number: string;
  name: string;
  supplier_id: string | null;
  unit: string | null;
  default_price: number | null;
}

export interface CustomerProductPriceRecord {
  customer_id: string;
  product_id: string;
  price: number;
}

export interface CreatedOrderRequest {
  id: string;
}

export interface OrderRequestInsert {
  customer_id: string;
  source: "jotform";
  source_submission_id: string;
  status: "created";
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  location_label: string;
  delivery_address: string | null;
  requested_delivery_date: string | null;
  internal_note: string | null;
  imported_at: string;
}

export interface OrderRequestLineInsert {
  request_id: string;
  product_id: string | null;
  supplier_id: string | null;
  line_number: number;
  raw_product_number: string | null;
  raw_product_name: string | null;
  quantity: number;
  unit: string | null;
  resolved_product_number: string | null;
  resolved_product_name: string | null;
  price_for_stats: number | null;
  line_status:
    | "ready_for_purchase"
    | "draft_needed";
  needs_action: boolean;
  action_reason: string | null;
  draft_product_suggestion: Record<string, unknown> | null;
  customer_label_snapshot: string;
}

export interface OrderImportErrorInsert {
  source: "jotform";
  source_submission_id: string;
  error_type: string;
  error_message: string;
  raw_payload: unknown;
}

export interface SyncLogInsert {
  source: string;
  status: "success" | "error";
  message: string;
}

export interface SyncResult {
  success: boolean;
  importedRequests: number;
  importedLines: number;
  actionRequiredLines: number;
  skippedExisting: number;
  failedCustomerMatches: number;
}

export interface JotformFieldConfig {
  location: string[];
  submittedByName: string[];
  submittedByEmail: string[];
  deliveryAddress: string[];
  requestedDeliveryDate: string[];
  internalNote: string[];
  lineItemsFieldKeys: string[];
  productNumberLabels: string[];
  productNameLabels: string[];
  quantityLabels: string[];
  unitLabels: string[];
}

export interface CustomerMatchSuggestion {
  customerId: string;
  customerName: string;
  score: number;
  reason: string;
}

export interface JotformSyncRepository {
  getImportedSubmissionIds(): Promise<Set<string>>;
  getCustomers(): Promise<CustomerRecord[]>;
  getCustomerAliases(source: string): Promise<CustomerAliasRecord[]>;
  getProducts(): Promise<ProductRecord[]>;
  getCustomerProductPrices(
    customerIds: string[],
    productIds: string[]
  ): Promise<CustomerProductPriceRecord[]>;
  insertOrderRequest(row: OrderRequestInsert): Promise<CreatedOrderRequest>;
  insertOrderRequestLines(rows: OrderRequestLineInsert[]): Promise<void>;
  insertImportError(row: OrderImportErrorInsert): Promise<void>;
  insertSyncLog(row: SyncLogInsert): Promise<void>;
}
