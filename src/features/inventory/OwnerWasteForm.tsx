"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Reason = "Асгарсан" | "Муудсан";

const REASONS: { label: Reason; notes: string }[] = [
  { label: "Асгарсан", notes: "Асгарсан/Алдаа" },
  { label: "Муудсан", notes: "Муудсан" },
];

// Самбараас нэг хаягдал. Бөөн импортын inventory_logs бичилттэй ижил талбарууд.
export default function OwnerWasteForm({
  activeClient,
  ingredients,
  workerName,
  onSaved,
}: {
  activeClient: string;
  ingredients: any[];
  workerName: string;
  onSaved?: () => void;
}) {
  const [ingredientId, setIngredientId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<Reason>("Асгарсан");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  const list = ingredients.filter((item) => !item.client_id || item.client_id === activeClient);
  const selected = list.find((item) => item.id === ingredientId);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    const qty = parseFloat(amount);
    if (!selected) {
      setNotice({ text: "Түүхий эдээ сонгоно уу.", error: true });
      return;
    }
    if (!(qty > 0)) {
      setNotice({ text: "Хэмжээг 0-ээс их оруулна уу.", error: true });
      return;
    }
    const note = REASONS.find((row) => row.label === reason)?.notes || "Муудсан";
    setBusy(true);
    const { error } = await supabase.from("inventory_logs").insert([
      {
        client_id: activeClient,
        ingredient_id: selected.id,
        quantity: -Math.abs(qty),
        type: "spoilage",
        notes: note,
        date: new Date().toISOString(),
        worker_name: `${workerName || "Эзэн"} (Хаягдал)`,
      },
    ]);
    setBusy(false);
    if (error) {
      setNotice({ text: "Хаягдал хадгалагдсангүй. Дахин оролдоно уу.", error: true });
      return;
    }
    setAmount("");
    setNotice({ text: "Хаягдал бүртгэгдлээ.", error: false });
    onSaved?.();
  }

  return (
    <form onSubmit={save} className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div>
        <p className="text-sm font-black text-white">Хаягдал бүртгэх</p>
        <p className="text-xs text-zinc-400 mt-0.5">Нэг түүхий эд, хэмжээ, шалтгаан. Таблетгүй бол энд бичнэ.</p>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-zinc-300">Эхлээд түүхий эд нэмнэ. Дараа нь хаягдал бүртгэнэ.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
              className="sm:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-bold"
            >
              <option value="">Түүхий эд сонгох</option>
              {list.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={selected?.unit ? `Хэмжээ (${selected.unit})` : "Хэмжээ"}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
            />
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as Reason)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-bold"
            >
              {REASONS.map((row) => (
                <option key={row.label} value={row.label}>
                  {row.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-black px-4 py-2 rounded-xl text-sm"
          >
            {busy ? "Хадгалж байна..." : "Хаягдал хадгалах"}
          </button>
        </>
      )}
      {notice && (
        <p role="status" className={`text-sm font-bold ${notice.error ? "text-rose-300" : "text-emerald-300"}`}>
          {notice.text}
        </p>
      )}
    </form>
  );
}
