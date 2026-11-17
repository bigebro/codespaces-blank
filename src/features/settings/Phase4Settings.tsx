"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Phase4Settings({ activeClient }: { activeClient: string }) {
  const [enabled, setEnabled] = useState(false);
  const [ingredients, setIngredients] = useState<{ id: string; name: string; unit: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [limit, setLimit] = useState("");
  const [streak, setStreak] = useState("");
  const [reward, setReward] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeClient) return;
    let cancelled = false;
    Promise.all([
      supabase.from("ingredients").select("id, name, unit").eq("client_id", activeClient).order("name", { ascending: true }),
      supabase.from("client_settings").select("cup_check_enabled, cup_ingredient_ids, team_goal").eq("client_id", activeClient).maybeSingle(),
    ]).then(([ingredientRes, settingRes]) => {
      if (cancelled) return;
      if (ingredientRes.error || settingRes.error) {
        setError("Мэдээлэл дутуу");
        return;
      }
      setIngredients(ingredientRes.data || []);
      const goal = settingRes.data?.team_goal || {};
      setEnabled(settingRes.data?.cup_check_enabled === true);
      setSelected(settingRes.data?.cup_ingredient_ids || []);
      setLimit(goal.unexplained_limit == null ? "" : String(goal.unexplained_limit));
      setStreak(goal.streak_shifts == null ? "" : String(goal.streak_shifts));
      setReward(goal.reward_amount == null ? "" : String(goal.reward_amount));
    });
    return () => {
      cancelled = true;
    };
  }, [activeClient]);

  async function save() {
    setError("");
    setNotice("");
    const numberOrNull = (value: string) => (value.trim() === "" ? null : Number(value));
    const { error: saveError } = await supabase.from("client_settings").upsert(
      {
        client_id: activeClient,
        cup_check_enabled: enabled,
        cup_ingredient_ids: selected,
        team_goal: {
          unexplained_limit: numberOrNull(limit),
          streak_shifts: numberOrNull(streak),
          reward_amount: numberOrNull(reward),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" },
    );
    if (saveError) setError("Хадгалж чадсангүй.");
    else setNotice("Хадгаллаа.");
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-base font-black text-white">Аяга шалгах</h3>
        <p className="text-xs text-zinc-400 mt-1">Анхдагчаар унтраалттай. Асаасан үед л санхүү болон киоск дээр харагдана.</p>
      </div>
      <button
        type="button"
        onClick={() => setEnabled((value) => !value)}
        className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm font-bold text-white"
      >
        {enabled ? "Асаалттай" : "Унтраалттай"}
      </button>
      {enabled ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ingredients.map((item) => {
            const on = selected.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected((rows) => (on ? rows.filter((id) => id !== item.id) : [...rows, item.id]))}
                className={`text-left px-3 py-2 rounded-xl border text-sm ${on ? "border-amber-400 text-amber-100" : "border-zinc-800 text-zinc-300"}`}
              >
                {item.name} {on ? "сонгосон" : ""}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="space-y-2">
        <h3 className="text-base font-black text-white">Багийн зорилт</h3>
        <label className="block text-xs text-zinc-400">
          Тайлбаргүй зөрүүний дээд дүн
          <input value={limit} onChange={(event) => setLimit(event.target.value)} inputMode="decimal" className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white" />
        </label>
        <label className="block text-xs text-zinc-400">
          Тооллогын streak, ээлж
          <input value={streak} onChange={(event) => setStreak(event.target.value)} inputMode="numeric" className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white" />
        </label>
        <label className="block text-xs text-zinc-400">
          Урамшууллын дүн
          <input value={reward} onChange={(event) => setReward(event.target.value)} inputMode="decimal" className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white" />
        </label>
        <p className="text-xs text-zinc-500">Цалинд автоматаар орохгүй.</p>
      </div>
      <button type="button" onClick={save} className="bg-white text-zinc-950 font-black text-sm px-4 py-2 rounded-xl">
        Хадгалах
      </button>
      {notice ? <p className="text-sm text-zinc-200">{notice}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
