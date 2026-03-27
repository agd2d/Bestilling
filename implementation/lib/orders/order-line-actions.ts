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
  quantity?: string;
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
    const parsedQuantity = Number(String(params.quantity ?? "").replace(",", "."));
    const hasValidQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0;

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

      if (!hasValidQuantity) {
        return {
          success: false,
          source: "live",
          message: "Antal skal være større end 0.",
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

      if (!hasValidQuantity) {
        return {
          success: false,
          source: "live",
          message: "Antal skal være større end 0.",
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
        quantity: parsedQuantity,
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

export async function createOrderLine(params: {
  requestId: string;
  mode: Exclude<ResolveOrderLineMode, "ignore">;
  productId?: string;
  productNumber?: string;
  productName?: string;
  quantity?: string;
  supplierId?: string;
  unit?: string;
}): Promise<ResolveOrderLineResult> {
  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message: "Mock fallback: ny varelinje er ikke skrevet til databasen endnu.",
    };
  }

  try {
    const supabase = createAdminClient();
    const parsedQuantity = Number(String(params.quantity ?? "").replace(",", "."));

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return {
        success: false,
        source: "live",
        message: "Antal skal være større end 0.",
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
          source: "live",
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
          source: "live",
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
        source: "live",
        message: "Varelinjen kunne ikke oprettes.",
      };
    }

    const { data: existingLines, error: linesError } = await supabase
      .from("customer_order_request_lines")
      .select("line_number")
      .eq("request_id", params.requestId)
      .order("line_number", { ascending: false })
      .limit(1);

    if (linesError) {
      return { success: false, source: "live", message: linesError.message };
    }

    const nextLineNumber = ((existingLines ?? [])[0]?.line_number ?? 0) + 1;

    const { error } = await supabase
      .from("customer_order_request_lines")
      .insert({
        request_id: params.requestId,
        product_id: productRecord.id,
        supplier_id: productRecord.supplier_id,
        line_number: nextLineNumber,
        raw_product_number: productRecord.product_number,
        raw_product_name: productRecord.name,
        quantity: parsedQuantity,
        unit: params.mode === "new" ? params.unit?.trim() || productRecord.unit || "stk" : productRecord.unit,
        resolved_product_number: productRecord.product_number,
        resolved_product_name: productRecord.name,
        line_status: "ready_for_purchase",
        needs_action: false,
        action_reason: null,
        draft_product_suggestion: null,
        customer_label_snapshot: "Manuelt tilføjet",
      });

    if (error) {
      return { success: false, source: "live", message: error.message };
    }

    return {
      success: true,
      source: "live",
      message:
        params.mode === "new"
          ? "Ny vare og varelinje er tilføjet til ordren."
          : "Varelinjen er tilføjet til ordren.",
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message: error instanceof Error ? error.message : "Ukendt fejl ved oprettelse af varelinje.",
    };
  }
}
