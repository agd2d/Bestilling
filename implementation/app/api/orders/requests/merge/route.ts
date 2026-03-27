import { NextResponse } from "next/server";
import { isDevAuthBypassed } from "@/lib/env";
import { mergeCustomerOrders } from "@/lib/orders/order-merge-actions";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

    const body = (await request.json()) as {
      targetOrderId?: string;
      sourceOrderIds?: string[];
    };

    const result = await mergeCustomerOrders({
      targetOrderId: body.targetOrderId ?? "",
      sourceOrderIds: body.sourceOrderIds ?? [],
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, source: result.source, mismatch: result.mismatch },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ukendt fejl ved fletning af bestillinger",
      },
      { status: 500 }
    );
  }
}
