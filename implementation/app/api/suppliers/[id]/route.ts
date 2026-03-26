import { NextResponse } from "next/server";
import { isDevAuthBypassed } from "@/lib/env";
import { updateSupplierContacts } from "@/lib/suppliers/supplier-actions";
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
      name?: string;
      email?: string;
      orderEmail?: string;
      confirmationEmail?: string;
      deliveryEmail?: string;
      notes?: string;
      isActive?: boolean;
    };

    const result = await updateSupplierContacts({
      id,
      name: body.name?.trim() ?? "",
      email: body.email?.trim() || null,
      orderEmail: body.orderEmail?.trim() || null,
      confirmationEmail: body.confirmationEmail?.trim() || null,
      deliveryEmail: body.deliveryEmail?.trim() || null,
      notes: body.notes?.trim() || null,
      isActive: Boolean(body.isActive),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message, source: result.source }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Ukendt fejl ved opdatering af leverandør",
      },
      { status: 500 }
    );
  }
}
