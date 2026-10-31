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
  const { data: shifts } = await supabaseAdmin
    .from("shifts")
    .select("id, character_role, start_time, end_time, is_active, pos_z_image_url, start_notes, closing_variance_score, daily_tasks_checklist")
    .ilike("client_id", clientId)
    .order("start_time", { ascending: false })
    .limit(limit);

  return shifts || [];
}