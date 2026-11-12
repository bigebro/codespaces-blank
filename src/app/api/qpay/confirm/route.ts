import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTenantFromRequest } from "@/lib/tenant";
import { checkQPayInvoice } from "@/lib/qpay";

export const dynamic = "force-dynamic";

async function confirmInvoice(invoiceId: string, clientId: string) {
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!payment) return { status: 404, body: { success: false, error: "Invoice not found" } };
  if (payment.applied) {
    return { status: 200, body: { success: true, alreadyApplied: true, status: "paid" } };
  }

  const check = await checkQPayInvoice(invoiceId);
  if (!check.paid) {
    return { status: 200, body: { success: true, status: "pending" } };
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("subscription_end_date")
    .eq("client_id", clientId)
    .maybeSingle();
  const base = tenant?.subscription_end_date && new Date(tenant.subscription_end_date) > new Date()
    ? new Date(tenant.subscription_end_date)
    : new Date();
  base.setDate(base.getDate() + 30);

  const { data: locked } = await supabaseAdmin
    .from("payments")
    .update({
      status: "paid",
      applied: true,
      qpay_payment_id: check.paymentId,
      paid_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .eq("applied", false)
    .select("id")
    .maybeSingle();

  if (!locked) {
    return { status: 200, body: { success: true, alreadyApplied: true, status: "paid" } };
  }

  await supabaseAdmin
    .from("tenants")
    .update({ status: "active", subscription_end_date: base.toISOString() })
    .eq("client_id", clientId);

  return {
    status: 200,
    body: { success: true, status: "paid", subscription_end_date: base.toISOString() },
  };
}

export async function POST(request: Request) {
  try {
    const session = await resolveTenantFromRequest(request);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { invoice_id: invoiceId } = await request.json();
    if (!invoiceId) return NextResponse.json({ success: false, error: "invoice_id required" }, { status: 400 });
    const result = await confirmInvoice(invoiceId, session.clientId);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Confirm failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
