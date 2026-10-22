// src/features/inventory/InventoryTab.tsx
"use client";
import React, { useState } from "react";
import { Database, Save, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface InventoryTabProps {
  activeClient: string;
  ingredients: any[];
  setIngredients: React.Dispatch<React.SetStateAction<any[]>>;
  liveAnalytics: any;
  loading: boolean;
  fetchDatabaseData: (client?: string) => Promise<void>;
  translationsCache: Record<string, string>;
  setTranslationsCache: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  editingTranslation: { original: string; text: string } | null;
  setEditingTranslation: React.Dispatch<
    React.SetStateAction<{ original: string; text: string } | null>
  >;
}

export default function InventoryTab({
  activeClient,
  ingredients,
  setIngredients,
  liveAnalytics,
  loading,
  fetchDatabaseData,
  translationsCache,
  setTranslationsCache,
  editingTranslation,
  setEditingTranslation,
}: InventoryTabProps) {
  // Дотоод төлөвүүд:
  const [invSearch, setInvSearch] = useState("");
  const [invFilter, setInvFilter] = useState<"all" | "low" | "critical">("all");
  const [bulkStock, setBulkStock] = useState<Record<string, string>>({});
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  const handleIngredientUpdate = async (
    id: string,
    column: string,
    value: string | boolean,
  ) => {
    const finalVal =
      typeof value === "boolean" ? value : parseFloat(value) || 0;

    // UI-ийг шууд өөрчлөх
    setIngredients((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, [column]: finalVal } : ing)),
    );
    // Update Supabase securely in the background [3]
    await supabase
      .from("ingredients")
      .update({ [column]: finalVal })
      .eq("id", id);
  };

  //GRID ТООЛЛОГО БӨӨНӨӨР ХАДГАЛАХ
  const handleBulkSave = async () => {
    setIsSavingBulk(true);
    try {
      const logsToInsert: any[] = [];
      const currentDate = new Date().toISOString();

      Object.keys(bulkStock).forEach((id) => {
        const stockVal = parseFloat(bulkStock[id]) || 0;
        const originalIng = ingredients.find((i) => i.id === id);

        if (originalIng && parseFloat(originalIng.current_stock) !== stockVal) {
          logsToInsert.push({
            client_id: activeClient, // ✅
            ingredient_id: id,
            quantity: stockVal,
            type: "count",
            notes: `Гараар Тоолсон Үлдэгдэл (Менежер Grid)`,
            date: currentDate,
            worker_name: "Менежер",
          });
        }
      });

      if (logsToInsert.length > 0) {
        const { error: logError } = await supabase
          .from("inventory_logs")
          .insert(logsToInsert);
        if (logError) throw logError;
      }

      alert("Бүх үлдэгдлүүд амжилттай хадгалагдлаа!");
      await fetchDatabaseData(activeClient);
    } catch (e: any) {
      alert(`Алдаа гарлаа: ${e.message}`);
    } finally {
      setIsSavingBulk(false);
    }
  };

  const lowStockItems = ingredients.filter(
    (i: any) => parseFloat(i.current_stock) <= 50,
  );

  return (
    <>
      <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 w-full overflow-hidden">
        {/* ДЭЭД ЭГНЭЭ: Гарчиг + Хадгалах товч (Баруун буланд байнга ил харагдана) */}
        <div className="flex justify-between items-center pb-4 border-b border-zinc-800 gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-zinc-200" />
              Агуулахын Тооллого
            </h3>
            <p className="text-sm text-zinc-400 mt-0.5">
              Бодит үлдэгдлийг шивээд "Хадгалах" дарна уу
            </p>
          </div>

          <button
            onClick={handleBulkSave}
            disabled={isSavingBulk}
            className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-5 py-2.5 rounded-xl transition text-sm flex items-center gap-2 shadow-lg shrink-0 cursor-pointer active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>{isSavingBulk ? "Хадгалж байна..." : "Хадгалах"}</span>
          </button>
        </div>
        {/* 🔄 ЦИКЛИЙН ТОЛЛОГЫН ЯВЦ (ЭНД БАЙХ НЬ 100% ЗӨВ) */}
        {liveAnalytics && (
          <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-sm font-mono">
            <span className="text-zinc-400">Цикл тооллого:</span>
            <span className="font-black text-zinc-200">
              {liveAnalytics.abc_summary?.counted_in_cycle || 0} /{" "}
              {liveAnalytics.abc_summary?.total_items || ingredients.length}
            </span>
            <span className="text-xs text-zinc-500">
              (
              {Math.round(
                ((liveAnalytics.abc_summary?.counted_in_cycle || 0) /
                  Math.max(
                    1,
                    liveAnalytics.abc_summary?.total_items ||
                      ingredients.length,
                  )) *
                  100,
              )}
              %)
            </span>
          </div>
        )}
        {/* ДОР ЭГНЭЭ: Хайлт + Шүүлтүүр (Эвтэйхэн багтана) */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-zinc-800/60">
          <input
            type="text"
            value={invSearch}
            onChange={(e) => setInvSearch(e.target.value)}
            placeholder="Бараа хайх..."
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-700 w-full sm:w-56"
          />
          {lowStockItems.length > 0 && (
            <span className="bg-rose-500/10 text-rose-400 px-3 py-1 rounded-xl text-sm font-semibold border border-rose-500/20 flex items-center gap-1.5 ">
              <AlertTriangle className="h-4 w-4" />
              {lowStockItems.length} Барааны нөөц дуусаж байна!
            </span>
          )}
          <div className="flex bg-zinc-950 rounded-xl p-1 border border-zinc-800 shrink-0 text-xs">
            <button
              onClick={() => setInvFilter("all")}
              className={`px-3 py-1 rounded-lg font-bold transition ${invFilter === "all" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              Бүгд
            </button>
            <button
              onClick={() => setInvFilter("low")}
              className={`px-3 py-1 rounded-lg font-bold transition ${invFilter === "low" ? "bg-rose-500/20 text-rose-400" : "text-zinc-400 hover:text-white"}`}
            >
              ⚠️ Дуусаж буй
            </button>
            <button
              onClick={() => setInvFilter("critical")}
              className={`px-3 py-1 rounded-lg font-bold transition ${invFilter === "critical" ? "bg-zinc-800 text-zinc-200" : "text-zinc-400 hover:text-white"}`}
            >
              ⭐ A-Class
            </button>
          </div>
        </div>

        {loading ? (
          <div className="relative flex items-center gap-2 text-zinc-200 text-xs font-bold animate-in fade-in duration-200 justify-center">
            <div className="translate-y-2.5 h-4 w-4 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin " />
            <span className="hidden sm:inline-block tracking-wide"></span>
          </div>
        ) : (
          <div className="w-full max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800 z-10 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Барааны Нэр</th>
                  <th className="py-2.5 px-2 text-right">Өртөг</th>
                  <th className="py-2.5 px-2 text-center">PAR</th>
                  <th className="py-2.5 px-2 text-center">LEAD</th>
                  <th className="py-2.5 px-2 text-right">Захиалга</th>
                  <th className="py-2.5 px-2 text-right text-zinc-200">
                    Системд
                  </th>
                  <th className="py-2.5 px-3 text-right">Бодит тооллого</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm">
                {ingredients
                  .filter((ing) => {
                    const matchSearch = ing.name
                      .toLowerCase()
                      .includes(invSearch.toLowerCase());
                    const analItem = liveAnalytics?.all_inventory_data?.find(
                      (i: any) =>
                        i.id === ing.id ||
                        i.name.toLowerCase() === ing.name.toLowerCase(),
                    );
                    const isAClass =
                      ing.is_critical || analItem?.abc_class === "A";
                    const matchFilter =
                      invFilter === "all" ||
                      (invFilter === "low" &&
                        parseFloat(ing.current_stock) <=
                          (ing.par_level || 50)) ||
                      (invFilter === "critical" && isAClass);
                    return matchSearch && matchFilter;
                  })
                  .map((ing) => {
                    const analItem = liveAnalytics?.all_inventory_data?.find(
                      (i: any) =>
                        i.id === ing.id ||
                        i.name.toLowerCase() === ing.name.toLowerCase(),
                    );
                    const abc = ing.is_critical
                      ? "A"
                      : analItem?.abc_class || "C";

                    return (
                      <tr
                        key={ing.id}
                        className="hover:bg-zinc-800/40 transition"
                      >
                        {/* 1. БАРААНЫ НЭР + НЭГЖ + A-CLASS ЧЕКБОКС */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            {/* ✅ ОЙЛГОМЖТОЙ, МЭРГЭЖЛИЙН ШИЙДЭЛ (Star Toggle) */}
                            <button
                              type="button"
                              onClick={async () => {
                                const nextVal = !ing.is_critical;
                                // Шууд дэлгэцэнд 0ms солигдоно
                                setIngredients((prev) =>
                                  prev.map((item) =>
                                    item.id === ing.id
                                      ? { ...item, is_critical: nextVal }
                                      : item,
                                  ),
                                );
                                await supabase
                                  .from("ingredients")
                                  .update({ is_critical: nextVal })
                                  .eq("id", ing.id);
                              }}
                              title={
                                ing.is_critical
                                  ? "Өдөр бүр заавал тоолох чухал бараа (Идэвхтэй)"
                                  : "Өдөр бүр тоолох чухал бараа болгох"
                              }
                              className="p-1 rounded-lg transition active:scale-75 shrink-0 cursor-pointer"
                            >
                              {ing.is_critical ? (
                                <span className="text-zinc-300 text-base leading-none drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                                  ★
                                </span>
                              ) : (
                                <span className="text-zinc-600 hover:text-zinc-400 text-2xl leading-none">
                                  ☆
                                </span>
                              )}
                            </button>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-sm sm:text-sm">
                                  {ing.name}
                                </span>

                                {/* 🏷️ A, B, C БҮХ ТӨЛӨВИЙГ БҮРЭН ӨНГӨТЭЙ БОЛГОСОН ХЭСЭГ: */}
                                <span
                                  className={`text-xs font-black px-1.5 py-0.5 rounded border ${
                                    abc === "A"
                                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                      : abc === "B"
                                        ? "bg-zinc-800/60 text-zinc-300 border-zinc-700"
                                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                                  }`}
                                >
                                  {abc}-Class
                                </span>
                              </div>

                              <span className="text-xs text-zinc-400 font-mono">
                                Нэгж: {ing.unit}
                              </span>
                            </div>

                            {/* 🌐 ОРЧУУЛГЫГ ХАРУУЛАХ БА ЗАСАХ ХЭСЭГ */}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {editingTranslation?.original ===
                              ing.name.toLowerCase() ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editingTranslation?.text || ""} // 👈 1. ?.text || "" нэмсэн
                                    onChange={(e) =>
                                      setEditingTranslation((prev) =>
                                        prev
                                          ? { ...prev, text: e.target.value }
                                          : null,
                                      )
                                    }
                                    className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-xs text-zinc-300 font-bold outline-none"
                                  />
                                  <button
                                    onClick={async () => {
                                      if (!editingTranslation) return; // 👈 2. null биш гэдгийг баталгаажуулах хамгаалалт

                                      const cleanOrig = ing.name
                                        .toLowerCase()
                                        .trim();
                                      const newTrans =
                                        editingTranslation.text.trim();

                                      // State шинэчлэх
                                      setTranslationsCache((prev) => ({
                                        ...prev,
                                        [cleanOrig]: newTrans,
                                      }));
                                      setEditingTranslation(null);

                                      // Баазад хадгалах
                                      await supabase
                                        .from("learned_translations")
                                        .upsert(
                                          [
                                            {
                                              client_id: activeClient,
                                              original_text: cleanOrig,
                                              translated_text: newTrans,
                                            },
                                          ],
                                          {
                                            onConflict:
                                              "client_id,original_text",
                                          },
                                        );
                                    }}
                                    className="text-zinc-200 font-bold text-xl"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => setEditingTranslation(null)}
                                    className="text-zinc-500 font-bold text-xl"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-xs font-medium text-zinc-300/80 font-mono flex items-center gap-1">
                                    🇲🇳{" "}
                                    {translationsCache[
                                      ing.name.toLowerCase().trim()
                                    ] || (
                                      <span className="text-zinc-500 italic">
                                        Орчуулгагүй
                                      </span>
                                    )}
                                  </span>
                                  <button
                                    onClick={() =>
                                      setEditingTranslation({
                                        original: ing.name.toLowerCase().trim(),
                                        text:
                                          translationsCache[
                                            ing.name.toLowerCase().trim()
                                          ] || "",
                                      })
                                    }
                                    className="text-zinc-500 hover:text-zinc-300 transition"
                                    title="Орчуулгыг засах"
                                  >
                                    ✏️
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. НЭГЖИЙН ӨРТӨГ */}
                        <td className="py-2.5 px-2 text-right font-mono text-sm text-zinc-300">
                          {parseFloat(ing.unit_price).toLocaleString()} ₮
                        </td>

                        {/* 3. PAR ТҮВШИН (Input) */}
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            step="any"
                            value={
                              ing.par_level !== undefined ? ing.par_level : 0
                            }
                            onChange={(e) =>
                              handleIngredientUpdate(
                                ing.id,
                                "par_level",
                                e.target.value,
                              )
                            }
                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-sm text-white w-14 font-mono outline-none focus:border-zinc-700"
                          />
                        </td>

                        {/* 4. LEAD - НИЙЛҮҮЛЭХ ХУГАЦАА (Input) 👈 БУЦААЖ НЭМСЭН ХЭСЭГ */}
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            value={
                              ing.lead_time_days !== undefined
                                ? ing.lead_time_days
                                : 1
                            }
                            onChange={(e) =>
                              handleIngredientUpdate(
                                ing.id,
                                "lead_time_days",
                                e.target.value,
                              )
                            }
                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-sm text-white w-14 font-mono outline-none focus:border-zinc-700"
                          />
                        </td>

                        {/* 5. ЗӨВЛӨХ ЗАХИАЛГА */}
                        <td className="py-2.5 px-2 text-right font-black font-mono text-sm text-zinc-300">
                          {liveAnalytics?.all_inventory_data?.find(
                            (i: any) => i.name === ing.name,
                          )?.suggested_order || 0}{" "}
                          {ing.unit}
                        </td>

                        {/* 6. СИСТЕМД БАЙГАА ҮЛДЭГДЭЛ */}
                        <td className="py-2.5 px-2 text-right font-black font-mono text-sm text-zinc-200">
                          {parseFloat(ing.current_stock || 0).toLocaleString()}{" "}
                          {ing.unit}
                        </td>

                        {/* 7. БОДИТ ТООЛЛОГО ЗАСАХ */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="any"
                            value={
                              bulkStock[ing.id] !== undefined
                                ? bulkStock[ing.id]
                                : ing.current_stock || ""
                            }
                            onChange={(e) =>
                              setBulkStock({
                                ...bulkStock,
                                [ing.id]: e.target.value,
                              })
                            }
                            placeholder="Тоо..."
                            className="bg-zinc-950 border border-zinc-700 focus:border-zinc-700 rounded-lg px-2.5 py-1 text-right text-white font-black text-sm w-20 sm:w-24 outline-none font-mono"
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
