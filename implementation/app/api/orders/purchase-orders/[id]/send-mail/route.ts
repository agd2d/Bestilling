import { NextResponse } from "next/server";
import { isDevAuthBypassed } from "@/lib/env";
import { sendPurchaseOrderMail } from "@/lib/orders/purchase-order-actions";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
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
    const result = await sendPurchaseOrderMail({ purchaseOrderId: id });

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
            : "Ukendt fejl ved afsendelse af leverandørmail",
      },
      { status: 500 }
    );
  }
}
