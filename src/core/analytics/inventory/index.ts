export interface InventoryItemInput {
  id: string;
  name: string;
  liveStock: number;
  theoreticalUsage: number;
  unitPrice: number;
  leadTimeDays: number;
  daysOfSupply: number;
  parLevel: number;
  isCritical?: boolean;
}

/**
 * 1. Calculates Dynamic PAR and Suggested Order Quantity
 */
export function calculateOrderSuggestion(item: InventoryItemInput, maxDailyUsage = 0) {
  const avgDailyUsage = item.theoreticalUsage / 30;
  const leadTime = item.leadTimeDays || 1;
  const maxLeadTime = leadTime + 2;

  // Safety Stock formula
  const safetyStock = (maxDailyUsage * maxLeadTime) - (avgDailyUsage * leadTime);
  const dynamicPar = (avgDailyUsage * leadTime) + Math.max(0, safetyStock);

  // Use configured PAR level if set by owner, otherwise use dynamic calculation
  const activePar = item.parLevel > 0 ? item.parLevel : dynamicPar;
  
  // Suggested Order = (Daily demand * Buffer days) + PAR - Current Stock
  const rawSuggestion = (avgDailyUsage * item.daysOfSupply) + activePar - item.liveStock;
  const suggestedOrder = Math.max(0, Math.round(rawSuggestion * 100) / 100);

  return {
    parLevel: Math.round(activePar * 100) / 100,
    suggestedOrder,
  };
}

/**
 * 2. Pareto 80/20 Rule: Categorizes items into A, B, and C classes
 */
export function classifyAbcPareto<T extends { totalSpend: number; isCritical?: boolean }>(items: T[]): (T & { abcClass: 'A' | 'B' | 'C' })[] {
  // Sort descending by financial impact
  const sorted = [...items].sort((a, b) => b.totalSpend - a.totalSpend);
  const totalSpendSum = sorted.reduce((sum, item) => sum + item.totalSpend, 0);

  let cumulativeSpend = 0;

  return sorted.map((item) => {
    cumulativeSpend += item.totalSpend;
    const cumulativePct = totalSpendSum > 0 ? (cumulativeSpend / totalSpendSum) * 100 : 100;

    // A-Class: Top 80% spend or manually marked critical
    if (item.isCritical || (item.totalSpend > 0 && cumulativePct <= 80)) {
      return { ...item, abcClass: 'A' };
    }
    // B-Class: Next 15% spend (80% - 95%)
    if (item.totalSpend > 0 && cumulativePct <= 95) {
      return { ...item, abcClass: 'B' };
    }
    // C-Class: Bottom 5% spend
    return { ...item, abcClass: 'C' };
  });
}