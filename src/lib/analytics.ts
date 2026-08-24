import { supabase } from './supabase';

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
  startDate: string = '2026-05-30T00:00:00.000Z',
  endDate: string = '2026-06-30T23:59:59.999Z'
) {
  // 1. Fetch tables directly
  const [
    { data: rawIngredients },
    { data: rawRecipes },
    { data: rawInventoryLogs },
    { data: rawSales },
    { data: rawShifts },
    { data: rawProducts }
  ] = await Promise.all([
    supabase.from('ingredients').select('*').eq('client_id', clientId),
    supabase.from('recipes').select('*').eq('client_id', clientId),
    supabase.from('inventory_logs').select('*').eq('client_id', clientId).lte('date', endDate),
    supabase.from('sales_logs').select('*').eq('client_id', clientId).gte('date', startDate).lte('date', endDate),
    supabase.from('shifts').select('*').eq('client_id', clientId).gte('start_time', startDate).lte('start_time', endDate),
    supabase.from('products').select('*').eq('client_id', clientId)
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
  let totalOpex = 2200000; 
  let rawActualCogs = 0;
  let totalTheoCogs = 0;
  let totalWasteLoss = 0;
  let totalSurplusSavings = 0;
  let totalLoggedSpoilage = 0;
  let totalLoggedTesting = 0;
  let totalLoggedStaffMeal = 0;
  let totalLoggedOther = 0;
  let totalUnexplainedWaste = 0;

  const opexDetails = [
    { category: "Тогтмол зардал", item: "Rent & Utilities (Түрээс, ашиглалт)", cost: 1200000 },
    { category: "Тогтмол зардал", item: "Fixed Salaries (Тогтмол цалин)", cost: 1000000 }
  ];

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
      last_counted_at: ing.last_counted_at || '2000-01-01T00:00:00Z', 
      theoretical: 0,
      unit_price: parseFloat(ing.unit_price) || 0,
      unit: ing.unit,
      par_level: parseFloat(ing.par_level) || 0,
      lead_time_days: parseInt(ing.lead_time_days) || 1,
      days_of_supply: parseInt(ing.days_of_supply) || 3
    };
  });

  const startDay = startDate.split('T')[0];
  const endDay = endDate.split('T')[0];

  rawInventoryLogs.forEach((log: any) => {
    const cost = parseFloat(log.total_cost) || 0;
    const qty = parseFloat(log.quantity) || 0; 
    const logDate = log.date ? log.date.split('T')[0] : '';

    if (log.type === 'purchase' && !log.ingredient_id) {
      if (logDate >= startDay && logDate <= endDay) {
        totalOpex += cost;
        opexDetails.push({
          category: "Хүнсний бус татан авалт (OPEX)",
          item: `${log.non_food_item || 'Бусад зардал'} (тоо: ${Math.round(qty)})`,
          cost: Math.round(cost)
        });
      }
      return;
    }

    const ing = rawIngredients.find((i: any) => i.id === log.ingredient_id);
    if (!ing) return;
    const key = cleanString(ing.name);

    if (log.type === 'count') {
      const noteText = (log.notes || "").toLowerCase();
      if (noteText.includes("start") || noteText.includes("эхний") || logDate <= startDay) {
        master[key].start = qty; 
      } 
      if (logDate >= startDay && logDate <= endDay && (noteText.includes("end") || noteText.includes("эцсийн") || !noteText.includes("start"))) {
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
    productSales[finalKey] = (productSales[finalKey] || 0) + qty;
  });

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
        recipe: drinkRecipe
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

    const noteStr = itemLogs.notes.length > 0 ? " (Тайлбар: " + [...new Set(itemLogs.notes)].join(", ") + ")" : "";

    fullInventory.push({
      name: m.name,
      par_level: Math.round(activeParLevel * 100) / 100, 
      suggested_order: finalSuggestion,
      theoretical: Math.round(m.theoretical * 100) / 100 || 0,
      gap: Math.abs(Math.round(unexplainedGap * 100) / 100) || 0,
      impact: Math.abs(unexplainedImpact) || 0,
      unit: m.unit,
      price: m.unit_price || 0,
      is_waste: unexplainedGap > 0.1,
      is_under: rawGap < -0.1,
      live_stock: m.live_stock
    });
  }

  const adjustedCogs = (rawActualCogs - totalLoggedTesting - totalLoggedStaffMeal - totalLoggedOther) || 0;
  const adjustedOpex = (totalOpex + totalLoggedTesting + totalLoggedStaffMeal + totalLoggedOther) || 0;
  const finalEbit = (totalRevenue - adjustedCogs - adjustedOpex) || 0;
  const simplifiedTax1Pct = Math.round(totalRevenue * 0.01);

  // 💡 src/lib/analytics.ts файлын төгсгөлийн return хэсэг:
  return {
    financial_ladder: {
      revenue: totalRevenue,
      actual_cogs: adjustedCogs,
      theo_cogs: totalTheoCogs,
      gross_margin: totalRevenue > 0 ? ((totalRevenue - adjustedCogs) / totalRevenue * 100).toFixed(2) + "%" : "0%",
      opex: adjustedOpex,
      ebit: finalEbit,
      net_profit: Math.round(finalEbit - simplifiedTax1Pct) || 0,
      net_margin: totalRevenue > 0 ? (((finalEbit - simplifiedTax1Pct) / totalRevenue) * 100).toFixed(2) + "%" : "0%"
    },
    top_wasters: fullInventory.filter(i => i.is_waste).sort((a,b) => b.impact - a.impact).slice(0, 3),
    top_expensive: fullInventory.sort((a,b) => b.price - a.price).slice(0, 3),
    
    // 🚀 AI-Д ЗОРИУЛСАН БҮРЭН ДЭЛГЭРЭНГҮЙ МАССИВУУД (БҮГДИЙГ 100% БҮРЭН ӨГНӨ):
    all_inventory_data: fullInventory,
    wasted_only: fullInventory.filter(i => i.is_waste).sort((a,b) => b.impact - a.impact), // Бүх хаягдсан барааны бүтэн жагсаалт
    underpoured_only: fullInventory.filter(i => i.is_under).sort((a,b) => b.impact - a.impact), // Бүх дутуу хийгдсэн/илүүдлийн жагсаалт
    menu_performance: menuPerformance.sort((a,b) => b.sold - a.sold), // Бүх менюний зарах үнэ, өртөг, ашиг
    all_recipes: allRecipesMap, // Бүх ундаа хоолны бүтэн жор
    opex_details: opexDetails, // OPEX зардлын бүх гүйлгээ
    recent_shifts: rawShifts || [], // Бүх ажилчдын ээлж ба даалгавар
    all_timeline_logs: rawInventoryLogs || [], // Бүх өдрийн гүйлгээний түүх
    total_waste_loss: totalWasteLoss || 0,
    total_unexplained_waste: totalUnexplainedWaste || 0,
    total_surplus_savings: totalSurplusSavings || 0,
    efficiency: rawActualCogs > 0 ? ((totalTheoCogs / rawActualCogs) * 100).toFixed(2) + "%" : "0%"
  };
}