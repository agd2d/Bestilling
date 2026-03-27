import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "../../../../../lib/supabase/server";
import {
  syncJotformOrderSubmissions,
} from "../../../../../lib/orders/jotform-sync";
import { previewJotformOrderSync } from "../../../../../lib/orders/jotform-dry-run";
import {
  CustomerAliasRecord,
  CustomerProductPriceRecord,
  CustomerRecord,
  JotformSyncRepository,
  OrderImportErrorInsert,
  OrderRequestInsert,
  OrderRequestLineInsert,
  ProductRecord,
  SyncLogInsert,
} from "../../../../../lib/orders/jotform-types";
import { hasEnv, isDevAuthBypassed } from "../../../../../lib/env";

const JOTFORM_API_KEY = process.env.JOTFORM_API_KEY!;
const JOTFORM_FORM_ID = process.env.ORDERS_JOTFORM_FORM_ID!;
const DEFAULT_MIN_CREATED_AT = "2026-03-16T00:00:00+01:00";

function createRepository(adminClient: any): JotformSyncRepository {
  return {
    async getImportedSubmissionIds() {
      const { data, error } = await adminClient
        .from("customer_order_requests")
        .select("source_submission_id")
        .eq("source", "jotform")
        .not("source_submission_id", "is", null);

      if (error) throw new Error(error.message);
      return new Set(
        (data ?? [])
          .map((row: { source_submission_id: string | null }) => row.source_submission_id)
          .filter((value: string | null): value is string => Boolean(value))
      );
    },

    async getCustomers() {
      const { data, error } = await adminClient.from("customers").select("id, name");
      if (error) throw new Error(error.message);
      return (data ?? []) as CustomerRecord[];
    },

    async getCustomerAliases(source: string) {
      const { data, error } = await adminClient
        .from("customer_import_aliases")
        .select("customer_id, alias_value")
        .eq("source", source);

      if (error) throw new Error(error.message);
      return (data ?? []) as CustomerAliasRecord[];
    },

    async getProducts() {
      const { data, error } = await adminClient
        .from("products")
        .select("id, product_number, name, supplier_id, unit, default_price");

      if (error) throw new Error(error.message);
      return (data ?? []) as ProductRecord[];
    },

    async getCustomerProductPrices(customerIds: string[], productIds: string[]) {
      if (customerIds.length === 0 || productIds.length === 0) {
        return [];
      }

      const { data, error } = await adminClient
        .from("customer_product_prices")
        .select("customer_id, product_id, price")
        .in("customer_id", customerIds)
        .in("product_id", productIds);

      if (error) throw new Error(error.message);
      return (data ?? []) as CustomerProductPriceRecord[];
    },

    async insertOrderRequest(row: OrderRequestInsert) {
      const { data, error } = await adminClient
        .from("customer_order_requests")
        .insert(row)
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async insertOrderRequestLines(rows: OrderRequestLineInsert[]) {
      const { error } = await adminClient
        .from("customer_order_request_lines")
        .insert(rows);

      if (error) throw new Error(error.message);
    },

    async insertImportError(row: OrderImportErrorInsert) {
      const { error } = await adminClient.from("order_import_errors").insert(row);
      if (error) throw new Error(error.message);
    },

    async insertSyncLog(row: SyncLogInsert) {
      const { error } = await adminClient.from("sync_log").insert(row);
      if (error) throw new Error(error.message);
    },
  };
}

export async function POST(request: Request) {
  try {
    let isAuthorized = false;

    if (isDevAuthBypassed()) {
      isAuthorized = true;
    } else {
      const authClient = await createClient();
      const {
        data: { user },
      } = await authClient.auth.getUser();
      isAuthorized = Boolean(user);
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }

    if (!hasEnv("JOTFORM_API_KEY") || !hasEnv("ORDERS_JOTFORM_FORM_ID")) {
      return NextResponse.json(
        { error: "Manglende Jotform miljøvariabler" },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient();
    const repository = createRepository(adminClient);
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get("dryRun") === "true";
    const minCreatedAt = searchParams.get("minCreatedAt") ?? DEFAULT_MIN_CREATED_AT;

    if (dryRun) {
      const [existingIds, customers, aliases, products] = await Promise.all([
        repository.getImportedSubmissionIds(),
        repository.getCustomers(),
        repository.getCustomerAliases("jotform"),
        repository.getProducts(),
      ]);

      const result = await previewJotformOrderSync({
        apiKey: JOTFORM_API_KEY,
        formId: JOTFORM_FORM_ID,
        existingIds,
        customers,
        aliases,
        products,
        minCreatedAt,
      });

      return NextResponse.json(result);
    }

    const result = await syncJotformOrderSubmissions({
      apiKey: JOTFORM_API_KEY,
      formId: JOTFORM_FORM_ID,
      minCreatedAt,
      repository,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ukendt fejl under Jotform sync";

    try {
      const adminClient = createAdminClient();
      await adminClient.from("sync_log").insert({
        source: "orders_jotform",
        status: "error",
        message,
      });
    } catch {
      // ignore secondary logging errors
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
