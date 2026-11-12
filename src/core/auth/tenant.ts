import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Service-role queries must match the tenant exactly. % and _ are SQL wildcards. */
export function exactClientId(clientId: string): string {
  const id = String(clientId || "").trim();
  if (!id || id.includes("%")) throw new Error("Invalid client_id");
  return id;
}

export function assertBusinessName(name: string): string {
  const id = String(name || "").trim();
  if (id.length < 2 || id.includes("%") || id.includes("_")) {
    throw new Error("Бизнесийн нэрт % эсвэл _ тэмдэгт байж болохгүй.");
  }
  return id;
}

export function rejectMissingCron(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function requireUser(request: Request) {
  const token = (request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, client_id, role, full_name, email")
    .eq("id", data.user.id)
    .single();
  if (!profile?.client_id) return null;
  return {
    userId: data.user.id,
    email: data.user.email || profile.email || "",
    clientId: exactClientId(profile.client_id),
    role: profile.role as string,
    fullName: profile.full_name as string | null,
  };
}

export async function getTenantBilling(clientId: string) {
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("status, plan, subscription_end_date")
    .eq("client_id", exactClientId(clientId))
    .maybeSingle();
  const end = data?.subscription_end_date ? new Date(data.subscription_end_date) : null;
  const daysLeft = end ? Math.ceil((end.getTime() - Date.now()) / 86400000) : null;
  const past = data?.status === "past_due" || (end != null && end.getTime() < Date.now());
  return { past, daysLeft, plan: data?.plan || null, status: data?.status || null };
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

export async function tooManyAttempts(deviceKey: string, kind: string) {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await supabaseAdmin
    .from("kiosk_attempts")
    .select("id", { count: "exact", head: true })
    .eq("device_key", deviceKey)
    .eq("kind", kind)
    .eq("success", false)
    .gte("created_at", since);
  return (count || 0) >= MAX_FAILS;
}

export async function recordAttempt(deviceKey: string, kind: string, success: boolean) {
  await supabaseAdmin.from("kiosk_attempts").insert({ device_key: deviceKey, kind, success });
}

export function deviceKey(request: Request, fallback: string) {
  return (
    request.headers.get("x-device-id") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    fallback ||
    "unknown"
  ).slice(0, 200);
}
