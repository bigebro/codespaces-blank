import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { deviceToken } = await request.json().catch(() => ({}));
  if (!deviceToken) return NextResponse.json({ logoUrl: null }, { status: 400 });

  const { data: device } = await supabaseAdmin
    .from("kiosk_devices")
    .select("client_id")
    .eq("device_token", deviceToken)
    .maybeSingle();
  if (!device?.client_id) return NextResponse.json({ logoUrl: null }, { status: 404 });

  const { data: settings } = await supabaseAdmin
    .from("client_settings")
    .select("logo_url")
    .eq("client_id", device.client_id)
    .maybeSingle();

  const stored = settings?.logo_url || "";
  if (!stored) return NextResponse.json({ logoUrl: null });
  if (stored.startsWith("http") && !stored.includes("/storage/v1/object/")) {
    return NextResponse.json({ logoUrl: stored });
  }

  const path = stored.includes("/storage/v1/object/")
    ? decodeURIComponent(stored.split("/receipts_evidence/")[1] || "").split("?")[0]
    : stored;
  const { data } = await supabaseAdmin.storage
    .from("receipts_evidence")
    .createSignedUrl(path, 60 * 60);
  return NextResponse.json({ logoUrl: data?.signedUrl || null });
}
