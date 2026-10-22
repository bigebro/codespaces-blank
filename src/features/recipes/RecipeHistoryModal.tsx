// src/features/recipes/RecipeHistoryModal.tsx
"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

function cleanString(str: string) {
  return String(str || "")
    .replace(/[\u00a0\s]+/g, " ")
    .trim();
}
interface RecipeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string | null;
  activeClient: string;
  recipes: any[];
  ingredients: any[];
  recordRecipeSnapshot: (
    name: string,
    action?: any,
    items?: any[],
  ) => Promise<void>;
  onRestored: () => void;
}

export default function RecipeHistoryModal({
  isOpen,
  onClose,
  productName,
  activeClient,
  recipes,
  ingredients,
  recordRecipeSnapshot,
  onRestored,
}: RecipeHistoryModalProps) {
  const [recipeSnapshots, setRecipeSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  //🕒 ЦОНХ НЭЭГДЭХЭД 30 ХОНОГИЙН ТҮҮХИЙГ ӨӨРӨӨ ТАТАХ ХЭСЭГ:
  useEffect(() => {
    if (isOpen && productName && activeClient) {
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      supabase
        .from("recipe_snapshots")
        .select("*")
        .eq("client_id", activeClient)
        .eq("product_name", productName)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setRecipeSnapshots(data);
        });
    }
  }, [isOpen, productName, activeClient]);

  if (!isOpen) return null;

  // ⚡ 1. ОДООГИЙН ЖОР БА ХУУЧИН ХУВИЛБАРЫГ ХАРЬЦУУЛАХ (VISUAL DIFF)
  const computeRecipeDiff = (snapshotItems: any[], productName: string) => {
    // Одоо баазад байгаа тухайн бүтээгдэхүүний идэвхтэй орцууд
    const currentActiveRows = recipes.filter(
      (r: any) =>
        cleanString(r.product_name).toLowerCase() ===
        cleanString(productName).toLowerCase(),
    );

    const currentMap = new Map();
    currentActiveRows.forEach((r: any) => {
      const ing = ingredients.find((i: any) => i.id === r.ingredient_id);
      currentMap.set(r.ingredient_id, {
        name: ing?.name || "Орц",
        unit: ing?.unit || "гр",
        amount: parseFloat(r.amount) || 0,
      });
    });

    const snapshotMap = new Map();
    const diffList: Array<{
      name: string;
      unit: string;
      snapAmount: number;
      currAmount?: number;
      status:
        | "unchanged"
        | "modified"
        | "removed_in_current"
        | "added_in_current";
    }> = [];

    // А. Хуучин хувилбарт байсан орцуудыг шалгах
    snapshotItems.forEach((snapIt: any) => {
      snapshotMap.set(snapIt.ingredient_id, snapIt);
      const curr = currentMap.get(snapIt.ingredient_id);

      if (!curr) {
        // Хуучинд байсан, гэтэл одоогийн жороос ХАСАГДСАН
        diffList.push({
          name: snapIt.name,
          unit: snapIt.unit,
          snapAmount: parseFloat(snapIt.amount) || 0,
          status: "removed_in_current",
        });
      } else if (Number(curr.amount) !== Number(snapIt.amount)) {
        // Грамм нь ӨӨРЧЛӨГДСӨН
        diffList.push({
          name: snapIt.name,
          unit: snapIt.unit,
          snapAmount: parseFloat(snapIt.amount) || 0,
          currAmount: Number(curr.amount),
          status: "modified",
        });
      } else {
        // Хэвийн, өөрчлөгдөөгүй
        diffList.push({
          name: snapIt.name,
          unit: snapIt.unit,
          snapAmount: parseFloat(snapIt.amount) || 0,
          status: "unchanged",
        });
      }
    });

    // Б. Хуучинд байгаагүй мөртлөө одоо ШИНЭЭР НЭМЭГДСЭН орцууд
    currentActiveRows.forEach((curr: any) => {
      if (!snapshotMap.has(curr.ingredient_id)) {
        const ing = ingredients.find((i: any) => i.id === curr.ingredient_id);
        diffList.push({
          name: ing?.name || "Орц",
          unit: ing?.unit || "гр",
          snapAmount: 0,
          currAmount: parseFloat(curr.amount) || 0,
          status: "added_in_current",
        });
      }
    });

    return diffList;
  };

  // 3. 1-CLICK БУЦААЖ СЭРГЭЭХ (RESTORE)
  const restoreRecipeFromSnapshot = async (snapshot: any) => {
    if (
      !confirm(
        `"${snapshot.product_name}"-ийн ${new Date(snapshot.created_at).toLocaleString("mn-MN")} үеийн хувилбарыг буцааж сэргээх үү?`,
      )
    )
      return;

    setLoading(true);
    const pName = snapshot.product_name;
    const items = snapshot.ingredients_snapshot || [];

    // А. Одоо байгаа жорыг цэвэрлэх
    await supabase
      .from("recipes")
      .delete()
      .eq("client_id", activeClient)
      .eq("product_name", pName);

    // Б. Сонгосон хуучин хувилбарыг баазад буцааж оруулах
    if (items.length > 0) {
      const rowsToInsert = items.map((it: any) => ({
        client_id: activeClient,
        product_name: pName,
        ingredient_id: it.ingredient_id,
        amount: parseFloat(it.amount) || 0,
      }));
      await supabase.from("recipes").insert(rowsToInsert);
    }

    // В. Сэргээсэн үйлдлээ шинэ snapshot болгон бүртгэх
    await recordRecipeSnapshot(pName, "updated", items);
    setLoading(false);
    onClose();
    onRestored();
    alert(`✅ "${pName}" жор амжилттай сэргээгдлээ!`);
  };
  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-slate-700 rounded-3xl p-5 w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Толгой хэсэг */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>🕒 Жорын Хувилбарын Түүх</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Бүтээгдэхүүн:{" "}
              <strong className="text-zinc-300 font-bold">{productName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
          >
            ✕ Хаах
          </button>
        </div>

        {/* Хувилбаруудын жагсаалт */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {recipeSnapshots.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-8">
              Энэ бүтээгдэхүүн дээр өмнөх хувилбарын түүх бүртгэгдээгүй байна.
            </p>
          ) : (
            recipeSnapshots.map((snap, idx) => {
              const isDeleted = snap.action === "deleted";
              const items = snap.ingredients_snapshot || [];

              return (
                <div
                  key={snap.id || idx}
                  className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                    isDeleted
                      ? "bg-rose-950/20 border-rose-500/30"
                      : "bg-slate-950 border-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                            isDeleted
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-purple-500/20 text-zinc-300 border border-zinc-800/30"
                          }`}
                        >
                          {isDeleted
                            ? "🗑️ Устгагдсан (Хогийн сав)"
                            : idx === 0
                              ? "Одоогийн хувилбар"
                              : "Хуучин хувилбар"}
                        </span>
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          {new Date(snap.created_at).toLocaleString("mn-MN", {
                            timeZone: "Asia/Ulaanbaatar",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Өөрчилсөн:{" "}
                        <strong className="text-slate-300">
                          {snap.author || "Админ"}
                        </strong>
                      </p>
                    </div>

                    {/* ⚡ СЭРГЭЭХ ТОBЧ */}
                    <button
                      type="button"
                      onClick={() => restoreRecipeFromSnapshot(snap)}
                      className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-3.5 py-1.5 rounded-xl text-xs transition active:scale-95 shadow cursor-pointer shrink-0"
                    >
                      ↩️ Сэргээх
                    </button>
                  </div>

                  {/* Тухайн хувилбарт байсан орцууд */}
                  {/* ⚡ VISUAL DIFF ОРЦУУДЫН ӨНГӨТ ЖАГСААЛТ */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
                    {computeRecipeDiff(items, productName || "").map(
                      (diff, i) => {
                        // 1. ОДООГООС ХАСАГДСАН ОРЦ (УЛААН ЗУРААСТАЙ)
                        if (diff.status === "removed_in_current") {
                          return (
                            <span
                              key={i}
                              className="bg-rose-500/10 border border-rose-500/40 px-2.5 py-1 rounded-xl text-xs font-bold text-rose-300 flex items-center gap-1 shadow-sm"
                              title="Энэ орц одоогийн жороос хасагдсан байна"
                            >
                              <span className="line-through opacity-75">
                                {diff.name}: {diff.snapAmount} {diff.unit}
                              </span>
                              <span className="text-rose-400 font-black ml-1 text-xs">
                                (Хасагдсан ✕)
                              </span>
                            </span>
                          );
                        }

                        // 2. ГРАММ ӨӨРЧЛӨГДСӨН ОРЦ (ШАР ӨНГӨТЭЙ)
                        if (diff.status === "modified") {
                          return (
                            <span
                              key={i}
                              className="bg-zinc-800/60 border border-amber-500/40 px-2.5 py-1 rounded-xl text-xs font-bold text-zinc-300 flex items-center gap-1.5 shadow-sm"
                              title="Грамм нь өөрчлөгдсөн байна"
                            >
                              <span>{diff.name}:</span>
                              <span className="flex items-center gap-1 font-mono">
                                <strong className="text-amber-200">
                                  {diff.snapAmount} {diff.unit}
                                </strong>
                                <span className="text-zinc-300/80 font-normal text-xs">
                                  (Одоо: {diff.currAmount} {diff.unit})
                                </span>
                              </span>
                            </span>
                          );
                        }

                        // 3. ОДОО ШИНЭЭР НЭМЭГДСЭН ОРЦ (НОГООН ӨНГӨТЭЙ)
                        if (diff.status === "added_in_current") {
                          return (
                            <span
                              key={i}
                              className="bg-zinc-800/60 border border-zinc-700/40 px-2.5 py-1 rounded-xl text-xs font-bold text-zinc-300 flex items-center gap-1 shadow-sm"
                              title="Энэ орц хуучинд байгаагүй, одоо шинээр нэмэгдсэн байна"
                            >
                              <span>+ {diff.name}:</span>
                              <strong className="text-emerald-200 font-mono">
                                {diff.currAmount} {diff.unit}
                              </strong>
                              <span className="text-zinc-200 text-xs font-black">
                                (Одоо шинэ)
                              </span>
                            </span>
                          );
                        }

                        // 4. ӨӨРЧЛӨГДӨӨГҮЙ ХЭВИЙН ОРЦ (СААРАЛ)
                        return (
                          <span
                            key={i}
                            className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl text-xs font-medium text-slate-300"
                          >
                            {diff.name}:{" "}
                            <strong className="text-zinc-300 font-mono">
                              {diff.snapAmount} {diff.unit}
                            </strong>
                          </span>
                        );
                      },
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-2 border-t border-slate-800 text-xs text-slate-500 text-center">
          💡 Та хүссэн хуучин хувилбарынхаа "↩️ Сэргээх" товчийг дарахад тухайн
          жор тэр дороо сэргэнэ.
        </div>
      </div>
    </div>
  );
}
