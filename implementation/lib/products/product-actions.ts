import { hasEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";
import type { ProductBillingCategory } from "@/lib/products/product-category";

export interface UpdateProductBillingCategoryResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
}

export interface UpdateProductResult extends UpdateProductBillingCategoryResult {}

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

  if (
    ![
      "material_cost",
      "resale_consumable",
      "equipment_purchase",
      "subcontractor_purchase",
      "window_cleaning_service",
      "mat_service",
    ].includes(params.billingCategory)
  ) {
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

export async function updateProduct(params: {
  id: string;
  productNumber: string;
  name: string;
  supplierId: string | null;
  unit: string | null;
  defaultPrice: number | null;
  isActive: boolean;
  billingCategory: ProductBillingCategory;
}): Promise<UpdateProductResult> {
  if (!params.id) {
    return {
      success: false,
      source: "mock",
      message: "Vare-id mangler.",
    };
  }

  if (!params.productNumber.trim()) {
    return {
      success: false,
      source: "mock",
      message: "Varenummer mangler.",
    };
  }

  if (!params.name.trim()) {
    return {
      success: false,
      source: "mock",
      message: "Varenavn mangler.",
    };
  }

  if (
    ![
      "material_cost",
      "resale_consumable",
      "equipment_purchase",
      "subcontractor_purchase",
      "window_cleaning_service",
      "mat_service",
    ].includes(params.billingCategory)
  ) {
    return {
      success: false,
      source: "mock",
      message: "Ugyldig varekategori.",
    };
  }

  if (params.defaultPrice !== null && Number.isNaN(params.defaultPrice)) {
    return {
      success: false,
      source: "mock",
      message: "Pris er ugyldig.",
    };
  }

  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message: "Mock fallback: varen er ikke gemt i databasen endnu.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("products")
      .update({
        product_number: params.productNumber.trim(),
        name: params.name.trim(),
        supplier_id: params.supplierId,
        unit: params.unit?.trim() || null,
        default_price: params.defaultPrice,
        is_active: params.isActive,
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
      message: "Varen er gemt.",
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message: error instanceof Error ? error.message : "Ukendt fejl ved opdatering af vare.",
    };
  }
}
