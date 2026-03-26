import { NextResponse } from "next/server";
import { isDevAuthBypassed } from "@/lib/env";
import { moveOrderBetweenFlows } from "@/lib/orders/order-flow-actions";
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

    const body = (await request.json()) as { targetStatus?: "created" | "sent_to_supplier" };
    const { id } = await context.params;

    if (body.targetStatus !== "created" && body.targetStatus !== "sent_to_supplier") {
      return NextResponse.json({ error: "Ugyldigt flowvalg" }, { status: 400 });
    }

    const result = await moveOrderBetweenFlows({
      id,
      targetStatus: body.targetStatus,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message, source: result.source }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ukendt fejl ved flowopdatering",
      },
      { status: 500 }
    );
  }
}
