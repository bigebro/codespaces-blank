const BUCKETS = ["receipts_evidence", "brand_assets"] as const;
export type StorageBucket = (typeof BUCKETS)[number];

export function parseStoredObject(
  stored: string | null | undefined,
  fallbackBucket: StorageBucket = "receipts_evidence",
): { bucket: StorageBucket; path: string } | { external: true } | null {
  const value = (stored || "").trim();
  if (!value) return null;

  for (const bucket of BUCKETS) {
    const marker = `/${bucket}/`;
    const at = value.indexOf(marker);
    if (at >= 0) {
      const path = decodeURIComponent(value.slice(at + marker.length)).split("?")[0];
      if (path) return { bucket, path };
    }
  }

  if (/^https?:\/\//i.test(value)) return { external: true };

  const path = value.split("?")[0].replace(/^\/+/, "");
  if (!path || path.includes("..")) return null;
  return { bucket: fallbackBucket, path };
}
