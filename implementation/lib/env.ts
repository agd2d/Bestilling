export function getEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function hasEnv(name: string) {
  return getEnv(name).length > 0;
}

export function isDevAuthBypassed() {
  return getEnv("DEV_BYPASS_AUTH").toLowerCase() === "true";
}

export function getEnvStatus() {
  const keys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "JOTFORM_API_KEY",
    "ORDERS_JOTFORM_FORM_ID",
    "MICROSOFT_GRAPH_TENANT_ID",
    "MICROSOFT_GRAPH_CLIENT_ID",
    "MICROSOFT_GRAPH_CLIENT_SECRET",
    "MICROSOFT_GRAPH_SENDER_USER_ID",
  ] as const;

  return keys.map((key) => ({
    key,
    present: hasEnv(key),
  }));
}
