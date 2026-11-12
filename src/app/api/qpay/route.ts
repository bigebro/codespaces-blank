import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTenantFromRequest } from "@/lib/tenant";
import { createQPayInvoice } from "@/lib/qpay";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await resolveTenantFromRequest(request);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (session.role !== "owner") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "Amount is required" }, { status: 400 });
    }

    const senderInvoiceNo = `INV-${session.clientId.slice(0, 12)}-${Date.now()}`;
    const invoice = await createQPayInvoice({
      clientId: session.clientId,
      amount,
      description: body.description || `Operlink 30 хоног - ${session.clientId}`,
      senderInvoiceNo,
    });

    const { error } = await supabaseAdmin.from("payments").insert({
      client_id: session.clientId,
      invoice_id: invoice.invoice_id,
      sender_invoice_no: senderInvoiceNo,
      amount,
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
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "QPay error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
