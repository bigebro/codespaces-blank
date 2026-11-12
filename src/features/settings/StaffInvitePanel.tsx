"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StaffInvitePanel() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"staff" | "manager">("staff");
  const [msg, setMsg] = useState("");

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/staff/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({ email, phone, role }),
    });
    const json = await res.json();
    setMsg(json.message || json.error || "");
  }

  return (
    <form onSubmit={invite} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 grid gap-2 md:grid-cols-4">
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Имэйл" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Утас" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100" />
      <select value={role} onChange={(e) => setRole(e.target.value as "staff" | "manager")} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100">
        <option value="staff">staff</option>
        <option value="manager">manager</option>
      </select>
      <button type="submit" className="bg-white text-zinc-950 font-black rounded-lg text-sm">Урих</button>
      {msg && <p className="md:col-span-4 text-xs text-zinc-400">{msg}</p>}
    </form>
  );
}
