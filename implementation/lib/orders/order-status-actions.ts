import { hasEnv } from "@/lib/env";
import { orderStatusOptions, OrderStatusValue } from "@/lib/orders/status-options";
import { createAdminClient } from "@/lib/supabase/server";

export interface UpdateOrderStatusResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
}

function canUseLiveData() {
  return (
    hasEnv("NEXT_PUBLIC_SUPABASE_URL") &&
    hasEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export async function updateOrderStatus(params: {
  id: string;
  status: string;
}): Promise<UpdateOrderStatusResult> {
  if (!orderStatusOptions.includes(params.status as OrderStatusValue)) {
    return {
      success: false,
      source: "mock",
      message: "Ugyldig statusvaerdi.",
    };
  }

  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message: "Mock fallback: status er ikke skrevet til databasen endnu.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("customer_order_requests")
      .update({ status: params.status, updated_at: new Date().toISOString() })
      .eq("id", params.id);

    if (error) {
      return {
        success: false,
        source: "live",
        message: error.message,
      };
    }

    return {
      success: true,
      source: "live",
      message: "Status er opdateret i Supabase.",
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message:
        error instanceof Error ? error.message : "Ukendt fejl ved statusopdatering.",
    };
  }
}
