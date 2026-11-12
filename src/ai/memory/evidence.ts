import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Evidence can be marked verified only when every id belongs to this tenant. */
export async function filterEvidenceLogIds(clientId: string, rawIds: unknown) {
  const ids = Array.isArray(rawIds)
    ? rawIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];
  if (ids.length === 0) return { ids: [] as string[], verified: false };

  const { data, error } = await supabaseAdmin
    .from("inventory_logs")
    .select("id")
    .eq("client_id", clientId)
    .in("id", ids);
  if (error) throw error;

  const owned = new Set((data || []).map((row) => row.id));
  const kept = ids.filter((id) => owned.has(id));
  return { ids: kept, verified: kept.length === ids.length && kept.length > 0 };
}
