import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/core/auth/tenant";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user || user.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { profileId, role } = await request.json();
  const next = String(role || "").trim();
  if (!next || next.toLowerCase() === "owner") {
    return NextResponse.json({ error: "Owner role cannot be granted here" }, { status: 400 });
  }
  const authRole = next === "manager" || next === "staff" ? next : next;
  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .eq("client_id", user.clientId)
    .maybeSingle();
  if (!target || target.role === "owner") {
    return NextResponse.json({ error: "Cannot change that profile" }, { status: 403 });
  }
  const { error } = await supabaseAdmin.from("profiles").update({ role: authRole }).eq("id", target.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
