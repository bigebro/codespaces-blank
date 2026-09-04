import { supabaseAdmin } from './supabaseAdmin';

const aliasMap: Record<string, string> = {
  "матча латте": "matcha latte",
  "салями сэндвич": "salami sandwich",
  "хулууны зутан шөл": "pumpkin soup / хулууны зутан шөл ", 
  "hot milk honey": "hot milk with honey",
  "flavoured latte": "flavored caffe latte",
  "tuna  sandwich": "tuna sandwich",         
  "sloppy joe” burger": "\"sloppy joe\" burger", 
  "caramel latte macchiato": "caramel macchiato",
  "tiramisu sale": "tiramisu (sale)",
  "tiramisu jijig": "tiramisu", 
  "tiramisu big": "tiramisu",
  "tiramsu": "tiramisu"
};

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
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const defaultEnd = now.toISOString();

  const finalStartDate = startDate || defaultStart;
  const finalEndDate = endDate || defaultEnd;

  // 1. ОГНООНЫ ШҮҮЛТҮҮРТЭЙ ДАТА ТАТАЛТ (Баазын ачааллыг 90% бууруулна)
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
    { data: rawSettings }
  ] = await Promise.all([
    supabaseAdmin.from('ingredients').select('*').ilike('client_id', clientId),
    supabaseAdmin.from('recipes').select('*').ilike('client_id', clientId),
    supabaseAdmin.from('inventory_logs').select('*').ilike('client_id', clientId).gte('date', finalStartDate).lte('date', finalEndDate).order('date', { ascending: false }),
    supabaseAdmin.from('sales_logs').select('*').ilike('client_id', clientId).gte('date', finalStartDate).lte('date', finalEndDate),
    supabaseAdmin.from('shifts').select('*').ilike('client_id', clientId).gte('start_time', finalStartDate).order('start_time', { ascending: false }).limit(50),
    supabaseAdmin.from('products').select('*').ilike('client_id', clientId),
    supabaseAdmin.from('profiles').select('id, full_name, email, role, salary_type, base_rate').ilike('client_id', clientId),
    supabaseAdmin.from('fixed_assets').select('*').ilike('client_id', clientId),
    supabaseAdmin.from('fixed_opex').select('*').ilike('client_id', clientId).eq('is_active', true),
    supabaseAdmin.from('client_settings').select('*').ilike('client_id', clientId).maybeSingle()
  ]);

  if (!rawIngredients || !rawRecipes || !rawInventoryLogs || !rawSales) {
    throw new Error("Failed to fetch necessary database tables");
  }

  const salesByDay: Record<string, any[]> = {};
  rawSales.forEach((s: any) => {
    if (!s.date) return;
    const day = new Date(s.date).toISOString().split('T')[0];
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
      days_of_supply: parseInt(ing.days_of_supply) || 3
    };
  });

  const startDay = finalStartDate.split('T')[0];
  const endDay = finalEndDate.split('T')[0];

  rawInventoryLogs.forEach((log: any) => {
    const cost = parseFloat(log.total_cost) || 0;
    const qty = parseFloat(log.quantity) || 0; 
    const logDate = log.date ? log.date.split('T')[0] : '';
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
    }

    const ing = rawIngredients.find((i: any) => i.id === log.ingredient_id);
    if (!ing) return;
    const key = cleanString(ing.name);

    if (log.type === 'count') {
      const nText = (log.notes || "").toLowerCase();
      if (nText.includes("start") || nText.includes("эхний") || logDate <= startDay) {
        master[key].start = qty; 
      } 
      if (logDate >= startDay && logDate <= endDay && (nText.includes("end") || nText.includes("эцсийн") || !nText.includes("start"))) {
        master[key].end = qty; 
      }
    } else if (log.type === 'purchase') {
      if (logDate >= startDay && logDate <= endDay) {
        master[key].purchased += qty;
      }
    }
  });

  rawRecipes.forEach((r: any) => {
    const pName = cleanString(r.product_name);
    const ing = rawIngredients.find((i: any) => i.id === r.ingredient_id);
    if (ing) {
      if (!allRecipesMap[pName]) allRecipesMap[pName] = {};
      allRecipesMap[pName][ing.name] = parseFloat(r.amount) || 0;
    }
  });

  rawSales.forEach((s: any) => {
    const pName = s.product_name;
    let nameLower = cleanString(pName).toLowerCase();
    if (aliasMap[nameLower]) nameLower = aliasMap[nameLower].toLowerCase();

    const matchedRecipeKey = Object.keys(allRecipesMap).find(recipeName => 
      recipeName.toLowerCase() === nameLower || 
      getSimilarity(recipeName, nameLower) >= 0.85
    );

    const finalKey = matchedRecipeKey ? matchedRecipeKey.toLowerCase() : nameLower;
    const revenue = parseFloat(s.total_revenue) || 0;
    const qty = parseInt(s.quantity_sold) || 0;

    totalRevenue += revenue;

    if (s.payment_method === 'cash') cashRevenue += revenue;
    else bankRevenue += revenue;

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

  const processedProducts = Array.from(new Set(rawRecipes.map((r: any) => r.product_name)));
  processedProducts.forEach((pName: any) => {
    const qtySold = productSales[pName.toLowerCase()] || 0;
    if (qtySold > 0) {
      const recipeItems = rawRecipes.filter((r: any) => r.product_name === pName);
      let estCost = 0;
      
      const drinkRecipe = recipeItems.map((recipe: any) => {
        const ing = rawIngredients.find((i: any) => i.id === recipe.ingredient_id);
        const cost = ing ? parseFloat(recipe.amount) * parseFloat(ing.unit_price) : 0;
        estCost += cost;
        return {
          ingredient: ing ? ing.name : 'Unknown',
          amount: parseFloat(recipe.amount),
          unit: ing ? ing.unit : '',
          cost_per_cup: Math.round(cost)
        };
      });

      const matchedProduct = rawProducts?.find(
        (p: any) => p.name.toLowerCase().trim() === pName.toLowerCase().trim()
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
    }
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

    if (log.type === 'count' || log.type === 'purchase' || log.type === 'sale') return;

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

    const totalAvailableQty = m.start + m.purchased;
    if (totalAvailableQty > 0 && totalPurchaseCost > 0) {
      weightedPrice = ((m.start * m.unit_price) + totalPurchaseCost) / totalAvailableQty;
    }

    const actual = (m.start + m.purchased) - m.end;
    const safeActual = (actual < 0 && m.start === 0 && m.purchased === 0) ? 0 : actual;
    
    const actualMoney = Math.round(safeActual * weightedPrice) || 0;
    const theoMoney = Math.round(m.theoretical * weightedPrice) || 0;
   
    rawActualCogs += actualMoney;
    totalTheoCogs += theoMoney;

    const rawGap = actual - m.theoretical;
    const impact = Math.round(rawGap * weightedPrice) || 0;

    if (impact > 1) totalWasteLoss += impact;
    else if (impact < -1) totalSurplusSavings += Math.abs(impact);

    if (m.start === 0 && m.purchased === 0 && m.end === 0 && m.theoretical === 0) continue;

    const itemLogs = loggedEvents[m.name] || { spoilage: 0, testing: 0, staff_meal: 0, other: 0, notes: [] };
    const unexplainedGap = Math.max(0, rawGap - itemLogs.spoilage - itemLogs.testing - itemLogs.staff_meal - itemLogs.other);
    const unexplainedImpact = Math.round(unexplainedGap * m.unit_price) || 0;
    totalUnexplainedWaste += unexplainedImpact;
    totalLoggedSpoilage += Math.round(itemLogs.spoilage * m.unit_price) || 0;
    totalLoggedTesting += Math.round(itemLogs.testing * m.unit_price) || 0;
    totalLoggedStaffMeal += Math.round(itemLogs.staff_meal * m.unit_price) || 0;
    totalLoggedOther += Math.round(itemLogs.other * m.unit_price) || 0;

    // Парето 80/20 дүрэмд зориулж сард эргэлдсэн мөнгөн дүн (Ui = Qi * Pi)
    const totalSpendValue = (m.theoretical > 0 ? m.theoretical : m.live_stock) * weightedPrice;

    fullInventory.push({
      id: m.id,
      name: m.name,
      par_level: Math.round(activeParLevel * 100) / 100, 
      suggested_order: finalSuggestion,
      theoretical: Math.round(m.theoretical * 100) / 100 || 0,
      gap: Math.abs(Math.round(unexplainedGap * 100) / 100) || 0,
      impact: Math.abs(unexplainedImpact) || 0,
      unit: m.unit,
      price: weightedPrice || m.unit_price || 0,
      unit_price: weightedPrice || m.unit_price || 0,
      is_waste: unexplainedGap > 0.1,
      is_under: rawGap < -0.1,
      live_stock: m.live_stock,
      current_stock: m.live_stock, // Kiosk дээр бодит үлдэгдэл харагдана
      last_counted_at: m.last_counted_at, //  12 цагийн дотор дахиж гарахгүй
      is_critical: m.is_critical,
      is_suspicious_promoted: m.is_suspicious_promoted,
      promoted_until: m.promoted_until,
      total_spend_value: totalSpendValue
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

  // =========================================================================
  // 💡 ШИНЭЭР НЭМСЭН: 2. PARETO 80/20 AUTOMATIC ABC CLASSIFICATION ENGINE
  // =========================================================================
fullInventory.sort((a, b) => b.total_spend_value - a.total_spend_value);
  const totalSpendSum = fullInventory.reduce((sum, item) => sum + item.total_spend_value, 0);

  let cumulativeSpend = 0;
  fullInventory.forEach((item) => {
    cumulativeSpend += item.total_spend_value;
    const cumulativePct = totalSpendSum > 0 ? (cumulativeSpend / totalSpendSum) * 100 : 100;

    const isTemporarilyPromoted = item.is_suspicious_promoted && item.promoted_until && new Date(item.promoted_until) > now;

    // 💡 ЗАСВАР: Зөвхөн бодит өртөгтэй бөгөөд нийт зардлын 80%-д багтаж байвал л A-Class болно!
    if (isTemporarilyPromoted || item.is_critical || (item.total_spend_value > 0 && cumulativePct <= 80)) {
      item.abc_class = 'A';
    } else if (item.total_spend_value > 0 && cumulativePct <= 95) {
      item.abc_class = 'B';
    } else {
      item.abc_class = 'C';
    }
  });

  const bcCount = fullInventory.filter(i => i.abc_class !== 'A').length;
  const shiftsPerDay = 2;
  const cycleDays = 14;
  const optimalCycleCountPerShift = Math.max(2, Math.ceil(bcCount / (shiftsPerDay * cycleDays)));

  // =========================================================================
  // 💡 ШИНЭЭР НЭМСЭН: 3. WAC MARGIN GUARD (Үнийн өсөлт & Маржин хамгаалагч)
  // =========================================================================
  const marginAlerts: any[] = [];
  (rawProducts || []).forEach((prod: any) => {
    const productRecipes = (rawRecipes || []).filter((r: any) => cleanString(r.product_name).toLowerCase() === cleanString(prod.name).toLowerCase());
    let currentRecipeCost = 0;

    productRecipes.forEach((r: any) => {
      const ing = fullInventory.find((i: any) => i.name.toLowerCase() === cleanString(r.product_name).toLowerCase() || i.id === r.ingredient_id);
      const ingPrice = ing ? ing.price : (rawIngredients?.find((i: any) => i.id === r.ingredient_id)?.unit_price || 0);
      currentRecipeCost += (parseFloat(r.amount) || 0) * (parseFloat(ingPrice) || 0);
    });

    const sellingPrice = parseFloat(prod.selling_price) || 0;
    if (sellingPrice > 0 && currentRecipeCost > 0) {
      const currentMarginPct = ((sellingPrice - currentRecipeCost) / sellingPrice) * 100;
      const targetMarginPct = 75; // 75% Бохир ашгийн маржин

      if (currentMarginPct < targetMarginPct) {
        const rawSuggestedPrice = currentRecipeCost / (1 - (targetMarginPct / 100));
        const suggestedPrice = Math.ceil(rawSuggestedPrice / 500) * 500; // 500₮-өөр дээшээ бүхэлчлэх
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

  // =========================================================================
  // 💡 ШИНЭЭР НЭМСЭН: 4. CROSS-SHIFT FRAUD & INCIDENT MATRIX
  // =========================================================================
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
  
  const adjustedCogs = (rawActualCogs - totalLoggedTesting - totalLoggedStaffMeal - totalLoggedOther) || 0;
  const adjustedOpex = (dynamicOpexTotal + totalLoggedTesting + totalLoggedStaffMeal + totalLoggedOther + totalMonthlyDepreciation) || 0;
  
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
      worker: log.worker_name || 'Үл мэдэгдэх',
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
      gross_margin: netRevenue > 0 ? ((netRevenue - adjustedCogs) / netRevenue * 100).toFixed(2) + "%" : "0%",
      opex: adjustedOpex,
      depreciation: totalMonthlyDepreciation,
      ebit: finalEbit,
      net_profit: Math.round(finalEbit - activeTaxAmount) || 0,
      net_margin: netRevenue > 0 ? (((finalEbit - activeTaxAmount) / netRevenue) * 100).toFixed(2) + "%" : "0%"
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
      suggested_cycle_per_shift: optimalCycleCountPerShift
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