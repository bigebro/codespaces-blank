import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { saveBusinessRule, recordBusinessLesson } from "@/ai/memory/memory.service";
import { filterEvidenceLogIds } from "@/ai/memory/evidence";

export type AlertInput = {
  clientId: string;
  kind: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  evidence?: unknown;
  status?: string;
};

export async function createAlert(input: AlertInput) {
  const { data, error } = await supabaseAdmin
    .from("agent_alerts")
    .insert({
      client_id: input.clientId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      payload: input.payload || {},
      evidence: input.evidence || null,
      status: input.status || "pending",
    })
    .select("id, kind, title, status")
    .single();
  if (error) throw error;
  void notifyTenant(input.clientId, input.title, input.body);
  return data;
}

async function notifyTenant(clientId: string, title: string, body: string) {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, subscription")
    .eq("client_id", clientId);
  if (!subs?.length) return;

  try {
    const webpush = (await import("web-push")) as unknown as {
      setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
      sendNotification: (subscription: unknown, payload: string) => Promise<unknown>;
      default?: {
        setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
        sendNotification: (subscription: unknown, payload: string) => Promise<unknown>;
      };
    };
    const wp = webpush.default || webpush;
    wp.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:ops@operlink.local",
      publicKey,
      privateKey,
    );
    await Promise.all(
      subs.map((row) =>
        wp
          .sendNotification(
            row.subscription,
            JSON.stringify({ title, body, url: "/dashboard" }),
          )
          .catch(() => null),
      ),
    );
  } catch (err) {
    console.warn("[push] skipped:", err);
  }
}

export async function decideAlert(opts: {
  clientId: string;
  alertId: string;
  userId: string;
  decision: "approve" | "reject";
}) {
  const { data: alert, error } = await supabaseAdmin
    .from("agent_alerts")
    .select("*")
    .eq("id", opts.alertId)
    .eq("client_id", opts.clientId)
    .maybeSingle();
  if (error || !alert) throw new Error("Alert not found");
  if (alert.status !== "pending") return alert;

  if (opts.decision === "reject") {
    const { data } = await supabaseAdmin
      .from("agent_alerts")
      .update({
        status: "rejected",
        resolved_at: new Date().toISOString(),
        resolved_by: opts.userId,
      })
      .eq("id", alert.id)
      .select("*")
      .single();
    return data;
  }

  const payload = (alert.payload || {}) as Record<string, any>;
  let applied: Record<string, unknown> = {};

  if (alert.kind === "memory_rule") {
    applied = await saveBusinessRule(opts.clientId, payload.topic, payload.fact);
  } else if (alert.kind === "memory_lesson") {
    const evidence = await filterEvidenceLogIds(opts.clientId, payload.evidenceLogIds || []);
    applied = await recordBusinessLesson(opts.clientId, {
      situation: payload.situation,
      actionTaken: payload.actionTaken,
      outcome: payload.outcome,
      lesson: payload.lesson,
      prediction: payload.prediction,
      confidence: payload.confidence,
      evidenceLogIds: evidence.verified ? evidence.ids : [],
    });
  } else if (alert.kind === "price_change") {
    const { error: priceErr } = await supabaseAdmin
      .from("products")
      .update({ selling_price: Number(payload.proposedPrice) })
      .eq("client_id", opts.clientId)
      .eq("name", payload.productName);
    if (priceErr) throw priceErr;
    applied = { productName: payload.productName, proposedPrice: payload.proposedPrice };
  } else if (alert.kind === "purchase_order") {
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("purchase_orders")
      .insert({
        client_id: opts.clientId,
        supplier_id: payload.supplierId || null,
        status: "approved",
        lines: payload.lines || [],
        total_cost: payload.totalCost || 0,
      })
      .select("id")
      .single();
    if (orderErr) throw orderErr;
    applied = { purchaseOrderId: order.id };
  } else if (
    alert.kind === "shift_plan" ||
    alert.kind === "staff_task" ||
    alert.kind === "assign_task" ||
    alert.kind === "finding"
  ) {
    const taskName = payload.taskName || alert.title;
    const { data: task, error: taskErr } = await supabaseAdmin
      .from("tasks")
      .insert({
        client_id: opts.clientId,
        task_name: taskName,
        role: payload.role || "Бүх ажилтан",
        weight: Number(payload.weight) || 10,
        is_active: true,
      })
      .select("id")
      .single();
    if (taskErr) throw taskErr;
    applied = { taskId: task.id };
  }

  const { data } = await supabaseAdmin
    .from("agent_alerts")
    .update({
      status: "approved",
      payload: { ...payload, applied },
      resolved_at: new Date().toISOString(),
      resolved_by: opts.userId,
    })
    .eq("id", alert.id)
    .select("*")
    .single();
  return data;
}
