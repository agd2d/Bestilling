import { NextResponse } from "next/server";
import { isDevAuthBypassed } from "@/lib/env";
import { createOrderLine } from "@/lib/orders/order-line-actions";
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
    const body = (await request.json()) as {
      mode?: "existing" | "new";
      productId?: string;
      productNumber?: string;
      productName?: string;
      quantity?: string;
      supplierId?: string;
      unit?: string;
    };

    if (!body.mode) {
      return NextResponse.json({ error: "Handling mangler" }, { status: 400 });
    }

    const result = await createOrderLine({
      requestId: id,
      mode: body.mode,
      productId: body.productId,
      productNumber: body.productNumber,
      productName: body.productName,
      quantity: body.quantity,
      supplierId: body.supplierId,
      unit: body.unit,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message, source: result.source }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Ukendt fejl ved oprettelse af varelinje",
      },
      { status: 500 }
    );
  }
}
