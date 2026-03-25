import { hasEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

export interface OrderNoteItem {
  id: string;
  requestId?: string;
  author: string;
  note: string;
  createdAt: string;
}

export interface AddOrderNoteResult {
  success: boolean;
  source: "live" | "mock";
  message: string;
}

function canUseLiveData() {
  return hasEnv("NEXT_PUBLIC_SUPABASE_URL") && hasEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export async function addOrderNote(params: {
  requestId: string;
  note: string;
  authorUserId?: string | null;
}): Promise<AddOrderNoteResult> {
  if (!params.note.trim()) {
    return {
      success: false,
      source: "mock",
      message: "Noten er tom.",
    };
  }

  if (!canUseLiveData()) {
    return {
      success: true,
      source: "mock",
      message: "Mock fallback: noten er ikke skrevet til databasen endnu.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("order_notes").insert({
      request_id: params.requestId,
      author_user_id: params.authorUserId ?? null,
      note: params.note.trim(),
    });

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
      message: "Noten er gemt i Supabase.",
    };
  } catch (error) {
    return {
      success: false,
      source: "live",
      message: error instanceof Error ? error.message : "Ukendt fejl ved noteoprettelse.",
    };
  }
}
