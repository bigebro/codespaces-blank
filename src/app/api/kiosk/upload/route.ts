import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const deviceToken = String(form.get("deviceToken") || "").trim();
  const folder = String(form.get("folder") || "logs").replace(/[^a-z0-9_-]/gi, "") || "logs";
  const file = form.get("file");
  if (!deviceToken) {
    return NextResponse.json({ error: "deviceToken required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const { data: device } = await supabaseAdmin
    .from("kiosk_devices")
    .select("client_id")
    .eq("device_token", deviceToken)
    .eq("is_active", true)
    .maybeSingle();
  if (!device?.client_id) {
    return NextResponse.json({ error: "Unknown device" }, { status: 403 });
  }

  const path = `${device.client_id}/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage.from("receipts_evidence").upload(path, bytes, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path });
}
