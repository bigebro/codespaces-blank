import { NextResponse } from "next/server";
import { requireKioskDevice } from "@/lib/kioskAuth";
import { getAnalyticsData } from "@/lib/analytics";
import { ubMonthStartIso } from "@/lib/ubDate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const device = await requireKioskDevice(body.deviceToken);
    if (!device) return NextResponse.json({ ok: false, message: "Төхөөрөмж идэвхгүй." }, { status: 401 });

    const data = await getAnalyticsData(device.clientId, ubMonthStartIso(), new Date().toISOString());
    const trust = data.data_trust;
    return NextResponse.json({
      ok: true,
      purchase_pct: trust.purchase_pct,
      missing: trust.missing,
      check: trust.check,
    });
  } catch (err) {
    console.error("[kiosk trust]", err);
    return NextResponse.json({ ok: false, message: "Итгэлийн тоо татаж чадсангүй." }, { status: 500 });
  }
}
