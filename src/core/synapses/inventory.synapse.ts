export interface InventoryCalculationItem {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  startStock: number;
  purchasedQty: number;
  endStock: number;
  currentStock: number;
  theoreticalUsage: number;
  parLevel: number;
  leadTimeDays: number;
  daysOfSupply: number;
  isCritical: boolean;
  isSuspiciousPromoted?: boolean;
  promotedUntil?: string | null;
  lastCountedAt?: string | null;
  spoilageLogged: number;
  testingLogged: number;
  staffMealLogged: number;
  otherLogged: number;
}

export function calculateDynamicParAndOrder(
  item: InventoryCalculationItem,
  maxDailyUsage = 0
) {
  const avgDailyUsage = item.theoreticalUsage / 30;
  const leadTime = item.leadTimeDays || 1;
  const maxLeadTime = leadTime + 2;

  const safetyStock = maxDailyUsage * maxLeadTime - avgDailyUsage * leadTime;
  const dynamicPar = avgDailyUsage * leadTime + Math.max(0, safetyStock);
  const activePar = item.parLevel > 0 ? item.parLevel : dynamicPar;

  const rawSuggestion =
    avgDailyUsage * item.daysOfSupply + activePar - item.currentStock;
  const suggestedOrder = Math.max(0, Math.round(rawSuggestion * 100) / 100);

  return {
    activePar: Math.round(activePar * 100) / 100,
    suggestedOrder,
  };
}

export function classifyAbcPareto<T extends { totalSpendValue: number; isCritical?: boolean }>(
  items: T[],
  now = new Date()
): (T & { abcClass: "A" | "B" | "C" })[] {
  const sorted = [...items].sort((a, b) => b.totalSpendValue - a.totalSpendValue);
  const totalSpendSum = sorted.reduce((sum, item) => sum + item.totalSpendValue, 0);

  let cumulativeSpend = 0;
  return sorted.map((item) => {
    cumulativeSpend += item.totalSpendValue;
    const cumulativePct =
      totalSpendSum > 0 ? (cumulativeSpend / totalSpendSum) * 100 : 100;

    if (item.isCritical || (item.totalSpendValue > 0 && cumulativePct <= 80)) {
      return { ...item, abcClass: "A" };
    }
    if (item.totalSpendValue > 0 && cumulativePct <= 95) {
      return { ...item, abcClass: "B" };
    }
    return { ...item, abcClass: "C" };
  });
}

export function auditItemDiscrepancy(item: InventoryCalculationItem) {
  const actualUsage = Math.max(
    0,
    item.startStock + item.purchasedQty - item.endStock
  );
  const rawGap = actualUsage - item.theoreticalUsage;
  const knownWaste =
    item.spoilageLogged +
    item.testingLogged +
    item.staffMealLogged +
    item.otherLogged;

  const unexplainedGap = Math.max(0, rawGap - knownWaste);
  const unexplainedCost = Math.round(unexplainedGap * item.unitPrice);
  const totalWasteLoss = Math.round(Math.max(0, rawGap) * item.unitPrice);

  return {
    actualUsage,
    rawGap,
    unexplainedGap,
    unexplainedCost,
    totalWasteLoss,
  };
}