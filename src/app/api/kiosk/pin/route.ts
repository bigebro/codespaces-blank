import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { deviceKey, recordAttempt, tooManyAttempts } from "@/core/auth/tenant";

export async function POST(request: Request) {
  const body = await request.json();
  const key = deviceKey(request, String(body.deviceToken || body.workerId || ""));
  if (await tooManyAttempts(key, "pin")) {
    return NextResponse.json({ valid: false, message: "15 минутад 5 буруу оролдлого. Түр хүлээнэ үү." }, { status: 429 });
  }
  const { data, error } = await supabaseAdmin.rpc("verify_kiosk_pin", {
    target_worker_id: body.workerId,
    entered_pin: body.pin,
  });
  const valid = !error && data === true;
  await recordAttempt(key, "pin", valid);
  if (!valid) return NextResponse.json({ valid: false, message: "Буруу PIN код" }, { status: 401 });
  return NextResponse.json({ valid: true });
}
