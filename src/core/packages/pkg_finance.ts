// src/core/packages/pkg_finance.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateDepreciation, calculatePnlLadder } from "@/core/synapses/pnl.synapse";
import { reconcileCashflow } from "@/core/synapses/cashflow.synapse";

export async function getProfitabilityPackage(
  clientId: string,
  startDate?: string,
  endDate?: string
) {
  const now = new Date();
  const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = endDate || now.toISOString();

  const [
    { data: sales },
    { data: ingredients },
    { data: recipes },
    { data: inventoryLogs },
    { data: fixedOpex },
    { data: fixedAssets },
    { data: settings },
  ] = await Promise.all([
    supabaseAdmin
      .from("sales_logs")
      .select("total_revenue, quantity_sold, product_name, payment_method")
      .ilike("client_id", clientId)
      .gte("date", start)
      .lte("date", end),
    supabaseAdmin.from("ingredients").select("*").ilike("client_id", clientId),
    supabaseAdmin.from("recipes").select("*").ilike("client_id", clientId),
    supabaseAdmin
      .from("inventory_logs")
      .select("*")
      .ilike("client_id", clientId)
      .gte("date", start)
      .lte("date", end),
    supabaseAdmin
      .from("fixed_opex")
      .select("monthly_cost, category, name")
      .ilike("client_id", clientId)
      .eq("is_active", true),
    supabaseAdmin.from("fixed_assets").select("*").ilike("client_id", clientId),
    supabaseAdmin.from("client_settings").select("*").ilike("client_id", clientId).maybeSingle(),
  ]);

  const totalRevenue = (sales || []).reduce((acc, s) => acc + (Number(s.total_revenue) || 0), 0);
  const fixedOpexTotal = (fixedOpex || []).reduce((acc, o) => acc + (Number(o.monthly_cost) || 0), 0);

  // Theoretical recipe cost
  let totalTheoCogs = 0;
  const ingMap = new Map((ingredients || []).map((i) => [i.id, i]));
  (sales || []).forEach((sale) => {
    const matched = (recipes || []).filter(
      (r) => r.product_name.toLowerCase().trim() === sale.product_name.toLowerCase().trim()
    );
    matched.forEach((r) => {
      const ing = ingMap.get(r.ingredient_id);
      totalTheoCogs += (sale.quantity_sold || 0) * (r.amount || 0) * (Number(ing?.unit_price) || 0);
    });
  });

  let totalLoggedSpoilage = 0;
  let totalLoggedTesting = 0;
  let totalLoggedStaffMeal = 0;
  let totalLoggedOther = 0;

  (inventoryLogs || []).forEach((log) => {
    const cost = Math.abs(Number(log.total_cost) || 0);
    if (log.type === "spoilage") totalLoggedSpoilage += cost;
    else if (log.type === "testing") totalLoggedTesting += cost;
    else if (log.type === "staff_meal") totalLoggedStaffMeal += cost;
    else if (log.type === "other") totalLoggedOther += cost;
  });

  const { totalMonthlyDepreciation } = calculateDepreciation(
    (fixedAssets || []).map((fa) => ({
      name: fa.name,
      initial_cost: fa.initial_cost,
      useful_months: fa.useful_months,
      purchase_date: fa.purchase_date,
    })),
    new Date(end)
  );

  const rawActualCogs = totalTheoCogs + totalLoggedSpoilage;

  const pnl = calculatePnlLadder({
    totalRevenue,
    rawActualCogs,
    totalTheoCogs,
    totalLoggedSpoilage,
    totalLoggedTesting,
    totalLoggedStaffMeal,
    totalLoggedOther,
    fixedOpexTotal,
    depreciationTotal: totalMonthlyDepreciation,
    taxMode: settings?.tax_mode || "auto",
  });


  // ⚡ ШИНЭ: 1. E-Barimt-ийн харьцааг бодох (purchases_summary)
  let ebarimtPurchases = 0;
  let noEbarimtPurchases = 0;
  (inventoryLogs || []).forEach((l) => {
    if (l.type === 'purchase') {
      const cost = Math.abs(Number(l.total_cost) || 0);
      if (l.is_ebarimt) ebarimtPurchases += cost;
      else noEbarimtPurchases += cost;
    }
  });

   // ⚡ ШИНЭ: 2. Аль цэс хамгийн сайн зарагдсаныг бодох (menu_performance)
  const menuSalesMap: Record<string, { qty: number, revenue: number }> = {};
  (sales || []).forEach((s) => {
    const name = s.product_name;
    if (!menuSalesMap[name]) menuSalesMap[name] = { qty: 0, revenue: 0 };
    menuSalesMap[name].qty += Number(s.quantity_sold) || 0;
    menuSalesMap[name].revenue += Number(s.total_revenue) || 0;
  });
  
  const menu_performance = Object.keys(menuSalesMap).map(name => ({
    product_name: name,
    quantity_sold: menuSalesMap[name].qty,
    total_revenue: menuSalesMap[name].revenue
  })).sort((a, b) => b.quantity_sold - a.quantity_sold);

  return {
    period: { start, end },
    pnl,
    fixedOpexList: fixedOpex || [],
       purchases_summary: {
      with_ebarimt: ebarimtPurchases,
      without_ebarimt: noEbarimtPurchases,
      total: ebarimtPurchases + noEbarimtPurchases
    },
    menu_performance: menu_performance,
    // 1. Бүх түүхий эдийн нэгж үнэ болон үлдэгдлийг AI-д харуулах:
    ingredientPrices: (ingredients || []).map((i) => ({
      name: i.name,
      unit: i.unit,
      unit_price_mnt: Number(i.unit_price) || 0,
      current_stock: Number(i.current_stock) || 0,
    })),
    
    // 2. Бүх жорын орцын задаргаа болон өртгийг AI-д харуулах:
    recipeDetails: (recipes || []).map((r) => {
      const ing = ingMap.get(r.ingredient_id);
      return {
        product: r.product_name,
        ingredient: ing?.name || "Тодорхойгүй",
        amount: Number(r.amount) || 0,
        unit: ing?.unit || "гр/мл",
        cost: (Number(r.amount) || 0) * (Number(ing?.unit_price) || 0),
      };
    }),
  };
}

export async function getCashflowPackage(
  clientId: string,
  startDate?: string,
  endDate?: string
) {
  const now = new Date();
  const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = endDate || now.toISOString();

  const [
    { data: sales },
    { data: logs },
    { data: settings },
    { data: fixedAssets },
    { data: fixedOpex },
  ] = await Promise.all([
    supabaseAdmin
      .from("sales_logs")
      .select("total_revenue, payment_method")
      .ilike("client_id", clientId)
      .gte("date", start)
      .lte("date", end),
    supabaseAdmin
      .from("inventory_logs")
      .select("*")
      .ilike("client_id", clientId)
      .gte("date", start)
      .lte("date", end),
    supabaseAdmin.from("client_settings").select("*").ilike("client_id", clientId).maybeSingle(),
    supabaseAdmin.from("fixed_assets").select("*").ilike("client_id", clientId),
    supabaseAdmin.from("fixed_opex").select("monthly_cost").ilike("client_id", clientId).eq("is_active", true),
  ]);

  let cashRevenue = 0;
  let bankRevenue = 0;
  (sales || []).forEach((s) => {
    const rev = Number(s.total_revenue) || 0;
    if (s.payment_method === "cash") cashRevenue += rev;
    else bankRevenue += rev;
  });

  let purchasesCashPaid = 0;
  let purchasesBankPaid = 0;
  let ownerDraws = 0;

  (logs || []).forEach((l) => {
    const cost = Math.abs(Number(l.total_cost) || 0);
    const note = (l.notes || "").toLowerCase();
    if (note.includes("draw") || note.includes("эзний")) {
      ownerDraws += cost;
    } else if (l.type === "purchase") {
      if (l.payment_method === "cash") purchasesCashPaid += cost;
      else purchasesBankPaid += cost;
    }
  });

  const fixedOpexTotal = (fixedOpex || []).reduce((acc, o) => acc + (Number(o.monthly_cost) || 0), 0);
  const fixedAssetsPaidBank = (fixedAssets || []).reduce((acc, fa) => {
    const pDate = new Date(fa.purchase_date || "");
    if (pDate >= new Date(start) && pDate <= new Date(end)) {
      return acc + (Number(fa.initial_cost) || 0);
    }
    return acc;
  }, 0);

  const cashflow = reconcileCashflow({
    initialCash: Number(settings?.initial_cash) || 0,
    initialBank: Number(settings?.initial_bank) || 0,
    cashRevenue,
    bankRevenue,
    purchasesCashPaid,
    purchasesBankPaid,
    adjustedOpex: fixedOpexTotal,
    ownerDraws,
    fixedAssetsPaidBank,
  });

  return cashflow;
}