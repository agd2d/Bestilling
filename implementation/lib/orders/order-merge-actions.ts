import { hasEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

export interface MergeCustomerOrdersResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
  mismatch?: {
    orders: Array<{
      id: string;
      customerId: string;
      customerName: string;
      locationLabel: string;
    }>;
  };
}

interface RequestRow {
  id: string;
  customer_id: string;
  location_label: string;
  status: string;
}

interface CustomerRow {
  id: string;
  name: string | null;
}

interface RequestLineRow {
  id: string;
  request_id: string;
  line_number: number | null;
}

function canUseLiveData() {
  return hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export async function mergeCustomerOrders(params: {
  targetOrderId: string;
  sourceOrderIds: string[];
}): Promise<MergeCustomerOrdersResult> {
  const sourceOrderIds = Array.from(
    new Set(params.sourceOrderIds.filter((orderId) => orderId && orderId !== params.targetOrderId))
  );

  if (!params.targetOrderId || sourceOrderIds.length === 0) {
    return {
      success: false,
      source: "mock",
      message: "Vælg mindst to bestillinger for at flette dem.",
    };
  }

  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message: "Mock fallback: bestillingerne er markeret som flettet.",
    };
  }

  try {
    const supabase = createAdminClient();
    const requestIds = [params.targetOrderId, ...sourceOrderIds];

    const [
      { data: requests, error: requestsError },
      { data: customers, error: customersError },
      { data: lines, error: linesError },
    ] = await Promise.all([
      supabase
        .from("customer_order_requests")
        .select("id, customer_id, location_label, status")
        .in("id", requestIds),
      supabase.from("customers").select("id, name"),
      supabase
        .from("customer_order_request_lines")
        .select("id, request_id, line_number")
        .in("request_id", requestIds)
        .order("line_number", { ascending: true }),
    ]);

    const firstError = requestsError || customersError || linesError;
    if (firstError) {
      return {
        success: false,
        source: "live",
        message: firstError.message,
      };
    }

    const requestRows = (requests ?? []) as RequestRow[];
    if (requestRows.length !== requestIds.length) {
      return {
        success: false,
        source: "live",
        message: "En eller flere bestillinger kunne ikke findes.",
      };
    }

    const customerMap = new Map(
      ((customers ?? []) as CustomerRow[]).map((customer) => [customer.id, customer.name ?? "Ukendt kunde"])
    );

    const mismatchOrders = requestRows.map((request) => ({
      id: request.id,
      customerId: request.customer_id,
      customerName: customerMap.get(request.customer_id) ?? "Ukendt kunde",
      locationLabel: request.location_label,
    }));

    const uniqueCustomerIds = Array.from(new Set(mismatchOrders.map((order) => order.customerId)));
    if (uniqueCustomerIds.length > 1) {
      return {
        success: false,
        source: "live",
        message: "Kun bestillinger fra samme kunde kan flettes.",
        mismatch: {
          orders: mismatchOrders,
        },
      };
    }

    const invalidStatusRequest = requestRows.find((request) => request.status !== "created");
    if (invalidStatusRequest) {
      return {
        success: false,
        source: "live",
        message: "Kun bestillinger i varebestilling kan flettes.",
      };
    }

    const requestLineRows = (lines ?? []) as RequestLineRow[];
    const requestLineIds = requestLineRows.map((line) => line.id);

    if (requestLineIds.length > 0) {
      const { data: purchaseOrderLines, error: purchaseOrderLinesError } = await supabase
        .from("purchase_order_lines")
        .select("id")
        .in("request_line_id", requestLineIds)
        .limit(1);

      if (purchaseOrderLinesError) {
        return {
          success: false,
          source: "live",
          message: purchaseOrderLinesError.message,
        };
      }

      if ((purchaseOrderLines ?? []).length > 0) {
        return {
          success: false,
          source: "live",
          message:
            "Bestillingerne kan ikke flettes, fordi en eller flere linjer allerede indgår i en leverandørordre.",
        };
      }
    }

    const sourceLines = requestLineRows.filter((line) => sourceOrderIds.includes(line.request_id));
    const targetLines = requestLineRows.filter((line) => line.request_id === params.targetOrderId);
    let nextLineNumber =
      targetLines.reduce((max, line) => Math.max(max, line.line_number ?? 0), 0) + 1;

    for (const line of sourceLines) {
      const { error: updateLineError } = await supabase
        .from("customer_order_request_lines")
        .update({
          request_id: params.targetOrderId,
          line_number: nextLineNumber,
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

      nextLineNumber += 1;
    }

    const { data: sourceLabels, error: sourceLabelsError } = await supabase
      .from("request_label_links")
      .select("label_id, request_id")
      .in("request_id", sourceOrderIds);

    if (sourceLabelsError) {
      return {
        success: false,
        source: "live",
        message: sourceLabelsError.message,
      };
    }

    const labelRows = (sourceLabels ?? []) as Array<{ label_id: string; request_id: string }>;
    if (labelRows.length > 0) {
      const { error: upsertLabelsError } = await supabase.from("request_label_links").upsert(
        labelRows.map((label) => ({
          request_id: params.targetOrderId,
          label_id: label.label_id,
        })),
        { onConflict: "request_id,label_id", ignoreDuplicates: true }
      );

      if (upsertLabelsError) {
        return {
          success: false,
          source: "live",
          message: upsertLabelsError.message,
        };
      }
    }

    const { error: moveNotesError } = await supabase
      .from("order_notes")
      .update({
        request_id: params.targetOrderId,
      })
      .in("request_id", sourceOrderIds);

    if (moveNotesError) {
      return {
        success: false,
        source: "live",
        message: moveNotesError.message,
      };
    }

    const mergedOrderDescriptions = requestRows
      .filter((request) => sourceOrderIds.includes(request.id))
      .map((request) => `${request.location_label} (${request.id})`)
      .join(", ");

    const { error: addMergeNoteError } = await supabase.from("order_notes").insert({
      request_id: params.targetOrderId,
      author_user_id: null,
      note: `Bestillingen er flettet med: ${mergedOrderDescriptions}`,
    });

    if (addMergeNoteError) {
      return {
        success: false,
        source: "live",
        message: addMergeNoteError.message,
      };
    }

    const { error: deleteSourceLabelsError } = await supabase
      .from("request_label_links")
      .delete()
      .in("request_id", sourceOrderIds);

    if (deleteSourceLabelsError) {
      return {
        success: false,
        source: "live",
        message: deleteSourceLabelsError.message,
      };
    }

    const { error: deleteSourceRequestsError } = await supabase
      .from("customer_order_requests")
      .delete()
      .in("id", sourceOrderIds);

    if (deleteSourceRequestsError) {
      return {
        success: false,
        source: "live",
        message: deleteSourceRequestsError.message,
      };
    }

    const { error: updateTargetError } = await supabase
      .from("customer_order_requests")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.targetOrderId);

    if (updateTargetError) {
      return {
        success: false,
        source: "live",
        message: updateTargetError.message,
      };
    }

    return {
      success: true,
      source: "live",
      message: `${sourceOrderIds.length + 1} bestillinger er flettet til én kundebestilling.`,
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message: error instanceof Error ? error.message : "Ukendt fejl ved fletning af bestillinger.",
    };
  }
}
