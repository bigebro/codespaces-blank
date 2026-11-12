import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTenantFromRequest } from "@/lib/tenant";
import { parseStoredObject, type StorageBucket } from "@/lib/storagePath";

export const dynamic = "force-dynamic";

async function tenantOwns(clientId: string, stored: string, path: string) {
  if (path === clientId || path.startsWith(`${clientId}/`)) return true;
  const values = Array.from(new Set([stored, path, decodeURIComponent(path)])).filter(Boolean);
  for (const value of values) {
    const { data: log } = await supabaseAdmin
      .from("inventory_logs")
      .select("id")
      .eq("client_id", clientId)
      .eq("image_url", value)
      .limit(1)
      .maybeSingle();
    if (log) return true;
    const { data: start } = await supabaseAdmin
      .from("shifts")
      .select("id")
      .eq("client_id", clientId)
      .eq("start_evidence_image", value)
      .limit(1)
      .maybeSingle();
    if (start) return true;
    const { data: z } = await supabaseAdmin
      .from("shifts")
      .select("id")
      .eq("client_id", clientId)
      .eq("pos_z_image_url", value)
      .limit(1)
      .maybeSingle();
    if (z) return true;
    const { data: logo } = await supabaseAdmin
      .from("client_settings")
      .select("client_id")
      .eq("client_id", clientId)
      .eq("logo_url", value)
      .maybeSingle();
    if (logo) return true;
  }
  return false;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const stored = String(body.stored || "");
  const deviceToken = String(body.deviceToken || "").trim();
  const parsed = parseStoredObject(stored);
  if (!parsed) return NextResponse.json({ url: null }, { status: 400 });
  if ("external" in parsed) return NextResponse.json({ url: stored });

  let clientId = "";
  if (deviceToken) {
    const { data: device } = await supabaseAdmin
      .from("kiosk_devices")
      .select("client_id")
      .eq("device_token", deviceToken)
      .eq("is_active", true)
      .maybeSingle();
    clientId = device?.client_id || "";
  } else {
    const session = await resolveTenantFromRequest(request);
    clientId = session?.clientId || "";
  }
  if (!clientId) return NextResponse.json({ url: null }, { status: 401 });

  const bucket = (body.bucket || parsed.bucket) as StorageBucket;
  const path = parsed.path;
  if (!(await tenantOwns(clientId, stored, path))) {
    return NextResponse.json({ url: null }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return NextResponse.json({ url: null }, { status: 404 });
  return NextResponse.json({ url: data.signedUrl });
}
