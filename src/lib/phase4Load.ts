import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assemblePhase4, kioskPhase4Payload } from "@/lib/phase4";
import { ubDay } from "@/lib/ubDate";

export async function loadKioskPhase4(clientId: string, staffId: string, now = new Date()) {
  const since = new Date(now.getTime() - 90 * 86400000).toISOString();
  const today = ubDay(now);
  const [{ data: settings }, { data: logs }, { data: shifts }, { data: profiles }, { data: ingredients }] = await Promise.all([
    supabaseAdmin.from("client_settings").select("cup_check_enabled, cup_ingredient_ids, team_goal").eq("client_id", clientId).maybeSingle(),
    supabaseAdmin
      .from("inventory_logs")
      .select("id, date, type, quantity, total_cost, ingredient_id, worker_name, staff_id, shift_id, incident_type")
      .eq("client_id", clientId)
      .gte("date", since)
      .limit(5000),
    supabaseAdmin
      .from("shifts")
      .select("id, start_time, end_time, is_active, character_role")
      .eq("client_id", clientId)
      .gte("start_time", since)
      .limit(400),
    supabaseAdmin.from("profiles").select("id, full_name, email").eq("client_id", clientId),
    supabaseAdmin.from("ingredients").select("id, name, unit").eq("client_id", clientId),
  ]);
  const cupOn = settings?.cup_check_enabled === true;
  const [recipes, sales] = cupOn
    ? await Promise.all([
        supabaseAdmin.from("recipes").select("product_name, ingredient_id").eq("client_id", clientId),
        supabaseAdmin.from("sales_logs").select("date, product_name, quantity_sold").eq("client_id", clientId).gte("date", since).limit(5000),
      ])
    : [{ data: [] }, { data: [] }];
  const view = assemblePhase4({
    settings,
    ingredients: ingredients || [],
    recipes: recipes.data || [],
    logs: logs || [],
    sales: sales.data || [],
    shifts: shifts || [],
    profiles: profiles || [],
    gaps: [],
    endDay: today,
    today,
    salesCoverFrom: since,
  });
  return kioskPhase4Payload(view, staffId);
}
