export type ProductBillingCategory =
  | "material_cost"
  | "resale_consumable"
  | "equipment_purchase"
  | "subcontractor_purchase"
  | "window_cleaning_service"
  | "mat_service";

export function formatProductBillingCategory(value: ProductBillingCategory) {
  if (value === "material_cost") {
    return "Materialeomkostning";
  }

  if (value === "equipment_purchase") {
    return "Indkøb af udstyr";
  }

  if (value === "subcontractor_purchase") {
    return "Indkøb af underleverance";
  }

  if (value === "window_cleaning_service") {
    return "Vinduespudsning";
  }

  if (value === "mat_service") {
    return "Måtteservice";
  }

  return "Forbrugsvare til kunde";
}

export function productBillingCategoryTone(value: ProductBillingCategory) {
  if (value === "material_cost") {
    return "neutral";
  }

  if (value === "equipment_purchase") {
    return "info";
  }

  if (value === "subcontractor_purchase") {
    return "warning";
  }

  if (value === "window_cleaning_service") {
    return "info";
  }

  if (value === "mat_service") {
    return "success";
  }

  return "success";
}
