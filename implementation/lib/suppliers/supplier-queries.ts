import { hasEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

export interface SupplierListItem {
  id: string;
  name: string;
  email: string | null;
  orderEmail: string | null;
  confirmationEmail: string | null;
  deliveryEmail: string | null;
  notes: string | null;
  isActive: boolean;
  productCount: number;
  purchaseOrderCount: number;
}

export interface SuppliersDataResult {
  suppliers: SupplierListItem[];
  source: "live" | "mock";
  message?: string;
}

interface SupplierRow {
  id: string;
  name: string;
  email: string | null;
  order_email: string | null;
  confirmation_email: string | null;
  delivery_email: string | null;
  notes: string | null;
  is_active: boolean;
}

interface ProductRow {
  supplier_id: string | null;
}

interface PurchaseOrderRow {
  supplier_id: string;
}

const mockSuppliers: SupplierListItem[] = [
  {
    id: "supplier-total-rent",
    name: "Total Rent",
    email: "kundeservice@totalrent.dk",
    orderEmail: "kundeservice@totalrent.dk",
    confirmationEmail: "kundeservice@totalrent.dk",
    deliveryEmail: "lager2@totalrent.dk",
    notes: "Primær leverandør for rengøring og forbrugsvarer.",
    isActive: true,
    productCount: 42,
    purchaseOrderCount: 8,
  },
  {
    id: "supplier-abena",
    name: "Abena",
    email: "ordre@abena.dk",
    orderEmail: "ordre@abena.dk",
    confirmationEmail: "ordre@abena.dk",
    deliveryEmail: null,
    notes: "Bruges til handsker og plejeprodukter.",
    isActive: true,
    productCount: 18,
    purchaseOrderCount: 3,
  },
];

function canUseLiveData() {
  return hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export async function getSuppliersData(): Promise<SuppliersDataResult> {
  if (!canUseLiveData()) {
    return {
      suppliers: mockSuppliers,
      source: "mock",
      message: "Miljøvariabler mangler stadig, derfor vises mockdata.",
    };
  }

  try {
    const supabase = createAdminClient();
    const [
      { data: suppliers, error: suppliersError },
      { data: products, error: productsError },
      { data: purchaseOrders, error: purchaseOrdersError },
    ] = await Promise.all([
      supabase
        .from("suppliers")
        .select(
          "id, name, email, order_email, confirmation_email, delivery_email, notes, is_active"
        )
        .order("name"),
      supabase.from("products").select("supplier_id"),
      supabase.from("purchase_orders").select("supplier_id"),
    ]);

    const firstError = suppliersError || productsError || purchaseOrdersError;
    if (firstError) {
      return {
        suppliers: mockSuppliers,
        source: "mock",
        message: `Live læsning fejlede: ${firstError.message}. Mockdata vises i stedet.`,
      };
    }

    const productCounts = new Map<string, number>();
    for (const product of (products ?? []) as ProductRow[]) {
      if (!product.supplier_id) continue;
      productCounts.set(product.supplier_id, (productCounts.get(product.supplier_id) ?? 0) + 1);
    }

    const purchaseOrderCounts = new Map<string, number>();
    for (const purchaseOrder of (purchaseOrders ?? []) as PurchaseOrderRow[]) {
      purchaseOrderCounts.set(
        purchaseOrder.supplier_id,
        (purchaseOrderCounts.get(purchaseOrder.supplier_id) ?? 0) + 1
      );
    }

    return {
      suppliers: ((suppliers ?? []) as SupplierRow[]).map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        orderEmail: supplier.order_email,
        confirmationEmail: supplier.confirmation_email,
        deliveryEmail: supplier.delivery_email,
        notes: supplier.notes,
        isActive: supplier.is_active,
        productCount: productCounts.get(supplier.id) ?? 0,
        purchaseOrderCount: purchaseOrderCounts.get(supplier.id) ?? 0,
      })),
      source: "live",
      message: "Leverandørkartoteket hentes fra databasen.",
    };
  } catch (error) {
    return {
      suppliers: mockSuppliers,
      source: "mock",
      message:
        error instanceof Error
          ? `Live læsning fejlede: ${error.message}. Mockdata vises i stedet.`
          : "Live læsning fejlede. Mockdata vises i stedet.",
    };
  }
}
