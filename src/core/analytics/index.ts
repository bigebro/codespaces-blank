import { getAnalyticsData } from "@/lib/analytics";

export async function fetchPnlData(clientId: string, startDate?: string, endDate?: string) {
  const data = await getAnalyticsData(clientId, startDate, endDate);
  return {
    financialLadder: data.financial_ladder,
    taxSummary: data.tax_summary,
    cashflow: data.cashflow_summary,
  };
}

export async function fetchInventoryWasteAudit(clientId: string, startDate?: string, endDate?: string) {
  const data = await getAnalyticsData(clientId, startDate, endDate);
  return {
    topWasters: data.top_wasters,
    totalWasteLoss: data.total_waste_loss,
    unexplainedWaste: data.total_unexplained_waste,
    wasteActItems: data.waste_act_items,
    allInventory: data.all_inventory_data,
  };
}