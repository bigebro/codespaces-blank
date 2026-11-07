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

  const [
    { data: logs },
    { data: ingredients },
  ] = await Promise.all([
    supabaseAdmin
      .from("inventory_logs")
      .select("*")
      .ilike("client_id", clientId)
      .gte("date", start)
      .lte("date", end),
    supabaseAdmin.from("ingredients").select("id, name, unit, unit_price").ilike("client_id", clientId),
  ]);

  const ingMap = new Map((ingredients || []).map((i) => [i.id, i]));
  const itemLossMap: Record<string, { name: string; unit: string; totalLossMnt: number; qty: number }> = {};

  (logs || []).forEach((log) => {
    if (["spoilage", "other"].includes(log.type)) {
      const ing = ingMap.get(log.ingredient_id);
      const name = ing ? ing.name : log.non_food_item || "Unknown";
      const unit = ing ? ing.unit : "ш";
      const loss = Math.abs(Number(log.total_cost) || 0);

      if (!itemLossMap[name]) itemLossMap[name] = { name, unit, totalLossMnt: 0, qty: 0 };
      itemLossMap[name].totalLossMnt += loss;
      itemLossMap[name].qty += Math.abs(Number(log.quantity) || 0);
    }
  });

  const topWasters = Object.values(itemLossMap).sort((a, b) => b.totalLossMnt - a.totalLossMnt);
  const totalLoggedWaste = topWasters.reduce((acc, i) => acc + i.totalLossMnt, 0);
  const fraudMatrix = compileWorkerFraudMatrix(logs || []);

  return {
    totalLoggedWaste,
    topWasters: topWasters.slice(0, 5),
    crossShiftIncidents: fraudMatrix,
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