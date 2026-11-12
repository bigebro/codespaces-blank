import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { exactClientId } from "@/core/auth/tenant";
import { evaluateMenuItemEconomics } from "@/core/synapses/menu.synapse";

const MN_HOLIDAYS = new Set([
  "01-01", "03-08", "06-01", "07-10", "07-11", "07-12", "07-13", "07-14", "07-15", "11-26", "12-29",
]);

function dayKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}-${day}`;
}

export async function forecastDemand(clientId: string) {
  const id = exactClientId(clientId);
  const since = new Date(Date.now() - 56 * 86400000).toISOString();
  const [{ data: sales, error }, { data: recipes, error: recipeError }, { data: ingredients, error: ingError }] = await Promise.all([
    supabaseAdmin.from("sales_logs").select("date, product_name, quantity_sold").eq("client_id", id).gte("date", since),
    supabaseAdmin.from("recipes").select("product_name, ingredient_id, amount").eq("client_id", id),
    supabaseAdmin.from("ingredients").select("id, name, unit").eq("client_id", id),
  ]);
  if (error) throw new Error(error.message);
  if (recipeError) throw new Error(recipeError.message);
  if (ingError) throw new Error(ingError.message);

  const buckets = new Map<string, number[]>();
  for (const row of sales || []) {
    const when = new Date(row.date);
    if (MN_HOLIDAYS.has(dayKey(when))) continue;
    const key = `${String(row.product_name || "").trim()}|${when.getDay()}`;
    const list = buckets.get(key) || [];
    list.push(Number(row.quantity_sold) || 0);
    buckets.set(key, list);
  }

  const ing = new Map((ingredients || []).map((i) => [i.id, i]));
  const days = Array.from({ length: 7 }, (_, n) => {
    const d = new Date();
    d.setDate(d.getDate() + n + 1);
    return d;
  });

  const products = new Map<string, { date: string; units: number; holiday: boolean }[]>();
  const prep = new Map<string, { name: string; unit: string; qty: number }>();

  for (const d of days) {
    const holiday = MN_HOLIDAYS.has(dayKey(d));
    const names = new Set((sales || []).map((s) => String(s.product_name || "").trim()).filter(Boolean));
    for (const name of names) {
      const samples = buckets.get(`${name}|${d.getDay()}`) || [];
      const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
      const units = Math.ceil(avg * (holiday ? 1.35 : 1));
      const list = products.get(name) || [];
      list.push({ date: d.toISOString().slice(0, 10), units, holiday });
      products.set(name, list);
      for (const line of recipes || []) {
        if (String(line.product_name || "").trim().toLowerCase() !== name.toLowerCase()) continue;
        const item = ing.get(line.ingredient_id);
        if (!item) continue;
        const current = prep.get(item.id) || { name: item.name, unit: item.unit, qty: 0 };
        current.qty += units * (Number(line.amount) || 0);
        prep.set(item.id, current);
      }
    }
  }

  return {
    products: Array.from(products.entries()).map(([name, daysOut]) => ({ name, days: daysOut })),
    prep: Array.from(prep.values()).map((p) => ({ ...p, qty: Math.round(p.qty * 100) / 100 })),
  };
}

export async function menuMatrix(clientId: string) {
  const id = exactClientId(clientId);
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: products }, { data: recipes }, { data: ingredients }, { data: sales }, { data: settings }] = await Promise.all([
    supabaseAdmin.from("products").select("id, name, category, selling_price").eq("client_id", id),
    supabaseAdmin.from("recipes").select("product_name, ingredient_id, amount").eq("client_id", id),
    supabaseAdmin.from("ingredients").select("id, name, unit, unit_price").eq("client_id", id),
    supabaseAdmin.from("sales_logs").select("product_name, quantity_sold").eq("client_id", id).gte("date", since),
    supabaseAdmin.from("client_settings").select("category_margins").eq("client_id", id).maybeSingle(),
  ]);
  const salesMap: Record<string, number> = {};
  for (const row of sales || []) {
    const key = String(row.product_name || "").trim().toLowerCase();
    salesMap[key] = (salesMap[key] || 0) + (Number(row.quantity_sold) || 0);
  }
  const economics = evaluateMenuItemEconomics(
    (products || []).map((p) => ({ id: p.id, name: p.name, category: p.category || "GENERAL", selling_price: Number(p.selling_price) || 0 })),
    recipes || [],
    (ingredients || []).map((i) => ({ id: i.id, name: i.name, unit: i.unit, unit_price: Number(i.unit_price) || 0 })),
    salesMap,
    (settings?.category_margins || {}) as Record<string, number>
  );
  const rows = economics.menuPerformance || [];
  const sold = rows.map((r) => r.soldQty).sort((a, b) => a - b);
  const margins = rows.map((r) => r.grossMarginPct).sort((a, b) => a - b);
  const midSold = sold[Math.floor(sold.length / 2)] || 0;
  const midMargin = margins[Math.floor(margins.length / 2)] || 0;
  return rows.map((row) => {
    const popular = row.soldQty >= midSold;
    const profitable = row.grossMarginPct >= midMargin;
    const quadrant = popular && profitable ? "star" : popular ? "plowhorse" : profitable ? "puzzle" : "dog";
    return { ...row, quadrant };
  });
}

export async function proposeShiftPlan(clientId: string, laborTargetPct = 25) {
  const id = exactClientId(clientId);
  const since = new Date(Date.now() - 28 * 86400000).toISOString();
  const [{ data: staff }, { data: sales }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, full_name, role, base_rate, salary_type").eq("client_id", id).neq("role", "owner"),
    supabaseAdmin.from("sales_logs").select("date, total_revenue").eq("client_id", id).gte("date", since),
  ]);
  const byHour = new Array(24).fill(0);
  const hourCounts = new Array(24).fill(0);
  for (const row of sales || []) {
    const hour = new Date(row.date).getHours();
    byHour[hour] += Number(row.total_revenue) || 0;
    hourCounts[hour] += 1;
  }
  const avgByHour = byHour.map((sum, hour) => (hourCounts[hour] ? sum / hourCounts[hour] : 0));
  const openHours = avgByHour
    .map((value, hour) => ({ hour, value }))
    .filter((h) => h.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .sort((a, b) => a.hour - b.hour);
  const dailySales = avgByHour.reduce((a, b) => a + b, 0);
  const laborBudget = dailySales * (laborTargetPct / 100);
  const workers = (staff || []).filter((s) => s.role !== "owner");
  const plan = [];
  let spent = 0;
  for (let day = 1; day <= 7; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);
    for (const worker of workers) {
      const rate = Number(worker.base_rate) || 6500;
      const hourly = worker.salary_type === "fixed" ? rate / 176 : rate;
      const hours = openHours.length ? Math.min(8, openHours.length) : 6;
      const cost = hourly * hours;
      if (spent + cost > laborBudget * 7 && plan.length > 0) continue;
      spent += cost;
      plan.push({
        date: date.toISOString().slice(0, 10),
        staffId: worker.id,
        name: worker.full_name || "Ажилтан",
        role: worker.role,
        startHour: openHours[0]?.hour ?? 8,
        hours,
        cost: Math.round(cost),
      });
    }
  }
  return {
    laborTargetPct,
    expectedDailySales: Math.round(dailySales),
    laborBudget: Math.round(laborBudget),
    plannedLabor: Math.round(spent),
    shifts: plan,
  };
}
