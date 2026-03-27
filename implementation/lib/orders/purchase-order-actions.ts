import { hasEnv } from "@/lib/env";
import { hasMicrosoftGraphMailConfig, sendMailViaMicrosoftGraph } from "@/lib/mail/microsoft-graph";
import { createAdminClient } from "@/lib/supabase/server";
import type { PurchaseOrderStatusValue } from "@/lib/orders/purchase-order-status-options";

export interface CreatePurchaseOrderDraftResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
  purchaseOrderId?: string;
}

export interface UpdatePurchaseOrderStatusResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
}

export interface UpdatePurchaseOrderLifecycleResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
}

export interface UndoSupplierOrderResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
}

export interface SendPurchaseOrderMailResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
}

export interface UpdatePurchaseOrderMailDraftResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
}

interface RequestLineRow {
  id: string;
  request_id: string;
  product_id: string | null;
  quantity: number;
  unit: string | null;
  needs_action?: boolean;
}

interface RequestRow {
  id: string;
  customer_id: string;
}

interface PurchaseOrderLinkRow {
  id: string;
  purchase_order_id: string;
  request_line_id: string;
}

interface PurchaseOrderStatusRow {
  id: string;
  status: string;
}

interface PurchaseOrderLineStatusRow {
  id: string;
  request_line_id: string;
}

interface SendPurchaseOrderRow {
  id: string;
  status: string;
  email_subject: string | null;
  email_body: string | null;
  supplier_id: string;
}

interface SendSupplierRow {
  id: string;
  name: string;
  order_email: string | null;
  email: string | null;
}

function canUseLiveData() {
  return hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function createPurchaseOrderNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(
    2,
    "0"
  )}`;
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `HS-${datePart}-${timePart}-${randomPart}`;
}

export async function createPurchaseOrderDraft(params: {
  supplierId: string;
  lineIds: string[];
  emailSubject: string;
  emailBody: string;
}): Promise<CreatePurchaseOrderDraftResult> {
  if (!params.supplierId || params.lineIds.length === 0) {
    return {
      success: false,
      source: "mock",
      message: "Leverandør og linjer skal vælges.",
    };
  }

  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message: "Mock fallback: leverandørordren er ikke skrevet til databasen endnu.",
    };
  }

  try {
    const supabase = createAdminClient();
    const orderNumber = createPurchaseOrderNumber();

    const { data: createdPurchaseOrder, error: purchaseOrderError } = await supabase
      .from("purchase_orders")
      .insert({
        supplier_id: params.supplierId,
        status: "sent",
        email_subject: `[${orderNumber}] ${params.emailSubject}`,
        email_body: `Ordrenummer: ${orderNumber}\n\n${params.emailBody}`,
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (purchaseOrderError || !createdPurchaseOrder) {
      return {
        success: false,
        source: "live",
        message: purchaseOrderError?.message ?? "Leverandørordren kunne ikke oprettes.",
      };
    }

    const purchaseOrderId = createdPurchaseOrder.id as string;

    const { data: requestLines, error: requestLinesError } = await supabase
      .from("customer_order_request_lines")
      .select("id, request_id, product_id, quantity, unit")
      .in("id", params.lineIds);

    if (requestLinesError) {
      return {
        success: false,
        source: "live",
        message: requestLinesError.message,
      };
    }

    const requestIds = Array.from(
      new Set(((requestLines ?? []) as RequestLineRow[]).map((line) => line.request_id))
    );
    const { data: requests, error: requestsError } = await supabase
      .from("customer_order_requests")
      .select("id, customer_id")
      .in("id", requestIds);

    if (requestsError) {
      return {
        success: false,
        source: "live",
        message: requestsError.message,
      };
    }

    const requestCustomerMap = new Map(
      ((requests ?? []) as RequestRow[]).map((request) => [request.id, request.customer_id])
    );

    const { error: insertLinesError } = await supabase.from("purchase_order_lines").insert(
      ((requestLines ?? []) as RequestLineRow[]).map((line) => ({
        purchase_order_id: purchaseOrderId,
        request_line_id: line.id,
        product_id: line.product_id,
        customer_id: requestCustomerMap.get(line.request_id),
        quantity: line.quantity,
        unit: line.unit,
        line_status: "sent",
      }))
    );

    if (insertLinesError) {
      return {
        success: false,
        source: "live",
        message: insertLinesError.message,
      };
    }

    const { error: updateLinesError } = await supabase
      .from("customer_order_request_lines")
      .update({
        line_status: "included_in_purchase_order",
        updated_at: new Date().toISOString(),
      })
      .in("id", params.lineIds);

    if (updateLinesError) {
      return {
        success: false,
        source: "live",
        message: updateLinesError.message,
      };
    }

    return {
      success: true,
      source: "live",
      message: `Leverandørordren ${orderNumber} er oprettet og låst som afgivet.`,
      purchaseOrderId,
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message:
        error instanceof Error ? error.message : "Ukendt fejl ved oprettelse af leverandørordre.",
    };
  }
}

export async function updatePurchaseOrderStatus(params: {
  purchaseOrderId: string;
  status: PurchaseOrderStatusValue;
}): Promise<UpdatePurchaseOrderStatusResult> {
  if (!params.purchaseOrderId || !params.status) {
    return {
      success: false,
      source: "mock",
      message: "Leverandørordre og status skal vælges.",
    };
  }

  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message: "Mock fallback: status er ikke skrevet til databasen endnu.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { data: linkedLines, error: linkedLinesError } = await supabase
      .from("purchase_order_lines")
      .select("id, request_line_id")
      .eq("purchase_order_id", params.purchaseOrderId);

    if (linkedLinesError) {
      return {
        success: false,
        source: "live",
        message: linkedLinesError.message,
      };
    }

    const nextTimestamp =
      params.status === "sent" ? { sent_at: new Date().toISOString() } : {};

    const { error } = await supabase
      .from("purchase_orders")
      .update({
        status: params.status,
        updated_at: new Date().toISOString(),
        ...nextTimestamp,
      })
      .eq("id", params.purchaseOrderId);

    if (error) {
      return {
        success: false,
        source: "live",
        message: error.message,
      };
    }

    const requestLineIds = ((linkedLines ?? []) as PurchaseOrderLineStatusRow[]).map(
      (line) => line.request_line_id
    );

    if (requestLineIds.length > 0) {
      const requestLineStatus =
        params.status === "ready_to_send"
          ? "supplier_confirmed"
          : params.status === "partially_delivered"
            ? "delivered"
            : "included_in_purchase_order";
      const purchaseLineStatus =
        params.status === "ready_to_send"
          ? "confirmed"
          : params.status === "partially_delivered"
            ? "delivered"
            : "sent";

      const { error: updatePurchaseLinesError } = await supabase
        .from("purchase_order_lines")
        .update({
          line_status: purchaseLineStatus,
        })
        .eq("purchase_order_id", params.purchaseOrderId);

      if (updatePurchaseLinesError) {
        return {
          success: false,
          source: "live",
          message: updatePurchaseLinesError.message,
        };
      }

      const { error: updateRequestLinesError } = await supabase
        .from("customer_order_request_lines")
        .update({
          line_status: requestLineStatus,
          updated_at: new Date().toISOString(),
        })
        .in("id", requestLineIds);

      if (updateRequestLinesError) {
        return {
          success: false,
          source: "live",
          message: updateRequestLinesError.message,
        };
      }
    }

    return {
      success: true,
      source: "live",
      message:
        params.status === "partially_delivered"
          ? "Ordren er markeret som modtaget ved kunde og flyttes nu til fakturering."
          : "Leverandørordre-status er opdateret.",
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message:
        error instanceof Error
          ? error.message
          : "Ukendt fejl ved opdatering af leverandørordre-status.",
    };
  }
}

export async function updatePurchaseOrderLifecycle(params: {
  purchaseOrderId: string;
  action: "reopen" | "cancel" | "close";
}): Promise<UpdatePurchaseOrderLifecycleResult> {
  if (!params.purchaseOrderId || !params.action) {
    return {
      success: false,
      source: "mock",
      message: "Leverandørordre og handling skal vælges.",
    };
  }

  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message: "Mock fallback: leverandørordren er opdateret.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { data: purchaseOrderLines, error: purchaseOrderLinesError } = await supabase
      .from("purchase_order_lines")
      .select("id, request_line_id")
      .eq("purchase_order_id", params.purchaseOrderId);

    if (purchaseOrderLinesError) {
      return {
        success: false,
        source: "live",
        message: purchaseOrderLinesError.message,
      };
    }

    const requestLineIds = ((purchaseOrderLines ?? []) as PurchaseOrderLineStatusRow[]).map(
      (line) => line.request_line_id
    );

    if (params.action === "reopen") {
      const { error } = await supabase
        .from("purchase_orders")
        .update({
          status: "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.purchaseOrderId);

      if (error) {
        return {
          success: false,
          source: "live",
          message: error.message,
        };
      }

      return {
        success: true,
        source: "live",
        message: "Leverandørordren er åbnet igen.",
      };
    }

    if (params.action === "close") {
      const { error } = await supabase
        .from("purchase_orders")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.purchaseOrderId);

      if (error) {
        return {
          success: false,
          source: "live",
          message: error.message,
        };
      }

      return {
        success: true,
        source: "live",
        message: "Leverandørordren er lukket og markeret som afgivet igen.",
      };
    }

    const { data: requestLines, error: requestLinesError } = await supabase
      .from("customer_order_request_lines")
      .select("id, needs_action")
      .in("id", requestLineIds);

    if (requestLinesError) {
      return {
        success: false,
        source: "live",
        message: requestLinesError.message,
      };
    }

    const { error: cancelOrderError } = await supabase
      .from("purchase_orders")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.purchaseOrderId);

    if (cancelOrderError) {
      return {
        success: false,
        source: "live",
        message: cancelOrderError.message,
      };
    }

    const { error: cancelPurchaseLinesError } = await supabase
      .from("purchase_order_lines")
      .update({
        line_status: "cancelled",
      })
      .eq("purchase_order_id", params.purchaseOrderId);

    if (cancelPurchaseLinesError) {
      return {
        success: false,
        source: "live",
        message: cancelPurchaseLinesError.message,
      };
    }

    for (const line of (requestLines ?? []) as RequestLineRow[]) {
      const nextLineStatus = line.needs_action ? "draft_needed" : "ready_for_purchase";

      const { error: updateRequestLineError } = await supabase
        .from("customer_order_request_lines")
        .update({
          line_status: nextLineStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.id);

      if (updateRequestLineError) {
        return {
          success: false,
          source: "live",
          message: updateRequestLineError.message,
        };
      }
    }

    return {
      success: true,
      source: "live",
      message: "Leverandørordren er annulleret. Linjerne kan nu indgå i en ny kladde.",
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message:
        error instanceof Error ? error.message : "Ukendt fejl ved opdatering af leverandørordre.",
    };
  }
}

export async function undoSupplierOrderForRequest(params: {
  requestId: string;
}): Promise<UndoSupplierOrderResult> {
  if (!params.requestId) {
    return {
      success: false,
      source: "mock",
      message: "Kundebestillingen mangler id.",
    };
  }

  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message: "Mock fallback: leverandørordren er fortrudt.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { data: requestLines, error: requestLinesError } = await supabase
      .from("customer_order_request_lines")
      .select("id, needs_action")
      .eq("request_id", params.requestId);

    if (requestLinesError) {
      return {
        success: false,
        source: "live",
        message: requestLinesError.message,
      };
    }

    const lineRows = (requestLines ?? []) as RequestLineRow[];
    const requestLineIds = lineRows.map((line) => line.id);

    if (requestLineIds.length === 0) {
      return {
        success: false,
        source: "live",
        message: "Ingen ordrelinjer blev fundet.",
      };
    }

    const { data: purchaseOrderLinks, error: purchaseOrderLinksError } = await supabase
      .from("purchase_order_lines")
      .select("id, purchase_order_id, request_line_id")
      .in("request_line_id", requestLineIds);

    if (purchaseOrderLinksError) {
      return {
        success: false,
        source: "live",
        message: purchaseOrderLinksError.message,
      };
    }

    const links = (purchaseOrderLinks ?? []) as PurchaseOrderLinkRow[];

    if (links.length === 0) {
      return {
        success: false,
        source: "live",
        message: "Bestillingen er ikke koblet til en leverandørordre.",
      };
    }

    const purchaseOrderIds = Array.from(new Set(links.map((link) => link.purchase_order_id)));
    const { data: purchaseOrders, error: purchaseOrdersError } = await supabase
      .from("purchase_orders")
      .select("id, status")
      .in("id", purchaseOrderIds);

    if (purchaseOrdersError) {
      return {
        success: false,
        source: "live",
        message: purchaseOrdersError.message,
      };
    }

    const blockedStatuses = ((purchaseOrders ?? []) as PurchaseOrderStatusRow[]).filter(
      (purchaseOrder) => !["draft", "sent", "ready_to_send"].includes(purchaseOrder.status)
    );

    if (blockedStatuses.length > 0) {
      return {
        success: false,
        source: "live",
        message:
          "Leverandørordren kan ikke fortrydes længere, fordi den er kommet for langt i flowet.",
      };
    }

    const { error: deleteLinksError } = await supabase
      .from("purchase_order_lines")
      .delete()
      .in(
        "id",
        links.map((link) => link.id)
      );

    if (deleteLinksError) {
      return {
        success: false,
        source: "live",
        message: deleteLinksError.message,
      };
    }

    for (const line of lineRows) {
      const nextLineStatus = line.needs_action ? "draft_needed" : "ready_for_purchase";
      const { error: updateLineError } = await supabase
        .from("customer_order_request_lines")
        .update({
          line_status: nextLineStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.id);

      if (updateLineError) {
        return {
          success: false,
          source: "live",
          message: updateLineError.message,
        };
      }
    }

    for (const purchaseOrderId of purchaseOrderIds) {
      const { count, error: countError } = await supabase
        .from("purchase_order_lines")
        .select("*", { count: "exact", head: true })
        .eq("purchase_order_id", purchaseOrderId);

      if (countError) {
        return {
          success: false,
          source: "live",
          message: countError.message,
        };
      }

      if ((count ?? 0) === 0) {
        const { error: deletePurchaseOrderError } = await supabase
          .from("purchase_orders")
          .delete()
          .eq("id", purchaseOrderId);

        if (deletePurchaseOrderError) {
          return {
            success: false,
            source: "live",
            message: deletePurchaseOrderError.message,
          };
        }
      }
    }

    const { error: updateRequestError } = await supabase
      .from("customer_order_requests")
      .update({
        status: "created",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.requestId);

    if (updateRequestError) {
      return {
        success: false,
        source: "live",
        message: updateRequestError.message,
      };
    }

    return {
      success: true,
      source: "live",
      message: "Leverandørordren er fortrudt, og kundebestillingen er sendt tilbage.",
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message:
        error instanceof Error ? error.message : "Ukendt fejl ved fortrydelse af leverandørordre.",
    };
  }
}

export async function sendPurchaseOrderMail(params: {
  purchaseOrderId: string;
  to?: string;
  subject?: string;
  body?: string;
}): Promise<SendPurchaseOrderMailResult> {
  if (!params.purchaseOrderId) {
    return {
      success: false,
      source: "mock",
      message: "Leverandørordren mangler id.",
    };
  }

  if (!canUseLiveData()) {
    return {
      success: false,
      source: "mock",
      message: "Live miljø mangler stadig for rigtig mailafsendelse.",
    };
  }

  if (!hasMicrosoftGraphMailConfig()) {
    return {
      success: false,
      source: "live",
      message: "Microsoft Graph er ikke konfigureret endnu for direkte mailafsendelse.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { data: purchaseOrder, error: purchaseOrderError } = await supabase
      .from("purchase_orders")
      .select("id, status, email_subject, email_body, supplier_id")
      .eq("id", params.purchaseOrderId)
      .maybeSingle();

    if (purchaseOrderError || !purchaseOrder) {
      return {
        success: false,
        source: "live",
        message: purchaseOrderError?.message ?? "Leverandørordren blev ikke fundet.",
      };
    }

    const order = purchaseOrder as SendPurchaseOrderRow;
    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, name, order_email, email")
      .eq("id", order.supplier_id)
      .maybeSingle();

    if (supplierError || !supplier) {
      return {
        success: false,
        source: "live",
        message: supplierError?.message ?? "Leverandøren blev ikke fundet.",
      };
    }

    const supplierRow = supplier as SendSupplierRow;
    const to = params.to?.trim() || supplierRow.order_email || supplierRow.email;
    const subject = params.subject?.trim() || order.email_subject;
    const body = params.body?.trim() || order.email_body;

    if (!to) {
      return {
        success: false,
        source: "live",
        message: "Leverandøren mangler ordre-e-mail.",
      };
    }

    if (!subject || !body) {
      return {
        success: false,
        source: "live",
        message: "Ordren mangler mail-emne eller mail-tekst.",
      };
    }

    await sendMailViaMicrosoftGraph({
      to,
      subject,
      body,
    });

    const nextStatus = order.status === "draft" ? "sent" : order.status;
    const { error: updateError } = await supabase
      .from("purchase_orders")
      .update({
        status: nextStatus,
        email_subject: subject,
        email_body: body,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.purchaseOrderId);

    if (updateError) {
      return {
        success: false,
        source: "live",
        message: updateError.message,
      };
    }

    return {
      success: true,
      source: "live",
      message: `Ordre-mail er sendt til ${supplierRow.name}.`,
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message:
        error instanceof Error ? error.message : "Ukendt fejl ved afsendelse af leverandørmail.",
    };
  }
}

export async function updatePurchaseOrderMailDraft(params: {
  purchaseOrderId: string;
  subject: string;
  body: string;
}): Promise<UpdatePurchaseOrderMailDraftResult> {
  if (!params.purchaseOrderId) {
    return {
      success: false,
      source: "mock",
      message: "Leverandørordren mangler id.",
    };
  }

  if (!params.subject.trim() || !params.body.trim()) {
    return {
      success: false,
      source: "mock",
      message: "Mail-emne og mail-tekst skal udfyldes.",
    };
  }

  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message: "Mock fallback: mailudkastet er ikke gemt i databasen endnu.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("purchase_orders")
      .update({
        email_subject: params.subject.trim(),
        email_body: params.body.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.purchaseOrderId);

    if (error) {
      return {
        success: false,
        source: "live",
        message: error.message,
      };
    }

    return {
      success: true,
      source: "live",
      message: "Mailudkast er gemt.",
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message: error instanceof Error ? error.message : "Ukendt fejl ved gemning af mailudkast.",
    };
  }
}
