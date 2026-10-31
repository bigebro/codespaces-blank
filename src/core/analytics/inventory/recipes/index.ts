export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  amount: number; // e.g. 16g, 200ml
  unitPrice: number;
}

export interface ProductRecipe {
  productName: string;
  sellingPrice: number;
  ingredients: RecipeIngredient[];
}

/**
 * 1. Calculates exact cost-per-cup and gross margin for a menu item
 */
export function calculateServingCost(recipe: ProductRecipe) {
  let costPerServing = 0;

  recipe.ingredients.forEach((ing) => {
    costPerServing += (ing.amount || 0) * (ing.unitPrice || 0);
  });

  const roundedCost = Math.round(costPerServing);
  const grossMargin = recipe.sellingPrice > 0 
    ? ((recipe.sellingPrice - roundedCost) / recipe.sellingPrice) * 100 
    : 0;

  return {
    costPerServing: roundedCost,
    grossProfit: Math.max(0, recipe.sellingPrice - roundedCost),
    grossMarginPct: Math.round(grossMargin * 10) / 10,
  };
}

/**
 * 2. Multiplies units sold by recipes to get total theoretical ingredient depletion
 */
export function calculateTheoreticalDepletion(
  salesLogs: { productName: string; quantitySold: number }[],
  recipesMap: Record<string, { ingredientName: string; amount: number }[]>
): Record<string, number> {
  const depletionMap: Record<string, number> = {};

  salesLogs.forEach((sale) => {
    const pName = sale.productName.toLowerCase().trim();
    const recipe = recipesMap[pName];

    if (recipe && sale.quantitySold > 0) {
      recipe.forEach((item) => {
        const ing = item.ingredientName;
        const totalUsed = sale.quantitySold * item.amount;
        depletionMap[ing] = (depletionMap[ing] || 0) + totalUsed;
      });
    }
  });

  return depletionMap;
}