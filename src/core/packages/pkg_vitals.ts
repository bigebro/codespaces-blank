import { exactClientId } from "@/core/auth/tenant";
// src/core/packages/pkg_vitals.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface BusinessVitals {
  monthToDateRevenue: number;
  estimatedNetProfit: number;
  totalLoggedWasteMNT: number;
  currentCashBalance: number;
  currentBankBalance: number;
  activeShiftStatus: {
    isOpen: boolean;
    workerRole?: string;
    startTime?: string;
  };
}

export async function getVitals(clientId: string): Promise<BusinessVitals> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { data: sales },
    { data: wastes },
    { data: settings },
    { data: activeShift },
  ] = await Promise.all([
    supabaseAdmin
      .from("sales_logs")
      .select("total_revenue")
      .eq("client_id", exactClientId(clientId.trim()))
      .gte("date", startOfMonth),
    supabaseAdmin
      .from("inventory_logs")
      .select("total_cost")
      .eq("client_id", exactClientId(clientId.trim()))
      .in("type", ["spoilage", "staff_meal", "testing", "other"])
      .gte("date", startOfMonth),
    supabaseAdmin
      .from("client_settings")
      .select("initial_cash, initial_bank")
      .eq("client_id", exactClientId(clientId.trim()))
      .maybeSingle(),
    supabaseAdmin
      .from("shifts")
      .select("character_role, start_time")
      .eq("client_id", exactClientId(clientId.trim()))
      .eq("is_active", true)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const mtdRevenue = (sales || []).reduce(
    (sum, s) => sum + (Number(s.total_revenue) || 0),
    0
  );

  const mtdWaste = (wastes || []).reduce(
    (sum, w) => sum + Math.abs(Number(w.total_cost) || 0),
    0
  );

  // High-speed deterministic baseline estimate (average healthy F&B net margin: ~15%)
  const estNetProfit = Math.round(mtdRevenue * 0.15);

  return {
    monthToDateRevenue: Math.round(mtdRevenue),
    estimatedNetProfit: estNetProfit,
    totalLoggedWasteMNT: Math.round(mtdWaste),
    currentCashBalance: Number(settings?.initial_cash) || 0,
    currentBankBalance: Number(settings?.initial_bank) || 0,
    activeShiftStatus: activeShift
      ? {
          isOpen: true,
          workerRole: activeShift.character_role,
          startTime: activeShift.start_time,
        }
      : { isOpen: false },
  };
}