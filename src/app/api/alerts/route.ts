import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/core/auth/tenant";
import { approveBusinessRule } from "@/ai/memory/memory.service";

async function owner(request: Request) {
  const user = await requireUser(request);
  if (!user || user.role !== "owner") return null;
  return user;
}

export async function GET(request: Request) {
  const user = await owner(request);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await supabaseAdmin
    .from("alerts")
    .select("id, kind, title, body, payload, status, created_at")
    .eq("client_id", user.clientId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alerts: data || [] });
}

export async function POST(request: Request) {
  const user = await owner(request);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const { data: alert } = await supabaseAdmin
    .from("alerts")
    .select("*")
    .eq("id", body.id)
    .eq("client_id", user.clientId)
    .eq("status", "pending")
    .maybeSingle();
  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

  if (body.decision === "reject") {
    await supabaseAdmin.from("alerts").update({ status: "rejected" }).eq("id", alert.id);
    return NextResponse.json({ success: true });
  }

  if (body.decision === "assign_task") {
    const payload = alert.payload || {};
    await supabaseAdmin.from("tasks").insert({
      client_id: user.clientId,
      role: "staff",
      task_name: alert.title,
      weight: 10,
    });
    await supabaseAdmin.from("alerts").update({ status: "approved" }).eq("id", alert.id);
    return NextResponse.json({ success: true, assigned: true, evidence: payload.evidenceLogIds || [] });
  }

  const payload = alert.payload || {};
  if (alert.kind === "price_change") {
    await supabaseAdmin.from("products").update({ selling_price: payload.proposedPrice }).eq("client_id", user.clientId).eq("name", payload.productName);
  } else if (alert.kind === "purchase_order") {
    await supabaseAdmin.from("suppliers").upsert({ client_id: user.clientId, name: payload.supplierName }, { onConflict: "client_id,name" });
    await supabaseAdmin.from("purchase_orders").insert({
      client_id: user.clientId,
      supplier_name: payload.supplierName,
      lines: payload.lines || [],
      note: payload.note || "",
      status: "approved",
    });
  } else if (alert.kind === "task") {
    await supabaseAdmin.from("tasks").insert({
      client_id: user.clientId,
      role: payload.role || "staff",
      task_name: payload.taskName,
      weight: payload.weight || 10,
    });
  } else if (alert.kind === "rule") {
    await approveBusinessRule(user.clientId, payload.topic, payload.fact);
  } else if (alert.kind === "lesson") {
    const ids = Array.isArray(payload.evidenceLogIds) ? payload.evidenceLogIds : [];
    let verified = false;
    if (ids.length) {
      const { data: rows } = await supabaseAdmin.from("inventory_logs").select("id").eq("client_id", user.clientId).in("id", ids);
      verified = (rows || []).length === ids.length;
      if (!verified) return NextResponse.json({ error: "Evidence is not from this business" }, { status: 400 });
    }
    await supabaseAdmin.from("business_experiences").insert({
      client_id: user.clientId,
      situation: payload.situation,
      action_taken: payload.actionTaken,
      outcome: payload.outcome,
      lesson: payload.lesson,
      prediction: payload.prediction,
      confidence: payload.confidence,
      status: "resolved",
      evidence_status: verified ? "verified" : "reported",
      resolved_at: new Date().toISOString(),
    });
  }

  await supabaseAdmin.from("alerts").update({ status: "approved" }).eq("id", alert.id);
  return NextResponse.json({ success: true });
}
