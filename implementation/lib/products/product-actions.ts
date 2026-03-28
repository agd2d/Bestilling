import { hasEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";
import type { ProductBillingCategory } from "@/lib/products/product-category";

export interface UpdateProductBillingCategoryResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
}

function canUseLiveData() {
  return hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export async function updateProductBillingCategory(params: {
  id: string;
  billingCategory: ProductBillingCategory;
}): Promise<UpdateProductBillingCategoryResult> {
  if (!params.id) {
    return {
      success: false,
      source: "mock",
      message: "Vare-id mangler.",
    };
  }

  if (!["material_cost", "resale_consumable"].includes(params.billingCategory)) {
    return {
      success: false,
      source: "mock",
      message: "Ugyldig varekategori.",
    };
  }

  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message: "Mock fallback: varekategorien er ikke gemt i databasen endnu.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("products")
      .update({
        billing_category: params.billingCategory,
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
      message: "Varekategori er gemt.",
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message: error instanceof Error ? error.message : "Ukendt fejl ved opdatering af varekategori.",
    };
  }
}
