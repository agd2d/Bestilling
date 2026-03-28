export type ProductBillingCategory = "material_cost" | "resale_consumable";

export function formatProductBillingCategory(value: ProductBillingCategory) {
  return value === "material_cost" ? "Materialeomkostning" : "Forbrugsvare til kunde";
}

export function productBillingCategoryTone(value: ProductBillingCategory) {
  return value === "material_cost" ? "neutral" : "success";
}
