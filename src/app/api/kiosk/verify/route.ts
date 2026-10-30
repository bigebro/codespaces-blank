import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { deviceToken } = await request.json();
    
    if (!deviceToken) {
       return NextResponse.json({ valid: false }, { status: 400 });
    }

    // Check if the device token still exists in the database
    const { data, error } = await supabaseAdmin
      .from("kiosk_devices")
      .select("client_id")
      .eq("device_token", deviceToken)
      .maybeSingle();

    if (error || !data) {
      // If deleted from dashboard, it won't be found here
      return NextResponse.json({ valid: false });
    }

    // Optional: Update last_seen_at so you know the device is online
    await supabaseAdmin
      .from("kiosk_devices")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("device_token", deviceToken);

    return NextResponse.json({ valid: true, clientId: data.client_id });
  } catch (err) {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}