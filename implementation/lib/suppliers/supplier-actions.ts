import { hasEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

export interface UpdateSupplierResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
}

function canUseLiveData() {
  return hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export async function updateSupplierContacts(params: {
  id: string;
  name: string;
  email: string | null;
  orderEmail: string | null;
  confirmationEmail: string | null;
  deliveryEmail: string | null;
  notes: string | null;
  isActive: boolean;
}): Promise<UpdateSupplierResult> {
  if (!params.id) {
    return {
      success: false,
      source: "mock",
      message: "Leverandør-id mangler.",
    };
  }

  if (!params.name.trim()) {
    return {
      success: false,
      source: "mock",
      message: "Leverandørnavn må ikke være tomt.",
    };
  }

  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message: "Mock fallback: leverandøren er ikke skrevet til databasen endnu.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("suppliers")
      .update({
        name: params.name.trim(),
        email: params.email,
        order_email: params.orderEmail,
        confirmation_email: params.confirmationEmail,
        delivery_email: params.deliveryEmail,
        notes: params.notes,
        is_active: params.isActive,
        updated_at: new Date().toISOString(),
      })
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
      message: "Leverandøroplysninger er gemt.",
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message:
        error instanceof Error ? error.message : "Ukendt fejl ved opdatering af leverandør.",
    };
  }
}
