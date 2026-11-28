"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import TabletSoloSetup from "@/features/onboarding/TabletSoloSetup";

export type StartStep = "ingredients" | "recipe" | "count" | "tablet";

type Step = {
  key: StartStep;
  title: string;
  detail: string;
  done: boolean | null;
};

async function exists(table: string, filter: (q: any) => any) {
  const { count, error } = await filter(
    supabase.from(table).select("id", { count: "exact", head: true }),
  );
  if (error) return null;
  return (count || 0) > 0;
}

// Шинэ эзэнд эхний алхмуудыг харуулна. Зөвхөн уншина, юу ч бичихгүй.
export default function GettingStarted({
  clientId,
  onOpenStep,
  onOpenIngredientImport,
}: {
  clientId: string;
  onOpenStep: (step: StartStep) => void;
  onOpenIngredientImport: () => void;
}) {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [hidden, setHidden] = useState(false);
  const hideKey = `operlink_getting_started_hidden_${clientId}`;

  useEffect(() => {
    if (!clientId) return;
    if (typeof window !== "undefined" && localStorage.getItem(hideKey) === "1") {
      setHidden(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const [catalog, firstRecipe, firstCount, tablet] = await Promise.all([
        exists("ingredients", (q) => q.eq("client_id", clientId)),
        exists("recipes", (q) => q.eq("client_id", clientId)),
        exists("inventory_logs", (q) => q.eq("client_id", clientId).eq("type", "count")),
        exists("kiosk_devices", (q) =>
          q.eq("client_id", clientId).eq("is_active", true).is("pairing_code", null),
        ),
      ]);
      if (cancelled) return;
      setSteps([
        {
          key: "ingredients",
          title: "Түүхий эд нэмэх",
          detail: "Нэр, нэгж, 1 нэгжийн үнээ оруулна. Дараагийн алхам үүн дээр тулна.",
          done: catalog,
        },
        {
          key: "recipe",
          title: "Анхны жор",
          detail: "Нэг цэсний орцыг тухайн нэгжээр нь бичнэ. Жишээ: сүү 200 мл.",
          done: firstRecipe,
        },
        {
          key: "count",
          title: "Агуулахын тооллого",
          detail: "Бодит үлдэгдлээ Агуулахын тооллого дээр бичнэ. Үүнгүйгээр зөрүү гарахгүй.",
          done: firstCount,
        },
        {
          key: "tablet",
          title: "Таблет холбох",
          detail: "Эхлээд өөрийн 4 оронтой PIN-ээ тавина. Дараа нь кодыг таблет дээр оруулна.",
          done: tablet,
        },
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, hideKey]);

  if (hidden || !steps) return null;
  if (steps.every((s) => s.done === true)) return null;

  const next = steps.find((s) => s.done !== true);

  return (
    <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">Эхлэх алхмууд</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Эхлээд түүхий эд, дараа нь жор, дараа нь тооллого. Дараа нь самбар бодит тоо харуулна.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(hideKey, "1");
            setHidden(true);
          }}
          className="text-xs font-bold text-zinc-400 hover:text-white shrink-0"
        >
          Нуух
        </button>
      </div>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li
            key={step.key}
            className={`flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border p-3 ${
              step.key === next?.key ? "border-zinc-600 bg-zinc-950" : "border-zinc-800 bg-zinc-950/60"
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-100">
                {i + 1}. {step.title}
              </p>
              <p className="text-xs text-zinc-400">{step.detail}</p>
              {step.key === "tablet" && step.done !== true && <TabletSoloSetup clientId={clientId} />}
            </div>
            <span
              className={`text-xs font-black px-2 py-1 rounded-lg shrink-0 ${
                step.done === true
                  ? "bg-emerald-500/15 text-emerald-300"
                  : step.done === false
                    ? "bg-rose-500/15 text-rose-300"
                    : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {step.done === true ? "Хийгдсэн" : step.done === false ? "Хийгдээгүй" : "Шалгах"}
            </span>
            {step.done !== true && (
              <div className="flex flex-col items-stretch sm:items-end gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenStep(step.key)}
                  className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-zinc-950"
                >
                  Нээх
                </button>
                {step.key === "ingredients" && (
                  <button
                    type="button"
                    onClick={onOpenIngredientImport}
                    className="text-[11px] leading-tight font-medium text-zinc-400 underline underline-offset-2 hover:text-zinc-100 text-left sm:text-right"
                  >
                    Олон бараатай бол Excel-ээр оруулах
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
