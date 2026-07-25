import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

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
  return String(str || "").replace(/[\u00a0\s]+/g, " ").replace(/\./g, "").trim();
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '2026-05-30T00:00:00.000Z';
    const endDate = searchParams.get('endDate') || '2026-06-30T23:59:59.999Z';

    const { data: rawIngredients } = await supabase.from('ingredients').select('*');
    const { data: rawRecipes } = await supabase.from('recipes').select('*');

    const { data: rawInventoryLogs } = await supabase
      .from('inventory_logs')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    const { data: rawSales } = await supabase
      .from('sales_logs')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (!rawIngredients || !rawRecipes || !rawInventoryLogs || !rawSales) {
      return NextResponse.json({ error: "Failed to fetch necessary database tables" }, { status: 400 });
    }

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
        end: parseFloat(ing.current_stock) || 0, // Fallback to live stock [1]
        theoretical: 0,
        unit_price: parseFloat(ing.unit_price) || 0,
        unit: ing.unit
      };
    });

    rawInventoryLogs.forEach((log: any) => {
      const cost = parseFloat(log.total_cost) || 0;
      const qty = parseFloat(log.quantity) || 0; 

      if (log.type === 'purchase' && !log.ingredient_id) {
        totalOpex += cost;
        opexDetails.push({
          category: "Хүнсний бус татан авалт (OPEX)",
          item: `${log.non_food_item || 'Бусад зардал'} (тоо хэмжээ: ${Math.round(qty)})`,
          cost: Math.round(cost)
        });
        return;
      }

      const ing = rawIngredients.find((i: any) => i.id === log.ingredient_id);
      if (!ing) return;
      const key = cleanString(ing.name);

      if (log.type === 'count') {
        const noteText = (log.notes || "").toLowerCase();
        if (noteText.includes("start") || noteText.includes("эхний")) {
          master[key].start = qty; 
        } else {
          master[key].end = qty; 
        }
      } else if (log.type === 'purchase') {
        master[key].purchased += qty;
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

        const sellPrice = pName === "Tiramisu" ? 11900 : pName === "Caffe Latte" ? 9500 : pName === "Americano" ? 8000 : 5000;

        menuPerformance.push({
          name: pName,
          sold: qtySold,
          profit: Math.round((sellPrice - estCost) * qtySold),
          unit_margin: sellPrice - estCost,
          food_cost_pct: sellPrice > 0 ? estCost / sellPrice : 0,
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

      if (log.type === 'count' || log.type === 'purchase') return;

      if (log.type === 'spoilage') loggedEvents[nameKey].spoilage += qty;
      else if (log.type === 'testing') loggedEvents[nameKey].testing += qty;
      else if (log.type === 'staff_meal') loggedEvents[nameKey].staff_meal += qty;
      else if (log.type === 'sale') {
        // Ignored
      } else {
        loggedEvents[nameKey].other += qty;
      }

      if (log.notes && log.notes !== `${log.type} logged manually`) {
        loggedEvents[nameKey].notes.push(log.notes);
      }
    });

    const fullInventory: any[] = [];
    const spoilageList: string[] = [];
    const testingList: string[] = [];
    const staffMealList: string[] = [];
    const otherList: string[] = [];

    for (const key in master) {
      const m = master[key];
      
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
      
      // SAFE COGS SAFEGUARD: Prevent unbacked database stock levels from generating negative consumption [1]
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

      if (itemLogs.spoilage > 0) spoilageList.push(`${m.name}: ${itemLogs.spoilage} ${m.unit} (₮${Math.round(itemLogs.spoilage * m.unit_price).toLocaleString()})${noteStr}`);
      if (itemLogs.testing > 0) testingList.push(`${m.name}: ${Math.round(itemLogs.testing * 10)/10} ${m.unit} (₮${Math.round(itemLogs.testing * m.unit_price).toLocaleString()})${noteStr}`);
      if (itemLogs.staff_meal > 0) staffMealList.push(`${m.name}: ${itemLogs.staff_meal} ${m.unit} (₮${Math.round(itemLogs.staff_meal * m.unit_price).toLocaleString()})${noteStr}`);
      if (itemLogs.other > 0) otherList.push(`${m.name}: ${itemLogs.other} ${m.unit} (₮${Math.round(itemLogs.other * m.unit_price).toLocaleString()})${noteStr}`);

      fullInventory.push({
        name: m.name,
        theoretical: Math.round(m.theoretical * 100) / 100 || 0,
        raw_physical_gap: Math.abs(Math.round(rawGap * 100) / 100) || 0,
        raw_physical_impact: Math.abs(impact) || 0,
        gap: Math.abs(Math.round(unexplainedGap * 100) / 100) || 0,
        impact: Math.abs(unexplainedImpact) || 0,
        spoilage: itemLogs.spoilage || 0,
        testing: itemLogs.testing || 0,
        staff_meal: itemLogs.staff_meal || 0,
        other: itemLogs.other || 0,
        notes: noteStr,
        unit: m.unit,
        price: m.unit_price || 0,
        is_waste: unexplainedGap > 0.1,
        is_under: rawGap < -0.1
      });
    }
// Spoilage stays inside COGS (adding to your food cost).
// Testing, Staff Meals, and Other are subtracted and moved to OPEX [3].
const adjustedCogs = (rawActualCogs - totalLoggedTesting - totalLoggedStaffMeal - totalLoggedOther) || 0;

// OPEX increases by the shifted logs [3].
const adjustedOpex = (totalOpex + totalLoggedTesting + totalLoggedStaffMeal + totalLoggedOther) || 0;
    const finalEbit = (totalRevenue - adjustedCogs - adjustedOpex) || 0;

    return NextResponse.json({
      financial_ladder: {
        revenue: totalRevenue,
        actual_cogs: adjustedCogs,
        theo_cogs: totalTheoCogs,
        gross_margin: totalRevenue > 0 ? ((totalRevenue - adjustedCogs) / totalRevenue * 100).toFixed(2) + "%" : "0%",
        opex: adjustedOpex,
        ebit: finalEbit,
        net_profit: Math.round(finalEbit * 0.9) || 0,
        net_margin: totalRevenue > 0 ? ((finalEbit * 0.9) / totalRevenue * 100).toFixed(2) + "%" : "0%"
      },
      top_wasters: fullInventory.filter(i => i.is_waste).sort((a,b) => b.impact - a.impact).slice(0, 3),
      top_underpoured: fullInventory.filter(i => i.is_under).sort((a,b) => b.impact - a.impact).slice(0, 3),
      top_expensive: fullInventory.sort((a,b) => b.price - a.price).slice(0, 3),
      menu_performance: menuPerformance.sort((a,b) => b.sold - a.sold),
      all_recipes: allRecipesMap,
      all_inventory_data: fullInventory,
      underpoured_only: fullInventory.filter(i => i.is_under).sort((a,b) => b.raw_physical_gap - a.raw_physical_gap),
      wasted_only: fullInventory.filter(i => i.is_waste).sort((a,b) => b.impact - a.impact),
      opex_details: opexDetails,
      total_waste_loss: totalWasteLoss || 0,
      total_unexplained_waste: totalUnexplainedWaste || 0,
      total_surplus_savings: totalSurplusSavings || 0,
      total_logged_spoilage: totalLoggedSpoilage || 0,
      total_logged_testing: totalLoggedTesting || 0,
      total_logged_staff_meal: totalLoggedStaffMeal || 0,
      total_logged_other: totalLoggedOther || 0,
      logged_spoilage_list: spoilageList,
      logged_testing_list: testingList,
      logged_staff_meal_list: staffMealList,
      logged_other_list: otherList,
      efficiency: rawActualCogs > 0 ? ((totalTheoCogs / rawActualCogs) * 100).toFixed(2) + "%" : "0%"
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}