// src/features/products/ProductsPanel.tsx
"use client";
import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Coffee,
  Edit2,
  Trash2,
  CupSoda,
  Utensils,
  Croissant,
  Package,
  Archive,
  Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import SearchableSelect from "@/components/shared/SearchableSelect";
import {
  sanitizeName,
  transliterate,
  getSimilarity,
} from "@/lib/autoReconcile";
import { useProducts } from "./useProducts";
import { AutoPilotChange } from "@/types/dashboard";
const UNIVERSAL_CATEGORIES = [
  {
    id: "HOT_BEVERAGE",
    name: "Халуун ундаа",
    icon: <Coffee className="h-4 w-4" />,
    color: "text-zinc-100 bg-zinc-900 border-zinc-800",
  },
  {
    id: "COLD_BEVERAGE",
    name: "Хүйтэн ундаа",
    icon: <CupSoda className="h-4 w-4" />,
    color: "text-zinc-100 bg-zinc-900 border-zinc-800",
  },
  {
    id: "FOOD_PREP",
    name: "Хоол & Зууш",
    icon: <Utensils className="h-4 w-4" />,
    color: "text-zinc-100 bg-zinc-900 border-zinc-800",
  },
  {
    id: "BAKERY_DESSERT",
    name: "Бэйкэри & Десерт",
    icon: <Croissant className="h-4 w-4" />,
    color: "text-zinc-100 bg-zinc-900 border-zinc-800",
  },
  {
    id: "RETAIL_FMCG",
    name: "Бэлэн бараа",
    icon: <Package className="h-4 w-4" />,
    color: "text-zinc-100 bg-zinc-900 border-zinc-800",
  },
  {
    id: "GENERAL",
    name: "Бусад",
    icon: <Archive className="h-4 w-4" />,
    color: "text-zinc-400 bg-zinc-950 border-zinc-800",
  },
];
function cleanString(str: string) {
  return String(str || "")
    .replace(/[\u00a0\s]+/g, " ")
    .trim();
}
export default function ProductsPanel({
  productsList,
  setProductsList,
  activeClient,
  recipes = [],
  salesLogs = [],
  learnedMenus = [],
  onStartRecipe,
}: {
  productsList: any[];
  setProductsList: React.Dispatch<React.SetStateAction<any[]>>;
  activeClient: string;
  recipes?: any[];
  salesLogs?: any[];
  learnedMenus?: any[];
  onStartRecipe?: (name: string, price: string) => void;
}) {
  const { fetchProducts } = useProducts(activeClient);

  const [selectedProdIds, setSelectedProdIds] = useState<string[]>([]);

  // Меню: Хүснэгт дотор шинэ мөр нэмэх & мөр засах
  const [isAddingProdRow, setIsAddingProdRow] = useState(false);
  const [newProdDraft, setNewProdDraft] = useState({
    name: "",
    category: "COFFEE",
    price: "",
  });
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [editingProdDraft, setEditingProdDraft] = useState({
    name: "",
    category: "COFFEE",
    price: "",
  });
  const [showAddProdModal, setShowAddProdModal] = useState(false);
  const [newProdForm, setNewProdForm] = useState({
    name: "",
    category: "COFFEE",
    price: "",
  });

  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [menuSearch, setMenuSearch] = useState("");
  const [autoPilotActivity, setAutoPilotActivity] = useState<{
    totalSales: number;
    changes: AutoPilotChange[];
  } | null>(null);
  const [showChangesModal, setShowChangesModal] = useState(false);
  // 🔗 ШАР САНУУЛГА ДЭЭР СОНГОСОН ЖОРЫГ НАЙДВАРТАЙ ХАДГАЛАХ СТЭЙТ:
  const [mergeSelections, setMergeSelections] = useState<
    Record<string, string>
  >({});

  const [catalogTab, setCatalogTab] = useState<
    "ingredients" | "products" | "recipes"
  >("ingredients");
  // 📖 Шинэ жор инлайнаар үүсгэх төлөвүүд

  // 1. Ангиллын пайз зурагч
  const renderCategoryBadge = (catId: string) => {
    const found =
      UNIVERSAL_CATEGORIES.find((c) => c.id === catId) ||
      UNIVERSAL_CATEGORIES[5];
    return (
      <span
        className={`px-2.5 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 shadow-sm ${found.color}`}
      >
        <span>{found.icon}</span>
        <span>{found.name.replace(/^[^\s]+\s/, "")}</span>
      </span>
    );
  };

  // ⚡ 1-CLICK ЗӨВ БУЦААХ (UNDO) ФУНКЦ
  const handleSingleUndo = async (changeId: string) => {
    if (!autoPilotActivity) return;
    const targetChange = autoPilotActivity.changes.find(
      (c) => c.id === changeId,
    );
    if (!targetChange || targetChange.reverted) return;

    try {
      if (targetChange.type === "NEW_PRODUCT") {
        await supabase
          .from("products")
          .delete()
          .eq("client_id", activeClient)
          .or(
            `id.eq.${targetChange.productId},name.eq.${targetChange.productName}`,
          );

        setProductsList((prev) =>
          prev.filter(
            (p) =>
              p.id !== targetChange.productId &&
              p.name !== targetChange.productName,
          ),
        );
      } else {
        // Нэр ба үнийг хуучин Меню дээр байсан хэвэнд нь буцааж UPDATE хийнэ:
        await supabase
          .from("products")
          .update({
            name: targetChange.oldName,
            selling_price: targetChange.oldPrice,
            category: targetChange.oldCategory,
          })
          .eq("id", targetChange.productId);

        // Жорон дээрх нэрийг хуучин нэр рүү нь буцаана:
        await supabase
          .from("recipes")
          .update({ product_name: targetChange.oldName })
          .eq("client_id", activeClient)
          .ilike("product_name", targetChange.newName);

        // Local state-ийг шинэчлэх:
        setProductsList((prev) =>
          prev.map((p) =>
            p.id === targetChange.productId
              ? {
                  ...p,
                  name: targetChange.oldName,
                  selling_price: targetChange.oldPrice,
                  category: targetChange.oldCategory,
                }
              : p,
          ),
        );
      }

      // Төлөвийг буцаагдсан болгох:
      setAutoPilotActivity((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          changes: prev.changes.map((c) =>
            c.id === changeId ? { ...c, reverted: true } : c,
          ),
        };
      });

      alert(
        `↩️ "${targetChange.newName}" амжилттай буцаж "${targetChange.oldName}" (${targetChange.oldPrice.toLocaleString()}₮) боллоо!`,
      );
    } catch (err: any) {
      alert(`Алдаа гарлаа: ${err.message}`);
    }
  };

  const aliasMap: Record<string, string> = {};
  // 🕒 1. БҮТЭЭГДЭХҮҮНИЙ ЖОР ӨӨРЧЛӨГДӨХ БҮРД ТҮҮХ ХАДГАЛАХ (ТӨГС УХААЛАГ ХУВИЛБАР)

  const unmappedSales = React.useMemo(() => {
    // Бүх нэрсийг санах ойд (Set) 1 удаа бэлтгэх (O(1) хурд)
    const knownSet = new Set<string>();

    productsList.forEach((p: any) => {
      const clean = cleanString(p.name).toLowerCase();
      knownSet.add(clean);
      knownSet.add(sanitizeName(clean));
      // Крилл үсгийг латин болгож санах ойд нэмэх (Салями сэндвич == salami sendvich)
      if (typeof transliterate === "function")
        knownSet.add(transliterate(clean));
    });

    // 🧠 САНАХ ОЙ: learned_menus дээр сурсан БҮХ товчлолуудыг шалгах!
    (learnedMenus || []).forEach((lm: any) => {
      if (lm.pos_name) {
        const cleanPos = cleanString(lm.pos_name).toLowerCase();
        knownSet.add(cleanPos);
        knownSet.add(sanitizeName(cleanPos));
        if (typeof transliterate === "function") {
          knownSet.add(transliterate(cleanPos).replace(/\s+/g, ""));
        }
      }
    });

    Object.entries(aliasMap).forEach(([k, v]) => {
      knownSet.add(k.toLowerCase());
      knownSet.add(v.toLowerCase());
    });

    const missingItems: any[] = [];
    const seen = new Set<string>();

    salesLogs
      .filter((s: any) => s.client_id === activeClient)
      .forEach((s: any) => {
        const rawName = cleanString(s.product_name);
        const pNameLower = rawName.toLowerCase();
        const pClean = sanitizeName(pNameLower);
        const pTrans =
          typeof transliterate === "function"
            ? transliterate(pNameLower)
            : pNameLower;

        // ⚡ 300 сая биш, 0.00001 миллисекундэд шууд шалгана:
        const isKnown =
          knownSet.has(pNameLower) ||
          knownSet.has(pClean) ||
          knownSet.has(pTrans);

        if (!isKnown && !seen.has(pNameLower)) {
          seen.add(pNameLower);
          const calculatedPrice =
            s.quantity_sold > 0
              ? Math.round(s.total_revenue / s.quantity_sold)
              : 0;
          missingItems.push({
            name: s.product_name,
            soldCount: s.quantity_sold,
            unitPrice: calculatedPrice,
          });
        }
      });

    return missingItems;
  }, [salesLogs, productsList, activeClient, learnedMenus]);

  const productRecipeStatus = React.useMemo(() => {
    const map = new Map<string, { count: number }>();

    // Бэлэн жоруудын нэрийг 1 удаа бэлтгэх
    const recipeGroups = new Map<string, any[]>();
    recipes.forEach((r: any) => {
      const clean = cleanString(r.product_name).toLowerCase();
      if (!recipeGroups.has(clean)) recipeGroups.set(clean, []);
      recipeGroups.get(clean)!.push(r);
    });

    // Бүх цэсийг хурдан шалгаж Map дотор хадгалах
    productsList.forEach((prod: any) => {
      const pClean = cleanString(prod.name).toLowerCase();
      const pTrans =
        typeof transliterate === "function"
          ? transliterate(pClean).replace(/\s+/g, "")
          : pClean;

      // 1. Яг адил нэртэй жор байна уу?
      if (recipeGroups.has(pClean)) {
        map.set(prod.id, { count: recipeGroups.get(pClean)!.length });
        return;
      }

      // 2. Алиас эсвэл Крилл-Латин (Салями сэндвич == Salami Sandwich) таарч байна уу?
      let matchedCount = 0;
      for (const [rName, rItems] of recipeGroups.entries()) {
        const rTrans =
          typeof transliterate === "function"
            ? transliterate(rName).replace(/\s+/g, "")
            : rName;
        if (
          rName === aliasMap[pClean] ||
          rTrans === pTrans ||
          getSimilarity(rTrans, pTrans) >= 0.7 ||
          (pClean.includes("салями") && rName.includes("salami"))
        ) {
          matchedCount = rItems.length;
          break;
        }
      }

      map.set(prod.id, { count: matchedCount });
    });

    return map;
  }, [recipes, productsList, activeClient]);

  const handleSaveNewProd = async () => {
    if (!newProdDraft.name.trim()) return;
    const { data } = await supabase
      .from("products")
      .insert([
        {
          client_id: activeClient,
          name: newProdDraft.name.trim(),
          category: newProdDraft.category || "General",
          selling_price: parseFloat(newProdDraft.price) || 0,
        },
      ])
      .select()
      .single();

    if (data) setProductsList((prev: any[]) => [data, ...prev]);
    setIsAddingProdRow(false);
    setNewProdDraft({ name: "", category: "COFFEE", price: "" });
  };

  const handleSaveEditedProd = async (prod: any) => {
    const oldName = prod.name;
    const newName = editingProdDraft.name.trim() || prod.name;
    const newPrice = parseFloat(editingProdDraft.price) || 0;
    const newCat = editingProdDraft.category || "General";

    setProductsList((prev: any[]) =>
      prev.map((p) =>
        p.id === prod.id
          ? { ...p, name: newName, category: newCat, selling_price: newPrice }
          : p,
      ),
    );
    setEditingProdId(null);

    await supabase
      .from("products")
      .update({
        name: newName,
        category: newCat,
        selling_price: newPrice,
      })
      .eq("id", prod.id);

    if (oldName && oldName !== newName) {
      await supabase
        .from("recipes")
        .update({ product_name: newName })
        .eq("client_id", activeClient)
        .eq("product_name", oldName);
    }
    fetchProducts();
  };

  return (
    <div className="pt-4 space-y-3">
      {/* ⚡ АВТО-ПИЛОТ ТУУЗ: ЯГ ТАНЫ ХҮССЭН ТЕКСТ & ТОВЧ */}
      {autoPilotActivity && (
        <div className="bg-zinc-800/60 border-2 border-zinc-800 p-4 rounded-2xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-200  shrink-0" />
            <p className="text-sm sm:text-sm text-zinc-300 font-black leading-relaxed">
              ⚡ Авто-Пилот: {autoPilotActivity.totalSales} борлуулалт амжилттай
              бодлоо.
              {autoPilotActivity.changes.length > 0
                ? ` Нийт ${autoPilotActivity.changes.filter((c) => !c.reverted).length} бараанд өөрчлөлт орсон байна.`
                : " Бүх үнэ, жор 100% таарсан байна."}
            </p>
          </div>

          {autoPilotActivity.changes.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowChangesModal(true)}
                className="bg-white hover:bg-zinc-200 text-zinc-950 px-3.5 py-1.5 rounded-xl text-sm font-black transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow"
              >
                <span>
                  Өөрчлөлтүүдийг харах (
                  {autoPilotActivity.changes.filter((c) => !c.reverted).length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAutoPilotActivity(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1 text-sm"
                title="Хаах"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* 📋 [  ӨӨРЧЛӨЛТҮҮДИЙГ ХАРАХ ] ПОПАП ЦОНХ */}
      {showChangesModal && autoPilotActivity && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-150"
          onClick={() => setShowChangesModal(false)}
        >
          <div
            className="bg-zinc-950 border border-zinc-700 rounded-3xl p-5 w-full max-w-2xl shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <span>📋 Авто-Пилотын хийсэн өөрчлөлтүүд</span>
                </h3>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Шинээр орж ирсэн ПОС-ын нэр болон үнийг шалгаж, шаардлагатай
                  бол буцаана уу.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChangesModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-xl text-sm font-bold"
              >
                ✕ Хаах
              </button>
            </div>

            {/* ХҮСНЭГТ: ХУУЧИН БА ШИНЭ УТГУУД ЗӨВ БАЙРАНДАА */}
            <div className="flex-1 overflow-y-auto border border-zinc-800 rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold sticky top-0 border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3">Шинэ бүтээгдэхүүн (ПОС)</th>
                    <th className="py-2.5 px-3">Төлөв</th>
                    <th className="py-2.5 px-3 text-right">Хуучин (Меню)</th>
                    <th className="py-2.5 px-3 text-right">Шинэ (ПОС)</th>
                    <th className="py-2.5 px-3 text-center">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-zinc-950/40">
                  {autoPilotActivity.changes.map((ch) => (
                    <tr
                      key={ch.id}
                      className={
                        ch.reverted
                          ? "opacity-40 line-through bg-zinc-900/20"
                          : "hover:bg-zinc-900/40"
                      }
                    >
                      <td className="py-2.5 px-3 font-bold text-white">
                        <div>
                          <span>{ch.oldName}</span>
                          {ch.newName && ch.newName !== ch.oldName && (
                            <span className="block text-xs text-zinc-400 font-normal">
                              {ch.newName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-xs font-black uppercase bg-zinc-800/60 text-zinc-300 border border-zinc-700/20">
                          Үнэ шинэчлэгдсэн
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-400 font-mono">
                        {ch.oldPrice.toLocaleString()} ₮
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-200 font-mono font-black">
                        {ch.newPrice.toLocaleString()} ₮
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {ch.reverted ? (
                          <span className="text-xs text-zinc-500 font-bold">
                            Буцаагдсан ↩️
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSingleUndo(ch.id)}
                            className="bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-300 border border-zinc-700 hover:border-rose-500/40 px-2.5 py-1 rounded-xl text-sm font-bold transition active:scale-95 cursor-pointer"
                            title="Хуучин нэр ба үнэ рүү нь буцаах"
                          >
                            ↩️ Буцаах
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <p className="text-xs text-zinc-500">
                💡 Буцаах товч дармагц тухайн бараа хуучин нэр болон үнэ рүүгээ
                тэр дороо шилжинэ.
              </p>
              <button
                type="button"
                onClick={() => setShowChangesModal(false)}
                className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-4 py-2 rounded-xl text-sm cursor-pointer transition shadow"
              >
                ✓ Ойлголоо, цонхыг хаах
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ПОС-ООС ИРСЭН БҮТЭЭГДЭХҮҮНИЙГ СОЛЬЖ НЭГТГЭХ ЭСВЭЛ ШИНЭЭР НЭМЭХ ШАР БАННЕР */}
      {unmappedSales.length > 0 && (
        <div className="bg-zinc-800/60 border-2 border-amber-500/40 p-4 rounded-2xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-zinc-300 shrink-0 " />
            <div>
              <h4 className="text-sm sm:text-sm font-black text-zinc-300">
                ПОС дээр нэр зөрсөн/шинэ бүтээгдэхүүнүүд ({unmappedSales.length}
                ):
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Хэрэв хуучин цэсний товчлол бол <strong>"Сольж нэгтгэх"</strong>
                , цоо шинэ бараа бол <strong>"+ Шинэ цэс үүсгэх"</strong> дарна
                уу.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            {unmappedSales.map((item, idx) => (
              <div
                key={idx}
                className="bg-zinc-950 p-3 rounded-2xl border border-zinc-700 text-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 shadow-sm"
              >
                <div>
                  <span className="text-white font-black text-sm">
                    {item.name}
                  </span>
                  <span className="text-zinc-200 font-mono text-xs ml-2">
                    ПОС үнэ: {item.unitPrice.toLocaleString()} ₮ (
                    {item.soldCount}ш)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  {/* ⚡ СОНГОЛТ 1: ХУУЧИН ЖОРТОЙ СОЛЬЖ НЭГТГЭХ (ХАЙЛТТАЙ, АРИЛАХГҮЙ) */}
                  <div className="flex items-center gap-1.5 flex-1 lg:flex-none">
                    <div className="w-56">
                      <SearchableSelect
                        placeholder="-- Жор хайж сонгох --"
                        value={mergeSelections[item.name] || ""}
                        options={Array.from(
                          new Set(recipes.map((r: any) => r.product_name)),
                        ).map((rName: any) => ({
                          value: rName,
                          label: `📖 ${rName}`,
                        }))}
                        onChange={(chosenRecipe) => {
                          // Сонголтыг найдвартай хадгална (Арилж алга болохгүй)
                          setMergeSelections((prev) => ({
                            ...prev,
                            [item.name]: chosenRecipe,
                          }));
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        // ⚡ Сонгосон жорыг санах ойноос шууд уншина
                        const selectedOldName = mergeSelections[item.name];
                        if (!selectedOldName) {
                          alert("Сольж нэгтгэх хуучин жороо сонгоно уу!");
                          return;
                        }

                        const posName = item.name.trim();
                        const existingProd = productsList.find(
                          (p) =>
                            p.name.toLowerCase().trim() ===
                            selectedOldName.toLowerCase().trim(),
                        );
                        const preservedCategory =
                          existingProd?.category || "General";

                        // 1. Хуучин бүтээгдэхүүний орцуудыг татаж авах
                        const { data: existingRecipeRows } = await supabase
                          .from("recipes")
                          .select("ingredient_id, amount")
                          .eq("client_id", activeClient)
                          .eq("product_name", selectedOldName);

                        if (
                          existingRecipeRows &&
                          existingRecipeRows.length > 0
                        ) {
                          // 2. Шинэ цэс дээр уг жорыг ХУУЛБАРЛАЖ (COPY) өгнө:
                          const rowsToClone = existingRecipeRows.map(
                            (r: any) => ({
                              client_id: activeClient,
                              product_name: posName,
                              ingredient_id: r.ingredient_id,
                              amount: r.amount,
                            }),
                          );

                          await supabase.from("recipes").upsert(rowsToClone, {
                            onConflict: "client_id,product_name,ingredient_id",
                          });

                          // 3. ⚡ ТҮҮХИЙГ ШУУД БААЗАД БҮРТГЭХ:
                          const {
                            data: { session },
                          } = await supabase.auth.getSession();
                          const currentActor =
                            session?.user?.user_metadata?.full_name ||
                            session?.user?.email?.split("@")[0] ||
                            "Эзэн";

                          await supabase.from("recipe_snapshots").insert([
                            {
                              client_id: activeClient,
                              product_name: posName,
                              action: "created",
                              ingredients_snapshot: rowsToClone, // 👈 Хуулсан орцуудаа шууд түүх рүү оруулна
                              author: `${currentActor} (ПОС нэгтгэл)`,
                            },
                          ]);
                        }

                        // 4. Products хүснэгт дэх үнэ, ангиллыг хадгалах:
                        if (existingProd) {
                          await supabase
                            .from("products")
                            .update({
                              name: posName,
                              selling_price:
                                item.unitPrice > 0
                                  ? item.unitPrice
                                  : existingProd.selling_price,
                              category: preservedCategory,
                            })
                            .eq("id", existingProd.id);
                        } else {
                          await supabase.from("products").upsert(
                            [
                              {
                                client_id: activeClient,
                                name: posName,
                                category: preservedCategory,
                                selling_price: item.unitPrice,
                              },
                            ],
                            { onConflict: "client_id,name" },
                          );
                        }

                        // 5. "🔗 СОЛЬЖ НЭГТГЭХ" дарахад системийг сургах (learned_menus-д хадгалах):
                        if (
                          cleanString(posName).toLowerCase() !==
                          cleanString(selectedOldName).toLowerCase()
                        ) {
                          await supabase.from("learned_menus").upsert(
                            [
                              {
                                client_id: activeClient,
                                pos_name: posName,
                                official_product_name: selectedOldName,
                              },
                            ],
                            { onConflict: "client_id,pos_name" },
                          );
                        }

                        // 6. Дэлгэц дээрх Менюг шинэчлэх
                        await fetchProducts();
                        alert(
                          ` "${selectedOldName}"-ийн жорыг "${posName}"-тай амжилттай холболоо!`,
                        );
                      }}
                      className="bg-white hover:bg-zinc-200 text-zinc-950 px-3.5 py-2 rounded-xl font-black text-xs transition active:scale-95 whitespace-nowrap shadow cursor-pointer"
                    >
                      🔗 Сольж нэгтгэх
                    </button>
                  </div>

                  <span className="text-zinc-600 text-sm hidden lg:inline">
                    эсвэл
                  </span>

                  {/* ⚡ СОНГОЛТ 2: ЦОО ШИНЭЭР ЦЭСЭНД НЭМЭХ */}
                  <button
                    type="button"
                    onClick={async () => {
                      const { data } = await supabase
                        .from("products")
                        .upsert(
                          [
                            {
                              client_id: activeClient,
                              name: item.name.trim(),
                              category: "General",
                              selling_price: item.unitPrice,
                            },
                          ],
                          { onConflict: "client_id,name" },
                        )
                        .select()
                        .single();

                      if (data) {
                        setProductsList((prev) => [
                          data,
                          ...prev.filter((p) => p.id !== data.id),
                        ]);
                      }
                      fetchProducts();
                    }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-xl font-bold text-sm transition active:scale-95 whitespace-nowrap"
                  >
                    + Шинэ цэс үүсгэх ({item.unitPrice.toLocaleString()}₮)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔍 Хайлт ба Инлайн Шинэ цэс нэмэх */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <input
          type="text"
          value={menuSearch}
          onChange={(e) => setMenuSearch(e.target.value)}
          placeholder="Менюний нэрээр хайх..."
          className="w-full sm:flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-700"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {selectedProdIds.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                if (
                  !confirm(
                    `Сонгосон ${selectedProdIds.length} цэсийг устгах уу?`,
                  )
                )
                  return;
                setProductsList((prev) =>
                  prev.filter((p) => !selectedProdIds.includes(p.id)),
                );
                const ids = [...selectedProdIds];
                setSelectedProdIds([]);
                await supabase.from("products").delete().in("id", ids);
                fetchProducts();
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2.5 rounded-xl text-sm font-black transition active:scale-95 flex items-center gap-1.5 shadow"
            >
              <span>🗑️ Сонгосон ({selectedProdIds.length}) устгах</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsAddingProdRow(!isAddingProdRow);
              setNewProdDraft({ name: "", category: "COFFEE", price: "" });
            }}
            className={`${
              isAddingProdRow
                ? "bg-zinc-800 text-zinc-300"
                : "bg-white hover:bg-zinc-200 text-zinc-950"
            } px-4 py-2.5 rounded-xl text-sm font-black transition flex items-center gap-1.5 active:scale-95 shadow`}
          >
            <span>{isAddingProdRow ? "✕ Цуцлах" : "+ Менюний цэс нэмэх"}</span>
          </button>
        </div>
      </div>

      {/* 📋 МЕНЮНИЙ ХҮСНЭГТ (МӨР ДОТРОО ЖОР СОНГОЖ ХОЛБОХ БАГАНАТАЙ) */}
      <div className="overflow-x-auto max-h-[440px] border border-zinc-800 rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold sticky top-0 border-b border-zinc-800 z-10">
            <tr>
              <th className="py-3 px-3 w-8">
                <input
                  type="checkbox"
                  checked={
                    selectedProdIds.length > 0 &&
                    selectedProdIds.length === productsList.length
                  }
                  onChange={(e) => {
                    if (e.target.checked)
                      setSelectedProdIds(productsList.map((p) => p.id));
                    else setSelectedProdIds([]);
                  }}
                  className="w-4 h-4 accent-blue-500 cursor-pointer rounded"
                />
              </th>
              <th className="py-3 px-3">Ангилал</th>
              <th className="py-3 px-3">Бүтээгдэхүүний нэр</th>
              <th className="py-3 px-3 text-right">ПОС зарах үнэ (₮)</th>
              <th className="py-3 px-3 text-center">Жорын төлөв & Холбоос</th>
              <th className="py-3 px-3 text-right">Үйлдэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-zinc-950/40 font-medium">
            {/* Шинэ цэс нэмэх инлайн мөр */}
            {isAddingProdRow && (
              <tr className="bg-zinc-900/60 border-b-2 border-zinc-700/60 animate-in fade-in duration-150">
                <td className="py-2 px-3 text-zinc-300 font-bold">New</td>
                <td className="py-2 px-3">
                  <select
                    value={newProdDraft.category}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setNewProdDraft({
                        ...newProdDraft,
                        category: e.target.value,
                      })
                    }
                    className="bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none cursor-pointer"
                  >
                    {UNIVERSAL_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-3">
                  <input
                    type="text"
                    autoFocus
                    value={newProdDraft.name}
                    onChange={(e) =>
                      setNewProdDraft({ ...newProdDraft, name: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveNewProd();
                    }}
                    placeholder="Бүтээгдэхүүний нэр..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-sm text-white font-bold outline-none"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    value={newProdDraft.price}
                    onChange={(e) =>
                      setNewProdDraft({
                        ...newProdDraft,
                        price: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveNewProd();
                    }}
                    placeholder="Зарах үнэ ₮..."
                    className="w-24 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-right text-sm text-zinc-200 font-mono font-bold outline-none"
                  />
                </td>
                <td className="py-2 px-3 text-center text-zinc-500">-</td>
                <td className="py-2 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      disabled={!newProdDraft.name.trim()}
                      onClick={async () => {
                        const { data } = await supabase
                          .from("products")
                          .insert([
                            {
                              client_id: activeClient,
                              name: newProdDraft.name.trim(),
                              category: newProdDraft.category || "General",
                              selling_price:
                                parseFloat(newProdDraft.price) || 0,
                            },
                          ])
                          .select()
                          .single();
                        if (data) setProductsList((prev) => [data, ...prev]);
                        setIsAddingProdRow(false);
                        setNewProdDraft({
                          name: "",
                          category: "COFFEE",
                          price: "",
                        });
                      }}
                      className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-2.5 py-1 rounded-lg text-sm transition"
                      title="Хадгалах"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingProdRow(false)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2 py-1 rounded-lg text-sm"
                      title="Болих"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* ЦЭСНИЙ ЖАГСААЛТ */}
            {productsList
              .filter(
                (p) =>
                  !menuSearch.trim() ||
                  p.name
                    .toLowerCase()
                    .includes(menuSearch.toLowerCase().trim()) ||
                  (p.category &&
                    p.category
                      .toLowerCase()
                      .includes(menuSearch.toLowerCase().trim())),
              )
              .map((prod, idx) => {
                // 👈 idx нэмсэн
                const isEditingThis = editingProdId === prod.id;

                if (isEditingThis) {
                  return (
                    <tr
                      key={`edit-${prod.id}-${idx}`}
                      className="bg-zinc-900/60 border-b-2 border-zinc-700/60"
                    >
                      <td className="py-2 px-3"></td>
                      <td className="py-2 px-3">
                        <select
                          value={editingProdDraft.category}
                          onChange={(e) =>
                            setEditingProdDraft({
                              ...editingProdDraft,
                              category: e.target.value,
                            })
                          }
                          className="bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none cursor-pointer"
                        >
                          {UNIVERSAL_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          autoFocus
                          value={editingProdDraft.name}
                          onChange={(e) =>
                            setEditingProdDraft({
                              ...editingProdDraft,
                              name: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEditedProd(prod);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-sm text-white font-bold outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          value={editingProdDraft.price}
                          onChange={(e) =>
                            setEditingProdDraft({
                              ...editingProdDraft,
                              price: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEditedProd(prod);
                          }}
                          className="w-24 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-right text-sm text-zinc-200 font-mono font-bold outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-center text-zinc-500">-</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const oldName = prod.name;
                              const newName =
                                editingProdDraft.name.trim() || prod.name;
                              const newPrice =
                                parseFloat(editingProdDraft.price) || 0;
                              const newCat =
                                editingProdDraft.category || "General";

                              setProductsList((prev) =>
                                prev.map((p) =>
                                  p.id === prod.id
                                    ? {
                                        ...p,
                                        name: newName,
                                        category: newCat,
                                        selling_price: newPrice,
                                      }
                                    : p,
                                ),
                              );
                              setEditingProdId(null);

                              await supabase
                                .from("products")
                                .update({
                                  name: newName,
                                  category: newCat,
                                  selling_price: newPrice,
                                })
                                .eq("id", prod.id);

                              // 🧠 ⚡ ЭЗЭН МЕНЮ ДЭЭР АНГИЛЛЫГ ЗАСМАГЦ LEARNED_CATEGORIES БААЗ ДАВХАР ЗАСАГДАНА:
                              await supabase.from("learned_categories").upsert(
                                [
                                  {
                                    client_id: activeClient,
                                    product_name: newName,
                                    category: newCat,
                                  },
                                ],
                                { onConflict: "client_id,product_name" },
                              );
                              if (oldName && oldName !== newName) {
                                await supabase
                                  .from("recipes")
                                  .update({ product_name: newName })
                                  .eq("client_id", activeClient)
                                  .eq("product_name", oldName);
                              }
                              fetchProducts();
                            }}
                            className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-2.5 py-1 rounded-lg text-sm transition"
                            title="Батлах"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProdId(null)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2 py-1 rounded-lg text-sm"
                            title="Цуцлах"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={`prod-${prod.id}-${idx}`}
                    className="hover:bg-zinc-900/60 transition"
                  >
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={selectedProdIds.includes(prod.id)}
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelectedProdIds((prev) => [...prev, prod.id]);
                          else
                            setSelectedProdIds((prev) =>
                              prev.filter((id) => id !== prod.id),
                            );
                        }}
                        className="w-4 h-4 accent-blue-500 cursor-pointer rounded"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="   ">
                        {renderCategoryBadge(prod.category)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {prod.name}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-200 font-mono font-black text-sm">
                      {parseFloat(prod.selling_price || 0).toLocaleString()} ₮
                    </td>
                    {/* ⚡ УХААЛАГ ЖОРЫН ТӨЛӨВ & ХОЛБООС БАГАНА */}
                    <td className="py-2.5 px-3 text-center">
                      {(() => {
                        const status = productRecipeStatus.get(prod.id);
                        const hasRecipe = status && status.count > 0;

                        if (hasRecipe) {
                          return (
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-950 shadow-[0_0_15px_rgba(52,211,153,0.25)] shrink-0" />
                              <span> Жортой</span>
                              <span className="text-xs text-zinc-200/80">
                                ({status.count} орц)
                              </span>
                            </span>
                          );
                        }

                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (onStartRecipe) {
                                onStartRecipe(
                                  prod.name,
                                  prod.selling_price?.toString() || "",
                                );
                              }
                            }}
                            className="bg-zinc-200/20 hover:bg-zinc-200/30 text-zinc-300 border border-zinc-800/30 px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 mx-auto active:scale-95 shadow-sm cursor-pointer"
                          >
                            <Plus className="h-3 w-3 text-zinc-500" />
                            <span>Орц угсрах</span>
                          </button>
                        );
                      })()}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProdId(prod.id);
                            setEditingProdDraft({
                              name: prod.name,
                              category: prod.category || "General",
                              price: (prod.selling_price || 0).toString(),
                            });
                          }}
                          className="text-zinc-400 hover:text-zinc-300 p-1 text-sm transition"
                          title="Мөр дотор засах"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !confirm(
                                `"${prod.name}" бүтээгдэхүүнийг цэснээс устгах уу?`,
                              )
                            )
                              return;
                            setProductsList((prev) =>
                              prev.filter((p) => p.id !== prod.id),
                            );
                            await supabase
                              .from("products")
                              .delete()
                              .eq("id", prod.id);
                            fetchProducts();
                          }}
                          className="text-zinc-500 hover:text-rose-400 p-1 text-sm transition"
                          title="Устгах"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* ➕ 2. ШИНЭ МЕНЮНИЙ ЦЭС НЭМЭХ МОДАЛ                                         */}
      {/* ========================================================================= */}
      {showAddProdModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-700 p-5 rounded-3xl max-w-sm w-full space-y-3">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-black text-white">
                + Шинэ Менюний Цэс нэмэх
              </h3>
              <button
                onClick={() => setShowAddProdModal(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              required
              value={newProdForm.name}
              onChange={(e) =>
                setNewProdForm({ ...newProdForm, name: e.target.value })
              }
              placeholder="Бүтээгдэхүүний нэр (Жишээ: Oat Latte)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newProdForm.category}
                onChange={(e) =>
                  setNewProdForm({
                    ...newProdForm,
                    category: e.target.value,
                  })
                }
                placeholder="Ангилал (COFFEE, FOOD)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white outline-none"
              />
              <input
                type="number"
                value={newProdForm.price}
                onChange={(e) =>
                  setNewProdForm({
                    ...newProdForm,
                    price: e.target.value,
                  })
                }
                placeholder="Зарах үнэ ₮"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white outline-none"
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!newProdForm.name.trim()) return;
                const { data } = await supabase
                  .from("products")
                  .insert([
                    {
                      client_id: activeClient,
                      name: newProdForm.name.trim(),
                      category: newProdForm.category || "General",
                      selling_price: parseFloat(newProdForm.price) || 0,
                    },
                  ])
                  .select()
                  .single();
                if (data) setProductsList((prev) => [...prev, data]);
                setShowAddProdModal(false);
                setNewProdForm({
                  name: "",
                  category: "COFFEE",
                  price: "",
                });
              }}
              className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-black py-2.5 rounded-xl text-sm transition"
            >
              Цэсэнд Нэмэх
            </button>
          </div>
        </div>
      )}

      {/* ✏️ МЕНЮ БҮТЭЭГДЭХҮҮН ЗАСАХ МОДАЛ (Нэр болон Зарах үнийг хамтад нь засна) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-700 p-5 rounded-3xl max-w-sm w-full space-y-3">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-black text-white">
                <Edit2 className="h-4 w-4" />
                Цэс засах
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1">
                Бүтээгдэхүүний нэр (ПОС-той таарах):
              </label>
              <input
                type="text"
                value={editingProduct.name}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    name: e.target.value,
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white outline-none focus:border-zinc-700 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  Ангилал:
                </label>
                <input
                  type="text"
                  value={editingProduct.category}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      category: e.target.value,
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-zinc-300 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  Зарах үнэ (₮):
                </label>
                <input
                  type="number"
                  value={editingProduct.selling_price}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      selling_price: e.target.value,
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-zinc-200 font-mono font-bold outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                const oldName = productsList.find(
                  (p) => p.id === editingProduct.id,
                )?.name;
                const newName = editingProduct.name.trim();

                // 1. Бүтээгдэхүүнийг шинэчлэх
                await supabase
                  .from("products")
                  .update({
                    name: newName,
                    category: editingProduct.category,
                    selling_price:
                      parseFloat(editingProduct.selling_price) || 0,
                  })
                  .eq("id", editingProduct.id);

                // 2. Хэрэв нэр нь өөрчлөгдсөн бол холбогдох ЖОРЫН бүтээгдэхүүний нэрийг дагаж солих!
                if (oldName && oldName !== newName) {
                  await supabase
                    .from("recipes")
                    .update({ product_name: newName })
                    .eq("client_id", activeClient)
                    .eq("product_name", oldName);
                }

                setEditingProduct(null);
                fetchProducts();
              }}
              className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-black py-2.5 rounded-xl text-sm transition"
            >
              Хадгалах
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
