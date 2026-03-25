import { hasEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

export type ResolveOrderLineMode = "existing" | "new" | "ignore";

export interface ResolveOrderLineResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
}

function canUseLiveData() {
  return hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export async function resolveOrderLine(params: {
  lineId: string;
  mode: ResolveOrderLineMode;
  productId?: string;
  productNumber?: string;
  productName?: string;
  supplierId?: string;
  unit?: string;
}): Promise<ResolveOrderLineResult> {
  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message: "Mock fallback: varelinjen er ikke skrevet til databasen endnu.",
    };
  }

  try {
    const supabase = createAdminClient();

    if (params.mode === "ignore") {
      const { error } = await supabase
        .from("customer_order_request_lines")
        .update({
          needs_action: false,
          action_reason: "ignored_by_buyer",
          line_status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.lineId);

      if (error) {
        return { success: false, source: "live", message: error.message };
      }

      return {
        success: true,
        source: "live",
        message: "Varelinjen er markeret som ignoreret.",
      };
    }

    let productRecord:
      | {
          id: string;
          product_number: string;
          name: string;
          supplier_id: string | null;
          unit: string | null;
        }
      | null = null;

    if (params.mode === "existing") {
      if (!params.productId) {
        return {
          success: false,
          source: "mock",
          message: "Vælg en eksisterende vare først.",
        };
      }

      const { data, error } = await supabase
        .from("products")
        .select("id, product_number, name, supplier_id, unit")
        .eq("id", params.productId)
        .maybeSingle();

      if (error || !data) {
        return {
          success: false,
          source: "live",
          message: error?.message ?? "Den valgte vare kunne ikke findes.",
        };
      }

      productRecord = data;
    }

    if (params.mode === "new") {
      if (!params.productNumber?.trim() || !params.productName?.trim()) {
        return {
          success: false,
          source: "mock",
          message: "Varenummer og varenavn skal udfyldes for at oprette en ny vare.",
        };
      }

      const normalizedNumber = params.productNumber.trim();
      const { data: existingProduct, error: existingError } = await supabase
        .from("products")
        .select("id, product_number, name, supplier_id, unit")
        .eq("product_number", normalizedNumber)
        .maybeSingle();

      if (existingError) {
        return { success: false, source: "live", message: existingError.message };
      }

      if (existingProduct) {
        productRecord = existingProduct;
      } else {
        const { data: insertedProduct, error: insertError } = await supabase
          .from("products")
          .insert({
            product_number: normalizedNumber,
            name: params.productName.trim(),
            supplier_id: params.supplierId ?? null,
            unit: params.unit?.trim() || "stk",
            is_active: true,
          })
          .select("id, product_number, name, supplier_id, unit")
          .single();

        if (insertError || !insertedProduct) {
          return {
            success: false,
            source: "live",
            message: insertError?.message ?? "Ny vare kunne ikke oprettes.",
          };
        }

        productRecord = insertedProduct;
      }
    }

    if (!productRecord) {
      return {
        success: false,
        source: "mock",
        message: "Varelinjen kunne ikke gemmes.",
      };
    }

    const { error } = await supabase
      .from("customer_order_request_lines")
      .update({
        product_id: productRecord.id,
        supplier_id: productRecord.supplier_id,
        resolved_product_number: productRecord.product_number,
        resolved_product_name: productRecord.name,
        unit: productRecord.unit,
        needs_action: false,
        action_reason: null,
        draft_product_suggestion: null,
        line_status: "ready_for_purchase",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.lineId);

    if (error) {
      return { success: false, source: "live", message: error.message };
    }

    return {
      success: true,
      source: "live",
      message:
        params.mode === "new"
          ? "Varen er oprettet og varelinjen er klar til bestilling."
          : "Varelinjen er koblet til en eksisterende vare og klar til bestilling.",
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message: error instanceof Error ? error.message : "Ukendt fejl ved varelinje-opdatering.",
    };
  }
}
