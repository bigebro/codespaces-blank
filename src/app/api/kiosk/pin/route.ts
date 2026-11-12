import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimit } from "@/lib/rateLimit";
import { hashPin, isHashedPin, pinMatches } from "@/lib/pinHash";
import { signWorkerToken } from "@/lib/kioskAuth";

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

    const pinSubject = `${deviceToken}:${workerId}`;
    const gate = await rateLimit("kiosk_pin", pinSubject, true);
    if (gate.limited) {
      return NextResponse.json(
        { valid: false, message: "Хэт олон буруу PIN. 15 минутын дараа дахин оролдоно уу." },
        { status: 429 },
      );
    }

    const { data: device } = await supabaseAdmin
      .from("kiosk_devices")
      .select("id, client_id")
      .eq("device_token", deviceToken)
      .eq("is_active", true)
      .maybeSingle();
    const { data: worker } = await supabaseAdmin
      .from("profiles")
      .select("id, client_id, pin_code")
      .eq("id", workerId)
      .maybeSingle();
    if (!device || !worker || device.client_id !== worker.client_id) {
      return NextResponse.json({ valid: false, message: "Төхөөрөмж таарахгүй байна." }, { status: 403 });
    }

    const valid = pinMatches(worker.pin_code, pin);
    if (!valid) {
      return NextResponse.json({ valid: false, message: "Буруу PIN код." }, { status: 401 });
    }
    await supabaseAdmin.from("auth_attempts").delete().eq("bucket", "kiosk_pin").eq("subject", pinSubject);
    if (!isHashedPin(worker.pin_code)) {
      await supabaseAdmin.from("profiles").update({ pin_code: hashPin(pin) }).eq("id", worker.id);
    }
    const workerToken = signWorkerToken({ did: device.id, cid: device.client_id, wid: worker.id });
    return NextResponse.json({ valid: true, workerToken });
  } catch {
    return NextResponse.json({ valid: false, message: "PIN шалгахад алдаа гарлаа." }, { status: 500 });
  }
}
