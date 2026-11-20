import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireKioskDevice, requireKioskWorker } from "@/lib/kioskAuth";
import { ubDayStartIso, ubDay } from "@/lib/ubDate";
import { sortLogsNewestFirst } from "@/lib/logSort";

export const dynamic = "force-dynamic";

// Өнөөдрийн бүртгэл: ажилтны id эсвэл одоогийн нэрээр. Үүрэг нэр солигдсон ч хуучин бүртгэл алга болохгүй.
async function loadTodayLogs(worker: { clientId: string; workerId: string; workerName: string }) {
  const today = ubDayStartIso(ubDay(new Date()));
  const name = worker.workerName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return supabaseAdmin
    .from("inventory_logs")
    .select("id, date, created_at, type, quantity, total_cost, notes, image_url, non_food_item, ingredient_id, ingredients(name, unit)")
    .eq("client_id", worker.clientId)
    .or(`created_by.eq.${worker.workerId},worker_name.eq."${name}"`)
    .gte("date", today)
    .order("created_at", { ascending: false })
    .order("date", { ascending: false })
    .limit(200);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.only === "logs") {
      const w = await requireKioskWorker(body.deviceToken, body.workerToken);
      if (!w) return NextResponse.json({ ok: false, message: "Киоск нэвтрэлт хүчингүй." }, { status: 401 });
      const logs = await loadTodayLogs(w);
      return NextResponse.json({ ok: true, todayLogs: sortLogsNewestFirst(logs.data || []) });
    }
    const device = await requireKioskDevice(body.deviceToken);
    if (!device) return NextResponse.json({ ok: false, message: "Төхөөрөмж идэвхгүй." }, { status: 401 });

    const [{ data: translations }, { data: staff }, worker] = await Promise.all([
      supabaseAdmin.from("learned_translations").select("original_text, translated_text").eq("client_id", device.clientId),
      supabaseAdmin.from("profiles").select("id, full_name, role, email, client_id").eq("client_id", device.clientId).order("full_name", { ascending: true }),
      body.workerToken ? requireKioskWorker(body.deviceToken, body.workerToken, device) : Promise.resolve(null),
    ]);
    const base = {
      ok: true,
      clientId: device.clientId,
      staff: (staff || []).map((row) => ({
        id: row.id,
        full_name: row.full_name,
        role: row.role,
        email: row.email,
        client_id: row.client_id,
      })),
      translations: translations || [],
    };
    if (!worker) return NextResponse.json(base);

    const today = ubDayStartIso(ubDay(new Date()));
    const todayUtc = new Date(today).toISOString();
    const [ingredients, aliases, recipes, tasks, shift, todayLogs] = await Promise.all([
      supabaseAdmin
        .from("ingredients")
        .select("id, name, unit, current_stock, is_critical, last_counted_at, client_id, is_suspicious_promoted, promoted_until, unit_price")
        .eq("client_id", worker.clientId)
        .order("name", { ascending: true }),
      supabaseAdmin.from("learned_aliases").select("id, phrase, ingredient_id").eq("client_id", worker.clientId),
      supabaseAdmin
        .from("recipes")
        .select("product_name, amount, ingredient_id, ingredients(name, unit)")
        .eq("client_id", worker.clientId),
      supabaseAdmin.from("tasks").select("*").eq("client_id", worker.clientId).eq("is_active", true),
      supabaseAdmin
        .from("shifts")
        .select("id, daily_tasks_checklist, character_role, is_active, start_time")
        .eq("client_id", worker.clientId)
        .or(`start_time.gte."${todayUtc}",is_active.eq.true`),
      loadTodayLogs(worker),
    ]);

    return NextResponse.json({
      ...base,
      worker,
      ingredients: ingredients.data || [],
      aliases: aliases.data || [],
      recipes: recipes.data || [],
      tasks: tasks.data || [],
      todayShifts: shift.data || [],
      activeShift:
        (shift.data || []).find(
          (row: { is_active?: boolean; character_role?: string }) =>
            row.is_active && row.character_role === worker.workerName,
        ) || null,
      todayLogs: sortLogsNewestFirst(todayLogs.data || []),
    });
  } catch (err) {
    console.error("[kiosk bootstrap]", err);
    return NextResponse.json({ ok: false, message: "Киоск дата татаж чадсангүй." }, { status: 500 });
  }
}
