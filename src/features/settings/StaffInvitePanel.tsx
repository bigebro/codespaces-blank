"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${data.session?.access_token || ""}`,
    "Content-Type": "application/json",
  };
}

export default function StaffInvitePanel({ clientId }: { clientId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "manager">("staff");
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage("Хуулж чадсангүй. Холбоосыг гараар сонгоод хуулна уу.");
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/staff/invite", {
      method: "POST",
      headers: await authHeader(),
      body: JSON.stringify({ email, role }),
    });
    const json = await res.json();
    if (res.ok && json.invite?.token && typeof window !== "undefined") {
      const link = `${window.location.origin}/login?invite=${json.invite.token}`;
      setInviteLink(link);
      setCopied(false);
      setMessage("Урилга үүслээ. Систем имэйл явуулахгүй. Доорх холбоосыг хуулж, ажилтандаа өөрөө илгээнэ үү.");
      setEmail("");
    } else {
      setInviteLink(null);
      setMessage(json.error || "Урилга үүссэнгүй.");
    }
  }

  async function addSupplier(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("suppliers").insert({
      client_id: clientId,
      name: supplierName.trim(),
      phone: supplierPhone.trim() || null,
    });
    setMessage(error ? error.message : "Нийлүүлэгч нэмэгдлээ.");
    if (!error) setSupplierName("");
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={invite} className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
        <h3 className="font-black text-white">Ажилтан урих</h3>
        <p className="text-xs text-zinc-400">Урилгын холбоос үүснэ. Систем имэйл явуулахгүй, холбоосыг та өөрөө илгээнэ. Ажилтан өөрөө салбар сонгож бүртгэхгүй.</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="Имэйл" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white" />
        <select value={role} onChange={(e) => setRole(e.target.value as "staff" | "manager")} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white">
          <option value="staff">Ажилтан</option>
          <option value="manager">Менежер</option>
        </select>
        <button type="submit" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-zinc-950">Урих</button>
      </form>
      <form onSubmit={addSupplier} className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
        <h3 className="font-black text-white">Нийлүүлэгч</h3>
        <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Нэр" required className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white" />
        <input value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} placeholder="Утас" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white" />
        <button type="submit" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-zinc-950">Нэмэх</button>
      </form>
      {inviteLink && (
        <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
          <p className="flex-1 break-all text-sm text-zinc-200 font-mono">{inviteLink}</p>
          <button type="button" onClick={copyLink} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-zinc-950 shrink-0">
            {copied ? "Хуулагдлаа" : "Хуулах"}
          </button>
        </div>
      )}
      {message && <p className="md:col-span-2 text-sm text-zinc-300">{message}</p>}
    </div>
  );
}
