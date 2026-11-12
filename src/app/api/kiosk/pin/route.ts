import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const workerId = String(body.workerId || "").trim();
    const pin = String(body.pin || "").trim();
    const deviceToken = String(body.deviceToken || "").trim();
    if (!deviceToken) {
      return NextResponse.json({ valid: false, message: "Төхөөрөмжийн токен шаардлагатай." }, { status: 400 });
    }
    if (!workerId || !pin) {
      return NextResponse.json({ valid: false, message: "PIN дутуу байна." }, { status: 400 });
    }

    const gate = await rateLimit("kiosk_pin", deviceToken, false);
    if (gate.limited) {
      return NextResponse.json(
        { valid: false, message: "Хэт олон буруу PIN. 15 минутын дараа дахин оролдоно уу." },
        { status: 429 },
      );
    }

    const { data: device } = await supabaseAdmin
      .from("kiosk_devices")
      .select("client_id")
      .eq("device_token", deviceToken)
      .eq("is_active", true)
      .maybeSingle();
    const { data: worker } = await supabaseAdmin
      .from("profiles")
      .select("id, client_id, pin_code")
      .eq("id", workerId)
      .maybeSingle();
    if (!device || !worker || device.client_id !== worker.client_id) {
      await rateLimit("kiosk_pin", deviceToken, true);
      return NextResponse.json({ valid: false, message: "Төхөөрөмж таарахгүй байна." }, { status: 403 });
    }

    const { data: rpcValid, error: rpcError } = await supabaseAdmin.rpc("verify_kiosk_pin", {
      target_worker_id: workerId,
      entered_pin: pin,
    });
    const valid = !rpcError && rpcValid === true;

    if (!valid) {
      await rateLimit("kiosk_pin", deviceToken, true);
      return NextResponse.json({ valid: false, message: "Буруу PIN код." }, { status: 401 });
    }
    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false, message: "PIN шалгахад алдаа гарлаа." }, { status: 500 });
  }
}
