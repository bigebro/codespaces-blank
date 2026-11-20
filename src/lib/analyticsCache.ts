import { getAnalyticsData } from "./analytics";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(clientId: string, start?: string, end?: string) {
  return `${String(clientId || "").trim()}|${start || "default"}|${end || "default"}`;
}

/** Shared short-lived cache so overview, tools, and /report do not reload the same period twice. */
export async function getCachedAnalytics(
  clientId: string,
  start?: string,
  end?: string,
) {
  const key = cacheKey(clientId, start, end);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  const freshData = await getAnalyticsData(clientId, start, end);
  cache.set(key, { data: freshData, timestamp: Date.now() });
  return freshData;
}

export function clearAnalyticsCache() {
  cache.clear();
}
