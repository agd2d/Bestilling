import { NextResponse } from "next/server";
import { isDevAuthBypassed } from "@/lib/env";
import { updatePurchaseOrderLifecycle } from "@/lib/orders/purchase-order-actions";
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

    const body = (await request.json()) as { action?: "reopen" | "cancel" | "close" };
    const { id } = await context.params;

    if (!body.action || !["reopen", "cancel", "close"].includes(body.action)) {
      return NextResponse.json({ error: "Ugyldig handling" }, { status: 400 });
    }

    const result = await updatePurchaseOrderLifecycle({
      purchaseOrderId: id,
      action: body.action,
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
            : "Ukendt fejl ved opdatering af leverandørordre",
      },
      { status: 500 }
    );
  }
}
