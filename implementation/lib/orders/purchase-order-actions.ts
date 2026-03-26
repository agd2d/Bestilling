import { hasEnv } from "@/lib/env";
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

export interface UndoSupplierOrderResult {
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

function canUseLiveData() {
  return hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
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
      message: "Mock fallback: leverandørkladden er ikke skrevet til databasen endnu.",
    };
  }

  try {
    const supabase = createAdminClient();

    const { data: createdPurchaseOrder, error: purchaseOrderError } = await supabase
      .from("purchase_orders")
      .insert({
        supplier_id: params.supplierId,
        status: "sent",
        email_subject: params.emailSubject,
        email_body: params.emailBody,
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
      message: "Leverandørordren er oprettet som afsendt.",
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

    return {
      success: true,
      source: "live",
      message: "Leverandørordre-status er opdateret.",
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
      (purchaseOrder) => !["draft", "ready_to_send", "sent"].includes(purchaseOrder.status)
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
