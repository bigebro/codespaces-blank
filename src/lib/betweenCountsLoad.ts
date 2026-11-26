import { supabaseAdmin } from "./supabaseAdmin";
import { computeBetweenCounts, lastTwoCounts, recipeUsageEvents, type BetweenCount } from "./betweenCounts";

const LOOKBACK_DAYS = 180;
const MAX_PAGES = 50;

async function fetchAll(
  build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: { message: string } | null }>,
) {
  const rows: any[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await build(page * 1000, page * 1000 + 999);
    if (error) throw new Error(error.message);
    const chunk = data || [];
    rows.push(...chunk);
    if (chunk.length < 1000) return rows;
  }
  // Дутуу өгөгдлөөр тоо гаргахгүй.
  throw new Error("Тооллого хоорондын тооцоонд өгөгдөл хэт их байна.");
}

/** Зөвхөн уншина. Бараа бүрийн сүүлийн хоёр тооллогын эхлэлээс хойшхи мөрийг нэг удаа татна. */
export async function loadBetweenCounts(clientId: string, now = new Date()) {
  const nowIso = now.toISOString();
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 86400000).toISOString();

  const [ingredients, countRows] = await Promise.all([
    fetchAll((from, to) =>
      supabaseAdmin
        .from("ingredients")
        .select("id, name, unit, unit_price")
        .eq("client_id", clientId)
        .order("name", { ascending: true })
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabaseAdmin
        .from("inventory_logs")
        .select("ingredient_id, quantity, date, created_at")
        .eq("client_id", clientId)
        .eq("type", "count")
        .gte("date", since)
        .lte("date", nowIso)
        .order("date", { ascending: false })
        .range(from, to),
    ),
  ]);

  const counts: BetweenCount[] = countRows
    .filter((row) => row.ingredient_id && row.date)
    .map((row) => ({ ingredient_id: row.ingredient_id, qty: Number(row.quantity) || 0, date: row.date, created_at: row.created_at }));

  const byIngredient = new Map<string, BetweenCount[]>();
  for (const row of counts) {
    const list = byIngredient.get(row.ingredient_id) || [];
    list.push(row);
    byIngredient.set(row.ingredient_id, list);
  }
  const starts = [...byIngredient.values()]
    .map((rows) => lastTwoCounts(rows).start?.date)
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const earliest = starts[0] ? new Date(starts[0]).toISOString() : null;

  const [logs, sales, recipes] = earliest
    ? await Promise.all([
        fetchAll((from, to) =>
          supabaseAdmin
            .from("inventory_logs")
            .select("ingredient_id, type, quantity, notes, incident_type, date")
            .eq("client_id", clientId)
            .neq("type", "count")
            .not("ingredient_id", "is", null)
            .gt("date", earliest)
            .lte("date", nowIso)
            .order("date", { ascending: true })
            .range(from, to),
        ),
        fetchAll((from, to) =>
          supabaseAdmin
            .from("sales_logs")
            .select("product_name, quantity_sold, date")
            .eq("client_id", clientId)
            .gt("date", earliest)
            .lte("date", nowIso)
            .order("date", { ascending: true })
            .range(from, to),
        ),
        fetchAll((from, to) =>
          supabaseAdmin
            .from("recipes")
            .select("product_name, ingredient_id, amount")
            .eq("client_id", clientId)
            .range(from, to),
        ),
      ])
    : [[], [], []];

  const result = computeBetweenCounts({
    ingredients: ingredients
      .filter((row) => row.id && row.name)
      .map((row) => {
        const price = Number(row.unit_price);
        return { id: row.id, name: row.name, unit: row.unit || "", unitPrice: Number.isFinite(price) && price > 0 ? price : null };
      }),
    counts,
    purchases: logs
      .filter((row) => row.type === "purchase" && row.date)
      .map((row) => ({ ingredient_id: row.ingredient_id, qty: Number(row.quantity) || 0, date: row.date })),
    usage: recipeUsageEvents(sales, recipes),
    wasteLogs: logs.filter((row) => row.type !== "purchase" && row.date),
  });
  return { ...result, generatedAt: nowIso };
}
