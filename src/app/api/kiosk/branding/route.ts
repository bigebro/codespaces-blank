import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parseStoredObject } from "@/lib/storagePath";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { deviceToken } = await request.json().catch(() => ({}));
  if (!deviceToken) return NextResponse.json({ logoUrl: null }, { status: 400 });

  const { data: device } = await supabaseAdmin
    .from("kiosk_devices")
    .select("client_id")
    .eq("device_token", deviceToken)
    .eq("is_active", true)
    .maybeSingle();
  if (!device?.client_id) return NextResponse.json({ logoUrl: null }, { status: 404 });

  const { data: settings } = await supabaseAdmin
    .from("client_settings")
    .select("logo_url")
    .eq("client_id", device.client_id)
    .maybeSingle();

  const stored = settings?.logo_url || "";
  if (!stored) return NextResponse.json({ logoUrl: null });
  const parsed = parseStoredObject(stored, "brand_assets");
  if (!parsed || "external" in parsed || parsed.bucket !== "brand_assets") {
    return NextResponse.json({ logoUrl: null });
  }
  if (!parsed.path.startsWith(`${device.client_id}/`)) {
    return NextResponse.json({ logoUrl: null }, { status: 403 });
  }

  const { data } = await supabaseAdmin.storage.from("brand_assets").createSignedUrl(parsed.path, 60 * 60);
  return NextResponse.json({ logoUrl: data?.signedUrl || null });
}
