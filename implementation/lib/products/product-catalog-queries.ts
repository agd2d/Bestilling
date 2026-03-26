import { hasEnv } from "@/lib/env";
import { mockOrders, mockProducts } from "@/lib/orders/mock-orders";
import { createAdminClient } from "@/lib/supabase/server";

interface ProductRow {
  id: string;
  product_number: string;
  name: string;
  supplier_id: string | null;
  unit: string | null;
  default_price: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface SupplierRow {
  id: string;
  name: string;
}

interface RequestLineRow {
  request_id: string;
  product_id: string | null;
  quantity: number;
}

interface RequestRow {
  id: string;
  created_at: string;
}

export interface ProductCatalogItem {
  id: string;
  productNumber: string;
  name: string;
  supplierName: string;
  unit: string;
  defaultPrice: number | null;
  isActive: boolean;
  usageCount: number;
  totalQuantity: number;
  lastOrderedAt: string | null;
}

export interface ProductCatalogStats {
  totalProducts: number;
  activeProducts: number;
  usedProducts: number;
  totalOrderedQuantity: number;
}

export interface ProductCatalogResult {
  items: ProductCatalogItem[];
  stats: ProductCatalogStats;
  source: "live" | "mock";
  message?: string;
}

function canUseLiveData() {
  return hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMockCatalog(): ProductCatalogResult {
  const items = mockProducts.map((product) => {
    const matchingOrders = mockOrders.filter((order) =>
      order.lines.some((line) => line.productId === product.id)
    );
    const relatedLines = matchingOrders.flatMap((order) =>
      order.lines.filter((line) => line.productId === product.id)
    );

    return {
      id: product.id,
      productNumber: product.productNumber,
      name: product.name,
      supplierName: product.supplierName,
      unit: product.unit ?? "-",
      defaultPrice: null,
      isActive: true,
      usageCount: relatedLines.length,
      totalQuantity: relatedLines.reduce((sum, line) => sum + line.quantity, 0),
      lastOrderedAt: matchingOrders.map((order) => order.createdAt).sort().at(-1) ?? null,
    };
  });

  return {
    items,
    stats: {
      totalProducts: items.length,
      activeProducts: items.filter((item) => item.isActive).length,
      usedProducts: items.filter((item) => item.usageCount > 0).length,
      totalOrderedQuantity: items.reduce((sum, item) => sum + item.totalQuantity, 0),
    },
    source: "mock",
    message: "Miljøvariabler mangler stadig, derfor vises mockdata.",
  };
}

export async function getProductCatalogData(): Promise<ProductCatalogResult> {
  if (!canUseLiveData()) {
    return getMockCatalog();
  }

  try {
    const supabase = createAdminClient();
    const [
      { data: products, error: productsError },
      { data: suppliers, error: suppliersError },
      { data: lines, error: linesError },
      { data: requests, error: requestsError },
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id, product_number, name, supplier_id, unit, default_price, is_active, created_at")
        .order("product_number"),
      supabase.from("suppliers").select("id, name"),
      supabase
        .from("customer_order_request_lines")
        .select("request_id, product_id, quantity")
        .not("product_id", "is", null),
      supabase.from("customer_order_requests").select("id, created_at"),
    ]);

    const firstError = productsError || suppliersError || linesError || requestsError;

    if (firstError) {
      return {
        ...getMockCatalog(),
        message: `Live læsning fejlede: ${firstError.message}. Mockdata vises i stedet.`,
      };
    }

    const supplierMap = new Map(
      ((suppliers ?? []) as SupplierRow[]).map((supplier) => [supplier.id, supplier.name])
    );
    const requestDateMap = new Map(
      ((requests ?? []) as RequestRow[]).map((request) => [request.id, request.created_at])
    );
    const usageMap = new Map<
      string,
      { usageCount: number; totalQuantity: number; lastOrderedAt: string | null }
    >();

    for (const line of (lines ?? []) as RequestLineRow[]) {
      if (!line.product_id) {
        continue;
      }

      const current = usageMap.get(line.product_id) ?? {
        usageCount: 0,
        totalQuantity: 0,
        lastOrderedAt: null,
      };
      const requestDate = requestDateMap.get(line.request_id) ?? null;

      usageMap.set(line.product_id, {
        usageCount: current.usageCount + 1,
        totalQuantity: current.totalQuantity + Number(line.quantity ?? 0),
        lastOrderedAt:
          requestDate && (!current.lastOrderedAt || requestDate > current.lastOrderedAt)
            ? requestDate
            : current.lastOrderedAt,
      });
    }

    const items = ((products ?? []) as ProductRow[]).map((product) => {
      const usage = usageMap.get(product.id);

      return {
        id: product.id,
        productNumber: product.product_number,
        name: product.name,
        supplierName: product.supplier_id
          ? supplierMap.get(product.supplier_id) ?? "Ukendt leverandør"
          : "Ukendt leverandør",
        unit: product.unit ?? "-",
        defaultPrice: product.default_price,
        isActive: product.is_active ?? true,
        usageCount: usage?.usageCount ?? 0,
        totalQuantity: usage?.totalQuantity ?? 0,
        lastOrderedAt: formatDate(usage?.lastOrderedAt ?? product.created_at),
      };
    });

    return {
      items,
      stats: {
        totalProducts: items.length,
        activeProducts: items.filter((item) => item.isActive).length,
        usedProducts: items.filter((item) => item.usageCount > 0).length,
        totalOrderedQuantity: items.reduce((sum, item) => sum + item.totalQuantity, 0),
      },
      source: "live",
      message: "Varekatalog og varestatistik hentes nu fra Supabase.",
    };
  } catch (error) {
    return {
      ...getMockCatalog(),
      message:
        error instanceof Error
          ? `Live læsning fejlede: ${error.message}. Mockdata vises i stedet.`
          : "Live læsning fejlede. Mockdata vises i stedet.",
    };
  }
}
