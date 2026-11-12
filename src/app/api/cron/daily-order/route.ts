import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAnalyticsData } from "@/lib/analytics";
import { rejectMissingCron, exactClientId } from "@/core/auth/tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = rejectMissingCron(request);
  if (denied) return denied;

  const { data: tenants, error } = await supabaseAdmin
    .from("tenants")
    .select("client_id")
    .eq("status", "active");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (let i = 0; i < (tenants || []).length; i += 3) {
    const batch = (tenants || []).slice(i, i + 3);
    const settled = await Promise.all(batch.map(async (tenant) => {
      try {
        const clientId = exactClientId(tenant.client_id);
        const analytics = await getAnalyticsData(clientId);
        const lowItems = (analytics.all_inventory_data || []).filter((item: { is_low?: boolean; suggested_order?: number }) => item.is_low && (item.suggested_order || 0) > 0);
        if (!lowItems.length) return { clientId, alerts: 0 };
        await supabaseAdmin.from("alerts").insert({
          client_id: clientId,
          kind: "low_stock",
          title: "Агуулахын нөөц багассан",
          body: lowItems.map((item: { name: string; live_stock: number; unit: string; suggested_order: number }) =>
            `${item.name}: үлдэгдэл ${Math.round(item.live_stock * 10) / 10} ${item.unit}, захиалах ${item.suggested_order} ${item.unit}`
          ).join("\n"),
          payload: { lines: lowItems.map((item: { name: string; suggested_order: number; unit: string }) => ({ name: item.name, qty: item.suggested_order, unit: item.unit })) },
          status: "pending",
        });
        return { clientId, alerts: 1 };
      } catch (err) {
        return { clientId: tenant.client_id, error: err instanceof Error ? err.message : "failed" };
      }
    }));
    results.push(...settled);
  }

  return NextResponse.json({ success: true, results });
}
