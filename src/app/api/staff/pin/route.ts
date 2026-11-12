import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashPin } from "@/lib/pinHash";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ ok: false, message: "Нэвтрээгүй байна." }, { status: 401 });
    const { data: auth } = await supabaseAdmin.auth.getUser(token);
    const user = auth.user;
    if (!user) return NextResponse.json({ ok: false, message: "Нэвтрээгүй байна." }, { status: 401 });

    const body = await request.json();
    const pin = String(body.pin || "").trim();
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ ok: false, message: "PIN 4 оронтой тоо байх ёстой." }, { status: 400 });
    }

    const { data: actor } = await supabaseAdmin
      .from("profiles")
      .select("id, client_id, role")
      .eq("id", user.id)
      .maybeSingle();
    if (!actor) return NextResponse.json({ ok: false, message: "Профайл олдсонгүй." }, { status: 403 });

    const targetId = String(body.workerId || actor.id);
    const isOwner = actor.role === "owner" || actor.role === "manager";
    if (targetId !== actor.id && !isOwner) {
      return NextResponse.json({ ok: false, message: "PIN солих эрхгүй." }, { status: 403 });
    }
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, client_id")
      .eq("id", targetId)
      .maybeSingle();
    if (!target || target.client_id !== actor.client_id) {
      return NextResponse.json({ ok: false, message: "Ажилтан олдсонгүй." }, { status: 404 });
    }

    const { error } = await supabaseAdmin.from("profiles").update({ pin_code: hashPin(pin) }).eq("id", targetId);
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[staff pin]", err);
    return NextResponse.json({ ok: false, message: "PIN хадгалж чадсангүй." }, { status: 500 });
  }
}
