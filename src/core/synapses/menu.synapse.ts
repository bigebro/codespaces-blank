export interface RecipeItem {
  product_name: string;
  ingredient_id: string;
  amount: number;
}

export interface IngredientPricing {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
}

export interface MenuItemInput {
  id: string;
  name: string;
  category: string;
  selling_price: number;
}

export function evaluateMenuItemEconomics(
  products: MenuItemInput[],
  recipes: RecipeItem[],
  ingredients: IngredientPricing[],
  salesMap: Record<string, number>,
  targetMargins: Record<string, number>
) {
  const defaultMargins: Record<string, number> = {
    HOT_BEVERAGE: 82,
    COLD_BEVERAGE: 78,
    FOOD_PREP: 68,
    BAKERY_DESSERT: 75,
    RETAIL_FMCG: 50,
    GENERAL: 70,
  };

  const menuPerformance = products.map((prod) => {
    const prodRecipes = recipes.filter(
      (r) => r.product_name.toLowerCase().trim() === prod.name.toLowerCase().trim()
    );

    let costPerCup = 0;
    prodRecipes.forEach((r) => {
      const ing = ingredients.find((i) => i.id === r.ingredient_id);
      costPerCup += (r.amount || 0) * (ing?.unit_price || 0);
    });

    costPerCup = Math.round(costPerCup);
    const sellingPrice = Number(prod.selling_price) || 0;
    const soldQty = salesMap[prod.name.toLowerCase().trim()] || 0;
    const grossMarginPct =
      sellingPrice > 0 ? ((sellingPrice - costPerCup) / sellingPrice) * 100 : 0;

    return {
      productId: prod.id,
      name: prod.name,
      category: prod.category || "GENERAL",
      sellingPrice,
      costPerCup,
      soldQty,
      totalRevenue: sellingPrice * soldQty,
      totalCost: costPerCup * soldQty,
      grossProfit: Math.max(0, (sellingPrice - costPerCup) * soldQty),
      grossMarginPct: Math.round(grossMarginPct * 10) / 10,
    };
  });

  const marginAlerts = menuPerformance
    .filter((m) => {
      const target = targetMargins[m.category] || defaultMargins[m.category] || 70;
      return m.sellingPrice > 0 && m.costPerCup > 0 && m.grossMarginPct < target;
    })
    .map((m) => {
      const target = targetMargins[m.category] || defaultMargins[m.category] || 70;
      const suggestedPrice = Math.ceil(m.costPerCup / (1 - target / 100) / 500) * 500;
      return {
        productName: m.name,
        category: m.category,
        currentPrice: m.sellingPrice,
        costPerCup: m.costPerCup,
        currentMarginPct: `${m.grossMarginPct}%`,
        targetMarginPct: `${target}%`,
        suggestedPrice,
        priceGap: suggestedPrice - m.sellingPrice,
      };
    });

  return { menuPerformance, marginAlerts };
}