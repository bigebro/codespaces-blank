import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/core/auth/tenant";

const QPAY_URL = "https://merchant.qpay.mn/v2";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user || user.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { paymentId } = await request.json();
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("client_id", user.clientId)
    .maybeSingle();
  if (!payment) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (payment.status === "paid") return NextResponse.json({ success: true, already: true });

  const username = process.env.QPAY_USERNAME;
  const password = process.env.QPAY_PASSWORD;
  if (!username || !password) return NextResponse.json({ error: "QPay is not configured" }, { status: 500 });

  const tokenRes = await fetch(`${QPAY_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const tokenJson = await tokenRes.json();
  const checkRes = await fetch(`${QPAY_URL}/payment/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenJson.access_token}` },
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: payment.invoice_id,
      offset: { page_number: 1, page_limit: 100 },
    }),
  });
  const check = await checkRes.json();
  const paid = Number(check.paid_amount || 0) >= Number(payment.amount) || (check.rows || []).some((row: { payment_status?: string }) => row.payment_status === "PAID");
  if (!paid) return NextResponse.json({ success: false, pending: true });

  const { data: locked } = await supabaseAdmin
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString(), qpay_payment_id: check.rows?.[0]?.payment_id || null })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (!locked) return NextResponse.json({ success: true, already: true });

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("subscription_end_date")
    .eq("client_id", user.clientId)
    .maybeSingle();
  const currentEnd = tenant?.subscription_end_date ? new Date(tenant.subscription_end_date) : new Date();
  const base = currentEnd.getTime() > Date.now() ? currentEnd : new Date();
  const next = new Date(base.getTime() + 30 * 86400000);
  await supabaseAdmin.from("tenants").update({
    status: "active",
    plan: payment.plan,
    subscription_end_date: next.toISOString(),
  }).eq("client_id", user.clientId);

  return NextResponse.json({ success: true, subscription_end_date: next.toISOString() });
}
