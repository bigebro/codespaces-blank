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
  const now = new Date().toISOString();
  const nextStatus = opts.decision === "reject" ? "rejected" : "approved";
  const { data: locked, error } = await supabaseAdmin
    .from("agent_alerts")
    .update({
      status: nextStatus,
      resolved_at: now,
      resolved_by: opts.userId,
    })
    .eq("id", opts.alertId)
    .eq("client_id", opts.clientId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!locked) {
    const { data: current } = await supabaseAdmin
      .from("agent_alerts")
      .select("*")
      .eq("id", opts.alertId)
      .eq("client_id", opts.clientId)
      .maybeSingle();
    if (!current) throw new Error("Alert not found");
    return current;
  }
  if (opts.decision === "reject") return locked;

  const payload = (locked.payload || {}) as Record<string, any>;
  let applied: Record<string, unknown> = {};

  try {
    if (locked.kind === "memory_rule") {
      applied = await saveBusinessRule(opts.clientId, payload.topic, payload.fact);
    } else if (locked.kind === "memory_lesson") {
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
    } else if (locked.kind === "price_change") {
      const { error: priceErr } = await supabaseAdmin
        .from("products")
        .update({ selling_price: Number(payload.proposedPrice) })
        .eq("client_id", opts.clientId)
        .eq("name", payload.productName);
      if (priceErr) throw priceErr;
      applied = { productName: payload.productName, proposedPrice: payload.proposedPrice };
    } else if (locked.kind === "purchase_order") {
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
      locked.kind === "shift_plan" ||
      locked.kind === "staff_task" ||
      locked.kind === "assign_task" ||
      locked.kind === "finding"
    ) {
      const taskName = payload.taskName || locked.title;
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
      .update({ payload: { ...payload, applied } })
      .eq("id", locked.id)
      .eq("status", "approved")
      .select("*")
      .single();
    return data || locked;
  } catch (err) {
    await supabaseAdmin
      .from("agent_alerts")
      .update({ status: "pending", resolved_at: null, resolved_by: null })
      .eq("id", locked.id)
      .eq("status", "approved");
    throw err;
  }
}
