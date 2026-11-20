"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { mapAuthError } from "@/lib/authErrors";

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

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
  const [supplierEmail, setSupplierEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [listError, setListError] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name, phone, email, notes")
      .eq("client_id", clientId)
      .order("name", { ascending: true });
    if (error) {
      setListError("Жагсаалтыг уншиж чадсангүй.");
      return;
    }
    setListError(null);
    setSuppliers((data || []) as Supplier[]);
  }, [clientId]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

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
      email: supplierEmail.trim() || null,
    });
    setMessage(error ? mapAuthError(error, "Нийлүүлэгч нэмж чадсангүй.") : "Нийлүүлэгч нэмэгдлээ.");
    if (!error) {
      setSupplierName("");
      setSupplierPhone("");
      setSupplierEmail("");
      await loadSuppliers();
    }
  }

  async function saveEdit(id: string) {
    const { error } = await supabase
      .from("suppliers")
      .update({
        name: editName.trim(),
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
      })
      .eq("id", id)
      .eq("client_id", clientId);
    setMessage(error ? mapAuthError(error, "Засаж чадсангүй.") : "Нийлүүлэгч шинэчлэгдлээ.");
    if (!error) {
      setEditingId(null);
      await loadSuppliers();
    }
  }

  async function removeSupplier(id: string, name: string) {
    if (typeof window !== "undefined" && !window.confirm(`«${name}» нийлүүлэгчийг устгах уу?`)) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id).eq("client_id", clientId);
    setMessage(error ? mapAuthError(error, "Устгаж чадсангүй.") : "Нийлүүлэгч устгагдлаа.");
    if (!error) await loadSuppliers();
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
        <input value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} placeholder="Имэйл" type="email" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white" />
        <button type="submit" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-zinc-950">Нэмэх</button>
      </form>
      <div className="md:col-span-2 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
        <h3 className="font-black text-white">Нийлүүлэгчийн жагсаалт</h3>
        {listError && <p className="text-sm text-rose-300">{listError}</p>}
        {suppliers.length === 0 && !listError ? (
          <p className="text-sm text-zinc-400">Нийлүүлэгч бүртгэгдээгүй байна.</p>
        ) : (
          <ul className="space-y-2">
            {suppliers.map((row) => (
              <li key={row.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                {editingId === row.id ? (
                  <div className="space-y-2">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" />
                    <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Утас" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" />
                    <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Имэйл" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveEdit(row.id)} className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-zinc-950">Хадгалах</button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300">Болих</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-white">{row.name}</p>
                      <p className="text-xs text-zinc-400">
                        {[row.phone, row.email].filter(Boolean).join(" · ") || "Холбоо барих мэдээлэл алга"}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(row.id);
                          setEditName(row.name);
                          setEditPhone(row.phone || "");
                          setEditEmail(row.email || "");
                        }}
                        className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-200"
                      >
                        Засах
                      </button>
                      <button type="button" onClick={() => removeSupplier(row.id, row.name)} className="rounded-xl border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-300">
                        Устгах
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
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
