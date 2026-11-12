import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runNightlyAuditForTenant } from "@/ai/memory/data_auditor";
import { createAlert } from "@/lib/alerts";
import { markPastDueTenants, getTenantBilling } from "@/lib/subscription";
import { runWeeklyBrief } from "@/core/packages/pkg_weekly_brief";

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

async function weeklyBriefDue(clientId: string) {
  const { data } = await supabaseAdmin
    .from("weekly_briefs")
    .select("created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.created_at) return true;
  return Date.now() - new Date(data.created_at).getTime() > 7 * 24 * 60 * 60 * 1000;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let pastDueUpdated = 0;
  try {
    pastDueUpdated = await markPastDueTenants();
  } catch (err) {
    console.error("past_due update failed:", err);
  }

  const { data: tenants, error: tenantErr } = await supabaseAdmin
    .from("tenants")
    .select("client_id")
    .neq("status", "past_due");

  if (tenantErr || !tenants) {
    return NextResponse.json({ error: tenantErr?.message || "No tenants" }, { status: 500 });
  }

  const results: { clientId: string; ok: boolean; anomalies?: number; error?: string }[] = [];

  await mapPool(tenants, 3, async (tenant) => {
    try {
      const billing = await getTenantBilling(tenant.client_id);
      if (billing?.pastDue) {
        results.push({ clientId: tenant.client_id, ok: true, error: "skipped_past_due" });
        return;
      }
      const stats = await runNightlyAuditForTenant(tenant.client_id);
      for (const finding of stats.findings) {
        await createAlert({
          clientId: tenant.client_id,
          kind: "finding",
          title: finding.title,
          body: finding.body,
          evidence: finding.evidenceLogIds,
          payload: {
            impact: finding.impact,
            evidenceLogIds: finding.evidenceLogIds,
            taskName: `Шалгах: ${finding.title}`,
            role: "Бүх ажилтан",
            reason: finding.body,
          },
        });
      }
      results.push({ clientId: tenant.client_id, ok: true, anomalies: stats.anomalies });
    } catch (err: unknown) {
      results.push({
        clientId: tenant.client_id,
        ok: false,
        error: err instanceof Error ? err.message : "failed",
      });
    }
    try {
      if (await weeklyBriefDue(tenant.client_id)) {
        await runWeeklyBrief(tenant.client_id);
      }
    } catch (briefErr) {
      console.error("[weekly brief]", tenant.client_id, briefErr);
    }
  });

  return NextResponse.json({
    success: true,
    pastDueUpdated,
    auditedTenantsCount: results.filter((r) => r.ok).length,
    results,
  });
}
