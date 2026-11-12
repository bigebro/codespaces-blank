import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireKioskWorker } from "@/lib/kioskAuth";
import { convertToIngredientUnit } from "@/lib/units";

export const dynamic = "force-dynamic";

const LOG_TYPES = new Set([
  "count",
  "purchase",
  "spoilage",
  "staff_meal",
  "testing",
  "sale",
  "other",
]);

function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

async function weightedPrice(ingredientId: string, addedQty: number, addedCost: number) {
  const { data: ing } = await supabaseAdmin
    .from("ingredients")
    .select("unit_price, current_stock")
    .eq("id", ingredientId)
    .maybeSingle();
  if (!ing || addedQty <= 0 || addedCost <= 0) return;
  const price = Number(ing.unit_price) || 0;
  const stock = Number(ing.current_stock) || 0;
  const before = Math.max(0, stock - addedQty);
  const next = price <= 0 || before <= 0 ? addedCost / addedQty : (before * price + addedCost) / (before + addedQty);
  if (!Number.isFinite(next) || next < 0) return;
  if (price > 0 && (next > price * 10 || next < price / 10)) return;
  await supabaseAdmin
    .from("ingredients")
    .update({ unit_price: Math.round(next * 100) / 100 })
    .eq("id", ingredientId);
}

async function duplicatePurchase(clientId: string, ingredientId: string, qty: number, cost: number) {
  const since = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("inventory_logs")
    .select("id, date")
    .eq("client_id", clientId)
    .eq("ingredient_id", ingredientId)
    .eq("type", "purchase")
    .eq("quantity", qty)
    .eq("total_cost", cost)
    .gte("date", since)
    .limit(1);
  return data?.[0] || null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const worker = await requireKioskWorker(body.deviceToken, body.workerToken);
    if (!worker) return fail("Киоск нэвтрэлт хүчингүй. Дахин PIN оруулна уу.", 401);

    const action = String(body.action || "");
    const nowIso = new Date().toISOString();

    if (action === "logs.insert") {
      const rows = Array.isArray(body.logs) ? body.logs : [];
      if (rows.length === 0) return fail("Хадгалах мөр алга.");
      if (rows.length > 80) return fail("Нэг дор хэт олон мөр байна.");
      const prepared = [];
      for (const row of rows) {
        const type = String(row.type || "");
        if (!LOG_TYPES.has(type)) return fail("Буруу бүртгэлийн төрөл.");
        const when = row.date ? new Date(row.date) : new Date();
        if (Number.isNaN(when.getTime()) || when.getTime() > Date.now() + 5 * 60 * 1000) {
          return fail("Ирээдүйн огноо зөвшөөрөгдөхгүй.");
        }
        let qty = Number(row.quantity);
        if (!Number.isFinite(qty)) return fail("Тоо хэмжээ буруу байна. Хоосон эсвэл үсэг бичсэн байна.");
        let ingredientId = row.ingredient_id || null;
        if (ingredientId) {
          const { data: ing } = await supabaseAdmin
            .from("ingredients")
            .select("id, unit, client_id")
            .eq("id", ingredientId)
            .maybeSingle();
          if (!ing || ing.client_id !== worker.clientId) return fail("Бараа олдсонгүй.");
          qty = convertToIngredientUnit(qty, row.input_unit, ing.unit || "");
        }
        if (type === "purchase" && !ingredientId && row.is_food !== false && row.non_food_item) {
          return fail(`"${row.non_food_item}" аль орц болохыг сонгоно уу.`, 409, { code: "needs_match" });
        }
        const cost = Number(row.total_cost) || 0;
        if (type === "purchase" && ingredientId && !body.confirmDuplicate) {
          const existing = await duplicatePurchase(worker.clientId, ingredientId, Math.abs(qty), cost);
          if (existing) {
            return fail("Сүүлийн 45 хоногт ийм орлого бүртгэгдсэн байна. Давхардаж байвал баталгаажуулна уу.", 409, {
              code: "duplicate",
            });
          }
        }
        prepared.push({
          client_id: worker.clientId,
          ingredient_id: ingredientId,
          non_food_item: ingredientId ? null : row.non_food_item || null,
          quantity: qty,
          total_cost: cost,
          type,
          payment_method: row.payment_method || null,
          image_url: row.image_url || null,
          is_ebarimt: row.is_ebarimt === true,
          incident_type: row.incident_type ?? null,
          reported_against_worker: row.reported_against_worker || null,
          notes: String(row.notes || "").slice(0, 500),
          worker_name: worker.workerName,
          created_by: worker.workerId,
          date: when.toISOString(),
        });
      }
      const { data, error } = await supabaseAdmin.from("inventory_logs").insert(prepared).select("id");
      if (error) return fail(error.message, 500);
      for (const row of prepared) {
        if (row.type === "purchase" && row.ingredient_id && row.total_cost > 0 && row.quantity > 0) {
          await weightedPrice(row.ingredient_id, row.quantity, row.total_cost);
        }
      }
      for (const alias of Array.isArray(body.aliases) ? body.aliases : []) {
        const phrase = String(alias.phrase || "").trim().toLowerCase();
        if (phrase.length < 2 || !alias.ingredient_id) continue;
        await supabaseAdmin.from("learned_aliases").upsert(
          [{ client_id: worker.clientId, phrase, ingredient_id: alias.ingredient_id }],
          { onConflict: "client_id,phrase" },
        );
      }
      return NextResponse.json({ ok: true, ids: (data || []).map((row) => row.id) });
    }

    if (action === "logs.delete") {
      const id = String(body.id || "");
      if (!id || id.startsWith("temp-")) return fail("Устгах бүртгэл олдсонгүй.");
      const { data: existing } = await supabaseAdmin
        .from("inventory_logs")
        .select("id, created_by, worker_name")
        .eq("id", id)
        .eq("client_id", worker.clientId)
        .maybeSingle();
      if (!existing) return fail("Устгах бүртгэл олдсонгүй.");
      const owns =
        existing.created_by === worker.workerId ||
        (!existing.created_by && existing.worker_name === worker.workerName);
      if (!owns) return fail("Зөвхөн өөрийн бүртгэлийг буцаана.", 403);
      const { error } = await supabaseAdmin.from("inventory_logs").delete().eq("id", id).eq("client_id", worker.clientId);
      if (error) return fail(error.message, 500);
      if (body.aliasId) {
        await supabaseAdmin.from("learned_aliases").delete().eq("id", body.aliasId).eq("client_id", worker.clientId);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "shift.start") {
      const { data, error } = await supabaseAdmin
        .from("shifts")
        .insert([
          {
            client_id: worker.clientId,
            character_role: worker.workerName,
            is_active: true,
            start_notes: String(body.start_notes || "Ээлж хэвийн хүлээн авсан.").slice(0, 500),
            start_evidence_image: body.start_evidence_image || null,
            daily_tasks_checklist: body.daily_tasks_checklist || [],
          },
        ])
        .select("*")
        .single();
      if (error || !data) return fail(error?.message || "Ээлж үүсгэж чадсангүй.", 500);
      return NextResponse.json({ ok: true, shift: data });
    }

    if (action === "shift.patch") {
      const id = String(body.id || "");
      const patch: Record<string, unknown> = {};
      if ("daily_tasks_checklist" in body) patch.daily_tasks_checklist = body.daily_tasks_checklist;
      const { error } = await supabaseAdmin
        .from("shifts")
        .update(patch)
        .eq("id", id)
        .eq("client_id", worker.clientId)
        .eq("is_active", true);
      if (error) return fail(error.message, 500);
      return NextResponse.json({ ok: true });
    }

    if (action === "shift.close") {
      const id = String(body.id || "");
      const counts = Array.isArray(body.counts) ? body.counts : [];
      const ids = counts.map((c: any) => String(c.ingredient_id || "")).filter(Boolean);
      if (ids.length !== counts.length) return fail("Бараа дутуу байна.");
      if (ids.length > 0) {
        const { data: own } = await supabaseAdmin.from("ingredients").select("id").eq("client_id", worker.clientId).in("id", ids);
        const ownIds = new Set((own || []).map((r: any) => r.id));
        if (ids.some((x: string) => !ownIds.has(x))) return fail("Бараа олдсонгүй.", 403);
      }
      const { data: openShift } = await supabaseAdmin.from("shifts").select("id").eq("id", id).eq("client_id", worker.clientId).eq("is_active", true).maybeSingle();
      if (!openShift) return fail("Ээлж аль хэдийн хаагдсан эсвэл олдсонгүй.", 409);
      const logs = [];
      for (const item of counts) {
        const qty = Number(item.quantity);
        if (!Number.isFinite(qty) || qty < 0) return fail("Хаалтын тоо буруу байна.");
        logs.push({
          client_id: worker.clientId,
          ingredient_id: item.ingredient_id,
          quantity: qty,
          type: "count",
          incident_type: "daily_cycle_count",
          notes: `[CYCLE] Ээлж хаалтын цикл тооллого: ${item.name || ""}`.slice(0, 500),
          worker_name: worker.workerName,
          created_by: worker.workerId,
          date: nowIso,
        });
      }
      const cash = Number(body.cash);
      if (Number.isFinite(cash) && cash >= 0) {
        logs.push({
          client_id: worker.clientId,
          ingredient_id: null,
          non_food_item: "Кассын хаалтын үлдэгдэл",
          quantity: 1,
          total_cost: cash,
          type: "count",
          payment_method: "cash",
          notes: `Кассын тоолсон бэлэн мөнгө: ${cash}`,
          worker_name: worker.workerName,
          created_by: worker.workerId,
          date: nowIso,
        });
      }
      const { error: logError } = await supabaseAdmin.from("inventory_logs").insert(logs);
      if (logError) return fail(logError.message, 500);
      const { error: shiftError } = await supabaseAdmin
        .from("shifts")
        .update({
          is_active: false,
          end_time: nowIso,
          pos_z_image_url: body.pos_z_image_url || null,
          closing_checklist: body.closing_checklist || [],
        })
        .eq("id", id)
        .eq("client_id", worker.clientId);
      if (shiftError) return fail(shiftError.message, 500);
      return NextResponse.json({ ok: true });
    }

    if (action === "ingredient.create") {
      const name = String(body.name || "").trim();
      const unit = ["ш", "мл", "гр"].includes(body.unit) ? body.unit : "ш";
      const qty = Number(body.qty);
      const cost = Number(body.cost) || 0;
      if (!name || !Number.isFinite(qty) || qty <= 0) return fail("Шинэ барааны нэр, тоо буруу.");
      const { data: existing } = await supabaseAdmin
        .from("ingredients")
        .select("id, name")
        .eq("client_id", worker.clientId)
        .ilike("name", name)
        .maybeSingle();
      if (existing) return fail(`"${existing.name}" аль хэдийн бүртгэлтэй.`, 409);
      const unitPrice = cost > 0 ? Math.round((cost / qty) * 100) / 100 : 0;
      const { data: created, error } = await supabaseAdmin
        .from("ingredients")
        .insert([{ client_id: worker.clientId, name, unit, unit_price: unitPrice, current_stock: 0 }])
        .select("id")
        .single();
      if (error || !created) return fail(error?.message || "Бараа үүсгэж чадсангүй.", 500);
      const { data: log, error: logError } = await supabaseAdmin
        .from("inventory_logs")
        .insert([
          {
            client_id: worker.clientId,
            ingredient_id: created.id,
            quantity: qty,
            total_cost: cost,
            type: "purchase",
            payment_method: "bank",
            image_url: body.image_url || null,
            is_ebarimt: false,
            notes: "Kiosk дээр шинээр үүсгэж орлого авсан",
            worker_name: worker.workerName,
            created_by: worker.workerId,
            date: nowIso,
          },
        ])
        .select("id")
        .single();
      if (logError) return fail(logError.message, 500);
      const { data: fresh } = await supabaseAdmin
        .from("ingredients")
        .select("current_stock")
        .eq("id", created.id)
        .maybeSingle();
      if ((Number(fresh?.current_stock) || 0) === 0) {
        await supabaseAdmin.from("ingredients").update({ current_stock: qty }).eq("id", created.id);
      }
      return NextResponse.json({ ok: true, id: created.id, logId: log?.id });
    }

    if (action === "alias.upsert") {
      const phrase = String(body.phrase || "").trim().toLowerCase();
      if (phrase.length < 2 || !body.ingredient_id) return fail("Холбох нэр дутуу.");
      const { data, error } = await supabaseAdmin
        .from("learned_aliases")
        .upsert([{ client_id: worker.clientId, phrase, ingredient_id: body.ingredient_id }], { onConflict: "client_id,phrase" })
        .select("id")
        .single();
      if (error) return fail(error.message, 500);
      return NextResponse.json({ ok: true, id: data?.id });
    }

    return fail("Үйлдэл танигдаагүй.");
  } catch (err) {
    console.error("[kiosk ops]", err);
    return fail("Хадгалахад алдаа гарлаа.", 500);
  }
}
