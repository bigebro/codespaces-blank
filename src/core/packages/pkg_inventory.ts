// src/core/packages/pkg_inventory.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { evaluateMenuItemEconomics } from "@/core/synapses/menu.synapse";
import {
  calculateDynamicParAndOrder,
  classifyAbcPareto,
} from "@/core/synapses/inventory.synapse";

export async function getPricingStrategyPackage(clientId: string) {
  const [
    { data: products },
    { data: recipes },
    { data: ingredients },
    { data: sales },
    { data: settings },
  ] = await Promise.all([
    supabaseAdmin.from("products").select("*").eq("client_id", clientId),
    supabaseAdmin.from("recipes").select("*").eq("client_id", clientId),
    supabaseAdmin.from("ingredients").select("*").eq("client_id", clientId),
    supabaseAdmin.from("sales_logs").select("product_name, quantity_sold").eq("client_id", clientId),
    supabaseAdmin.from("client_settings").select("category_margins").eq("client_id", clientId).maybeSingle(),
  ]);

  const salesMap: Record<string, number> = {};
  (sales || []).forEach((s) => {
    const key = (s.product_name || "").toLowerCase().trim();
    salesMap[key] = (salesMap[key] || 0) + (s.quantity_sold || 0);
  });

  const targetMargins = settings?.category_margins || {};
  return evaluateMenuItemEconomics(
    products || [],
    recipes || [],
    ingredients || [],
    salesMap,
    targetMargins
  );
}

export async function getProcurementForecastPackage(clientId: string) {
  const [
    { data: ingredients },
    { data: recipes },
    { data: sales },
  ] = await Promise.all([
    supabaseAdmin.from("ingredients").select("*").eq("client_id", clientId),
    supabaseAdmin.from("recipes").select("*").eq("client_id", clientId),
    supabaseAdmin
      .from("sales_logs")
      .select("product_name, quantity_sold, date")
      .eq("client_id", clientId)
      .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const ingMap = new Map((ingredients || []).map((i) => [i.id, i]));
  const usageMap: Record<string, number> = {};

  (sales || []).forEach((sale) => {
    const matched = (recipes || []).filter(
      (r) => r.product_name.toLowerCase().trim() === sale.product_name.toLowerCase().trim()
    );
    matched.forEach((r) => {
      usageMap[r.ingredient_id] =
        (usageMap[r.ingredient_id] || 0) + (sale.quantity_sold || 0) * (r.amount || 0);
    });
  });

  const computedItems = (ingredients || []).map((ing) => {
    const theoreticalUsage = usageMap[ing.id] || 0;
    const { activePar, suggestedOrder } = calculateDynamicParAndOrder({
      id: ing.id,
      name: ing.name,
      unit: ing.unit,
      unitPrice: Number(ing.unit_price) || 0,
      startStock: 0,
      purchasedQty: 0,
      endStock: Number(ing.current_stock) || 0,
      currentStock: Number(ing.current_stock) || 0,
      theoreticalUsage,
      parLevel: Number(ing.par_level) || 0,
      leadTimeDays: ing.lead_time_days || 1,
      daysOfSupply: ing.days_of_supply || 3,
      isCritical: Boolean(ing.is_critical),
      spoilageLogged: 0,
      testingLogged: 0,
      staffMealLogged: 0,
      otherLogged: 0,
    });

    const totalSpendValue = theoreticalUsage * (Number(ing.unit_price) || 0);

    return {
      id: ing.id,
      name: ing.name,
      unit: ing.unit,
      unitPrice: Number(ing.unit_price) || 0,
      currentStock: Number(ing.current_stock) || 0,
      activePar,
      suggestedOrder,
      isCritical: Boolean(ing.is_critical),
      totalSpendValue,
    };
  });

  const paretoClassified = classifyAbcPareto(computedItems);
  return {
    procurementOrders: paretoClassified.filter((item) => item.suggestedOrder > 0),
    inventoryList: paretoClassified,
  };
}