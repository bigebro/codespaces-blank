// src/core/packages/pkg_operations.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateStaffPayroll, compileWorkerFraudMatrix } from "@/core/synapses/workforce.synapse";

export async function getFraudAndLeakagePackage(
  clientId: string,
  startDate?: string,
  endDate?: string
) {
  const now = new Date();
  const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = endDate || now.toISOString();

  // 1. БҮХ шаардлагатай 4 хүснэгтийг зэрэг татах
  const [
    { data: logs },
    { data: ingredients },
    { data: sales },
    { data: recipes }
  ] = await Promise.all([
    supabaseAdmin.from("inventory_logs").select("*").ilike("client_id", clientId).gte("date", start).lte("date", end),
    supabaseAdmin.from("ingredients").select("id, name, unit, unit_price, current_stock, last_counted_at").ilike("client_id", clientId),
    supabaseAdmin.from("sales_logs").select("product_name, quantity_sold").ilike("client_id", clientId).gte("date", start).lte("date", end),
    supabaseAdmin.from("recipes").select("product_name, ingredient_id, amount").ilike("client_id", clientId),
  ]);

  const ingMap = new Map((ingredients || []).map((i) => [i.id, i]));
  const itemLossMap: Record<string, { name: string; unit: string; totalLossMnt: number; qty: number }> = {};
  const logged_spoilage_items: any[] = [];

  // 2. Ил бүртгэгдсэн хаягдлууд (Logged Spoilage)
  (logs || []).forEach((log) => {
    if (["spoilage", "other"].includes(log.type)) {
      const ing = ingMap.get(log.ingredient_id);
      const name = ing ? ing.name : log.non_food_item || "Unknown";
      const unit = ing ? ing.unit : "ш";
      const loss = Math.abs(Number(log.total_cost) || 0);

      if (!itemLossMap[name]) itemLossMap[name] = { name, unit, totalLossMnt: 0, qty: 0 };
      itemLossMap[name].totalLossMnt += loss;
      itemLossMap[name].qty += Math.abs(Number(log.quantity) || 0);

      if (log.type === "spoilage") {
        logged_spoilage_items.push({
          item: name,
          quantity: Math.abs(Number(log.quantity) || 0),
          unit: unit,
          worker: log.worker_name || "Үл мэдэгдэх",
          time: log.date ? new Date(log.date).toLocaleString("mn-MN", { timeZone: "Asia/Ulaanbaatar" }) : "",
          notes: log.notes || ""
        });
      }
    }
  });

  const topWasters = Object.values(itemLossMap).sort((a, b) => b.totalLossMnt - a.totalLossMnt).slice(0, 5);
  const totalLoggedWaste = topWasters.reduce((acc, i) => acc + i.totalLossMnt, 0);
  const fraudMatrix = compileWorkerFraudMatrix(logs || []);

  // 3. Борлуулалтаас гарсан онолын зарлагыг (Theoretical Usage) тооцоолох
  const theoUsageMap = new Map<string, number>();
  (sales || []).forEach((sale) => {
    const pName = (sale.product_name || "").toLowerCase().trim();
    const pQty = Number(sale.quantity_sold) || 0;
    (recipes || []).forEach((r) => {
      if ((r.product_name || "").toLowerCase().trim() === pName) {
        const prev = theoUsageMap.get(r.ingredient_id) || 0;
        theoUsageMap.set(r.ingredient_id, prev + pQty * (Number(r.amount) || 0));
      }
    });
  });

  // 4. Далд хулгай (Unexplained Waste) болон Татварын актыг (Waste Act Items) бодитоор бодох
  let totalUnexplainedWasteMNT = 0;
  const wasteAuditItems: any[] = [];

  (ingredients || []).forEach((ing) => {
    const theoUsage = theoUsageMap.get(ing.id) || 0;
    const unitPrice = Number(ing.unit_price) || 0;

    // Тухайн барааны бүртгэгдсэн бүх хаягдал (spoilage, staff_meal, testing, other)
    const ingLogs = (logs || []).filter((l) => l.ingredient_id === ing.id);
    const knownWasteQty = ingLogs
      .filter((l) => ["spoilage", "staff_meal", "testing", "other"].includes(l.type))
      .reduce((sum, l) => sum + Math.abs(Number(l.quantity) || 0), 0);

    // Татан авалт
    const purchasedQty = ingLogs
      .filter((l) => l.type === "purchase")
      .reduce((sum, l) => sum + Math.abs(Number(l.quantity) || 0), 0);

    // Тооллогын түүх (Start ба End тооллого)
    const countLogs = ingLogs
      .filter((l) => l.type === "count")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const startStock = countLogs.length > 0 ? Number(countLogs[0].quantity) : Number(ing.current_stock) || 0;
    const endStock = countLogs.length > 1 ? Number(countLogs[countLogs.length - 1].quantity) : (countLogs.length === 1 ? Number(countLogs[0].quantity) : Number(ing.current_stock) || 0);

    const actualUsage = Math.max(0, startStock + purchasedQty - endStock);
    const rawGap = actualUsage - theoUsage;
    const unexplainedGap = Math.max(0, rawGap - knownWasteQty);
    const unexplainedCost = Math.round(unexplainedGap * unitPrice);

    if (unexplainedCost > 0) {
      totalUnexplainedWasteMNT += unexplainedCost;
    }

    // Ил хаягдал болон далд хорогдлыг Татварын актад оруулах (ТЕХ 14-р зүйл)
    if (knownWasteQty > 0 || unexplainedGap > 0) {
      const totalLossQty = knownWasteQty + unexplainedGap;
      wasteAuditItems.push({
        name: ing.name,
        unit: ing.unit,
        theo_usage: Math.round(theoUsage * 10) / 10,
        actual_usage: Math.round(actualUsage * 10) / 10,
        gap_qty: Math.round(totalLossQty * 10) / 10,
        loss_amount: Math.round(totalLossQty * unitPrice),
        cause: knownWasteQty > 0 ? "Хугацаа дууссан / Асгарсан хаягдал" : "Технологийн ууршилт, хадгалалтын далд хорогдол"
      });
    }
  });

  // 5. Цикл тооллогын явц (ABC Summary)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const countedItems = (ingredients || []).filter((i: any) => i.last_counted_at && i.last_counted_at >= thirtyDaysAgo).length;
  const uncountedItems = (ingredients || []).length - countedItems;

  return {
    totalLoggedWaste,
    totalUnexplainedWaste: totalUnexplainedWasteMNT, // 👈 100% бодитоор бодогдож гарна
    topWasters,
    crossShiftIncidents: fraudMatrix,
    logged_spoilage_items,
    waste_act_items: wasteAuditItems, // 👈 100% татварын акт үүснэ
    abc_summary: {
      total_items: (ingredients || []).length,
      counted_in_last_30_days: countedItems,
      uncounted: uncountedItems
    }
  };
}
export async function getStaffPerformancePackage(
  clientId: string,
  startDate?: string,
  endDate?: string
) {
  const now = new Date();
  const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = endDate || now.toISOString();

  const [
    { data: shifts },
    { data: profiles },
    { data: logs },
  ] = await Promise.all([
    supabaseAdmin
      .from("shifts")
      .select("*")
      .ilike("client_id", clientId)
      .gte("start_time", start)
      .lte("start_time", end),
    supabaseAdmin.from("profiles").select("*").ilike("client_id", clientId),
    supabaseAdmin.from("inventory_logs").select("*").ilike("client_id", clientId).gte("date", start).lte("date", end),
  ]);

  const payroll = calculateStaffPayroll(shifts || [], profiles || []);
  const fraudMatrix = compileWorkerFraudMatrix(logs || []);

  return { payroll, fraudMatrix };
}

export async function getShiftHandoversPackage(clientId: string, limit = 10) {
  // 1. Fetch recent shifts
  const { data: shifts } = await supabaseAdmin
    .from("shifts")
    .select("id, character_role, start_time, end_time, is_active, pos_z_image_url, start_notes, closing_variance_score, daily_tasks_checklist, closing_checklist")
    .ilike("client_id", clientId)
    .order("start_time", { ascending: false })
    .limit(limit);

  if (!shifts || shifts.length === 0) return [];

  // 2. Fetch inventory counts for this client
  const { data: countLogs } = await supabaseAdmin
    .from("inventory_logs")
    .select("id, date, ingredient_id, quantity, incident_type, notes, worker_name, ingredients(name, unit)")
    .ilike("client_id", clientId)
    .eq("type", "count")
    .order("date", { ascending: false });

  // 3. Map over shifts and correlate counts
  const enrichedShifts = shifts.map((shift) => {
    const shiftStart = new Date(shift.start_time).getTime();
    const shiftEnd = shift.end_time
      ? new Date(shift.end_time).getTime()
      : Date.now();

    // Correlate inventory_logs within shift timeframe + 1 hour buffer
    const logsInShift = (countLogs || [])
      .filter((log: any) => {
        const logTime = new Date(log.date).getTime();
        return (
          logTime >= shiftStart - 15 * 60 * 1000 &&
          logTime <= shiftEnd + 60 * 60 * 1000
        );
      })
      .map((log: any) => ({
        ingredient_id: log.ingredient_id,
        name: log.ingredients?.name || log.notes || "Тодорхойгүй бараа",
        quantity: Math.abs(parseFloat(log.quantity) || 0),
        unit: log.ingredients?.unit || "ш",
        count_category: log.incident_type || "random_count",
        counted_at: log.date,
      }));

    // Parse existing closing_checklist from shift record
    let savedChecklist = shift.closing_checklist;
    if (typeof savedChecklist === "string") {
      try {
        savedChecklist = JSON.parse(savedChecklist);
      } catch (e) {
        savedChecklist = [];
      }
    }

    const cycleItems = (Array.isArray(savedChecklist) ? savedChecklist : []).map(
      (item: any) => ({
        ...item,
        count_category: "daily_cycle_count",
      })
    );

    // Merge cycle counts and other counts while avoiding duplicates
    const countedIds = new Set(cycleItems.map((c: any) => c.ingredient_id).filter(Boolean));
    const nonDuplicateLogs = logsInShift.filter(
      (log: any) => !countedIds.has(log.ingredient_id)
    );

    const mergedCounts = [...cycleItems, ...nonDuplicateLogs];

    return {
      id: shift.id,
      worker: shift.character_role || "Ажилтан",
      start_time: shift.start_time,
      end_time: shift.end_time || "Идэвхтэй (Хаагдаагүй)",
      is_active: shift.is_active,
      pos_z_image_url: shift.pos_z_image_url,
      start_notes: shift.start_notes,
      sop_tasks_done: shift.daily_tasks_checklist,
      inventory_counts: mergedCounts,
      total_items_counted: mergedCounts.length,
    };
  });

  return enrichedShifts;
}