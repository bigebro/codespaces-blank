"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

// Эзэн эсвэл менежер одоо байгаа ажилтны таблетын PIN-ийг солино.
// Ажилтан нэмэх урсгалаас тусдаа. /api/staff/pin нь workerId-аар эрх шалгана.
export default function StaffPinReset({ workers }: { workers: any[] }) {
  const [workerId, setWorkerId] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!workerId) {
      setNotice({ text: "Ажилтнаа сонгоно уу.", error: true });
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setNotice({ text: "PIN 4 оронтой тоо байх ёстой.", error: true });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/staff/pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session?.access_token || ""}`,
        },
        body: JSON.stringify({ workerId, pin }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        setNotice({ text: json.message || "PIN хадгалж чадсангүй.", error: true });
        return;
      }
      const name = workers.find((w) => w.id === workerId);
      setPin("");
      setNotice({
        text: `${name?.full_name || "Ажилтны"} PIN солигдлоо. Таблет дээр шинэ PIN-ээр нэвтэрнэ.`,
        error: false,
      });
    } catch {
      setNotice({ text: "Сүлжээ шалгаад дахин оролдоно уу.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 space-y-3">
      <h3 className="text-base font-bold text-zinc-300">Ажилтны PIN солих</h3>
      <p className="text-sm text-zinc-400">Ажилтан PIN-ээ мартсан бол энд шинэ PIN тавина.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 font-bold"
        >
          <option value="">Ажилтан сонгох</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.full_name || String(w.email || "").split("@")[0] || "Нэргүй"}
            </option>
          ))}
        </select>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="Шинэ PIN (4 тоо)"
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-center text-white font-bold text-sm tracking-widest sm:w-40"
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-4 py-2 rounded-xl text-sm disabled:opacity-60"
        >
          {busy ? "Хадгалж байна..." : "PIN солих"}
        </button>
      </div>
      {notice && (
        <p role="status" className={`text-sm font-bold ${notice.error ? "text-rose-300" : "text-emerald-300"}`}>
          {notice.text}
        </p>
      )}
    </form>
  );
}
