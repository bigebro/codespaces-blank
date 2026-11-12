import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/core/auth/tenant";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user || user.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { orderId, channel } = await request.json();
  const { data: found } = await supabaseAdmin
    .from("purchase_orders")
    .select("*")
    .eq("id", orderId)
    .eq("client_id", user.clientId)
    .maybeSingle();
  let order = found;
  if (!order) {
    const latest = await supabaseAdmin
      .from("purchase_orders")
      .select("*")
      .eq("client_id", user.clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest.data) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    order = latest.data;
  }
  const { data: supplier } = await supabaseAdmin
    .from("suppliers")
    .select("phone, email")
    .eq("client_id", user.clientId)
    .eq("name", order.supplier_name)
    .maybeSingle();
  const lines = Array.isArray(order.lines) ? order.lines : [];
  const text = [`Operlink захиалга: ${order.supplier_name}`, ...lines.map((line: { name: string; qty: number; unit?: string }) => `- ${line.name}: ${line.qty} ${line.unit || ""}`)].join("\n");
  const phone = supplier?.phone || "";
  const email = supplier?.email || "";
  if (process.env.SMS_WEBHOOK_URL && channel === "sms" && phone) {
    await fetch(process.env.SMS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: phone, text }),
    });
    return NextResponse.json({ success: true, sent: "sms" });
  }
  return NextResponse.json({
    success: true,
    sent: false,
    sms: phone ? `sms:${phone}?body=${encodeURIComponent(text)}` : null,
    mailto: email ? `mailto:${email}?subject=${encodeURIComponent("Operlink захиалга")}&body=${encodeURIComponent(text)}` : null,
  });
}
