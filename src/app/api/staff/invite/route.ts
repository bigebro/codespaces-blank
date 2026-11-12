import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await resolveTenantFromRequest(request);
  if (!session || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await supabaseAdmin
    .from("staff_invites")
    .select("id, email, phone, role, created_at, accepted_at")
    .eq("client_id", session.clientId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invites: data || [] });
}

export async function POST(request: Request) {
  const session = await resolveTenantFromRequest(request);
  if (!session || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const role = body.role === "manager" ? "manager" : "staff";
  if (!email && !phone) {
    return NextResponse.json({ error: "Имэйл эсвэл утас оруулна уу." }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("staff_invites")
    .insert({
      client_id: session.clientId,
      email: email || null,
      phone: phone || null,
      role,
      token: randomBytes(16).toString("hex"),
      invited_by: session.userId,
    })
    .select("id, email, phone, role")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invite: data });
}
