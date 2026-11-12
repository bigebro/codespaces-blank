import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/core/auth/tenant";

const QPAY_URL = "https://merchant.qpay.mn/v2";
const PLANS: Record<string, number> = {
  starter: 300000,
  professional: 600000,
};

async function getQPayToken() {
  const username = process.env.QPAY_USERNAME;
  const password = process.env.QPAY_PASSWORD;
  if (!username || !password || !process.env.QPAY_INVOICE_CODE) {
    throw new Error("QPay is not configured");
  }
  const res = await fetch(`${QPAY_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("QPay login failed");
  return data.access_token as string;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user || user.role !== "owner") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const plan = body.plan === "starter" ? "starter" : "professional";
    const amount = PLANS[plan];
    const token = await getQPayToken();
    const senderInvoiceNo = `INV-${Date.now()}`;
    const invoiceRes = await fetch(`${QPAY_URL}/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        invoice_code: process.env.QPAY_INVOICE_CODE,
        sender_invoice_no: senderInvoiceNo,
        invoice_receiver_code: user.clientId,
        invoice_description: `Operlink ${plan} - ${user.clientId}`,
        amount,
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/dashboard`,
      }),
    });
    const invoice = await invoiceRes.json();
    if (!invoice.invoice_id) {
      return NextResponse.json({ success: false, error: "QPay invoice failed" }, { status: 502 });
    }
    const { data: payment, error } = await supabaseAdmin.from("payments").insert({
      client_id: user.clientId,
      invoice_id: invoice.invoice_id,
      sender_invoice_no: senderInvoiceNo,
      amount,
      plan,
      status: "pending",
    }).select("id").single();
    if (error) throw error;
    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      invoice_id: invoice.invoice_id,
      qr_text: invoice.qr_text,
      qr_image: invoice.qr_image,
      deep_links: invoice.urls,
      amount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "QPay error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
