import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pairingCode = (body.pairingCode || body.code || "").trim();
    // ⚡ 1. NEW: Extract the device info sent from the tablet
    const deviceInfo = body.deviceInfo || "Үл мэдэгдэх төхөөрөмж";

    if (!pairingCode || pairingCode.length < 6) {
      return NextResponse.json(
        { success: false, message: "6 оронтой холболтын кодыг зөв оруулна уу." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data: device, error: findError } = await supabaseAdmin
      .from("kiosk_devices")
      .select("id, client_id, device_name, device_token")
      .eq("pairing_code", pairingCode)
      .eq("is_active", true)
      .gte("pairing_expires_at", nowIso)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ success: false, message: `Баазын алдаа: ${findError.message}` }, { status: 500 });
    }

    if (!device) {
      return NextResponse.json({
          success: false,
          message: "Холболтын код буруу эсвэл 15 минутын хугацаа нь дууссан байна. Дахин код авна уу.",
        }, { status: 404 });
    }




    // ⚡ 2. Update the device_name in the database with the real iPad/iPhone name
    await supabaseAdmin
      .from("kiosk_devices")
      .update({
        pairing_code: null,
        pairing_expires_at: null,
        last_seen_at: nowIso,
        device_name: deviceInfo // <--- Overwrites dummy name with real name
      })
      .eq("id", device.id);

      //⚡ 3. Broadcast live event to Dashboard immediately!
    const channel = supabaseAdmin.channel(`kiosk_events_${device.client_id}`);
    await channel.send({
      type: "broadcast",
      event: "device_paired",
      payload: { deviceId: device.id, deviceName: deviceInfo },
    });
    supabaseAdmin.removeChannel(channel);



    return NextResponse.json({
      success: true,
      deviceToken: device.device_token,
      clientId: device.client_id,
      deviceName: deviceInfo, // Return the real name
      message: `"${deviceInfo}" төхөөрөмж амжилттай холбогдлоо!`,
    });
  } catch (err: any) {
    console.error("Kiosk pairing error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Серверийн алдаа гарлаа." },
      { status: 500 }
    );
  }
}