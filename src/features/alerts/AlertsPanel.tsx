"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AlertRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
};

export default function AlertsPanel({ activeClient }: { activeClient: string }) {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/alerts", {
      headers: { Authorization: `Bearer ${session?.access_token || ""}` },
    });
    const json = await res.json();
    setRows(json.alerts || []);
  }

  useEffect(() => { load(); }, [activeClient]);

  async function act(id: string, decision: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({ id, decision }),
    });
    const json = await res.json();
    setMessage(json.error || "Хадгаллаа");
    if (decision === "approve" && json.success) {
      const row = rows.find((item) => item.id === id);
      if (row?.kind === "purchase_order" || row?.kind === "low_stock") {
        const sent = await fetch("/api/alerts/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
          body: JSON.stringify({ orderId: json.orderId, channel: "sms" }),
        });
        const link = await sent.json();
        if (link.sms) window.open(link.sms);
        else if (link.mailto) window.open(link.mailto);
      }
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Operlink", { body: row?.title || "Баталлаа" });
      }
    }
    load();
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black text-zinc-100">Alerts & Approvals</h2>
        <button type="button" onClick={() => Notification.requestPermission()} className="text-xs text-zinc-400">Мэдэгдэл зөвшөөрөх</button>
      </div>
      {message && <p className="text-xs text-zinc-400 mb-3">{message}</p>}
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="border border-zinc-800 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">{row.kind} · {row.status}</div>
            <div className="font-bold text-zinc-100 mt-1">{row.title}</div>
            {row.body && <p className="text-sm text-zinc-400 mt-1 whitespace-pre-wrap">{row.body}</p>}
            {row.status === "pending" && (
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => act(row.id, "approve")} className="bg-white text-zinc-950 text-xs font-black px-3 py-1.5 rounded-lg">Батлах</button>
                <button type="button" onClick={() => act(row.id, "reject")} className="border border-zinc-700 text-zinc-300 text-xs font-bold px-3 py-1.5 rounded-lg">Татгалзах</button>
                {row.kind === "waste" && (
                  <button type="button" onClick={() => act(row.id, "assign_task")} className="border border-zinc-700 text-zinc-300 text-xs font-bold px-3 py-1.5 rounded-lg">Assign task</button>
                )}
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-zinc-500">Хүлээгдэж буй санал алга.</p>}
      </div>
    </div>
  );
}
