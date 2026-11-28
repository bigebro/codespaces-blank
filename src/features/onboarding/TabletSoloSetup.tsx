"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Эзэн ганцаараа таблетаа холбоно: өөрийн PIN, дараа нь 6 оронтой код.
export default function TabletSoloSetup({ clientId }: { clientId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinNotice, setPinNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [kioskUrl, setKioskUrl] = useState("/kiosk");

  useEffect(() => {
    setKioskUrl(`${window.location.origin}/kiosk`);
  }, []);

  const loadCode = useCallback(async () => {
    const { data, error } = await supabase
      .from("kiosk_devices")
      .select("pairing_code, pairing_expires_at")
      .eq("client_id", clientId)
      .not("pairing_code", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) return;
    const live = (data || []).find(
      (row) => row.pairing_code && row.pairing_expires_at && new Date(row.pairing_expires_at).getTime() > Date.now(),
    );
    setCode(live?.pairing_code || null);
  }, [clientId]);

  useEffect(() => {
    void loadCode();
  }, [loadCode]);

  async function createCode() {
    setBusy(true);
    setCodeError(null);
    const { count } = await supabase
      .from("kiosk_devices")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .not("pairing_code", "is", null);
    if ((count || 0) >= 3) {
      setCodeError("Холболт хүлээж буй 3 код байна. Тохиргоо хэсгээс нэгийг нь устгаад дахин авна уу.");
      setBusy(false);
      return;
    }
    const next = Math.floor(100000 + Math.random() * 900000).toString();
    const { error } = await supabase.from("kiosk_devices").insert([
      {
        client_id: clientId,
        device_name: "Шинэ төхөөрөмж",
        device_token: "kiosk_" + crypto.randomUUID().replace(/-/g, ""),
        pairing_code: next,
        pairing_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        is_active: true,
      },
    ]);
    setBusy(false);
    if (error) {
      setCodeError("Код гарсангүй. Дахин оролдоно уу.");
      return;
    }
    setCode(next);
  }

  async function savePin(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setPinNotice({ text: "PIN 4 оронтой тоо байх ёстой.", error: true });
      return;
    }
    setPinBusy(true);
    setPinNotice(null);
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/staff/pin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session?.access_token || ""}`,
      },
      body: JSON.stringify({ pin }),
    });
    const json = await res.json().catch(() => ({}));
    setPinBusy(false);
    if (!res.ok || json.ok === false) {
      setPinNotice({ text: "PIN хадгалагдсангүй. Дахин оролдоно уу.", error: true });
      return;
    }
    setPin("");
    setPinNotice({ text: "PIN хадгалагдлаа. Таблет дээр өөрийн нэр дээр дарж энэ кодоо оруулна.", error: false });
  }

  return (
    <div className="mt-3 space-y-3">
      <form onSubmit={savePin} className="flex flex-col sm:flex-row sm:items-end gap-2">
        <label className="flex-1 text-xs text-zinc-400">
          Таны таблетын PIN (4 тоо)
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="4 тоо"
            className="mt-1 w-full sm:w-36 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-center text-white font-bold tracking-widest"
          />
        </label>
        <button
          type="submit"
          disabled={pinBusy}
          className="bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-black px-3 py-2 rounded-xl text-xs"
        >
          {pinBusy ? "Хадгалж байна..." : "PIN хадгалах"}
        </button>
      </form>
      {pinNotice && (
        <p className={`text-xs font-bold ${pinNotice.error ? "text-rose-300" : "text-emerald-300"}`}>{pinNotice.text}</p>
      )}

      <p className="text-xs text-zinc-300">
        Таблет дээр {kioskUrl} нээгээд энэ 6 оронтой кодыг оруулна уу.
      </p>
      {code ? (
        <p className="font-mono text-2xl font-black tracking-[0.2em] text-white">{code}</p>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void createCode()}
          className="bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-black px-3 py-2 rounded-xl text-xs"
        >
          {busy ? "Гарч байна..." : "Холбох код гаргах"}
        </button>
      )}
      {codeError && <p className="text-xs font-bold text-rose-300">{codeError}</p>}
      <p className="text-[11px] text-zinc-500">Код 15 минут хүчинтэй.</p>
    </div>
  );
}
