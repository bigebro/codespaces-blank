import { getAnalyticsData } from "./analytics";
import { supabaseAdmin } from "./supabaseAdmin";

const cache = new Map<string, { data: any; timestamp: number; stamp: string }>();
/** Short backup only. Freshness is decided by the latest inventory log, so a new row cannot stay hidden for minutes. */
const CACHE_TTL_MS = 20 * 1000;

function cacheKey(clientId: string, start?: string, end?: string) {
  return `${String(clientId || "").trim()}|${start || "default"}|${end || "default"}`;
}

async function latestLogStamp(clientId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("inventory_logs")
    .select("created_at")
    .eq("client_id", String(clientId || "").trim())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.created_at ? String(data.created_at) : "";
}

/**
 * Same numbers as the dashboard: reuse a result only when the latest inventory log
 * is unchanged. A 5-minute cache was serving stale milk waste (2100 vs 2200).
 */
export async function getCachedAnalytics(
  clientId: string,
  start?: string,
  end?: string,
) {
  const key = cacheKey(clientId, start, end);
  const stamp = await latestLogStamp(clientId);
  const cached = cache.get(key);
  if (cached && cached.stamp === stamp && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  const freshData = await getAnalyticsData(clientId, start, end);
  cache.set(key, { data: freshData, timestamp: Date.now(), stamp });
  return freshData;
}

export function clearAnalyticsCache(clientId?: string) {
  const id = String(clientId || "").trim();
  if (!id) {
    cache.clear();
    return;
  }
  for (const key of [...cache.keys()]) {
    if (key.startsWith(`${id}|`)) cache.delete(key);
  }
}
