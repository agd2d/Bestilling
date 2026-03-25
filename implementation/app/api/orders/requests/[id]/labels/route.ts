import { NextResponse } from "next/server";
import { isDevAuthBypassed } from "@/lib/env";
import { toggleOrderLabel } from "@/lib/orders/order-label-actions";
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
    const body = (await request.json()) as { labelId?: string; selected?: boolean };

    if (!body.labelId || typeof body.selected !== "boolean") {
      return NextResponse.json({ error: "Label-oplysninger mangler" }, { status: 400 });
    }

    const result = await toggleOrderLabel({
      requestId: id,
      labelId: body.labelId,
      selected: body.selected,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message, source: result.source }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Ukendt fejl ved label-opdatering",
      },
      { status: 500 }
    );
  }
}
