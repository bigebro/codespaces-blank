import { supabaseAdmin } from "@/lib/supabaseAdmin";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const memoryBuckets = new Map<string, number[]>();

function memoryHit(key: string, recordFailure: boolean): { limited: boolean; remaining: number } {
  const now = Date.now();
  const prev = (memoryBuckets.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recordFailure) prev.push(now);
  memoryBuckets.set(key, prev);
  const limited = prev.length >= MAX_FAILS;
  return { limited, remaining: Math.max(0, MAX_FAILS - prev.length) };
}

/**
 * Max 5 failures per subject per 15 minutes.
 * Persists in `auth_attempts` when the migration is applied; falls back to
 * process memory so a missing table does not disable the limit entirely.
 */
export async function rateLimit(
  bucket: "kiosk_pair" | "kiosk_pin",
  subject: string,
  failed: boolean,
): Promise<{ limited: boolean; remaining: number }> {
  const key = `${bucket}:${subject}`;
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  if (failed) {
    const { error: insertError } = await supabaseAdmin.from("auth_attempts").insert({ bucket, subject });
    if (insertError) return memoryHit(key, true);
  }

  const { count, error } = await supabaseAdmin
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket)
    .eq("subject", subject)
    .gte("created_at", since);

  if (error) return memoryHit(key, false);

  const used = count || 0;
  if (used >= MAX_FAILS) return { limited: true, remaining: 0 };
  return { limited: false, remaining: Math.max(0, MAX_FAILS - used) };
}

export function clientAddress(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
