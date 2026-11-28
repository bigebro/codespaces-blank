import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatSignupTime, sendSignupAlert } from "@/lib/signupAlert";

export const dynamic = "force-dynamic";

const FRESH_MS = 30 * 60 * 1000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { userId?: unknown };
    const userId = textOf(body?.userId);
    if (!UUID_RE.test(userId)) return NextResponse.json({ ok: true, sent: false });

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.info("[signup-alert] SUPABASE_SERVICE_ROLE_KEY unset, skipping email");
      return NextResponse.json({ ok: true, sent: false });
    }

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data.user) {
      console.error("[signup-alert] user lookup failed", error?.message || "missing");
      return NextResponse.json({ ok: true, sent: false });
    }

    const user = data.user;
    const meta = user.user_metadata ?? {};
    if (textOf(meta.invite_token) || textOf(meta.role).toLowerCase() !== "owner") {
      return NextResponse.json({ ok: true, sent: false });
    }

    const created = new Date(user.created_at);
    if (Number.isNaN(created.getTime()) || Date.now() - created.getTime() > FRESH_MS) {
      console.info("[signup-alert] user is not a fresh signup, skipping");
      return NextResponse.json({ ok: true, sent: false });
    }

    const result = await sendSignupAlert({
      cafeName: textOf(meta.client_id),
      ownerName: textOf(meta.full_name),
      phone: textOf(meta.phone),
      email: textOf(user.email),
      signedUpAt: formatSignupTime(created),
    });

    return NextResponse.json({ ok: true, sent: result === "sent" });
  } catch (err) {
    console.error("[signup-alert] failed", err instanceof Error ? err.message : "error");
    return NextResponse.json({ ok: true, sent: false });
  }
}
