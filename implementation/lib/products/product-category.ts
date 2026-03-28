export type ProductBillingCategory =
  | "material_cost"
  | "resale_consumable"
  | "equipment_purchase"
  | "subcontractor_purchase";

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

  return "success";
}
