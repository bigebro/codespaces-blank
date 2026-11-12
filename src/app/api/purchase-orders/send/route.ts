import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await resolveTenantFromRequest(request);
  if (!session || session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const channel = body.channel === "sms" ? "sms" : "email";
  const { data: order } = await supabaseAdmin
    .from("purchase_orders")
    .select("id, lines, total_cost, supplier_id, status")
    .eq("id", body.orderId)
    .eq("client_id", session.clientId)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const { data: supplier } = order.supplier_id
    ? await supabaseAdmin
        .from("suppliers")
        .select("name, phone, email")
        .eq("id", order.supplier_id)
        .eq("client_id", session.clientId)
        .maybeSingle()
    : { data: null };

  const lines = Array.isArray(order.lines) ? order.lines : [];
  const text = [
    `Operlink захиалга ${order.id}`,
    ...lines.map(
      (line: { name?: string; quantity?: number; unit?: string }) =>
        `- ${line.name}: ${line.quantity} ${line.unit || ""}`,
    ),
    `Нийт: ${Number(order.total_cost || 0).toLocaleString()}₮`,
  ].join("\n");

  let delivered = false;
  if (channel === "email" && supplier?.email && process.env.SMTP_WEBHOOK_URL) {
    const res = await fetch(process.env.SMTP_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: supplier.email, subject: "Захиалга", text }),
    });
    delivered = res.ok;
  }
  if (channel === "sms" && supplier?.phone && process.env.SMS_WEBHOOK_URL) {
    const res = await fetch(process.env.SMS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: supplier.phone, text }),
    });
    delivered = res.ok;
  }

  await supabaseAdmin
    .from("purchase_orders")
    .update({ status: delivered ? "sent" : "approved", sent_via: channel })
    .eq("id", order.id);

  const href = channel === "sms"
    ? `sms:${supplier?.phone || ""}?body=${encodeURIComponent(text)}`
    : `mailto:${supplier?.email || ""}?subject=${encodeURIComponent("Захиалга")}&body=${encodeURIComponent(text)}`;

  return NextResponse.json({ delivered, href, text, supplier });
}
