import { supabaseAdmin } from "@/lib/supabaseAdmin";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const memoryBuckets = new Map<string, number[]>();

function memoryHit(key: string, recordFailure: boolean): { limited: boolean; remaining: number } {
  const now = Date.now();
  const prev = (memoryBuckets.get(key) || []).filter((t) => now - t < WINDOW_MS);
  const limited = prev.length >= MAX_FAILS;
  if (recordFailure && !limited) prev.push(now);
  memoryBuckets.set(key, prev);
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

  const { count, error } = await supabaseAdmin
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket)
    .eq("subject", subject)
    .gte("created_at", since);

  if (error) return memoryHit(key, failed);

  const used = count || 0;
  if (used >= MAX_FAILS) return { limited: true, remaining: 0 };

  if (failed) {
    await supabaseAdmin.from("auth_attempts").insert({ bucket, subject });
  }
  return { limited: false, remaining: MAX_FAILS - used - (failed ? 1 : 0) };
}

export function clientAddress(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
