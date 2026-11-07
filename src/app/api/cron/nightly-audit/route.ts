// src/app/api/cron/nightly-audit/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runNightlyAuditForTenant } from "@/ai/memory/data_auditor";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel-ийн 60 секундийн хугацааг зөвшөөрнө

export async function GET(request: Request) {
  try {
    // 🔒 1. Vercel Cron-ийг гадны халдлагаас хамгаалах
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🏢 2. Бүх идэвхтэй салбаруудыг татах
    const { data: tenants, error: tenantErr } = await supabaseAdmin
      .from("tenants")  
      .select("client_id")
      .eq("status", "active");

    if (tenantErr || !tenants) {
      return NextResponse.json(
        { error: tenantErr?.message || "No active tenants found" },
        { status: 500 }
      );
    }

    // 🔍 3. Салбар бүр дээр шөнийн 3 чиглэлийн аудитыг ажиллуулж, нотлох баримтуудыг холбох
    const results = [];
    for (const tenant of tenants) {
      const stats = await runNightlyAuditForTenant(tenant.client_id);
      results.push({
        clientId: tenant.client_id,
        anomaliesDetected: stats.anomalies,
        evidenceLinked: stats.evidence,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      auditedTenantsCount: tenants.length,
      results,
    });
  } catch (err: any) {
    console.error("Nightly audit cron execution failed:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}