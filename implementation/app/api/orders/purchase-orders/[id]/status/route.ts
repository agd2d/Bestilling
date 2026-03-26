import { NextResponse } from "next/server";
import { isDevAuthBypassed } from "@/lib/env";
import { updatePurchaseOrderStatus } from "@/lib/orders/purchase-order-actions";
import {
  purchaseOrderStatusOptions,
  type PurchaseOrderStatusValue,
} from "@/lib/orders/purchase-order-status-options";
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

    const body = (await request.json()) as { status?: string };
    const { id } = await context.params;

    if (!body.status || !purchaseOrderStatusOptions.includes(body.status as never)) {
      return NextResponse.json({ error: "Ugyldig leverandørordre-status" }, { status: 400 });
    }

    const result = await updatePurchaseOrderStatus({
      purchaseOrderId: id,
      status: body.status as PurchaseOrderStatusValue,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message, source: result.source }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ukendt fejl ved opdatering af leverandørordre-status",
      },
      { status: 500 }
    );
  }
}
