import { NextResponse } from "next/server";
import { isDevAuthBypassed } from "@/lib/env";
import { updateProduct } from "@/lib/products/product-actions";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    let isAuthorized = false;

    if (isDevAuthBypassed()) {
      isAuthorized = true;
    } else {
      const authClient = await createClient();
      const {
        data: { user },
      } = await authClient.auth.getUser();
      isAuthorized = Boolean(user);
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }

    const { id } = await context.params;
    const payload = (await request.json()) as {
      productNumber?: string;
      name?: string;
      supplierId?: string | null;
      unit?: string | null;
      defaultPrice?: number | null;
      isActive?: boolean;
      billingCategory?:
        | "material_cost"
        | "resale_consumable"
        | "equipment_purchase"
        | "subcontractor_purchase"
        | "window_cleaning_service"
        | "mat_service";
    };

    const result = await updateProduct({
      id,
      productNumber: payload.productNumber ?? "",
      name: payload.name ?? "",
      supplierId: payload.supplierId ?? null,
      unit: payload.unit ?? null,
      defaultPrice: payload.defaultPrice ?? null,
      isActive: payload.isActive ?? true,
      billingCategory: payload.billingCategory ?? "resale_consumable",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message, source: result.source }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ukendt fejl ved opdatering af vare",
      },
      { status: 500 }
    );
  }
}
