"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AlertRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  status: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || "";
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const headers = await authHeader();
    const res = await fetch("/api/alerts", { headers });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Ачаалж чадсангүй");
      return;
    }
    setAlerts(json.alerts || []);
    const fresh = (json.alerts || []).filter((row: AlertRow) => row.status === "pending");
    if (fresh.length && "Notification" in window && Notification.permission === "granted") {
      const reg = await navigator.serviceWorker?.ready;
      fresh.slice(0, 3).forEach((row: AlertRow) => {
        reg?.showNotification(row.title, { body: row.body, tag: row.id });
      });
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => null);
    }
    (async () => {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: await authHeader(),
        body: JSON.stringify(sub),
      });
    })().catch(() => null);
    return () => clearInterval(timer);
  }, []);

  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(id);
    const res = await fetch("/api/alerts/decision", {
      method: "POST",
      headers: await authHeader(),
      body: JSON.stringify({ alertId: id, decision }),
    });
    setBusy(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Шийдвэр хадгалагдсангүй");
      return;
    }
    await load();
  }

  async function sendOrder(alert: AlertRow, channel: "sms" | "email") {
    const orderId = (alert.payload?.applied as { purchaseOrderId?: string } | undefined)?.purchaseOrderId
      || (alert.payload?.purchaseOrderId as string | undefined);
    if (!orderId) {
      setError("Эхлээд захиалгыг батална уу.");
      return;
    }
    const res = await fetch("/api/purchase-orders/send", {
      method: "POST",
      headers: await authHeader(),
      body: JSON.stringify({ orderId, channel }),
    });
    const json = await res.json();
    if (json.href) window.location.href = json.href;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-white">Мэдэгдэл ба баталгаа</h2>
        <p className="text-sm text-zinc-400">Аудитын олдвор, үнийн санал, захиалга, ээлж, дүрэм энд ирж баталгаажна.</p>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {alerts.length === 0 && <p className="text-sm text-zinc-500">Одоогоор мэдэгдэл алга.</p>}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <article key={alert.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">{alert.kind} · {alert.status}</p>
                <h3 className="font-bold text-white">{alert.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{alert.body}</p>
              </div>
            </div>
            {alert.status === "pending" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === alert.id}
                  onClick={() => decide(alert.id, "approve")}
                  className="rounded-xl bg-white px-3 py-2 text-xs font-black text-zinc-950"
                >
                  {alert.kind === "finding" ? "Даалгавар өгөх" : "Батлах"}
                </button>
                <button
                  type="button"
                  disabled={busy === alert.id}
                  onClick={() => decide(alert.id, "reject")}
                  className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200"
                >
                  Татгалзах
                </button>
              </div>
            )}
            {alert.kind === "purchase_order" && alert.status === "approved" && (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => sendOrder(alert, "sms")} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-100">SMS</button>
                <button type="button" onClick={() => sendOrder(alert, "email")} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-100">Имэйл</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
