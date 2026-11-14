import { supabaseAdmin } from './supabaseAdmin';
import { calculateMatchScore, transliterate } from './autoReconcile';
import { ubDay, ubMonthStartIso } from './ubDate';

function addCalendarDays(day: string, days: number) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

async function fetchPaged(
  build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: { message: string } | null }>,
) {
  const rows: any[] = [];
  for (let offset = 0; offset < 20000; offset += 1000) {
    const { data, error } = await build(offset, offset + 999);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return { data: rows };
}

function duplicatePurchase(rows: Array<{ id: string; qty: number; cost: number; date: string; notes: string }>) {
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const apart = Math.abs(new Date(rows[i].date).getTime() - new Date(rows[j].date).getTime());
      if (Math.abs(rows[i].qty - rows[j].qty) < 0.001 && apart <= 3 * 86400000) {
        return { a: rows[i], b: rows[j] };
      }
    }
  }
  return null;
}

function gradeIngredient(item: any, endDay: string, price: number) {
  const inPeriod = item.in_period_log || item.purchased !== 0 || item.theoretical > 0 || (item.purchase_value || 0) > 0;
  if (!inPeriod) return null;
  const reasons: string[] = [];
  if (!item.has_start) reasons.push("Эхний тооллого алга");
  if (!item.has_end) reasons.push("Эцсийн тооллого алга");
  if (item.future_log_id) reasons.push("Ирээдүйн огноотой бүртгэл");
  if (item.no_price) reasons.push("Үнэгүй худалдан авалт");
  const duplicate = duplicatePurchase(item.purchases || []);
  if (duplicate) reasons.push("Давхардсан орлого байж болзошгүй");
  const lateEnd = Boolean(item.has_end && item.end_count_date && ubDay(item.end_count_date) > addCalendarDays(endDay, 7));
  if (lateEnd) reasons.push("Эцсийн тооллого хугацаа дууссанаас 7 хоногоос хойш хийгдсэн");

  let actualQty: number | null = null;
  let gapQty: number | null = null;
  let far = false;
  if (item.has_start && item.has_end) {
    actualQty = Number(item.start) + Number(item.purchased) - Number(item.end);
    gapQty = actualQty - Number(item.theoretical);
    const scale = Math.max(Math.abs(Number(item.theoretical)), Math.abs(actualQty));
    if (scale > 0.5 && Math.abs(gapQty) / scale > 0.3) {
      far = true;
      reasons.push("Тооллого хүлээгдэж байснаас 30%-иас их зөрсөн");
    }
  }

  let status: "Verified" | "Check" | "Missing" = "Verified";
  if (!item.has_start || !item.has_end) status = "Missing";
  else if (reasons.length > 0) status = "Check";

  let action: "count" | "price" | "duplicate" | "date" | null = null;
  if (status !== "Verified") {
    if (!item.has_start || !item.has_end) action = "count";
    else if (item.future_log_id) action = "date";
    else if (item.no_price) action = "price";
    else if (duplicate) action = "duplicate";
    else action = "count";
  }

  const actualMoney = actualQty == null ? 0 : actualQty * price;
  const theoMoney = Number(item.theoretical) * price;
  return {
    ingredient_id: item.id,
    name: item.name,
    unit: item.unit,
    status,
    reasons,
    action,
    purchase_value: Number(item.purchase_value) || 0,
    actual_qty: actualQty,
    theoretical_qty: Number(item.theoretical) || 0,
    gap_qty: gapQty,
    gap_money: actualQty == null ? null : actualMoney - theoMoney,
    actual_money: actualMoney,
    theo_money: theoMoney,
    price_log_id: item.price_log_id || null,
    future_log_id: item.future_log_id || null,
    duplicate,
    far,
  };
}

function cleanString(str: string) {
  return String(str || "").replace(/[\u00a0\s]+/g, " ").trim();
}

function getSimilarity(s1: string, s2: string): number {
  let longer = s1.toLowerCase().trim();
  let shorter = s2.toLowerCase().trim();
  if (longer.length < shorter.length) {
    let temp = longer;
    longer = shorter;
    shorter = temp;
  }
  let longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  let costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longerLength - costs[shorter.length]) / parseFloat(longerLength.toString());
}

export async function getAnalyticsData(
  clientId: string = 'SF Coffee',
  startDate?: string,
  endDate?: string
) {
  const now = new Date();
  const defaultStart = ubMonthStartIso();
  const defaultEnd = now.toISOString();

  const finalStartDate = startDate || defaultStart;
  const finalEndDate = endDate || defaultEnd;
    const afterLimit = new Date(new Date(finalEndDate).getTime() + 45 * 86400000).toISOString();
  // 1. ОГНООНЫ ШҮҮЛТҮҮРТЭЙ ДАТА ТАТАЛТ
// Replace the Promise.all at the top of getAnalyticsData with this optimized version:
  const [
    { data: rawIngredients },
    { data: rawRecipes },
    { data: rawInventoryLogs },
    { data: rawSales },
    { data: rawShifts },
    { data: rawProducts },
    { data: rawProfiles },
    { data: rawFixedAssets },
    { data: rawFixedOpex },
    { data: rawSettings },
    { data: rawAfterLogs },
    { data: rawAfterSales },
  ] = await Promise.all([
    // OPTIMIZATION: Select only needed columns to prevent Vercel Out-Of-Memory (OOM) errors
    supabaseAdmin.from("ingredients").select("id, name, unit, unit_price, current_stock, is_critical, is_suspicious_promoted, promoted_until, last_counted_at, par_level, lead_time_days, days_of_supply").eq("client_id", clientId.trim()),
    supabaseAdmin.from("recipes").select("product_name, ingredient_id, amount").eq("client_id", clientId.trim()),
    fetchPaged((from, to) =>
      supabaseAdmin
        .from("inventory_logs")
        .select("id, date, type, quantity, total_cost, notes, non_food_item, ingredient_id, worker_name, payment_method, is_ebarimt, image_url, incident_type, reported_against_worker")
        .eq("client_id", clientId.trim())
        .gte("date", new Date(new Date(finalStartDate).getTime() - 180 * 86400000).toISOString())
        .lte("date", finalEndDate)
        .order("date", { ascending: true })
        .range(from, to),
    ),
    fetchPaged((from, to) =>
      supabaseAdmin
        .from("sales_logs")
        .select("date, product_name, quantity_sold, total_revenue, payment_method")
        .eq("client_id", clientId.trim())
        .gte("date", finalStartDate)
        .lte("date", finalEndDate)
        .order("date", { ascending: true })
        .range(from, to),
    ),
    supabaseAdmin
      .from("shifts")
      .select("character_role, start_time, end_time, is_active, daily_tasks_checklist, pos_z_image_url, start_evidence_image")
      .eq("client_id", clientId.trim())
      .gte("start_time", finalStartDate)
      .order("start_time", { ascending: false })
      .limit(50),
    supabaseAdmin.from("products").select("name, selling_price, category").eq("client_id", clientId.trim()),
    supabaseAdmin
      .from("profiles")
      .select("full_name, email, role, salary_type, base_rate")
      .eq("client_id", clientId.trim()),
    supabaseAdmin.from("fixed_assets").select("name, code, purchase_date, initial_cost, useful_months").eq("client_id", clientId.trim()),
    supabaseAdmin.from("fixed_opex").select("name, category, monthly_cost").eq("client_id", clientId.trim()).eq("is_active", true),
    supabaseAdmin.from("client_settings").select("initial_cash, initial_bank, tax_mode, category_margins").eq("client_id", clientId.trim()).maybeSingle(),
    fetchPaged((from, to) =>
      supabaseAdmin
        .from("inventory_logs")
        .select("date, type, quantity, ingredient_id")
        .eq("client_id", clientId.trim())
        .gt("date", finalEndDate)
        .lte("date", afterLimit)
        .in("type", ["count", "purchase"])
        .order("date", { ascending: true })
        .range(from, to),
    ),
    fetchPaged((from, to) =>
      supabaseAdmin
        .from("sales_logs")
        .select("date, product_name, quantity_sold")
        .eq("client_id", clientId.trim())
        .gt("date", finalEndDate)
        .lte("date", afterLimit)
        .order("date", { ascending: true })
        .range(from, to),
    ),
  ]);

  if (!rawIngredients || !rawRecipes || !rawInventoryLogs || !rawSales) {
    throw new Error("Failed to fetch necessary database tables");
  }

  const salesByDay: Record<string, any[]> = {};
  rawSales.forEach((s: any) => {
    if (!s.date) return;
    const day = ubDay(s.date);
    if (!salesByDay[day]) salesByDay[day] = [];
    salesByDay[day].push(s);
  });

  let totalRevenue = 0;
  let cashRevenue = 0;
  let bankRevenue = 0;
  let rawActualCogs = 0;
  let totalTheoCogs = 0;
  let totalWasteLoss = 0;
  let totalSurplusSavings = 0;
  let totalLoggedSpoilage = 0;
  let totalLoggedTesting = 0;
  let totalLoggedStaffMeal = 0;
  let totalLoggedOther = 0;
  let totalUnexplainedWaste = 0;

  let totalPurchasesCashPaid = 0;
  let totalPurchasesBankPaid = 0;
  let totalPurchasesWithEbarimt = 0;
  let totalPurchasesNoEbarimt = 0;
  let totalOwnerDraws = 0;

  const opexDetails: { category: string; item: string; cost: number }[] = [];
  let dynamicOpexTotal = 0;

  (rawFixedOpex || []).forEach((fo: any) => {
    const cost = parseFloat(fo.monthly_cost) || 0;
    dynamicOpexTotal += cost;
    opexDetails.push({
      category: fo.category || 'Тогтмол зардал',
      item: fo.name,
      cost: cost
    });
  });

  const productSales: Record<string, number> = {};
  const allRecipesMap: Record<string, Record<string, number>> = {};
  const master: Record<string, any> = {};
  const menuPerformance: any[] = []; 

  rawIngredients.forEach((ing: any) => {
    const nameKey = cleanString(ing.name);
    master[nameKey] = {
      id: ing.id,
      name: nameKey,
      start: 0,
      purchased: 0,
      end: parseFloat(ing.current_stock) || 0,
      live_stock: parseFloat(ing.current_stock) || 0, 
      is_critical: ing.is_critical || false, 
      is_suspicious_promoted: ing.is_suspicious_promoted || false,
      promoted_until: ing.promoted_until || null,
      last_counted_at: ing.last_counted_at || '2000-01-01T00:00:00Z', 
      theoretical: 0,
      unit_price: parseFloat(ing.unit_price) || 0,
      unit: ing.unit,
      par_level: parseFloat(ing.par_level) || 0,
      lead_time_days: parseInt(ing.lead_time_days) || 1,
      days_of_supply: parseInt(ing.days_of_supply) || 3,
      has_start: false,
      has_end: false,
      purchase_value: 0,
      purchases: [],
      future_log_id: null,
      price_log_id: null,
      no_price: false,
      in_period_log: false,
      end_count_date: null,
    };
  });

  const startDay = ubDay(finalStartDate);
  const endDay = ubDay(finalEndDate);

//fixed

// =========================================================================
  // 🎯 АГУУЛАХЫН ТООЛЛОГЫГ ЦАГ ХУГАЦААНЫ ДАРААЛЛААР ЗӨВ ТАНИХ ШИНЭ ЛОГИК
  // =========================================================================
  const itemCountsHistory: Record<string, Array<{ date: string; qty: number }>> = {};

  rawInventoryLogs.forEach((log: any) => {
    const cost = parseFloat(log.total_cost) || 0;
    const qty = parseFloat(log.quantity) || 0; 
    const logDate = log.date ? ubDay(log.date) : '';
    if (log.ingredient_id && logDate >= startDay && logDate <= endDay) {
      const touched = rawIngredients.find((i: any) => i.id === log.ingredient_id);
      const touchedKey = touched ? cleanString(touched.name) : "";
      if (touchedKey && master[touchedKey]) {
        master[touchedKey].in_period_log = true;
        if (log.date && new Date(log.date).getTime() > Date.now() + 5 * 60 * 1000) {
          master[touchedKey].future_log_id = log.id;
        }
      }
    }
    const noteText = (log.notes || "").toLowerCase();
    const isEbarimt = log.is_ebarimt !== false && !noteText.includes('баримтгүй') && !noteText.includes('зураг');
    const isCashPay = log.payment_method === 'cash' || noteText.includes('бэлэн');

    if (noteText.includes('эзний') || noteText.includes('хувийн') || noteText.includes('draw')) {
      totalOwnerDraws += cost > 0 ? cost : Math.abs(qty);
    }

    if (log.type === 'purchase') {
      if (isCashPay) totalPurchasesCashPaid += cost;
      else totalPurchasesBankPaid += cost;

      if (isEbarimt) totalPurchasesWithEbarimt += cost;
      else totalPurchasesNoEbarimt += cost;

      if (!log.ingredient_id) {
        if (logDate >= startDay && logDate <= endDay) {
          dynamicOpexTotal += cost;
          opexDetails.push({
            category: "Хүнсний бус зардал (OPEX)",
            item: `${log.non_food_item || 'Бусад зардал'} (${isEbarimt ? 'E-Barimt' : 'Баримтгүй'})`,
            cost: Math.round(cost)
          });
        }
        return;
      }

      if (logDate >= startDay && logDate <= endDay) {
        const ing = rawIngredients.find((i: any) => i.id === log.ingredient_id);
        if (ing) {
          const key = cleanString(ing.name);
          master[key].purchased += qty;
          master[key].purchase_value += cost;
          master[key].purchases.push({
            id: log.id,
            qty: Math.abs(qty),
            cost,
            date: log.date,
            notes: log.notes || "",
          });
          if (!(cost > 0) && qty !== 0) {
            master[key].no_price = true;
            if (!master[key].price_log_id) master[key].price_log_id = log.id;
          }
        }
      }
    }

    // Тооллогуудыг цуглуулах
    if (log.type === 'count' && log.ingredient_id) {
      const ing = rawIngredients.find((i: any) => i.id === log.ingredient_id);
      if (ing) {
        const key = cleanString(ing.name);
        if (!itemCountsHistory[key]) itemCountsHistory[key] = [];
        itemCountsHistory[key].push({
          date: log.date,
          qty: qty
        });
      }
    }
  });

  const afterCounts: Record<string, Array<{ date: string; qty: number }>> = {};
  const afterPurchases: Record<string, Array<{ date: string; qty: number }>> = {};
  (rawAfterLogs || []).forEach((log: any) => {
    if (!log.ingredient_id || !log.date) return;
    const ing = rawIngredients.find((i: any) => i.id === log.ingredient_id);
    if (!ing) return;
    const key = cleanString(ing.name);
    const row = { date: log.date, qty: parseFloat(log.quantity) || 0 };
    if (log.type === "count") {
      if (!afterCounts[key]) afterCounts[key] = [];
      afterCounts[key].push(row);
    } else if (log.type === "purchase") {
      if (!afterPurchases[key]) afterPurchases[key] = [];
      afterPurchases[key].push(row);
    }
  });
  for (const key of Object.keys(afterCounts)) {
    afterCounts[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

for (const key in master) {
  const history = (itemCountsHistory[key] || []).concat(afterCounts[key] || []).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const day = (d: string) => ubDay(d);
  const startCounts = history.filter((h) => day(h.date) <= startDay);
  const endCounts = history.filter((h) => day(h.date) >= endDay && new Date(h.date).getTime() <= new Date(afterLimit).getTime());

  if (startCounts.length) {
    master[key].start = startCounts[startCounts.length - 1].qty;
    master[key].has_start = true;
  } else {
    master[key].start = null;
    master[key].has_start = false;
  }

  if (endCounts.length) {
    const first = endCounts[0];
    master[key].end = first.qty;
    master[key].has_end = true;
    master[key].end_count_date = first.date;
    if (day(first.date) > endDay) master[key].next_count = first;
  } else {
    master[key].end = null;
    master[key].has_end = false;
  }
}

 

  rawRecipes.forEach((r: any) => {
    const pName = cleanString(r.product_name);
    const ing = rawIngredients.find((i: any) => i.id === r.ingredient_id);
    if (ing) {
      if (!allRecipesMap[pName]) allRecipesMap[pName] = {};
      allRecipesMap[pName][ing.name] = parseFloat(r.amount) || 0;
    }
  });

  rawSales.forEach((s: any) => {
    const rawPosName = s.product_name;
    const cleanPos = cleanString(rawPosName).toLowerCase();
    const revenue = parseFloat(s.total_revenue) || 0;
    const qty = parseInt(s.quantity_sold) || 0;

    totalRevenue += revenue;

    if (s.payment_method === 'cash') cashRevenue += revenue;
    else bankRevenue += revenue;

    // Жороо олох
    let matchedRecipeKey = Object.keys(allRecipesMap).find(rName => 
      rName.toLowerCase() === cleanPos || 
      calculateMatchScore(rawPosName, rName) >= 0.80
    );

    const finalKey = matchedRecipeKey ? matchedRecipeKey.toLowerCase() : cleanPos;
    productSales[finalKey] = (productSales[finalKey] || 0) + qty;
  });

  if (cashRevenue === 0 && bankRevenue === 0 && totalRevenue > 0) {
    bankRevenue = Math.round(totalRevenue * 0.85);
    cashRevenue = Math.round(totalRevenue * 0.15);
  }

  rawRecipes.forEach((r: any) => {
    const pName = cleanString(r.product_name);
    const qtySold = productSales[pName.toLowerCase()] || 0;
    const ing = rawIngredients.find((i: any) => i.id === r.ingredient_id);

    if (ing && parseFloat(r.amount) > 0) {
      const key = cleanString(ing.name);
      master[key].theoretical += (qtySold * parseFloat(r.amount));
    }
  });

  const dayKey = (d: string) => ubDay(d);
  const recipeQty = (productName: string, ingredientName: string) => {
    const cleanPos = cleanString(productName).toLowerCase();
    const productKey = Object.keys(allRecipesMap).find((name) => name.toLowerCase() === cleanPos);
    if (!productKey) return 0;
    const recipe = allRecipesMap[productKey];
    const found = Object.keys(recipe).find((name) => cleanString(name) === ingredientName);
    return found ? recipe[found] : 0;
  };

  for (const key in master) {
    const next = master[key].next_count;
    if (!next) continue;
    const countDay = dayKey(next.date);
    let usedAfter = 0;
    (rawAfterSales || []).forEach((sale: any) => {
      if (!sale.date) return;
      const saleDay = dayKey(sale.date);
      if (saleDay <= endDay || saleDay > countDay) return;
      usedAfter += (parseInt(sale.quantity_sold) || 0) * recipeQty(sale.product_name, key);
    });
    const boughtAfter = (afterPurchases[key] || [])
      .filter((row) => {
        const purchaseDay = dayKey(row.date);
        return purchaseDay > endDay && purchaseDay <= countDay;
      })
      .reduce((sum, row) => sum + row.qty, 0);
    // Next count is lower by what was used after the period, and higher by later purchases.
    master[key].end = next.qty + usedAfter - boughtAfter;
    master[key].count_status = "дараагийн тооллого";
  }

  const allKnownProducts = Array.from(new Set([
    ...(rawProducts || []).map((p: any) => cleanString(p.name)),
    ...rawRecipes.map((r: any) => cleanString(r.product_name))
  ]));

  allKnownProducts.forEach((pName: any) => {
    const cleanP = cleanString(pName).toLowerCase();
    
    let qtySold = productSales[cleanP] || 0;
    if (qtySold === 0) {
      const matchKey = Object.keys(productSales).find(k => calculateMatchScore(pName, k) >= 0.80);
      if (matchKey) qtySold = productSales[matchKey];
    }

    let recipeItems = rawRecipes.filter((r: any) => cleanString(r.product_name).toLowerCase() === cleanP);
    if (recipeItems.length === 0) {
      const rMatch = Array.from(new Set(rawRecipes.map((r: any) => r.product_name))).find(rName => 
        calculateMatchScore(pName, rName) >= 0.80
      );
      if (rMatch) {
        recipeItems = rawRecipes.filter((r: any) => cleanString(r.product_name).toLowerCase() === cleanString(rMatch).toLowerCase());
      }
    }

    let estCost = 0;
    const drinkRecipe = recipeItems.map((recipe: any) => {
      const ing = rawIngredients.find((i: any) => i.id === recipe.ingredient_id);
      const cost = ing ? parseFloat(recipe.amount) * (parseFloat(ing.unit_price) || 0) : 0;
      estCost += cost;
      return {
        ingredient: ing ? ing.name : 'Unknown',
        amount: parseFloat(recipe.amount),
        unit: ing ? ing.unit : '',
        cost_per_cup: Math.round(cost)
      };
    });

    const matchedProduct = rawProducts?.find(
      (p: any) => cleanString(p.name).toLowerCase() === cleanP || calculateMatchScore(p.name, pName) >= 0.80
    );
    const sellPrice = matchedProduct ? parseFloat(matchedProduct.selling_price) : 8000;
    const category = matchedProduct ? matchedProduct.category : 'General';

    menuPerformance.push({
      name: pName,
      category: category,
      sold: qtySold,
      profit: Math.round((sellPrice - estCost) * qtySold),
      unit_margin: sellPrice - estCost,
      food_cost_pct: sellPrice > 0 ? (estCost / sellPrice) * 100 : 0,
      gross_margin_pct: sellPrice > 0 ? ((sellPrice - estCost) / sellPrice) * 100 : 0,
      recipe: drinkRecipe,
      selling_price: sellPrice,           
      cost_per_item: Math.round(estCost), 
    });
  });

  const loggedEvents: Record<string, any> = {};
  Object.keys(master).forEach((name: string) => {
    loggedEvents[name] = { spoilage: 0, testing: 0, staff_meal: 0, other: 0, notes: [] };
  });

  rawInventoryLogs.forEach((log: any) => {
    if (log.type === 'purchase' && !log.ingredient_id) return;
    const ing = rawIngredients.find((i: any) => i.id === log.ingredient_id);
    if (!ing) return;
    const nameKey = cleanString(ing.name);
    const qty = Math.abs(parseFloat(log.quantity)) || 0;
    const logDate = log.date ? ubDay(log.date) : '';

    if (log.type === 'count' || log.type === 'purchase' || log.type === 'sale') return;
    if (logDate < startDay || logDate > endDay) return;

    if (log.type === 'spoilage') loggedEvents[nameKey].spoilage += qty;
    else if (log.type === 'testing') loggedEvents[nameKey].testing += qty;
    else if (log.type === 'staff_meal') loggedEvents[nameKey].staff_meal += qty;
    else loggedEvents[nameKey].other += qty;

    if (log.notes && log.notes !== `${log.type} logged manually`) {
      loggedEvents[nameKey].notes.push(log.notes);
    }
  });

  const fullInventory: any[] = [];
  const grades: any[] = [];
  const wasteAuditItems: any[] = [];

  for (const key in master) {
    const m = master[key];

    let maxDailyUsage = 0;
    for (const day in salesByDay) {
      let usageForDay = 0;
      salesByDay[day].forEach((sale: any) => {
        const pName = cleanString(sale.product_name);
        const qtySold = parseInt(sale.quantity_sold) || 0;
        const recipeAmount = allRecipesMap[pName.toLowerCase()]?.[m.name] || 0;
        usageForDay += (qtySold * recipeAmount);
      });
      if (usageForDay > maxDailyUsage) maxDailyUsage = usageForDay;
    }

    const avgDailyUsage = m.theoretical / 30;
    const avgLeadTime = m.lead_time_days || 1;
    const maxLeadTime = avgLeadTime + 2;
    const safetyStock = (maxDailyUsage * maxLeadTime) - (avgDailyUsage * avgLeadTime);
    const dynamicParLevel = (avgDailyUsage * avgLeadTime) + Math.max(0, safetyStock);
    const activeParLevel = m.par_level > 0 ? m.par_level : dynamicParLevel;
    const suggestedOrder = (avgDailyUsage * m.days_of_supply) + activeParLevel - m.live_stock;
    const finalSuggestion = Math.max(0, Math.round(suggestedOrder * 100) / 100);

    let weightedPrice = m.unit_price; 
    const ingredientPurchases = rawInventoryLogs.filter((log: any) => log.ingredient_id === m.id && log.type === 'purchase');
    let totalPurchaseCost = 0;
    ingredientPurchases.forEach((p: any) => {
      totalPurchaseCost += parseFloat(p.total_cost) || 0;
    });

    const startQty = m.has_start ? Number(m.start) : 0;
    const totalAvailableQty = startQty + m.purchased;
    if (totalAvailableQty > 0 && totalPurchaseCost > 0) {
      weightedPrice = ((startQty * m.unit_price) + totalPurchaseCost) / totalAvailableQty;
    }

    const weightedForMoney = weightedPrice || m.unit_price || 0;
    const grade = gradeIngredient(m, endDay, weightedForMoney);
    if (!grade) continue;
    grades.push(grade);

    if (grade.status === "Missing") {
      fullInventory.push({
        id: m.id,
        name: m.name,
        par_level: Math.round(activeParLevel * 100) / 100,
        suggested_order: finalSuggestion,
        theoretical: Math.round(m.theoretical * 100) / 100 || 0,
        gap: null,
        impact: 0,
        unit: m.unit,
        price: weightedForMoney,
        unit_price: weightedForMoney,
        is_waste: false,
        is_under: false,
        live_stock: m.live_stock,
        current_stock: m.live_stock,
        last_counted_at: m.last_counted_at,
        is_critical: m.is_critical,
        is_suspicious_promoted: m.is_suspicious_promoted,
        promoted_until: m.promoted_until,
        total_spend_value: grade.purchase_value,
        count_status: "Дутуу",
        grade: grade.status,
        reasons: grade.reasons,
      });
      continue;
    }

    const actual = Number(m.start) + m.purchased - Number(m.end);
    const safeActual = actual;
    const actualMoney = Math.round(grade.actual_money) || 0;
    const theoMoney = Math.round(grade.theo_money) || 0;

    if (grade.status === "Verified") {
      rawActualCogs += actualMoney;
      totalTheoCogs += theoMoney;
      if ((grade.gap_money || 0) > 1) totalWasteLoss += grade.gap_money || 0;
      else if ((grade.gap_money || 0) < -1) totalSurplusSavings += Math.abs(grade.gap_money || 0);
    }

    if (m.start === 0 && m.purchased === 0 && m.end === 0 && m.theoretical === 0) continue;

    const rawGap = actual - m.theoretical;
    const impact = Math.round(rawGap * weightedForMoney) || 0;
    const itemLogs = loggedEvents[m.name] || { spoilage: 0, testing: 0, staff_meal: 0, other: 0, notes: [] };
    const unexplainedGap = Math.max(0, rawGap - itemLogs.spoilage - itemLogs.testing - itemLogs.staff_meal - itemLogs.other);
    const unexplainedImpact = Math.round(unexplainedGap * m.unit_price) || 0;
    totalUnexplainedWaste += unexplainedImpact;
    totalLoggedSpoilage += Math.round(itemLogs.spoilage * m.unit_price) || 0;
    totalLoggedTesting += Math.round(itemLogs.testing * m.unit_price) || 0;
    totalLoggedStaffMeal += Math.round(itemLogs.staff_meal * m.unit_price) || 0;
    totalLoggedOther += Math.round(itemLogs.other * m.unit_price) || 0;

    const totalSpendValue = (m.theoretical > 0 ? m.theoretical : m.live_stock) * weightedPrice;

    fullInventory.push({
      id: m.id,
      name: m.name,
      par_level: Math.round(activeParLevel * 100) / 100, 
      suggested_order: finalSuggestion,
      theoretical: Math.round(m.theoretical * 100) / 100 || 0,
      gap: Math.round(rawGap * 100) / 100 || 0,
      impact: impact || 0,
      unit: m.unit,
      price: weightedPrice || m.unit_price || 0,
      unit_price: weightedPrice || m.unit_price || 0,
      is_waste: grade.status === "Verified" && rawGap > 0.1,
      is_under: grade.status === "Verified" && rawGap < -0.1,
      live_stock: m.live_stock,
      current_stock: m.live_stock,
      last_counted_at: m.last_counted_at,
      is_critical: m.is_critical,
      is_suspicious_promoted: m.is_suspicious_promoted,
      promoted_until: m.promoted_until,
      total_spend_value: totalSpendValue,
      count_status: grade.status === "Verified" ? "Баталгаажсан" : "Шалгах",
      grade: grade.status,
      reasons: grade.reasons,
    });

    if (itemLogs.spoilage > 0) {
      wasteAuditItems.push({
        name: m.name,
        theo_usage: Math.round(m.theoretical * 10) / 10,
        actual_usage: Math.round(safeActual * 10) / 10,
        gap_qty: Math.round(itemLogs.spoilage * 10) / 10,
        unit: m.unit,
        unit_price: m.unit_price,
        loss_amount: Math.round(itemLogs.spoilage * m.unit_price),
        cause: "Хугацаа дууссан / Чанарын шаардлага хангаагүй (Бүртгэлтэй акт)"
      });
    }

    if (unexplainedGap > 0.05 && unexplainedImpact > 10) {
      wasteAuditItems.push({
        name: m.name,
        theo_usage: Math.round(m.theoretical * 10) / 10,
        actual_usage: Math.round(safeActual * 10) / 10,
        gap_qty: Math.round(unexplainedGap * 10) / 10,
        unit: m.unit,
        unit_price: m.unit_price,
        loss_amount: unexplainedImpact,
        cause: "Тээвэрлэлт, хадгалалт, хөргөлтийн ууршилт, технологийн хорогдол"
      });
    }
  }

  // ABC Эрэмбэлэлт
  fullInventory.sort((a, b) => b.total_spend_value - a.total_spend_value);
  const totalSpendSum = fullInventory.reduce((sum, item) => sum + item.total_spend_value, 0);

  let cumulativeSpend = 0;
  fullInventory.forEach((item) => {
    cumulativeSpend += item.total_spend_value;
    const cumulativePct = totalSpendSum > 0 ? (cumulativeSpend / totalSpendSum) * 100 : 100;
    const isTemporarilyPromoted = item.is_suspicious_promoted && item.promoted_until && new Date(item.promoted_until) > now;

    if (isTemporarilyPromoted || item.is_critical || (item.total_spend_value > 0 && cumulativePct <= 80)) {
      item.abc_class = 'A';
    } else if (item.total_spend_value > 0 && cumulativePct <= 95) {
      item.abc_class = 'B';
    } else {
      item.abc_class = 'C';
    }
  });

  const N = fullInventory.length;
  const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString();
  const countedInCycleCount = fullInventory.filter((i: any) => i.last_counted_at && i.last_counted_at >= thirtyDaysAgo).length;
  const uncountedInCycleCount = N - countedInCycleCount;
  const dailyCycleQuota = Math.max(1, Math.ceil(N / 30));

  const GLOBAL_CATEGORY_MARGINS: Record<string, number> = {
    'HOT_BEVERAGE': 82,
    'COLD_BEVERAGE': 78,
    'FOOD_PREP': 68,
    'BAKERY_DESSERT': 75,
    'RETAIL_FMCG': 50,
    'GENERAL': 72
  };

  const customMargins: Record<string, number> = rawSettings?.category_margins || {};

  const getTargetMarginPct = (categoryName: string): number => {
    const cat = (categoryName || 'GENERAL').trim();
    if (customMargins[cat] !== undefined && Number(customMargins[cat]) > 0) {
      return Number(customMargins[cat]);
    }
    return GLOBAL_CATEGORY_MARGINS[cat] || GLOBAL_CATEGORY_MARGINS['GENERAL'];
  };

  const marginAlerts: any[] = [];
  (rawProducts || []).forEach((prod: any) => {
    const productRecipes = (rawRecipes || []).filter(
      (r: any) => cleanString(r.product_name).toLowerCase() === cleanString(prod.name).toLowerCase()
    );
    let currentRecipeCost = 0;

    productRecipes.forEach((r: any) => {
      const ing = fullInventory.find(
        (i: any) => i.name.toLowerCase() === cleanString(r.product_name).toLowerCase() || i.id === r.ingredient_id
      );
      const ingPrice = ing ? ing.price : (rawIngredients?.find((i: any) => i.id === r.ingredient_id)?.unit_price || 0);
      currentRecipeCost += (parseFloat(r.amount) || 0) * (parseFloat(ingPrice) || 0);
    });

    const sellingPrice = parseFloat(prod.selling_price) || 0;
    if (sellingPrice > 0 && currentRecipeCost > 0) {
      const currentMarginPct = ((sellingPrice - currentRecipeCost) / sellingPrice) * 100;
      const targetMarginPct = getTargetMarginPct(prod.category || 'General');

      if (currentMarginPct < targetMarginPct) {
        const rawSuggestedPrice = currentRecipeCost / (1 - (targetMarginPct / 100));
        const suggestedPrice = Math.ceil(rawSuggestedPrice / 500) * 500;
        
        marginAlerts.push({
          product_name: prod.name,
          category: prod.category || 'General',
          selling_price: sellingPrice,
          cost_price: Math.round(currentRecipeCost),
          current_margin_pct: currentMarginPct.toFixed(1) + "%",
          target_margin_pct: targetMarginPct + "%",
          suggested_price: suggestedPrice,
          price_gap: suggestedPrice - sellingPrice
        });
      }
    }
  });

  const workerFraudMatrix: Record<string, { totalIncidents: number; totalLossAmount: number; incidents: any[] }> = {};
  (rawInventoryLogs || []).forEach((log: any) => {
    if (log.incident_type === 'previous_shift_damage' && log.reported_against_worker) {
      const targetWorker = log.reported_against_worker.trim();
      if (!workerFraudMatrix[targetWorker]) {
        workerFraudMatrix[targetWorker] = { totalIncidents: 0, totalLossAmount: 0, incidents: [] };
      }
      const loss = Math.abs(parseFloat(log.total_cost) || 0);
      workerFraudMatrix[targetWorker].totalIncidents += 1;
      workerFraudMatrix[targetWorker].totalLossAmount += loss;
      workerFraudMatrix[targetWorker].incidents.push({
        date: log.date,
        reporter: log.worker_name,
        notes: log.notes,
        image_url: log.image_url,
        loss_amount: loss
      });
    }
  });

  let totalMonthlyDepreciation = 0;
  let fixedAssetsPurchasedThisMonthBank = 0; 
  const currentDate = new Date(finalEndDate);

  const processedFixedAssets = (rawFixedAssets || []).map((fa: any) => {
    const cost = parseFloat(fa.initial_cost) || 0;
    const months = parseInt(fa.useful_months) || 60;
    const monthlyDep = months > 0 ? Math.round(cost / months) : 0;
    const pDate = new Date(fa.purchase_date || '2025-01-01');
    
    if (pDate >= new Date(startDay) && pDate <= new Date(endDay)) {
      fixedAssetsPurchasedThisMonthBank += cost;
    }

    if (currentDate >= pDate) {
      totalMonthlyDepreciation += monthlyDep;
    }

    const monthsPassed = Math.max(0, (currentDate.getFullYear() - pDate.getFullYear()) * 12 + (currentDate.getMonth() - pDate.getMonth()));
    const accumulatedDep = Math.min(cost, monthlyDep * monthsPassed);
    const bookValue = Math.max(0, cost - accumulatedDep);

    return {
      name: fa.name,
      code: fa.code || 'FA',
      purchaseDate: fa.purchase_date,
      initialCost: cost,
      usefulMonths: months,
      monthlyDep: monthlyDep,
      accDep: accumulatedDep,
      bookValue: bookValue
    };
  });

  const isAbove300M = (totalRevenue * 12) > 300000000;
  const netRevenue = Math.round(totalRevenue / 1.1); 
  const estimatedVat10Pct = totalRevenue - netRevenue; 
  
  const verifiedRows = grades.filter((row) => row.status === "Verified");
  const verifiedActual = verifiedRows.reduce((sum, row) => sum + (Number(row.actual_money) || 0), 0);
  const verifiedTheo = verifiedRows.reduce((sum, row) => sum + (Number(row.theo_money) || 0), 0);
  const purchaseAll = grades.reduce((sum, row) => sum + (Number(row.purchase_value) || 0), 0);
  const purchaseVerified = verifiedRows.reduce((sum, row) => sum + (Number(row.purchase_value) || 0), 0);
  const dataTrust = {
    verified: verifiedRows.length,
    total: grades.length,
    purchase_pct: purchaseAll > 0
      ? Math.round((purchaseVerified / purchaseAll) * 100)
      : (grades.length ? Math.round((verifiedRows.length / grades.length) * 100) : 0),
  };
  const fixList = grades
    .filter((row) => row.status !== "Verified")
    .sort((a, b) => (b.purchase_value || 0) - (a.purchase_value || 0));

  const adjustedCogs = verifiedActual;
  const adjustedOpex = (dynamicOpexTotal + totalMonthlyDepreciation) || 0;
  
  const finalEbit = (netRevenue - adjustedCogs - adjustedOpex) || 0; 
  const simplifiedTax1Pct = Math.round(netRevenue * 0.01);
  const standardTax10Pct = finalEbit > 0 ? Math.round(finalEbit * 0.10) : 0;

  let activeTaxAmount = simplifiedTax1Pct;
  if (rawSettings?.tax_mode === 'standard_10pct' || (rawSettings?.tax_mode === 'auto' && isAbove300M)) {
    activeTaxAmount = standardTax10Pct;
  }

  const cashInitial = parseFloat(rawSettings?.initial_cash) || 0;
  const bankInitial = parseFloat(rawSettings?.initial_bank) || 0;
  const cashOutOpexCash = Math.round(adjustedOpex * 0.20);
  const cashOutOpexBank = Math.round(adjustedOpex * 0.80);
  
  const cashEndBalance = cashInitial + cashRevenue - totalPurchasesCashPaid - cashOutOpexCash - Math.round(totalOwnerDraws * 0.3);
  const bankEndBalance = bankInitial + bankRevenue - totalPurchasesBankPaid - cashOutOpexBank - Math.round(totalOwnerDraws * 0.7) - fixedAssetsPurchasedThisMonthBank;

  const staffHoursMap: Record<string, { role: string; totalMinutes: number; shiftCount: number }> = {};

  (rawShifts || []).forEach((shift: any) => {
    if (shift.start_time && shift.end_time) {
      const workerKey = shift.character_role || "Ажилтан";
      const durationMs = new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime();
      const durationMins = Math.max(0, Math.floor(durationMs / (1000 * 60)));

      if (!staffHoursMap[workerKey]) {
        staffHoursMap[workerKey] = { role: workerKey, totalMinutes: 0, shiftCount: 0 };
      }
      staffHoursMap[workerKey].totalMinutes += durationMins;
      staffHoursMap[workerKey].shiftCount += 1;
    }
  });

  const payrollSummary = Object.keys(staffHoursMap).map((worker) => {
    const data = staffHoursMap[worker];
    const matchedProfile = (rawProfiles || []).find((p: any) => 
      (p.full_name && worker.includes(p.full_name)) || (p.email && worker.includes(p.email.split('@')[0]))
    );

    const isFixed = matchedProfile?.salary_type === 'fixed';
    const rate = parseFloat(matchedProfile?.base_rate) || (isFixed ? 1200000 : 6500);

    const hoursDecimal = Math.round((data.totalMinutes / 60) * 10) / 10;
    const baseSalary = isFixed ? Math.round(rate) : Math.round(hoursDecimal * rate);
    const grossSalary = baseSalary;
    
    const ndshDeduction = Math.round(grossSalary * 0.115); 
    const employerNdsh = Math.round(grossSalary * 0.125); 
    const hhoatRaw = Math.round((grossSalary - ndshDeduction) * 0.10);
    const hhoatDeduction = Math.max(0, hhoatRaw - 30000); 
    const netTakeHome = grossSalary - ndshDeduction - hhoatDeduction;

    return {
      worker_name: worker,
      shift_count: data.shiftCount,
      total_hours: hoursDecimal,
      salary_type: isFixed ? 'fixed' : 'hourly',
      hourly_rate: rate,
      base_salary: baseSalary,
      bonus: 0,
      gross_salary: grossSalary,
      ndsh_deduction: ndshDeduction,
      employer_ndsh: employerNdsh,
      hhoat_deduction: hhoatDeduction,
      advance_paid: 0,
      net_take_home: netTakeHome
    };
  });

  const timelineLogs = rawInventoryLogs.map((log: any) => {
    const ing = rawIngredients.find((i: any) => i.id === log.ingredient_id);
    return {
      date: log.date ? new Date(log.date).toLocaleString('mn-MN', { timeZone: 'Asia/Ulaanbaatar', dateStyle: 'short' }) : 'Unknown',
      time: log.date ? new Date(log.date).toLocaleTimeString('mn-MN', { timeZone: 'Asia/Ulaanbaatar' }) : '',
      worker: log.worker_name || 'Систем / Админ',
      item: ing ? ing.name : (log.non_food_item || "Unknown"),
      qty: log.quantity,
      unit: ing ? ing.unit : 'ш',
      type: log.type,
      payment_method: log.payment_method || 'bank',
      is_ebarimt: log.is_ebarimt !== false,
      image_url: log.image_url || null,
      incident_type: log.incident_type || 'normal',
      reported_against_worker: log.reported_against_worker || null,
      notes: log.notes || ""
    };
  });

  const formattedShifts = (rawShifts || []).map((s: any) => ({
    worker: s.character_role || "Ерөнхий ажилтан",
    start_time: s.start_time ? new Date(s.start_time).toLocaleString('mn-MN', { timeZone: 'Asia/Ulaanbaatar' }) : "-",
    end_time: s.end_time ? new Date(s.end_time).toLocaleString('mn-MN', { timeZone: 'Asia/Ulaanbaatar' }) : "Хаагдаагүй (Идэвхтэй)",
    is_active: s.is_active,
    tasks_done: s.daily_tasks_checklist || [],
    pos_z_image_url: s.pos_z_image_url || null,
    start_evidence_image: s.start_evidence_image || null
  }));

  // ===========================================================================
  // 🧠 УХААЛАГ ӨРТӨГ & МЕНЮТЭЙ 100% ЯГ ТААРДАГ ЖОРГҮЙ ЦЭСИЙН ТООЛОЛТ (ЯГ 7)
  // ===========================================================================
  const effectiveActualCogs = verifiedActual;
  const effectiveNetRevenue = netRevenue;
  const effectiveGrossProfit = effectiveNetRevenue - effectiveActualCogs;
  const effectiveEbit = effectiveNetRevenue - effectiveActualCogs - adjustedOpex;
  const effectiveNetProfit = Math.round(effectiveEbit - activeTaxAmount);

  // 1. Жорын бүх нэрсийг Set болгох
  const recipeProductNamesSet = new Set(
    rawRecipes.map((r: any) => cleanString(r.product_name).toLowerCase())
  );

  // 2. Борлуулалт орсон ПОС нэрсийг цуглуулах
  const soldNamesSet = new Set(
    rawSales.map((s: any) => cleanString(s.product_name).toLowerCase())
  );
// 3. rawProducts (Меню) доторх бүтээгдэхүүнүүдээс:
  // Меню дээрхтэй 100% адилхан Крилл/Латин хөрвүүлэгчээр шалгана:
  const unmappedCount = (rawProducts || []).filter((prod: any) => {
    const pClean = cleanString(prod.name).toLowerCase();
    
    // Энэ цэс зарагдсан уу?
    const wasSold = soldNamesSet.has(pClean) || 
                    (productSales[pClean] || 0) > 0 ||
                    rawSales.some((s: any) => cleanString(s.product_name).toLowerCase() === pClean);
    if (!wasSold) return false;

    // Менюний хүснэгттэй яг адилхан шалгах:
    const pTrans = transliterate(pClean).replace(/\s+/g, "");
    const hasRecipe = (rawRecipes || []).some((r: any) => {
      const rClean = cleanString(r.product_name).toLowerCase();
      if (rClean === pClean) return true;
      const rTrans = transliterate(rClean).replace(/\s+/g, "");
      return rTrans === pTrans || getSimilarity(rTrans, pTrans) >= 0.70;
    });

    return !hasRecipe; // Жоргүй (Орц угсрах товчтой) цэсүүдийг тоолно!
  }).length;

  return {
    financial_ladder: {
      revenue: totalRevenue,
      net_revenue: netRevenue,
      actual_cogs: effectiveActualCogs,
      theo_cogs: verifiedTheo,
      verified_gap: verifiedActual - verifiedTheo,
      data_trust: dataTrust,
      is_theoretical_mode: false,
      has_unmapped_recipes: unmappedCount > 0,
      unmapped_recipes_count: unmappedCount, // 👈 Яг таны меню дээрх 7 гарна!
      gross_margin: effectiveNetRevenue > 0 ? ((effectiveGrossProfit / effectiveNetRevenue) * 100).toFixed(2) + "%" : "0%",
      opex: adjustedOpex,
      depreciation: totalMonthlyDepreciation,
      ebit: effectiveEbit,
      net_profit: effectiveNetProfit,
      net_margin: effectiveNetRevenue > 0 ? ((effectiveNetProfit / effectiveNetRevenue) * 100).toFixed(2) + "%" : "0%"
    },
    tax_summary: {
      is_above_300m: isAbove300M,
      tax_mode: isAbove300M ? "Энгийн 10% (300М-ээс дээш)" : "Хялбаршуулсан 1% (300М хүртэл)",
      simplified_1pct: simplifiedTax1Pct,
      standard_10pct: standardTax10Pct,
      active_tax_amount: activeTaxAmount,
      estimated_vat_10pct: estimatedVat10Pct
    },
    abc_summary: {
      a_count: fullInventory.filter((i: any) => i.abc_class === 'A').length,
      b_count: fullInventory.filter((i: any) => i.abc_class === 'B').length,
      c_count: fullInventory.filter((i: any) => i.abc_class === 'C').length,
      total_items: N,
      counted_in_cycle: countedInCycleCount,
      uncounted_in_cycle: uncountedInCycleCount,
      suggested_cycle_per_shift: dailyCycleQuota
    },
    margin_guard_alerts: marginAlerts,
    worker_fraud_matrix: workerFraudMatrix,
    purchases_summary: {
      total_purchases: totalPurchasesWithEbarimt + totalPurchasesNoEbarimt,
      with_ebarimt: totalPurchasesWithEbarimt,
      without_ebarimt: totalPurchasesNoEbarimt,
      fixed_assets_invested: fixedAssetsPurchasedThisMonthBank
    },
    cashflow_summary: {
      cash_in_total: totalRevenue,
      cash_in_cash: cashRevenue,
      cash_in_bank: bankRevenue,
      initial_cash: cashInitial,
      initial_bank: bankInitial,
      cash_out_purchases_cash: totalPurchasesCashPaid,
      cash_out_purchases_bank: totalPurchasesBankPaid,
      cash_out_opex_cash: cashOutOpexCash,
      cash_out_opex_bank: cashOutOpexBank,
      owner_draws: totalOwnerDraws,
      fixed_assets_paid: fixedAssetsPurchasedThisMonthBank,
      end_cash_balance: cashEndBalance,
      end_bank_balance: bankEndBalance,
      net_total_balance: cashEndBalance + bankEndBalance
    },
    payroll_summary: payrollSummary,
    fixed_assets: processedFixedAssets,
    waste_act_items: wasteAuditItems,
    top_wasters: fullInventory.filter(i => i.is_waste).sort((a,b) => b.impact - a.impact).slice(0, 3),
      //  Ажилтнуудын Kiosk-оор бүртгэсэн бодит хаягдлуудын нэгдсэн жагсаалт:
   // ⚡ Ажилтны нэр (worker) болон ээлжийн тэмдэглэлтэй нь хамт гаргах:
logged_spoilage_items: (rawInventoryLogs || [])
  .filter((log: any) => log.type === 'spoilage' && (log.date ? ubDay(log.date) >= startDay && ubDay(log.date) <= endDay : true))
  .map((log: any) => {
    const ing = rawIngredients.find((i: any) => i.id === log.ingredient_id);
    return {
      item: ing ? ing.name : (log.non_food_item || "Unknown"),
      quantity: Math.abs(parseFloat(log.quantity) || 0),
      unit: ing ? ing.unit : "ш",
      worker: log.worker_name || "Үл мэдэгдэх", // 👈 ЭНД АЖИЛТНЫ НЭРИЙГ ӨГНӨ!
      time: log.date ? new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
      notes: log.notes || ""
    };
  }),
    top_expensive: fullInventory.sort((a,b) => b.price - a.price).slice(0, 3),
    all_inventory_data: fullInventory,
    wasted_only: fullInventory.filter(i => i.is_waste).sort((a,b) => b.impact - a.impact),
    underpoured_only: fullInventory.filter(i => i.is_under).sort((a,b) => b.impact - a.impact),
    menu_performance: menuPerformance.sort((a,b) => b.sold - a.sold),
    all_recipes: allRecipesMap,
    opex_details: opexDetails,
    all_timeline_logs: timelineLogs,
    recent_shifts: formattedShifts,
    recent_worker_logs: timelineLogs.slice(0, 40),
    grades,
    fix_list: fixList,
    data_trust: dataTrust,
    verified_gap: verifiedActual - verifiedTheo,
    total_waste_loss: totalWasteLoss || 0,
    total_unexplained_waste: totalUnexplainedWaste || 0,
    total_logged_spoilage: totalLoggedSpoilage || 0,
    total_logged_testing: totalLoggedTesting || 0,
    total_logged_staff_meal: totalLoggedStaffMeal || 0,
    total_logged_other: totalLoggedOther || 0,
    total_surplus_savings: totalSurplusSavings || 0,
    efficiency: verifiedActual !== 0 ? ((verifiedTheo / verifiedActual) * 100).toFixed(2) + "%" : "0%"
  };
}