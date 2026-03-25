import { hasEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

export interface ToggleOrderLabelResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
}

function canUseLiveData() {
  return hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export async function toggleOrderLabel(params: {
  requestId: string;
  labelId: string;
  selected: boolean;
}): Promise<ToggleOrderLabelResult> {
  if (!params.labelId) {
    return {
      success: false,
      source: "mock",
      message: "Label mangler.",
    };
  }

  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message: "Mock fallback: label er ikke skrevet til databasen endnu.",
    };
  }

  try {
    const supabase = createAdminClient();

    if (params.selected) {
      const { error } = await supabase.from("request_label_links").upsert(
        {
          request_id: params.requestId,
          label_id: params.labelId,
        },
        { onConflict: "request_id,label_id", ignoreDuplicates: true }
      );

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
        message: "Label er tilføjet.",
      };
    }

    const { error } = await supabase
      .from("request_label_links")
      .delete()
      .eq("request_id", params.requestId)
      .eq("label_id", params.labelId);

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
      message: "Label er fjernet.",
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message: error instanceof Error ? error.message : "Ukendt fejl ved label-opdatering.",
    };
  }
}
