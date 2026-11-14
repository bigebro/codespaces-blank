import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ubDay } from "@/lib/ubDate";

export const dynamic = "force-dynamic";

async function ownerClient(request: Request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data: auth } = await supabaseAdmin.auth.getUser(token);
  if (!auth.user) return null;
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, client_id, role")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile?.client_id || (profile.role !== "owner" && profile.role !== "manager")) return null;
  return profile;
}

export async function POST(request: Request) {
  try {
    const actor = await ownerClient(request);
    if (!actor) return NextResponse.json({ ok: false, message: "Энэ үйлдлийг зөвхөн эзэн хийнэ." }, { status: 403 });
    const body = await request.json();
    const action = String(body.action || "");
    const clientId = actor.client_id;

    if (action === "count_task") {
      const ids = Array.isArray(body.ingredientIds) ? body.ingredientIds.map(String).filter(Boolean) : [];
      if (ids.length === 0) return NextResponse.json({ ok: false, message: "Тоолох бараа сонгогдоогүй." }, { status: 400 });
      const { data: ingredients } = await supabaseAdmin
        .from("ingredients")
        .select("id, name")
        .eq("client_id", clientId)
        .in("id", ids);
      const own = ingredients || [];
      if (own.length !== ids.length) return NextResponse.json({ ok: false, message: "Бараа олдсонгүй." }, { status: 404 });
      const { data: openTasks } = await supabaseAdmin
        .from("tasks")
        .select("id, ingredient_ids")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .eq("task_type", "count");
      const covered = new Set((openTasks || []).flatMap((row: any) => row.ingredient_ids || []));
      if (ids.every((id: string) => covered.has(id))) {
        return NextResponse.json({ ok: true, message: "Тоолох даалгавар аль хэдийн үүссэн." });
      }
      const names = own.map((row) => row.name).filter(Boolean);
      const { error } = await supabaseAdmin.from("tasks").insert([{
        client_id: clientId,
        role: "Бүх ажилтан",
        task_name: `Тоолох: ${names.join(", ")}`.slice(0, 180),
        task_type: "count",
        ingredient_ids: own.map((row) => row.id),
        weight: 10,
        is_active: true,
      }]);
      if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === "set_price") {
      const logId = String(body.logId || "");
      const totalCost = Number(body.totalCost);
      if (!logId || !Number.isFinite(totalCost) || totalCost < 0) {
        return NextResponse.json({ ok: false, message: "Үнэ буруу байна." }, { status: 400 });
      }
      const { data: log } = await supabaseAdmin
        .from("inventory_logs")
        .select("id, ingredient_id, quantity, type")
        .eq("id", logId)
        .eq("client_id", clientId)
        .maybeSingle();
      if (!log || log.type !== "purchase") return NextResponse.json({ ok: false, message: "Орлого олдсонгүй." }, { status: 404 });
      const { error } = await supabaseAdmin.from("inventory_logs").update({ total_cost: totalCost }).eq("id", logId).eq("client_id", clientId);
      if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      const qty = Math.abs(Number(log.quantity) || 0);
      if (log.ingredient_id && qty > 0 && totalCost > 0) {
        const { data: ing } = await supabaseAdmin.from("ingredients").select("unit_price").eq("id", log.ingredient_id).maybeSingle();
        if (ing && !(Number(ing.unit_price) > 0)) {
          await supabaseAdmin.from("ingredients").update({ unit_price: Math.round((totalCost / qty) * 100) / 100 }).eq("id", log.ingredient_id);
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_log") {
      const logId = String(body.logId || "");
      const { data: log } = await supabaseAdmin.from("inventory_logs").select("id").eq("id", logId).eq("client_id", clientId).maybeSingle();
      if (!log) return NextResponse.json({ ok: false, message: "Бүртгэл олдсонгүй." }, { status: 404 });
      const { error } = await supabaseAdmin.from("inventory_logs").delete().eq("id", logId).eq("client_id", clientId);
      if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === "set_date") {
      const logId = String(body.logId || "");
      const day = String(body.date || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day > ubDay(new Date())) {
        return NextResponse.json({ ok: false, message: "Огноо өнөөдрөөс хойш байж болохгүй." }, { status: 400 });
      }
      const { data: log } = await supabaseAdmin.from("inventory_logs").select("id").eq("id", logId).eq("client_id", clientId).maybeSingle();
      if (!log) return NextResponse.json({ ok: false, message: "Бүртгэл олдсонгүй." }, { status: 404 });
      const { error } = await supabaseAdmin
        .from("inventory_logs")
        .update({ date: `${day}T12:00:00+08:00` })
        .eq("id", logId)
        .eq("client_id", clientId);
      if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, message: "Үйлдэл танигдаагүй." }, { status: 400 });
  } catch (err) {
    console.error("[inventory fix]", err);
    return NextResponse.json({ ok: false, message: "Засвар хадгалагдсангүй." }, { status: 500 });
  }
}
