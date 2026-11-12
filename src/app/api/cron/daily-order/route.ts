import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAnalyticsData } from "@/lib/analytics";
import { createAlert } from "@/lib/alerts";
import { getTenantBilling } from "@/lib/subscription";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function mapPool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tenants, error } = await supabaseAdmin
    .from("tenants")
    .select("client_id")
    .eq("status", "active");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { clientId: string; ok: boolean; error?: string }[] = [];

  await mapPool(tenants || [], 4, async (tenant) => {
    try {
      const billing = await getTenantBilling(tenant.client_id);
      if (billing?.pastDue) {
        results.push({ clientId: tenant.client_id, ok: true, error: "skipped_past_due" });
        return;
      }
      const analyticsData = await getAnalyticsData(tenant.client_id);
      const lowItems = analyticsData.all_inventory_data?.filter(
        (item: { is_low?: boolean; suggested_order?: number }) => item.is_low && (item.suggested_order || 0) > 0,
      ) || [];
      if (lowItems.length > 0) {
        const body = lowItems
          .slice(0, 12)
          .map(
            (item: { name: string; live_stock: number; unit: string; suggested_order: number }) =>
              `${item.name}: үлдэгдэл ${Math.round(item.live_stock * 10) / 10} ${item.unit}, захиалах ${item.suggested_order} ${item.unit}`,
          )
          .join("\n");
        await createAlert({
          clientId: tenant.client_id,
          kind: "low_stock",
          title: "Өглөөний нөөцийн сануулга",
          body,
          status: "info",
          payload: { count: lowItems.length },
        });
      }
      results.push({ clientId: tenant.client_id, ok: true });
    } catch (err: unknown) {
      results.push({
        clientId: tenant.client_id,
        ok: false,
        error: err instanceof Error ? err.message : "failed",
      });
    }
  });

  return NextResponse.json({ success: true, results });
}
