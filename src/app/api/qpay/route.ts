import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTenantFromRequest } from "@/lib/tenant";
import { createQPayInvoice } from "@/lib/qpay";
import { quotePlan } from "@/lib/planPrices";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await resolveTenantFromRequest(request);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (session.role !== "owner") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const quote = quotePlan(String(body.plan || ""), String(body.cycle || "monthly"));
    if (!quote) {
      return NextResponse.json({ success: false, error: "Unknown plan" }, { status: 400 });
    }

    const senderInvoiceNo = `INV-${session.clientId.slice(0, 12)}-${Date.now()}`;
    const invoice = await createQPayInvoice({
      clientId: session.clientId,
      amount: quote.amount,
      description: `Operlink ${quote.plan} ${quote.days} хоног - ${session.clientId}`,
      senderInvoiceNo,
    });

    const { error } = await supabaseAdmin.from("payments").insert({
      client_id: session.clientId,
      invoice_id: invoice.invoice_id,
      sender_invoice_no: senderInvoiceNo,
      amount: quote.amount,
      plan: quote.plan,
      period_days: quote.days,
      status: "pending",
      applied: false,
    });
    if (error) throw error;

    return NextResponse.json({
      success: true,
      invoice_id: invoice.invoice_id,
      qr_text: invoice.qr_text,
      qr_image: invoice.qr_image,
      deep_links: invoice.urls,
      amount: quote.amount,
      plan: quote.plan,
      days: quote.days,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "QPay error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
