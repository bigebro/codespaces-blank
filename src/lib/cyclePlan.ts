import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateMatchScore } from "@/lib/autoReconcile";
import { countStreak, newestCount, pickCloseItems, sumBetween, type CycleCandidate, type CycleItem } from "@/lib/shiftCycle";

type CountRow = {
  id: string;
  ingredient_id: string;
  quantity: number;
  date: string;
  created_at?: string | null;
  shift_id?: string | null;
  worker_name?: string | null;
  incident_type?: string | null;
  notes?: string | null;
};

function clean(value: string) {
  return String(value || "").replace(/[\u00a0\s]+/g, " ").trim().toLowerCase();
}

async function fetchRows(
  build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: { message: string } | null }>,
) {
  const rows: any[] = [];
  for (let offset = 0; offset < 6000; offset += 1000) {
    const { data, error } = await build(offset, offset + 999);
    if (error) throw new Error(error.message);
    const page = data || [];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

function isCloseCount(row: CountRow) {
  return row.incident_type === "daily_cycle_count" || String(row.notes || "").startsWith("[CYCLE]");
}

export async function buildCyclePlan(clientId: string, activeShiftId?: string | null, now = new Date()) {
  const since30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const since180 = new Date(now.getTime() - 180 * 86400000).toISOString();
  const nowIso = now.toISOString();

  const [ingredients, purchases, counts, shifts] = await Promise.all([
    fetchRows((from, to) =>
      supabaseAdmin
        .from("ingredients")
        .select("id, name, unit, unit_price")
        .eq("client_id", clientId)
        .order("name", { ascending: true })
        .range(from, to),
    ),
    fetchRows((from, to) =>
      supabaseAdmin
        .from("inventory_logs")
        .select("ingredient_id, total_cost")
        .eq("client_id", clientId)
        .eq("type", "purchase")
        .gte("date", since30)
        .lte("date", nowIso)
        .range(from, to),
    ),
    fetchRows((from, to) =>
      supabaseAdmin
        .from("inventory_logs")
        .select("id, ingredient_id, quantity, date, created_at, shift_id, worker_name, incident_type, notes")
        .eq("client_id", clientId)
        .eq("type", "count")
        .gte("date", since180)
        .lte("date", nowIso)
        .order("date", { ascending: false })
        .range(from, to),
    ) as Promise<CountRow[]>,
    fetchRows((from, to) =>
      supabaseAdmin
        .from("shifts")
        .select("id, is_active, end_time, start_time")
        .eq("client_id", clientId)
        .order("start_time", { ascending: false })
        .range(from, to),
    ),
  ]);

  const purchaseValue = new Map<string, number>();
  for (const row of purchases) {
    if (!row.ingredient_id) continue;
    purchaseValue.set(row.ingredient_id, (purchaseValue.get(row.ingredient_id) || 0) + (Number(row.total_cost) || 0));
  }

  const closeGroups = new Map<string, { at: number; created: number; ids: string[] }>();
  for (const row of counts) {
    if (!row.ingredient_id || !row.shift_id || !isCloseCount(row)) continue;
    const at = new Date(row.date).getTime();
    const created = new Date(row.created_at || row.date).getTime();
    const group = closeGroups.get(row.shift_id) || { at: 0, created: 0, ids: [] };
    if (!group.ids.includes(row.ingredient_id)) group.ids.push(row.ingredient_id);
    if (at > group.at || (at === group.at && created > group.created)) {
      group.at = at;
      group.created = created;
    }
    closeGroups.set(row.shift_id, group);
  }
  const closeShifts = [...closeGroups.entries()].sort((a, b) => b[1].at - a[1].at || b[1].created - a[1].created);
  const previousIds = closeShifts[0]?.[1].ids || [];

  const candidates: CycleCandidate[] = ingredients
    .filter((row) => row.id && row.name)
    .map((row) => {
      const index = closeShifts.findIndex((group) => group[1].ids.includes(row.id));
      return {
        id: row.id,
        purchaseValue30d: purchaseValue.get(row.id) || 0,
        shiftsSinceCount: index === -1 ? closeShifts.length + 1 : index,
      };
    });
  const pickedIds = pickCloseItems(candidates, previousIds);
  const pickedSet = new Set(pickedIds);

  const closedShifts = [...shifts]
    .filter((shift) => shift && shift.is_active === false)
    .sort((a, b) => new Date(b.end_time || b.start_time || 0).getTime() - new Date(a.end_time || a.start_time || 0).getTime());
  const countedShiftIds = new Set(closeShifts.map((group) => group[0]));
  const streak = countStreak(closedShifts.map((shift) => ({ closed: true, hadCount: countedShiftIds.has(shift.id) })));

  const byIngredient = new Map<string, CountRow[]>();
  for (const row of counts) {
    if (!row.ingredient_id) continue;
    const list = byIngredient.get(row.ingredient_id) || [];
    list.push(row);
    byIngredient.set(row.ingredient_id, list);
  }

  const lastCloseId = closeShifts[0]?.[0] || null;
  const lastCloseRows = counts.filter((row) => row.shift_id && row.shift_id === lastCloseId && isCloseCount(row));
  const openingIds = [...new Set(lastCloseRows.map((row) => row.ingredient_id).filter(Boolean))];
  const alreadyOpened = activeShiftId
    ? counts.some((row) => row.shift_id === activeShiftId && row.incident_type === "opening_recount")
    : false;

  const focusIds = [...new Set([...pickedIds, ...(alreadyOpened ? [] : openingIds)])];
  const baselines = focusIds.map((id) => {
    const history = (byIngredient.get(id) || []).map((row) => ({
      ...row,
      qty: Number(row.quantity) || 0,
    }));
    const previous = newestCount(history);
    return { id, previous };
  });
  const earliest = baselines
    .map((row) => row.previous?.date)
    .filter((date): date is string => Boolean(date))
    .sort()[0];

  const [purchaseRows, sales, recipes] = earliest
    ? await Promise.all([
        fetchRows((from, to) =>
          supabaseAdmin
            .from("inventory_logs")
            .select("ingredient_id, quantity, date")
            .eq("client_id", clientId)
            .eq("type", "purchase")
            .gt("date", earliest)
            .lte("date", nowIso)
            .range(from, to),
        ),
        fetchRows((from, to) =>
          supabaseAdmin
            .from("sales_logs")
            .select("product_name, quantity_sold, date")
            .eq("client_id", clientId)
            .gt("date", earliest)
            .lte("date", nowIso)
            .range(from, to),
        ),
        fetchRows((from, to) =>
          supabaseAdmin
            .from("recipes")
            .select("product_name, ingredient_id, amount")
            .eq("client_id", clientId)
            .in("ingredient_id", focusIds.length ? focusIds : ["00000000-0000-0000-0000-000000000000"])
            .range(from, to),
        ),
      ])
    : [[], [], []];

  const ingredientById = new Map(ingredients.map((row) => [row.id, row]));

  function usageSince(ingredientId: string, from: string | null) {
    if (!from) return 0;
    const mine = recipes.filter((recipe) => recipe.ingredient_id === ingredientId);
    return sales.reduce((sum, sale) => {
      if (!sale.date) return sum;
      const at = new Date(sale.date).getTime();
      if (at <= new Date(from).getTime() || at > now.getTime()) return sum;
      const sold = Number(sale.quantity_sold) || 0;
      const exact = mine.find((recipe) => clean(recipe.product_name) === clean(sale.product_name));
      if (exact) return sum + sold * (Number(exact.amount) || 0);
      let best = 0;
      let score = 0;
      for (const recipe of mine) {
        const next = calculateMatchScore(String(sale.product_name || ""), String(recipe.product_name || ""));
        if (next >= 0.8 && next > score) {
          score = next;
          best = Number(recipe.amount) || 0;
        }
      }
      return sum + sold * best;
    }, 0);
  }

  function toItem(id: string, closeRow?: CountRow | null): CycleItem | null {
    const ing = ingredientById.get(id);
    if (!ing) return null;
    const previous = baselines.find((row) => row.id === id)?.previous || null;
    const price = Number(ing.unit_price);
    const closeMatch = closeRow || lastCloseRows.find((row) => row.ingredient_id === id) || null;
    return {
      id,
      name: ing.name,
      unit: ing.unit || "",
      unitPrice: Number.isFinite(price) && price > 0 ? price : null,
      previousQty: previous ? Number(previous.qty) : null,
      previousAt: previous?.date || null,
      previousStaff: previous?.worker_name || null,
      purchasesSince: previous
        ? sumBetween(
            purchaseRows
              .filter((row) => row.ingredient_id === id)
              .map((row) => ({ qty: Number(row.quantity) || 0, date: row.date })),
            previous.date,
            nowIso,
          )
        : 0,
      recipeUsageSince: usageSince(id, previous?.date || null),
      closeQty: closeMatch ? Number(closeMatch.quantity) || 0 : null,
      closeStaff: closeMatch?.worker_name || null,
    };
  }

  const closeItems = pickedIds.map((id) => toItem(id)).filter((row): row is CycleItem => Boolean(row));
  const openingItems = alreadyOpened || !lastCloseId
    ? []
    : openingIds.map((id) => toItem(id, lastCloseRows.find((row) => row.ingredient_id === id))).filter((row): row is CycleItem => Boolean(row));

  return {
    streak,
    closeItems: closeItems.filter((item) => pickedSet.has(item.id)),
    opening: openingItems.length
      ? { shiftId: lastCloseId, staffName: openingItems.find((item) => item.closeStaff)?.closeStaff || null, items: openingItems }
      : null,
  };
}
