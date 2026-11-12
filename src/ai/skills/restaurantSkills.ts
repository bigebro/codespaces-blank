import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { evaluateMenuItemEconomics } from "@/core/synapses/menu.synapse";
import { getProcurementForecastPackage } from "@/core/packages/pkg_inventory";

/** Observed Mongolian public holidays used as demand multipliers. Lunar dates included for the current seasons. */
const HOLIDAYS = new Set([
  "01-01",
  "03-08",
  "06-01",
  "07-11",
  "07-12",
  "07-13",
  "07-14",
  "07-15",
  "11-26",
  "12-29",
  "2026-02-18",
  "2026-02-19",
  "2026-02-20",
  "2027-02-07",
  "2027-02-08",
  "2027-02-09",
]);

function isHoliday(date: Date): boolean {
  const iso = date.toISOString().slice(0, 10);
  const md = iso.slice(5);
  return HOLIDAYS.has(iso) || HOLIDAYS.has(md);
}

export async function forecastDemand(clientId: string) {
  const since = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: sales }, { data: recipes }, { data: products }] = await Promise.all([
    supabaseAdmin
      .from("sales_logs")
      .select("date, product_name, quantity_sold")
      .eq("client_id", clientId)
      .gte("date", since),
    supabaseAdmin
      .from("recipes")
      .select("product_name, ingredient_id, amount")
      .eq("client_id", clientId),
    supabaseAdmin.from("products").select("name, category").eq("client_id", clientId),
  ]);

  const buckets = new Map<string, Map<number, number[]>>();
  for (const row of sales || []) {
    const name = String(row.product_name || "").trim();
    if (!name) continue;
    const dow = new Date(row.date).getUTCDay();
    if (!buckets.has(name)) buckets.set(name, new Map());
    const byDay = buckets.get(name)!;
    const list = byDay.get(dow) || [];
    list.push(Number(row.quantity_sold) || 0);
    byDay.set(dow, list);
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + i + 1);
    return d;
  });

  const byProduct = Array.from(buckets.entries()).map(([product, byDay]) => {
    const daily = days.map((date) => {
      const samples = byDay.get(date.getUTCDay()) || [];
      const avg = samples.length
        ? samples.reduce((s, n) => s + n, 0) / samples.length
        : 0;
      const units = Math.max(0, Math.round(avg * (isHoliday(date) ? 1.35 : 1)));
      return { date: date.toISOString().slice(0, 10), units, holiday: isHoliday(date) };
    });
    return {
      product,
      category: products?.find((p) => p.name === product)?.category || null,
      daily,
      totalUnits: daily.reduce((s, d) => s + d.units, 0),
    };
  });

  const prep = new Map<string, number>();
  for (const product of byProduct) {
    const lines = (recipes || []).filter(
      (r) => String(r.product_name).toLowerCase() === product.product.toLowerCase(),
    );
    for (const line of lines) {
      const add = product.totalUnits * (Number(line.amount) || 0);
      prep.set(line.ingredient_id, (prep.get(line.ingredient_id) || 0) + add);
    }
  }

  const ingredientIds = Array.from(prep.keys());
  const { data: ingredients } = ingredientIds.length
    ? await supabaseAdmin
        .from("ingredients")
        .select("id, name, unit")
        .eq("client_id", clientId)
        .in("id", ingredientIds)
    : { data: [] as { id: string; name: string; unit: string }[] };

  const prepQuantities = (ingredients || []).map((ing) => ({
    ingredientId: ing.id,
    name: ing.name,
    unit: ing.unit,
    quantity: Math.round((prep.get(ing.id) || 0) * 100) / 100,
  }));

  return { horizonDays: 7, byProduct, prepQuantities };
}

export async function menuMatrix(clientId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: products }, { data: recipes }, { data: ingredients }, { data: sales }, { data: settings }] =
    await Promise.all([
      supabaseAdmin.from("products").select("id, name, category, selling_price").eq("client_id", clientId),
      supabaseAdmin.from("recipes").select("product_name, ingredient_id, amount").eq("client_id", clientId),
      supabaseAdmin.from("ingredients").select("id, name, unit, unit_price").eq("client_id", clientId),
      supabaseAdmin.from("sales_logs").select("product_name, quantity_sold").eq("client_id", clientId).gte("date", since),
      supabaseAdmin.from("client_settings").select("category_margins").eq("client_id", clientId).maybeSingle(),
    ]);

  const salesMap: Record<string, number> = {};
  for (const row of sales || []) {
    const key = String(row.product_name || "").toLowerCase().trim();
    salesMap[key] = (salesMap[key] || 0) + (Number(row.quantity_sold) || 0);
  }

  const economics = evaluateMenuItemEconomics(
    (products || []).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category || "GENERAL",
      selling_price: Number(p.selling_price) || 0,
    })),
    recipes || [],
    (ingredients || []).map((i) => ({
      id: i.id,
      name: i.name,
      unit: i.unit,
      unit_price: Number(i.unit_price) || 0,
    })),
    salesMap,
    (settings?.category_margins || {}) as Record<string, number>,
  );

  const withSales = economics.menuPerformance.filter((item) => item.sellingPrice > 0);
  const qtyMedian = median(withSales.map((i) => i.soldQty));
  const marginMedian = median(withSales.map((i) => i.grossMarginPct));

  const matrix = withSales.map((item) => {
    const popular = item.soldQty >= qtyMedian;
    const profitable = item.grossMarginPct >= marginMedian;
    const klass = popular && profitable
      ? "star"
      : popular && !profitable
        ? "plowhorse"
        : !popular && profitable
          ? "puzzle"
          : "dog";
    return { ...item, klass };
  });

  return { qtyMedian, marginMedian, matrix, marginAlerts: economics.marginAlerts };
}

export async function proposeShiftPlan(clientId: string, laborTarget = 0.28) {
  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: sales }, { data: staff }, { data: shifts }] = await Promise.all([
    supabaseAdmin
      .from("sales_logs")
      .select("date, total_revenue")
      .eq("client_id", clientId)
      .gte("date", since),
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, base_rate, salary_type")
      .eq("client_id", clientId)
      .in("role", ["staff", "manager"]),
    supabaseAdmin
      .from("shifts")
      .select("character_role, start_time, end_time")
      .eq("client_id", clientId)
      .gte("start_time", since),
  ]);

  const byDow = new Map<number, number[]>();
  const byHour = new Map<number, number>();
  for (const row of sales || []) {
    const d = new Date(row.date);
    const list = byDow.get(d.getUTCDay()) || [];
    list.push(Number(row.total_revenue) || 0);
    byDow.set(d.getUTCDay(), list);
    const hour = d.getUTCHours();
    byHour.set(hour, (byHour.get(hour) || 0) + (Number(row.total_revenue) || 0));
  }

  const nextWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + i + 1);
    const samples = byDow.get(d.getUTCDay()) || [];
    const revenue = samples.length ? samples.reduce((s, n) => s + n, 0) / samples.length : 0;
    return { date: d.toISOString().slice(0, 10), forecastRevenue: Math.round(revenue) };
  });
  const weekRevenue = nextWeek.reduce((s, d) => s + d.forecastRevenue, 0);
  const laborBudget = Math.round(weekRevenue * laborTarget);

  const peakHours = Array.from(byHour.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([hour]) => hour)
    .sort((a, b) => a - b);

  const people = (staff || []).map((p) => ({
    id: p.id,
    name: p.full_name || "Ажилтан",
    role: p.role,
    hourlyRate: Number(p.base_rate) || 6500,
    salaryType: p.salary_type || "hourly",
  }));

  let spent = 0;
  const schedule = nextWeek.map((day) => {
    const shiftsForDay = people.slice(0, Math.min(2, people.length)).map((person, index) => {
      const hours = index === 0 ? 8 : 6;
      const cost = person.salaryType === "fixed" ? Math.round(person.hourlyRate / 30) : person.hourlyRate * hours;
      spent += cost;
      const open = peakHours[0] ?? 9;
      return {
        profileId: person.id,
        name: person.name,
        startHour: open,
        hours,
        estimatedCost: cost,
      };
    });
    return { ...day, shifts: shiftsForDay };
  });

  return {
    laborTarget,
    weekRevenue,
    laborBudget,
    estimatedLaborCost: spent,
    withinTarget: spent <= laborBudget || laborBudget === 0,
    recentShiftCount: (shifts || []).length,
    schedule,
  };
}

export async function buildPurchaseProposal(clientId: string, supplierId?: string | null) {
  const forecast = await getProcurementForecastPackage(clientId);
  const lines = (forecast.procurementOrders || []).slice(0, 25).map((item) => ({
    ingredientId: item.id,
    name: item.name,
    unit: item.unit,
    quantity: item.suggestedOrder,
    unitPrice: item.unitPrice,
    lineCost: Math.round(item.suggestedOrder * item.unitPrice),
  }));
  const totalCost = lines.reduce((s, line) => s + line.lineCost, 0);

  let supplier: { id: string; name: string; phone: string | null; email: string | null } | null = null;
  if (supplierId) {
    const { data } = await supabaseAdmin
      .from("suppliers")
      .select("id, name, phone, email")
      .eq("id", supplierId)
      .eq("client_id", clientId)
      .maybeSingle();
    supplier = data;
  }

  return { supplier, lines, totalCost };
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
