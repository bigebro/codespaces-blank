export interface FixedAssetInput {
  name: string;
  code?: string;
  purchase_date?: string;
  initial_cost: number;
  useful_months: number;
}

export interface PnlSummaryInput {
  totalRevenue: number;
  rawActualCogs: number;
  totalTheoCogs: number;
  totalLoggedSpoilage: number;
  totalLoggedTesting: number;
  totalLoggedStaffMeal: number;
  totalLoggedOther: number;
  fixedOpexTotal: number;
  depreciationTotal: number;
  taxMode: string;
}

export function calculateDepreciation(
  fixedAssets: FixedAssetInput[],
  targetDate: Date
) {
  let totalMonthlyDepreciation = 0;
  const processed = fixedAssets.map((fa) => {
    const cost = Number(fa.initial_cost) || 0;
    const months = Number(fa.useful_months) || 60;
    const monthlyDep = months > 0 ? Math.round(cost / months) : 0;
    const pDate = new Date(fa.purchase_date || "2025-01-01");

    if (targetDate >= pDate) {
      totalMonthlyDepreciation += monthlyDep;
    }

    const monthsPassed = Math.max(
      0,
      (targetDate.getFullYear() - pDate.getFullYear()) * 12 +
        (targetDate.getMonth() - pDate.getMonth())
    );
    const accumulatedDep = Math.min(cost, monthlyDep * monthsPassed);
    const bookValue = Math.max(0, cost - accumulatedDep);

    return {
      name: fa.name,
      code: fa.code || "FA",
      purchaseDate: fa.purchase_date || "",
      initialCost: cost,
      usefulMonths: months,
      monthlyDep,
      accDep: accumulatedDep,
      bookValue,
    };
  });

  return { totalMonthlyDepreciation, processedAssets: processed };
}

export function calculatePnlLadder(input: PnlSummaryInput) {
  const isAbove300M = input.totalRevenue * 12 > 300_000_000;
  const netRevenue = Math.round(input.totalRevenue / 1.1);
  const estimatedVat10Pct = input.totalRevenue - netRevenue;

  const adjustedCogs = Math.max(
    0,
    input.rawActualCogs -
      input.totalLoggedTesting -
      input.totalLoggedStaffMeal -
      input.totalLoggedOther
  );

  const adjustedOpex = Math.max(
    0,
    input.fixedOpexTotal +
      input.totalLoggedTesting +
      input.totalLoggedStaffMeal +
      input.totalLoggedOther +
      input.depreciationTotal
  );

  const ebit = netRevenue - adjustedCogs - adjustedOpex;

  const simplifiedTax1Pct = Math.round(netRevenue * 0.01);
  const standardTax10Pct = ebit > 0 ? Math.round(ebit * 0.1) : 0;

  let activeTaxAmount = simplifiedTax1Pct;
  if (
    input.taxMode === "standard_10pct" ||
    (input.taxMode === "auto" && isAbove300M)
  ) {
    activeTaxAmount = standardTax10Pct;
  }

  const netProfit = ebit - activeTaxAmount;
  const grossProfit = Math.max(0, netRevenue - adjustedCogs);

  return {
    revenue: input.totalRevenue,
    netRevenue,
    actualCogs: adjustedCogs,
    theoCogs: input.totalTheoCogs,
    grossProfit,
    grossMarginPct:
      netRevenue > 0
        ? Number(((grossProfit / netRevenue) * 100).toFixed(2))
        : 0,
    opex: adjustedOpex,
    depreciation: input.depreciationTotal,
    ebit,
    netProfit,
    netMarginPct:
      netRevenue > 0 ? Number(((netProfit / netRevenue) * 100).toFixed(2)) : 0,
    taxSummary: {
      isAbove300M,
      taxMode:
        input.taxMode === "standard_10pct" ||
        (input.taxMode === "auto" && isAbove300M)
          ? "Энгийн 10%"
          : "Хялбаршуулсан 1%",
      simplifiedTax1Pct,
      standardTax10Pct,
      activeTaxAmount,
      estimatedVat10Pct,
    },
  };
}