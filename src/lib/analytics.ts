// src/lib/analytics.ts
import { supabaseAdmin } from './supabaseAdmin';
import { calculateMatchScore, transliterate } from './autoReconcile';

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
  clientId: string,
  startDate?: string,
  endDate?: string
) {
  const normalizedClientId = String(clientId ?? "").trim();
  if (!normalizedClientId) {
    throw new Error("clientId is required for analytics");
  }

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const defaultEnd = now.toISOString();

  const finalStartDate = startDate || defaultStart;
  const finalEndDate = endDate || defaultEnd;

  const startDay = finalStartDate.split('T')[0];
  const endDay = finalEndDate.split('T')[0];

  // 1. DATABASE QUERIES - Retrieve data needed for period
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
  ] = await Promise.all([
    supabaseAdmin
      .from("ingredients")
      .select("*")
      .eq("client_id", normalizedClientId),

    supabaseAdmin
      .from("recipes")
      .select("*")
      .eq("client_id", normalizedClientId),

    supabaseAdmin
      .from("inventory_logs")
      .select("*")
      .eq("client_id", normalizedClientId)
      .lte("date", finalEndDate)
      .order("date", { ascending: true }),

    supabaseAdmin
      .from("sales_logs")
      .select("*")
      .eq("client_id", normalizedClientId)
      .gte("date", finalStartDate)
      .lte("date", finalEndDate),

    supabaseAdmin
      .from("shifts")
      .select("*")
      .eq("client_id", normalizedClientId)
      .gte("start_time", finalStartDate)
      .order("start_time", { ascending: false })
      .limit(50),

    supabaseAdmin
      .from("products")
      .select("*")
      .eq("client_id", normalizedClientId),

    supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, salary_type, base_rate")
      .eq("client_id", normalizedClientId),

    supabaseAdmin
      .from("fixed_assets")
      .select("*")
      .eq("client_id", normalizedClientId),

    supabaseAdmin
      .from("fixed_opex")
      .select("*")
      .eq("client_id", normalizedClientId)
      .eq("is_active", true),

    supabaseAdmin
      .from("client_settings")
      .select("*")
      .eq("client_id", normalizedClientId)
      .maybeSingle(),
  ]);

  if (!rawIngredients || !rawRecipes || !rawInventoryLogs || !rawSales) {
    throw new Error("Failed to fetch necessary database tables");
  }

  // ---------------------------------------------------------------------------
  // FIX 1: PAYMENT-METHOD ACCURACY (No fake 85/15 splits, no guessing)
  // ---------------------------------------------------------------------------
  let totalRevenue = 0;
  let cashRevenue = 0;
  let bankRevenue = 0;
  let qpayRevenue = 0;
  let otherRevenue = 0;
  let unknownRevenue = 0;

  const productSales: Record<string, number> = {};
  const allRecipesMap: Record<string, Record<string, number>> = {};
  const salesByDay: Record<string, any[]> = {};

  rawSales.forEach((s: any) => {
    if (!s.date) return;
    const day = new Date(s.date).toISOString().split('T')[0];
    if (!salesByDay[day]) salesByDay[day] = [];
    salesByDay[day].push(s);

    const revenue = parseFloat(s.total_revenue) || 0;
    const qty = parseInt(s.quantity_sold) || 0;
    totalRevenue += revenue;

    const rawMethod = (s.payment_method || "").trim().toLowerCase();
    if (rawMethod === "cash" || rawMethod === "бэлэн") {
      cashRevenue += revenue;
    } else if (rawMethod === "bank" || rawMethod === "данс" || rawMethod === "card" || rawMethod === "карт") {
      bankRevenue += revenue;
    } else if (rawMethod === "qpay") {
      qpayRevenue += revenue;
    } else if (rawMethod !== "") {
      otherRevenue += revenue;
    } else {
      unknownRevenue += revenue;
    }

    const rawPosName = s.product_name;
    const cleanPos = cleanString(rawPosName).toLowerCase();
    let matchedRecipeKey = Object.keys(allRecipesMap).find(rName => 
      rName.toLowerCase() === cleanPos || 
      calculateMatchScore(rawPosName, rName) >= 0.80
    );
    const finalKey = matchedRecipeKey ? matchedRecipeKey.toLowerCase() : cleanPos;
    productSales[finalKey] = (productSales[finalKey] || 0) + qty;
  });

  const knownPaymentRevenue = cashRevenue + bankRevenue + qpayRevenue + otherRevenue;

  // Build recipes map
  rawRecipes.forEach((r: any) => {
    const pName = cleanString(r.product_name);
    const ing = rawIngredients.find((i: any) => i.id === r.ingredient_id);
    if (ing) {
      if (!allRecipesMap[pName]) allRecipesMap[pName] = {};
      allRecipesMap[pName][ing.name] = parseFloat(r.amount) || 0;
    }
  });

  // Master ingredients tracking structure
  const master: Record<string, any> = {};
  rawIngredients.forEach((ing: any) => {
    const nameKey = cleanString(ing.name);
    master[nameKey] = {
      id: ing.id,
      name: nameKey,
      unit_price: parseFloat(ing.unit_price) >= 0 ? parseFloat(ing.unit_price) : null,
      unit: ing.unit,
      current_stock: parseFloat(ing.current_stock) || 0,
      live_stock: parseFloat(ing.current_stock) || 0,
      is_critical: ing.is_critical || false,
      is_suspicious_promoted: ing.is_suspicious_promoted || false,
      promoted_until: ing.promoted_until || null,
      last_counted_at: ing.last_counted_at || '2000-01-01T00:00:00Z',
      par_level: parseFloat(ing.par_level) || 0,
      lead_time_days: parseInt(ing.lead_time_days) || 1,
      days_of_supply: parseInt(ing.days_of_supply) || 3,
      theoretical: 0,
      purchased: 0,
    };
  });

  // Calculate theoretical usage from period sales
  rawRecipes.forEach((r: any) => {
    const pName = cleanString(r.product_name);
    const qtySold = productSales[pName.toLowerCase()] || 0;
    const ing = rawIngredients.find((i: any) => i.id === r.ingredient_id);
    if (ing && parseFloat(r.amount) > 0) {
      const key = cleanString(ing.name);
      if (master[key]) {
        master[key].theoretical += (qtySold * parseFloat(r.amount));
      }
    }
  });

  // ---------------------------------------------------------------------------
  // FIX 2: NO INVENTED OPEX OR DRAW SPLITS (Explicit payment channels only)
  // ---------------------------------------------------------------------------
  let totalPurchasesCashPaid = 0;
  let totalPurchasesBankPaid = 0;
  let totalPurchasesUnallocated = 0;
  let totalPurchasesWithEbarimt = 0;
  let totalPurchasesNoEbarimt = 0;

  let ownerDrawsCashPaid = 0;
  let ownerDrawsBankPaid = 0;
  let ownerDrawsUnallocated = 0;
  let totalOwnerDraws = 0;

  let opexCashPaid = 0;
  let opexBankPaid = 0;
  let opexUnallocated = 0;
  let dynamicOpexTotal = 0;

  const opexDetails: { category: string; item: string; cost: number; payment_channel: string }[] = [];

  // Fixed OPEX budget items (unallocated channel unless matched by a disbursement log)
  (rawFixedOpex || []).forEach((fo: any) => {
    const cost = parseFloat(fo.monthly_cost) || 0;
    dynamicOpexTotal += cost;
    opexUnallocated += cost;
    opexDetails.push({
      category: fo.category || 'Тогтмол зардал',
      item: fo.name,
      cost: cost,
      payment_channel: 'unallocated'
    });
  });

  const countsByIngredient: Record<string, Array<{ id: string; date: string; qty: number }>> = {};

  rawInventoryLogs.forEach((log: any) => {
    const cost = parseFloat(log.total_cost) || 0;
    const qty = parseFloat(log.quantity) || 0;
    const logDate = log.date ? log.date.split('T')[0] : '';
    const noteText = (log.notes || "").toLowerCase();
    const rawMethod = (log.payment_method || "").trim().toLowerCase();
    const isCash = rawMethod === 'cash' || noteText.includes('бэлэн');
    const isBank = rawMethod === 'bank' || rawMethod === 'card' || noteText.includes('данс');
    const isEbarimt = log.is_ebarimt !== false && !noteText.includes('баримтгүй') && !noteText.includes('зураг');

    // Owner withdrawals
    if (noteText.includes('эзний') || noteText.includes('хувийн') || noteText.includes('draw')) {
      const drawAmt = cost > 0 ? cost : Math.abs(qty);
      totalOwnerDraws += drawAmt;
      if (isCash) ownerDrawsCashPaid += drawAmt;
      else if (isBank) ownerDrawsBankPaid += drawAmt;
      else ownerDrawsUnallocated += drawAmt;
    }

    // Purchases
    if (log.type === 'purchase') {
      if (isCash) totalPurchasesCashPaid += cost;
      else if (isBank) totalPurchasesBankPaid += cost;
      else totalPurchasesUnallocated += cost;

      if (isEbarimt) totalPurchasesWithEbarimt += cost;
      else totalPurchasesNoEbarimt += cost;

      if (!log.ingredient_id) {
        if (logDate >= startDay && logDate <= endDay) {
          dynamicOpexTotal += cost;
          if (isCash) opexCashPaid += cost;
          else if (isBank) opexBankPaid += cost;
          else opexUnallocated += cost;

          opexDetails.push({
            category: "Хүнсний бус зардал (OPEX)",
            item: `${log.non_food_item || 'Бусад зардал'} (${isEbarimt ? 'E-Barimt' : 'Баримтгүй'})`,
            cost: Math.round(cost),
            payment_channel: isCash ? 'cash' : isBank ? 'bank' : 'unallocated'
          });
        }
        return;
      }

      if (logDate >= startDay && logDate <= endDay) {
        const ing = rawIngredients.find((i: any) => i.id === log.ingredient_id);
        if (ing) {
          const key = cleanString(ing.name);
          if (master[key]) master[key].purchased += qty;
        }
      }
    }

    // Physical count logs
    if (log.type === 'count' && log.ingredient_id) {
      const ing = rawIngredients.find((i: any) => i.id === log.ingredient_id);
      if (ing) {
        const key = cleanString(ing.name);
        if (!countsByIngredient[key]) countsByIngredient[key] = [];
        countsByIngredient[key].push({
          id: log.id,
          date: log.date,
          qty: qty
        });
      }
    }
  });

  // Fixed Assets (No payment_method column exists in fixed_assets table)
  let totalMonthlyDepreciation = 0;
  let fixedAssetsPurchasedThisPeriod = 0;
  const currentDate = new Date(finalEndDate);

  const processedFixedAssets = (rawFixedAssets || []).map((fa: any) => {
    const cost = parseFloat(fa.initial_cost) || 0;
    const months = parseInt(fa.useful_months) || 60;
    const monthlyDep = months > 0 ? Math.round(cost / months) : 0;
    const pDate = new Date(fa.purchase_date || '2025-01-01');

    if (pDate >= new Date(startDay) && pDate <= new Date(endDay)) {
      fixedAssetsPurchasedThisPeriod += cost;
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

  const hasInitialCash = rawSettings?.initial_cash !== null && rawSettings?.initial_cash !== undefined;
  const hasInitialBank = rawSettings?.initial_bank !== null && rawSettings?.initial_bank !== undefined;
  const cashInitial = hasInitialCash ? parseFloat(rawSettings.initial_cash) : 0;
  const bankInitial = hasInitialBank ? parseFloat(rawSettings.initial_bank) : 0;

  const verifiedCashOutflow = totalPurchasesCashPaid + opexCashPaid + ownerDrawsCashPaid;
  const verifiedBankOutflow = totalPurchasesBankPaid + opexBankPaid + ownerDrawsBankPaid;
  const totalUnallocatedOutflow = totalPurchasesUnallocated + opexUnallocated + ownerDrawsUnallocated + fixedAssetsPurchasedThisPeriod;

  const isCashFlowExact = hasInitialCash && hasInitialBank && totalUnallocatedOutflow === 0 && unknownRevenue === 0;
  const cashEndBalance = hasInitialCash ? (cashInitial + cashRevenue - verifiedCashOutflow) : null;
  const bankEndBalance = hasInitialBank ? (bankInitial + bankRevenue - verifiedBankOutflow) : null;

  // ---------------------------------------------------------------------------
  // FIX 3: INVENTORY RECONCILIATION & STRICT DATE BOUNDARIES
  // ---------------------------------------------------------------------------
  const loggedEvents: Record<string, any> = {};
  Object.keys(master).forEach((name: string) => {
    loggedEvents[name] = { spoilage: 0, testing: 0, staff_meal: 0, other: 0, notes: [] };
  });

  rawInventoryLogs.forEach((log: any) => {
    if (log.type === 'purchase' || log.type === 'count' || log.type === 'sale') return;
    if (!log.ingredient_id) return;
    const ing = rawIngredients.find((i: any) => i.id === log.ingredient_id);
    if (!ing) return;
    const nameKey = cleanString(ing.name);
    const qty = Math.abs(parseFloat(log.quantity)) || 0;
    const logDate = log.date ? log.date.split('T')[0] : '';
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
  const wasteAuditItems: any[] = [];

  let rawActualCogs = 0;
  let totalTheoCogs = 0;
  let totalWasteLoss = 0;
  let totalSurplusSavings = 0;
  let totalLoggedSpoilage = 0;
  let totalLoggedTesting = 0;
  let totalLoggedStaffMeal = 0;
  let totalLoggedOther = 0;
  let totalUnexplainedWaste = 0;
  let countOfReconciledItems = 0;

  for (const key in master) {
    const m = master[key];
    const history = countsByIngredient[key] || [];
    history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 1. Opening count: Latest physical count on or before start date
    const candidateOpeningCounts = history.filter(c => c.date.split('T')[0] <= startDay);
    const openingCountRecord = candidateOpeningCounts.length > 0 
      ? candidateOpeningCounts[candidateOpeningCounts.length - 1] 
      : null;

    // 2. Closing count: Latest physical count within selected period, strictly after opening count
    const candidateClosingCounts = history.filter(c => {
      const cDate = c.date.split('T')[0];
      if (cDate < startDay || cDate > endDay) return false;
      if (openingCountRecord && c.id === openingCountRecord.id) return false;
      if (openingCountRecord && new Date(c.date).getTime() <= new Date(openingCountRecord.date).getTime()) return false;
      return true;
    });

    const closingCountRecord = candidateClosingCounts.length > 0
      ? candidateClosingCounts[candidateClosingCounts.length - 1]
      : null;

    const isReconciliationAvailable = Boolean(openingCountRecord && closingCountRecord);

    // Weighted purchase price calculation
    let weightedPrice = m.unit_price;
    const ingredientPurchases = rawInventoryLogs.filter((log: any) => log.ingredient_id === m.id && log.type === 'purchase');
    let totalPurchaseCost = 0;
    let totalPurchasedQty = 0;
    ingredientPurchases.forEach((p: any) => {
      totalPurchaseCost += parseFloat(p.total_cost) || 0;
      totalPurchasedQty += parseFloat(p.quantity) || 0;
    });
    if (m.unit_price !== null && totalPurchasedQty > 0 && totalPurchaseCost > 0) {
      weightedPrice = ((m.current_stock * m.unit_price) + totalPurchaseCost) / Math.max(1, m.current_stock + totalPurchasedQty);
    }

    const itemLogs = loggedEvents[m.name] || { spoilage: 0, testing: 0, staff_meal: 0, other: 0, notes: [] };
    const recordedOutflows = itemLogs.spoilage + itemLogs.testing + itemLogs.staff_meal + itemLogs.other;

    let grossDepletion: number | null = null;
    let productUsage: number | null = null;
    let usageVariance: number | null = null;
    let unexplainedGap: number | null = null;
    let unexplainedCost: number | null = null;

    if (isReconciliationAvailable && openingCountRecord && closingCountRecord) {
      countOfReconciledItems++;
      const openingQty = openingCountRecord.qty;
      const closingQty = closingCountRecord.qty;
      grossDepletion = Math.max(0, openingQty + m.purchased - closingQty);
      productUsage = Math.max(0, grossDepletion - recordedOutflows);

      // Usage variance = theoretical usage - actual product usage
      // Positive = surplus (used less than theoretical)
      // Negative = deficit/overconsumption (used more than theoretical)
      usageVariance = m.theoretical - productUsage;

      if (usageVariance < 0) {
        unexplainedGap = Math.abs(usageVariance);
        unexplainedCost = weightedPrice !== null ? Math.round(unexplainedGap * weightedPrice) : 0;
        totalUnexplainedWaste += unexplainedCost;
        totalWasteLoss += unexplainedCost;
      } else if (usageVariance > 0) {
        const surplusSavings = weightedPrice !== null ? Math.round(usageVariance * weightedPrice) : 0;
        totalSurplusSavings += surplusSavings;
      }

      if (weightedPrice !== null) {
        rawActualCogs += Math.round(productUsage * weightedPrice);
      }
    } else {
      // Missing counts: fall back to theoretical for financial estimation
      if (weightedPrice !== null) {
        rawActualCogs += Math.round(m.theoretical * weightedPrice);
      }
    }

    if (weightedPrice !== null) {
      totalTheoCogs += Math.round(m.theoretical * weightedPrice);
      totalLoggedSpoilage += Math.round(itemLogs.spoilage * weightedPrice);
      totalLoggedTesting += Math.round(itemLogs.testing * weightedPrice);
      totalLoggedStaffMeal += Math.round(itemLogs.staff_meal * weightedPrice);
      totalLoggedOther += Math.round(itemLogs.other * weightedPrice);
    }

    // Safety stock & dynamic Par calculations
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

    const avgDailyUsage = m.theoretical / Math.max(1, Math.ceil((new Date(endDay).getTime() - new Date(startDay).getTime()) / (1000 * 60 * 60 * 24)) || 30);
    const avgLeadTime = m.lead_time_days || 1;
    const safetyStock = (maxDailyUsage * (avgLeadTime + 2)) - (avgDailyUsage * avgLeadTime);
    const dynamicParLevel = (avgDailyUsage * avgLeadTime) + Math.max(0, safetyStock);
    const activeParLevel = m.par_level > 0 ? m.par_level : dynamicParLevel;
    const suggestedOrder = (avgDailyUsage * m.days_of_supply) + activeParLevel - m.live_stock;
    const finalSuggestion = Math.max(0, Math.round(suggestedOrder * 100) / 100);

    const totalSpendValue = (m.theoretical > 0 ? m.theoretical : m.live_stock) * (weightedPrice || 0);

    fullInventory.push({
      id: m.id,
      name: m.name,
      unit: m.unit,
      price: weightedPrice,
      unit_price: weightedPrice,
      has_valid_unit_price: weightedPrice !== null,
      live_stock: m.live_stock,
      current_stock: m.live_stock,
      par_level: Math.round(activeParLevel * 100) / 100,
      suggested_order: finalSuggestion,
      theoretical: Math.round(m.theoretical * 100) / 100,
      reconciliation_available: isReconciliationAvailable,
      reconciliation_status: !openingCountRecord ? "MISSING_OPENING_COUNT" : !closingCountRecord ? "MISSING_CLOSING_COUNT" : "RECONCILED",
      opening_count: openingCountRecord ? openingCountRecord.qty : null,
      opening_count_date: openingCountRecord ? openingCountRecord.date : null,
      closing_count: closingCountRecord ? closingCountRecord.qty : null,
      closing_count_date: closingCountRecord ? closingCountRecord.date : null,
      period_purchases: m.purchased,
      gross_stock_depletion: grossDepletion,
      recorded_outflows: recordedOutflows,
      product_usage: productUsage,
      usage_variance: usageVariance,
      gap: unexplainedGap !== null ? Math.round(unexplainedGap * 100) / 100 : null,
      impact: unexplainedCost,
      is_waste: unexplainedCost !== null && unexplainedCost > 1,
      is_under: usageVariance !== null && usageVariance > 0.1,
      last_counted_at: m.last_counted_at,
      is_critical: m.is_critical,
      is_suspicious_promoted: m.is_suspicious_promoted,
      promoted_until: m.promoted_until,
      total_spend_value: totalSpendValue
    });

    if (itemLogs.spoilage > 0) {
      wasteAuditItems.push({
        name: m.name,
        theo_usage: Math.round(m.theoretical * 10) / 10,
        actual_usage: productUsage !== null ? Math.round(productUsage * 10) / 10 : "Unavailable",
        gap_qty: Math.round(itemLogs.spoilage * 10) / 10,
        unit: m.unit,
        unit_price: weightedPrice,
        loss_amount: weightedPrice !== null ? Math.round(itemLogs.spoilage * weightedPrice) : 0,
        cause: "Хугацаа дууссан / Чанарын шаардлага хангаагүй (Бүртгэлтэй акт)"
      });
    }

    if (unexplainedCost !== null && unexplainedCost > 10) {
      wasteAuditItems.push({
        name: m.name,
        theo_usage: Math.round(m.theoretical * 10) / 10,
        actual_usage: productUsage !== null ? Math.round(productUsage * 10) / 10 : "Unavailable",
        gap_qty: unexplainedGap !== null ? Math.round(unexplainedGap * 10) / 10 : 0,
        unit: m.unit,
        unit_price: weightedPrice,
        loss_amount: unexplainedCost,
        cause: "Тээвэрлэлт, хадгалалт, хөргөлтийн ууршилт, технологийн хорогдол"
      });
    }
  }

  // ---------------------------------------------------------------------------
  // FIX 4: NO 8,000 MNT FALLBACK & ACCURATE RECIPE COSTS
  // ---------------------------------------------------------------------------
  const menuPerformance: any[] = [];
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
    let isCostIncomplete = false;

    if (recipeItems.length === 0) {
      isCostIncomplete = true;
    }

    const drinkRecipe = recipeItems.map((recipe: any) => {
      const ing = rawIngredients.find((i: any) => i.id === recipe.ingredient_id);
      const uPrice = ing && ing.unit_price !== null && !isNaN(parseFloat(ing.unit_price))
        ? parseFloat(ing.unit_price)
        : null;

      if (uPrice === null || uPrice < 0) {
        isCostIncomplete = true;
      } else {
        estCost += parseFloat(recipe.amount) * uPrice;
      }

      return {
        ingredient: ing ? ing.name : 'Unknown',
        amount: parseFloat(recipe.amount),
        unit: ing ? ing.unit : '',
        unit_price: uPrice,
        cost_per_cup: uPrice !== null ? Math.round(parseFloat(recipe.amount) * uPrice) : null
      };
    });

    const matchedProduct = rawProducts?.find(
      (p: any) => cleanString(p.name).toLowerCase() === cleanP || calculateMatchScore(p.name, pName) >= 0.80
    );

    // FIX 4: NO 8000 MNT fallback!
    const sellPrice = (matchedProduct && matchedProduct.selling_price && parseFloat(matchedProduct.selling_price) > 0)
      ? parseFloat(matchedProduct.selling_price)
      : null;

    const category = matchedProduct ? matchedProduct.category : 'General';
    const isMarginAvailable = sellPrice !== null && !isCostIncomplete && sellPrice > 0;

    const unitMargin = isMarginAvailable ? (sellPrice - estCost) : null;
    const grossMarginPct = isMarginAvailable ? Number((((sellPrice - estCost) / sellPrice) * 100).toFixed(2)) : null;
    const foodCostPct = isMarginAvailable ? Number(((estCost / sellPrice) * 100).toFixed(2)) : null;
    const profit = isMarginAvailable ? Math.round((sellPrice - estCost) * qtySold) : null;

    menuPerformance.push({
      name: pName,
      category: category,
      sold: qtySold,
      selling_price: sellPrice,
      price_available: sellPrice !== null,
      cost_per_item: !isCostIncomplete ? Math.round(estCost) : null,
      cost_available: !isCostIncomplete,
      profit: profit,
      unit_margin: unitMargin,
      food_cost_pct: foodCostPct,
      gross_margin_pct: grossMarginPct,
      margin_available: isMarginAvailable,
      recipe: drinkRecipe
    });
  });

  // ABC Analysis
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

  // Margin guard alerts
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
    const pRow = menuPerformance.find(m => cleanString(m.name).toLowerCase() === cleanString(prod.name).toLowerCase());
    if (pRow && pRow.margin_available && pRow.selling_price !== null && pRow.cost_per_item !== null) {
      const targetMarginPct = getTargetMarginPct(prod.category || 'General');
      if (pRow.gross_margin_pct !== null && pRow.gross_margin_pct < targetMarginPct) {
        const rawSuggestedPrice = pRow.cost_per_item / (1 - (targetMarginPct / 100));
        const suggestedPrice = Math.ceil(rawSuggestedPrice / 500) * 500;
        marginAlerts.push({
          product_name: prod.name,
          category: prod.category || 'General',
          selling_price: pRow.selling_price,
          cost_price: pRow.cost_per_item,
          current_margin_pct: pRow.gross_margin_pct + "%",
          target_margin_pct: targetMarginPct + "%",
          suggested_price: suggestedPrice,
          price_gap: suggestedPrice - pRow.selling_price
        });
      }
    }
  });

  // Cross-shift incident matrix
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

  // Financial ladder totals
  const isAbove300M = (totalRevenue * 12) > 300000000;
  const netRevenue = Math.round(totalRevenue / 1.1);
  const estimatedVat10Pct = totalRevenue - netRevenue;

  const adjustedCogs = Math.max(0, rawActualCogs - totalLoggedTesting - totalLoggedStaffMeal - totalLoggedOther);
  const adjustedOpex = Math.max(0, dynamicOpexTotal + totalLoggedTesting + totalLoggedStaffMeal + totalLoggedOther + totalMonthlyDepreciation);

  const finalEbit = (netRevenue - adjustedCogs - adjustedOpex);
  const simplifiedTax1Pct = Math.round(netRevenue * 0.01);
  const standardTax10Pct = finalEbit > 0 ? Math.round(finalEbit * 0.10) : 0;

  let activeTaxAmount = simplifiedTax1Pct;
  if (rawSettings?.tax_mode === 'standard_10pct' || (rawSettings?.tax_mode === 'auto' && isAbove300M)) {
    activeTaxAmount = standardTax10Pct;
  }

  const effectiveGrossProfit = Math.max(0, netRevenue - adjustedCogs);
  const effectiveNetProfit = Math.round(finalEbit - activeTaxAmount);

  // Missing recipes detection
  const soldNamesSet = new Set(rawSales.map((s: any) => cleanString(s.product_name).toLowerCase()));
  const unmappedCount = (rawProducts || []).filter((prod: any) => {
    const pClean = cleanString(prod.name).toLowerCase();
    const wasSold = soldNamesSet.has(pClean) || (productSales[pClean] || 0) > 0;
    if (!wasSold) return false;
    const pTrans = transliterate(pClean).replace(/\s+/g, "");
    const hasRecipe = (rawRecipes || []).some((r: any) => {
      const rClean = cleanString(r.product_name).toLowerCase();
      if (rClean === pClean) return true;
      const rTrans = transliterate(rClean).replace(/\s+/g, "");
      return rTrans === pTrans || getSimilarity(rTrans, pTrans) >= 0.70;
    });
    return !hasRecipe;
  }).length;

  // Payroll calculations
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
    const grossSalary = isFixed ? Math.round(rate) : Math.round(hoursDecimal * rate);
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
      base_salary: grossSalary,
      gross_salary: grossSalary,
      ndsh_deduction: ndshDeduction,
      employer_ndsh: employerNdsh,
      hhoat_deduction: hhoatDeduction,
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

  return {
    financial_ladder: {
      revenue: totalRevenue,
      net_revenue: netRevenue,
      actual_cogs: adjustedCogs,
      theo_cogs: totalTheoCogs,
      is_theoretical_mode: countOfReconciledItems === 0,
      has_unmapped_recipes: unmappedCount > 0,
      unmapped_recipes_count: unmappedCount,
      gross_margin: netRevenue > 0 ? ((effectiveGrossProfit / netRevenue) * 100).toFixed(2) + "%" : "0%",
      opex: adjustedOpex,
      depreciation: totalMonthlyDepreciation,
      ebit: finalEbit,
      net_profit: effectiveNetProfit,
      net_margin: netRevenue > 0 ? ((effectiveNetProfit / netRevenue) * 100).toFixed(2) + "%" : "0%"
    },
    payment_methods_summary: {
      total_revenue: totalRevenue,
      known_payment_revenue: knownPaymentRevenue,
      unknown_payment_revenue: unknownRevenue,
      cash_revenue: cashRevenue,
      bank_revenue: bankRevenue,
      qpay_revenue: qpayRevenue,
      other_revenue: otherRevenue,
      is_channel_complete: unknownRevenue === 0
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
      fixed_assets_invested: fixedAssetsPurchasedThisPeriod
    },
    cashflow_summary: {
      initial_cash: hasInitialCash ? cashInitial : null,
      initial_bank: hasInitialBank ? bankInitial : null,
      has_initial_balances: hasInitialCash && hasInitialBank,
      cash_in_total: totalRevenue,
      cash_in_cash: cashRevenue,
      cash_in_bank: bankRevenue,
      cash_in_qpay: qpayRevenue,
      cash_in_unknown: unknownRevenue,
      cash_out_purchases_cash: totalPurchasesCashPaid,
      cash_out_purchases_bank: totalPurchasesBankPaid,
      cash_out_purchases_unallocated: totalPurchasesUnallocated,
      cash_out_opex_cash: opexCashPaid,
      cash_out_opex_bank: opexBankPaid,
      cash_out_opex_unallocated: opexUnallocated,
      owner_draws: totalOwnerDraws,
      owner_draws_cash: ownerDrawsCashPaid,
      owner_draws_bank: ownerDrawsBankPaid,
      owner_draws_unallocated: ownerDrawsUnallocated,
      fixed_assets_invested: fixedAssetsPurchasedThisPeriod,
      fixed_assets_unallocated: fixedAssetsPurchasedThisPeriod,
      verified_cash_outflow: verifiedCashOutflow,
      verified_bank_outflow: verifiedBankOutflow,
      unallocated_outflow: totalUnallocatedOutflow,
      is_balance_exact: isCashFlowExact,
      end_cash_balance: cashEndBalance,
      end_bank_balance: bankEndBalance,
      net_total_balance: (cashEndBalance !== null && bankEndBalance !== null) ? (cashEndBalance + bankEndBalance) : null,
      unallocated_warning: !isCashFlowExact
        ? "Төлбөрийн хэлбэр (бэлэн/данс) нь тодорхойгүй зардал эсвэл эхний үлдэгдэл дутуу тул баталгаажсан бодит гүйлгээнд үндэслэн харуулав."
        : null
    },
    payroll_summary: payrollSummary,
    fixed_assets: processedFixedAssets,
    waste_act_items: wasteAuditItems,
    top_wasters: fullInventory.filter(i => i.is_waste).sort((a, b) => (b.impact || 0) - (a.impact || 0)).slice(0, 3),
    top_expensive: fullInventory.sort((a, b) => (b.price || 0) - (a.price || 0)).slice(0, 3),
    all_inventory_data: fullInventory,
    menu_performance: menuPerformance.sort((a, b) => b.sold - a.sold),
    all_recipes: allRecipesMap,
    opex_details: opexDetails,
    all_timeline_logs: timelineLogs,
    recent_shifts: formattedShifts,
    recent_worker_logs: timelineLogs.slice(0, 40),
    total_waste_loss: totalWasteLoss || 0,
    total_unexplained_waste: totalUnexplainedWaste || 0,
    total_logged_spoilage: totalLoggedSpoilage || 0,
    total_logged_testing: totalLoggedTesting || 0,
    total_logged_staff_meal: totalLoggedStaffMeal || 0,
    total_logged_other: totalLoggedOther || 0,
    total_surplus_savings: totalSurplusSavings || 0,
    efficiency: rawActualCogs > 0 ? ((totalTheoCogs / rawActualCogs) * 100).toFixed(2) + "%" : "0%"
  };
}