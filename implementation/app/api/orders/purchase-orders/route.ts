import { NextResponse } from "next/server";
import { isDevAuthBypassed } from "@/lib/env";
import { createPurchaseOrderDraft } from "@/lib/orders/purchase-order-actions";
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
      supplierId?: string;
      lineIds?: string[];
      emailSubject?: string;
      emailBody?: string;
    };

    if (!body.supplierId || !body.lineIds?.length || !body.emailSubject || !body.emailBody) {
      return NextResponse.json({ error: "Kladdeoplysninger mangler" }, { status: 400 });
    }

    const result = await createPurchaseOrderDraft({
      supplierId: body.supplierId,
      lineIds: body.lineIds,
      emailSubject: body.emailSubject,
      emailBody: body.emailBody,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message, source: result.source }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Ukendt fejl ved oprettelse af leverandørordre",
      },
      { status: 500 }
    );
  }
}
