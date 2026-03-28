import { NextResponse } from "next/server";
import { isDevAuthBypassed } from "@/lib/env";
import { updateProductBillingCategory } from "@/lib/products/product-actions";
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
    const payload = (await request.json()) as { billingCategory?: "material_cost" | "resale_consumable" };

    const result = await updateProductBillingCategory({
      id,
      billingCategory: payload.billingCategory ?? "resale_consumable",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message, source: result.source }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Ukendt fejl ved opdatering af varekategori",
      },
      { status: 500 }
    );
  }
}
