import { hasEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

export interface MoveOrderFlowResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
}

type FlowTarget = "created" | "sent_to_supplier";

function canUseLiveData() {
  return hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export async function moveOrderBetweenFlows(params: {
  id: string;
  targetStatus: FlowTarget;
}): Promise<MoveOrderFlowResult> {
  if (!params.id) {
    return {
      success: false,
      source: "mock",
      message: "Ordren mangler id.",
    };
  }

  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message:
        params.targetStatus === "sent_to_supplier"
          ? "Mock fallback: kundebestillingen er markeret som sendt til ordre."
          : "Mock fallback: kundebestillingen er sendt tilbage til varebestilling.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { data: lines, error: linesError } = await supabase
      .from("customer_order_request_lines")
      .select("id, line_status, needs_action")
      .eq("request_id", params.id);

    if (linesError) {
      return {
        success: false,
        source: "live",
        message: linesError.message,
      };
    }

    const requestLines = lines ?? [];

    if (params.targetStatus === "sent_to_supplier") {
      const blockingLines = requestLines.filter(
        (line) => line.needs_action || line.line_status === "draft_needed" || line.line_status === "created"
      );

      if (blockingLines.length > 0) {
        return {
          success: false,
          source: "live",
          message: "Alle varelinjer skal være afklaret, før bestillingen kan sendes til ordre.",
        };
      }
    }

    if (params.targetStatus === "created" && requestLines.length > 0) {
      const requestLineIds = requestLines.map((line) => line.id);
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
            "Bestillingen kan ikke sendes tilbage, fordi en eller flere linjer allerede indgår i en leverandørordre.",
        };
      }
    }

    const { error: updateError } = await supabase
      .from("customer_order_requests")
      .update({
        status: params.targetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

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
      message:
        params.targetStatus === "sent_to_supplier"
          ? "Kundebestillingen er sendt til ordre."
          : "Kundebestillingen er sendt tilbage til varebestilling.",
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message:
        error instanceof Error ? error.message : "Ukendt fejl ved flytning mellem flow.",
    };
  }
}
