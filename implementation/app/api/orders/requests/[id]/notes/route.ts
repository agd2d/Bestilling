import { NextResponse } from "next/server";
import { isDevAuthBypassed } from "@/lib/env";
import { addOrderNote } from "@/lib/orders/order-notes-actions";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    let isAuthorized = false;
    let userId: string | null = null;

    if (isDevAuthBypassed()) {
      isAuthorized = true;
    } else {
      const authClient = await createClient();
      const {
        data: { user },
      } = await authClient.auth.getUser();
      isAuthorized = Boolean(user);
      userId = user?.id ?? null;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as { note?: string };

    if (!body.note) {
      return NextResponse.json({ error: "Note mangler" }, { status: 400 });
    }

    const result = await addOrderNote({
      requestId: id,
      note: body.note,
      authorUserId: userId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message, source: result.source }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ukendt fejl ved noteoprettelse",
      },
      { status: 500 }
    );
  }
}
