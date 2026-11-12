import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runNightlyAuditForTenant } from "@/ai/memory/data_auditor";
import { rejectMissingCron, exactClientId } from "@/core/auth/tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function runPool<T, R>(items: T[], size: number, worker: (item: T) => Promise<R>) {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const settled = await Promise.all(batch.map(async (item) => {
      try {
        return await worker(item);
      } catch (err) {
        const message = err instanceof Error ? err.message : "failed";
        return { error: message } as R;
      }
    }));
    results.push(...settled);
  }
  return results;
}

export async function GET(request: Request) {
  const denied = rejectMissingCron(request);
  if (denied) return denied;

  const nowIso = new Date().toISOString();
  await supabaseAdmin
    .from("tenants")
    .update({ status: "past_due" })
    .eq("status", "active")
    .lt("subscription_end_date", nowIso);

  const { data: tenants, error } = await supabaseAdmin
    .from("tenants")
    .select("client_id")
    .eq("status", "active");
  if (error || !tenants) {
    return NextResponse.json({ error: error?.message || "No active tenants" }, { status: 500 });
  }

  const results = await runPool(tenants, 3, async (tenant) => {
    const clientId = exactClientId(tenant.client_id);
    const stats = await runNightlyAuditForTenant(clientId);
    const findings = (stats.findings || []).slice(0, 3);
    if (findings.length) {
      await supabaseAdmin.from("alerts").insert(findings.map((f) => ({
        client_id: clientId,
        kind: "waste",
        title: f.title,
        body: f.body,
        payload: { evidenceLogIds: f.logIds, assignTask: true },
        status: "pending",
      })));
    }
    return { clientId, anomaliesDetected: stats.anomalies, evidenceLinked: stats.evidence, alerts: findings.length };
  });

  return NextResponse.json({ success: true, timestamp: nowIso, auditedTenantsCount: tenants.length, results });
}
