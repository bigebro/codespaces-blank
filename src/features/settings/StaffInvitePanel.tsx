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
      setMessage("Урилгын холбоосыг ажилтан руу илгээнэ. Утасны дугаараар нэгдэхгүй.");
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
        <p className="text-xs text-zinc-400">Имэйл эсвэл урилгын холбоосоор. Ажилтан өөрөө салбар сонгож бүртгэхгүй.</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="Имэйл" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white" />
        <select value={role} onChange={(e) => setRole(e.target.value as "staff" | "manager")} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white">
          <option value="staff">staff</option>
          <option value="manager">manager</option>
        </select>
        <button type="submit" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-zinc-950">Урих</button>
      </form>
      <form onSubmit={addSupplier} className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
        <h3 className="font-black text-white">Нийлүүлэгч</h3>
        <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Нэр" required className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white" />
        <input value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} placeholder="Утас" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white" />
        <button type="submit" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-zinc-950">Нэмэх</button>
      </form>
      {inviteLink && <p className="md:col-span-2 break-all text-sm text-zinc-200">{inviteLink}</p>}
      {message && <p className="md:col-span-2 text-sm text-zinc-300">{message}</p>}
    </div>
  );
}
