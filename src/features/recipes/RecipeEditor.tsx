// src/features/recipes/RecipeEditor.tsx
"use client";
import React, { useState, useEffect } from "react";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { supabase } from "@/lib/supabase";
import { useRecipes } from "./useRecipes";
import RecipeHistoryModal from "./RecipeHistoryModal";
import * as XLSX from "xlsx";
interface RecipeEditorProps {
  recipes: any[];
  setRecipes: React.Dispatch<React.SetStateAction<any[]>>;
  activeClient: string;
  ingredients: any[]; // Орцын сонголт харуулахад
  productsList: any[]; // Зарах үнийг олоход
  aliasMap?: Record<string, string>;
  initialDraft?: { name: string; price: string } | null;
  onDraftCleared?: () => void;
  setProductsList?: React.Dispatch<React.SetStateAction<any[]>>;
}
function cleanString(str: string) {
  return String(str || "")
    .replace(/[\u00a0\s]+/g, " ")
    .trim();
}
// 🇲🇳 Монголын цагийн бүсээр YYYY-MM-DD огноог 100% зөв гаргах функц:
function getLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function RecipeEditor({
  recipes,
  setRecipes,
  activeClient,
  ingredients,
  productsList,
  aliasMap = {},
  initialDraft,
  onDraftCleared,
  setProductsList,
}: RecipeEditorProps) {
  const [recipeSearch, setRecipeSearch] = useState("");
  const [selectedRecipeProducts, setSelectedRecipeProducts] = useState<
    string[]
  >([]);
  const [isCreatingRecipeCard, setIsCreatingRecipeCard] = useState(false);
  const [newRecipeNameDraft, setNewRecipeNameDraft] = useState("");
  const [newRecipePriceDraft, setNewRecipePriceDraft] = useState("");
  const [newRecipeItemsDraft, setNewRecipeItemsDraft] = useState<
    Array<{ ingredient_id: string; amount: string }>
  >([]);
  const [draftRecipeIngId, setDraftRecipeIngId] = useState("");
  const [draftRecipeIngAmt, setDraftRecipeIngAmt] = useState("");
  const [recipeDrafts, setRecipeDrafts] = useState<{
    [recipeId: string]: string;
  }>({});
  const [inlineAddRecipeProduct, setInlineAddRecipeProduct] = useState<
    string | null
  >(null);
  const [inlineRecipeDraft, setInlineRecipeDraft] = useState({
    ingredient_id: "",
    amount: "",
  });
  // 📥 JSON НӨӨЦ ФАЙЛЫГ УНШИХ & СОНГОЖ СЭРГЭЭХ СТЭЙТҮҮД
  const [jsonBackupModal, setJsonBackupModal] = useState<{
    fileData: any;
    recipesByProduct: Record<string, any[]>;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  // 🕒 ЖОРЫН ТҮҮХ БА ХОГИЙН САВНЫ СТЭЙТҮҮД
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<
    string | null
  >(null);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  // Recipe Builder-ийн State:
  const [recipeBuilder, setRecipeBuilder] = useState<{
    product_name: string;
    category: string;
    selling_price: string;
    items: Array<{ ingredient_id: string; amount: string }>;
  }>({
    product_name: "",
    category: "COFFEE",
    selling_price: "",
    items: [{ ingredient_id: "", amount: "" }],
  });
  const [addIngToRecipeProduct, setAddIngToRecipeProduct] = useState<
    string | null
  >(null);

  const [quickIngId, setQuickIngId] = useState("");
  const [quickIngAmount, setQuickIngAmount] = useState("");

  useEffect(() => {
    if (initialDraft) {
      setIsCreatingRecipeCard(true); // 👈 Ягаан хайрцгаа нээнэ
      setNewRecipeNameDraft(initialDraft.name); // 👈 Нэрийг нь автоматаар бичнэ
      setNewRecipePriceDraft(initialDraft.price); // 👈 Үнийг нь автоматаар бичнэ
      onDraftCleared?.();
    }
  }, [initialDraft]);

  // 💾 ЗӨВХӨН ТУХАЙН ХАРИЛЦАГЧИЙН (activeClient) ЖОРЫГ ТАТАХ
  const handleExportRecipeBackup = () => {
    // 🔒 Өөр салбарын жор хутгалдахаас хамгаалж activeClient-ээр нарийн шүүнэ
    const clientRecipes = recipes.filter(
      (r: any) =>
        cleanString(r.client_id).toLowerCase() ===
        cleanString(activeClient).toLowerCase(),
    );
    const clientProducts = productsList.filter(
      (p: any) =>
        cleanString(p.client_id).toLowerCase() ===
        cleanString(activeClient).toLowerCase(),
    );

    const backupData = {
      tenant_client_id: activeClient,
      exported_at: new Date().toISOString(),
      total_products: clientProducts.length,
      total_recipe_items: clientRecipes.length,
      products: clientProducts,
      recipes: clientRecipes,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Operlink_Recipes_${activeClient.replace(/\s+/g, "_")}_${getLocalDateStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  // 📥 EXCEL РҮҮ МЕНЮ БА ЖОРЫГ ТАТАЖ АВАХ ФУНКЦ
  const handleExportToExcel = () => {
    // 1. Меню (Products) өгөгдлийг бэлтгэх
    const menuData = productsList
      .filter((p: any) => p.client_id === activeClient)
      .map((p: any) => ({
        "Ангилал (Category)": p.category || "General",
        "Бүтээгдэхүүний нэр (Product Name)": p.name,
        "Зарах үнэ ₮ (Selling Price)": parseFloat(p.selling_price) || 0,
      }));

    // 2. Жор (Recipes) өгөгдлийг бэлтгэх
    const recipeData = recipes
      .filter((r: any) => r.client_id === activeClient)
      .map((r: any) => {
        const ing = ingredients.find((i: any) => i.id === r.ingredient_id);
        return {
          "Бүтээгдэхүүний нэр (Product Name)": r.product_name,
          "Орцын нэр (Ingredient)": ing?.name || "Unknown",
          "Хэмжээ (Amount)": parseFloat(r.amount) || 0,
          "Нэгж (Unit)": ing?.unit || "",
        };
      });

    // 3. Excel Workbook үүсгэх
    const wb = XLSX.utils.book_new();

    // 4. Меню хуудсыг үүсгэж хавсаргах
    const wsMenu = XLSX.utils.json_to_sheet(menuData);
    XLSX.utils.book_append_sheet(wb, wsMenu, "Меню_Үнэ");

    // 5. Жор хуудсыг үүсгэж хавсаргах
    const wsRecipes = XLSX.utils.json_to_sheet(recipeData);
    XLSX.utils.book_append_sheet(wb, wsRecipes, "Технологийн_Карт");

    // 6. Файлыг татаж авах
    const fileName = `Menu_Recipes_${activeClient.replace(/\s+/g, "_")}_${getLocalDateStr()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // 1. Компьютерээс .json файл сонгож унших
  const handleJsonFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.recipes || !Array.isArray(data.recipes)) {
          alert("Алдаа: Энэ файл дотор жорын мэдээлэл олдсонгүй!");
          return;
        }

        // Жорыг бүтээгдэхүүн тус бүрээр нь бүлэглэх (Сонгож сэргээхэд зориулж)
        const grouped: Record<string, any[]> = {};
        data.recipes.forEach((r: any) => {
          const pName = r.product_name;
          if (!grouped[pName]) grouped[pName] = [];
          grouped[pName].push(r);
        });

        setJsonBackupModal({
          fileData: data,
          recipesByProduct: grouped,
        });
      } catch (err) {
        alert("JSON файл уншихад алдаа гарлаа!");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset
  };
  // 🕒 2. СҮҮЛИЙН 30 ХОНОГИЙН ТҮҮХИЙГ БААЗААС ДУУДАХ (30 Days Retention)
  const openRecipeHistory = (pName: string) => {
    setSelectedHistoryProduct(pName);
    setShowHistoryModal(true);
  };
  // 2. БҮХ ЖОРЫГ НЭГ ДОР СЭРГЭЭХ
  const handleRestoreAllFromJson = async () => {
    if (!jsonBackupModal) return;
    if (
      !confirm(
        `Нөөц файлаас нийт ${Object.keys(jsonBackupModal.recipesByProduct).length} бүтээгдэхүүний БҮХ жорыг сэргээх үү?`,
      )
    )
      return;

    setLoading(true);
    try {
      const { recipes, products } = jsonBackupModal.fileData;

      // Үнийг хамт сэргээх
      if (products && products.length > 0) {
        const cleanProducts = products.map((p: any) => ({
          client_id: activeClient,
          name: p.name,
          category: p.category || "General",
          selling_price: p.selling_price || 0,
        }));
        await supabase
          .from("products")
          .upsert(cleanProducts, { onConflict: "client_id,name" });
      }

      // Жорыг баазад сэргээх
      if (recipes && recipes.length > 0) {
        const cleanRecipes = recipes.map((r: any) => ({
          client_id: activeClient,
          product_name: r.product_name,
          ingredient_id: r.ingredient_id,
          amount: parseFloat(r.amount) || 0,
        }));
        await supabase.from("recipes").upsert(cleanRecipes, {
          onConflict: "client_id,product_name,ingredient_id",
        });
      }

      setJsonBackupModal(null);
      await fetchRecipes();
      alert("✅ Бүх жор амжилттай сэргээгдлээ!");
    } catch (err: any) {
      alert(`Сэргээхэд алдаа гарлаа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  // 3. ЗӨВХӨН НЭГ ТУХАЙЛСАН ЖОРЫГ СЭРГЭЭХ (Жишээ нь: Chicken Sandwich)
  const handleRestoreSingleRecipe = async (productName: string) => {
    if (!jsonBackupModal) return;
    const targetItems = jsonBackupModal.recipesByProduct[productName];
    if (!targetItems) return;

    setLoading(true);
    try {
      // Бүтээгдэхүүний үнийг сэргээх
      const matchedProd = jsonBackupModal.fileData.products?.find(
        (p: any) => p.name === productName,
      );
      if (matchedProd) {
        await supabase.from("products").upsert(
          [
            {
              client_id: activeClient,
              name: matchedProd.name,
              category: matchedProd.category || "General",
              selling_price: matchedProd.selling_price || 0,
            },
          ],
          { onConflict: "client_id,name" },
        );
      }

      // Зөвхөн энэ бүтээгдэхүүний орцуудыг баазад оруулах
      const cleanRows = targetItems.map((r: any) => ({
        client_id: activeClient,
        product_name: productName,
        ingredient_id: r.ingredient_id,
        amount: parseFloat(r.amount) || 0,
      }));
      await supabase.from("recipes").upsert(cleanRows, {
        onConflict: "client_id,product_name,ingredient_id",
      });

      await fetchRecipes();
      alert(`✅ "${productName}" амжилттай сэргээгдлээ!`);
    } catch (err: any) {
      alert(`Алдаа гарлаа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const { fetchRecipes, recordRecipeSnapshot } = useRecipes(
    activeClient,
    ingredients,
  );
  const allRecipeProductNames = Array.from(
    new Set(recipes.map((r: any) => r.product_name)),
  );
  return (
    <div className="pt-4 space-y-3">
      {/* ТОЛГОЙ ХЭСЭГ: ХАЙЛТ, БҮГДИЙГ СОНГОХ БА ОЛНООР НЬ УСТГАХ */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <input
          type="text"
          value={recipeSearch}
          onChange={(e) => setRecipeSearch(e.target.value)}
          placeholder="Бүтээгдэхүүний жор хайх..."
          className="w-full sm:flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-800"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
          {/* ☑️ БҮГДИЙГ СОНГОХ CHECKBOX */}
          <label className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-300 hover:text-white cursor-pointer select-none">
            <input
              type="checkbox"
              checked={
                allRecipeProductNames.length > 0 &&
                selectedRecipeProducts.length === allRecipeProductNames.length
              }
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedRecipeProducts(allRecipeProductNames);
                } else {
                  setSelectedRecipeProducts([]);
                }
              }}
              className="w-4 h-4 accent-purple-500 cursor-pointer rounded"
            />
            <span>Бүгдийг сонгох ({allRecipeProductNames.length})</span>
          </label>

          {/* 🗑️ СОНГОСОН ЖОРУУДЫГ ОЛНООР НЬ УСТГАХ ТОВЧ (Түүхий эд шиг) */}
          {selectedRecipeProducts.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                if (
                  !confirm(
                    `Сонгосон ${selectedRecipeProducts.length} бүтээгдэхүүний бүх жорыг устгахдаа итгэлтэй байна уу?`,
                  )
                )
                  return;

                setLoading(true);
                const namesToDelete = [...selectedRecipeProducts];

                // ⚡ 0ms Optimistic UI (Дэлгэцнээс шууд арилгана)
                setRecipes((prev) =>
                  prev.filter((r) => !namesToDelete.includes(r.product_name)),
                );
                setSelectedRecipeProducts([]);

                // Баазаас бүгдийг зэрэг устгах
                const { error } = await supabase
                  .from("recipes")
                  .delete()
                  .eq("client_id", activeClient)
                  .in("product_name", namesToDelete);

                if (error) {
                  alert(`Устгахад алдаа гарлаа: ${error.message}`);
                } else {
                  alert(
                    `✅ Сонгосон ${namesToDelete.length} бүтээгдэхүүний жор бүрэн устгагдлаа.`,
                  );
                }

                setLoading(false);
                await fetchRecipes();
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2.5 rounded-xl text-sm font-black transition active:scale-95 flex items-center gap-1.5 shadow"
            >
              <span>🗑️ Сонгосон ({selectedRecipeProducts.length}) устгах</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportRecipeBackup}
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
            title={`${activeClient}-ийн бүх жорыг файлд хадгалж авах`}
          >
            <span>💾 Жор татах</span>
          </button>
          {/* 📊 EXCEL (Google Sheets) РҮҮ ТАТАХ ТОВЧ */}
          <button
            type="button"
            onClick={handleExportToExcel}
            className="bg-emerald-900/40 hover:bg-emerald-800/60 text-zinc-200 border border-zinc-700/40 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Меню болон Жороо хүн унших боломжтой Excel файлаар татаж авах"
          >
            <span>📊 Меню & Жор (Excel)</span>
          </button>

          {/* 📥 1-CLICK НӨӨЦ СЭРГЭЭХ (ШИНЭ) */}
          <input
            type="file"
            accept=".json"
            id="restore-json-upload"
            className="hidden"
            onChange={handleJsonFileSelect}
          />
          <label
            htmlFor="restore-json-upload"
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Компьютер дээрх .json файлаас жор сэргээх"
          >
            <span>📥 Нөөцөөс сэргээх</span>
          </label>

          {/* ⚡ ШИНЭ ЖОР ҮҮСГЭХ ТОВЧ */}
          <button
            type="button"
            onClick={() => {
              setIsCreatingRecipeCard(!isCreatingRecipeCard);
              setNewRecipeNameDraft("");
              setNewRecipePriceDraft("");
              setNewRecipeItemsDraft([]);
            }}
            className={`${
              isCreatingRecipeCard
                ? "bg-zinc-800 text-zinc-300"
                : "bg-white hover:bg-zinc-200 text-zinc-950"
            } px-3.5 py-2.5 rounded-xl text-sm font-black transition active:scale-95 flex items-center gap-1.5 shadow`}
          >
            <span>
              {isCreatingRecipeCard ? "✕ Болиулах" : "+ Шинэ жор үүсгэх"}
            </span>
          </button>
        </div>
      </div>

      {/* ⚡ ЖОРЫН ХАЙЛТТАЙ & ЭМХ ЦЭГЦТЭЙ КАРТ */}
      {/* 🟣 ЯГААН КАРТ: ДЭЭР НЬ ЧИРЧ УНАГАХ (DROP ZONE) БОЛОМЖТОЙ */}
      {isCreatingRecipeCard && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const raw = e.dataTransfer.getData("application/json");
            if (!raw) return;
            try {
              const dropped = JSON.parse(raw);
              // ⚡ ЗӨВХӨН ТУХАЙН 1 ОРЦЫГ Л ДАНГААР НЬ ХҮЛЭЭН АВНА
              if (dropped.ingredient_id) {
                // Хэрэв өмнө нь нэмэгдээгүй бол нэмэх
                setNewRecipeItemsDraft((prev) => {
                  const exists = prev.some(
                    (item) => item.ingredient_id === dropped.ingredient_id,
                  );
                  if (exists) return prev;
                  return [
                    ...prev,
                    {
                      ingredient_id: dropped.ingredient_id,
                      amount: dropped.amount,
                    },
                  ];
                });
              }
            } catch (err) {}
          }}
          className="bg-zinc-950 p-5 rounded-2xl border-2 border-zinc-800 space-y-4 shadow-xl"
        >
          {/* ЧИРЧ УНАГАХ ЗААВАР ТУУЗ */}
          <div className="bg-zinc-900 border border-dashed border-zinc-800/50 p-2.5 rounded-xl text-center">
            <p className="text-xs text-zinc-300 font-bold">
              💡 Зөвлөмж: Доорх бэлэн жорыг (эсвэл орцуудыг) хулганаараа чирж
              энэ хайрцаг руу унагавал шууд хуулагдана!
            </p>
          </div>

          {/* 1-Р МӨР: ЖОР ХОЛБОХ ЦЭС + ЗАРАХ ҮНЭ + БАТЛАХ */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[280px]">
              <SearchableSelect
                placeholder="-- Жор холбох цэсээ хайж сонгоно уу --"
                value={newRecipeNameDraft}
                options={productsList.map((p) => {
                  const cleanP = cleanString(p.name).toLowerCase();
                  const mappedName = aliasMap[cleanP] || cleanP;
                  const alreadyHas = recipes.some((r: any) => {
                    const rName = cleanString(r.product_name).toLowerCase();
                    return rName === cleanP || rName === mappedName;
                  });

                  return {
                    value: p.name,
                    label: p.name,
                    sublabel: alreadyHas ? "✓ Жортой" : "⚠️ Жоргүй",
                  };
                })}
                onChange={(chosen) => {
                  setNewRecipeNameDraft(chosen);
                  const matched = productsList.find((p) => p.name === chosen);
                  if (matched?.selling_price)
                    setNewRecipePriceDraft(matched.selling_price.toString());
                }}
              />
            </div>

            {/* Зарах үнэ */}
            <div className="w-36 shrink-0 flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2">
              <input
                type="number"
                value={newRecipePriceDraft}
                onChange={(e) => setNewRecipePriceDraft(e.target.value)}
                placeholder="Зарах үнэ"
                className="w-full bg-transparent text-sm text-zinc-200 font-mono font-black outline-none"
              />
              <span className="text-zinc-500 text-xs font-bold">₮</span>
            </div>

            {/* Батлах / Болиулах */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <button
                type="button"
                disabled={
                  !newRecipeNameDraft.trim() || newRecipeItemsDraft.length === 0
                }
                onClick={async () => {
                  const pName = newRecipeNameDraft.trim();
                  if (newRecipePriceDraft) {
                    await supabase.from("products").upsert(
                      [
                        {
                          client_id: activeClient,
                          name: pName,
                          category: "General",
                          selling_price: parseFloat(newRecipePriceDraft) || 0,
                        },
                      ],
                      { onConflict: "client_id,name" },
                    );
                  }

                  const recipeRows = newRecipeItemsDraft.map((it) => ({
                    client_id: activeClient,
                    product_name: pName,
                    ingredient_id: it.ingredient_id,
                    amount: parseFloat(it.amount) || 0,
                  }));

                  const { data } = await supabase
                    .from("recipes")
                    .insert(recipeRows)
                    .select();
                  if (data) setRecipes((prev) => [...prev, ...data]);

                  // ⚡ Шинэ цэсийг шууд жагсаалт руу 0ms-д нэмнэ:
                  if (setProductsList && newRecipePriceDraft) {
                    setProductsList((prev: any[]) => [
                      {
                        id: "prod-" + Date.now(),
                        client_id: activeClient,
                        name: pName,
                        category: "General",
                        selling_price: parseFloat(newRecipePriceDraft) || 0,
                      },
                      ...prev,
                    ]);
                  }
                  await recordRecipeSnapshot(pName, "created");
                  setIsCreatingRecipeCard(false);
                  setNewRecipeNameDraft("");
                  setNewRecipePriceDraft("");
                  setNewRecipeItemsDraft([]);
                  await fetchRecipes();
                }}
                className="bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-black px-4 py-2 rounded-xl text-xs transition active:scale-95 shadow cursor-pointer"
              >
                ✓ Батлах
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingRecipeCard(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-3 py-2 rounded-xl text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 2-Р МӨР: ОРЦ СОНГОХ + ГРАММ */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-900">
            <div className="w-56 shrink-0">
              <SearchableSelect
                placeholder="-- Орц хайх --"
                value={draftRecipeIngId}
                options={ingredients.map((i) => ({
                  value: i.id,
                  label: i.name,
                  sublabel: i.unit,
                }))}
                onChange={(id) => setDraftRecipeIngId(id)}
              />
            </div>

            <input
              type="number"
              placeholder="Хэмжээ"
              value={draftRecipeIngAmt}
              onChange={(e) => setDraftRecipeIngAmt(e.target.value)}
              onKeyDown={(e) => {
                // ⚡ Хэмжээгээ бичээд Enter дармагц + Нэмэх товчийг дарсан мэт шууд орно!
                if (
                  e.key === "Enter" &&
                  draftRecipeIngId &&
                  draftRecipeIngAmt
                ) {
                  e.preventDefault();
                  setNewRecipeItemsDraft((prev) => [
                    ...prev,
                    {
                      ingredient_id: draftRecipeIngId,
                      amount: draftRecipeIngAmt,
                    },
                  ]);
                  setDraftRecipeIngId("");
                  setDraftRecipeIngAmt("");
                }
              }}
              className="w-24 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none font-mono focus:border-zinc-800"
            />

            <button
              type="button"
              disabled={!draftRecipeIngId || !draftRecipeIngAmt}
              onClick={() => {
                setNewRecipeItemsDraft([
                  ...newRecipeItemsDraft,
                  {
                    ingredient_id: draftRecipeIngId,
                    amount: draftRecipeIngAmt,
                  },
                ]);
                setDraftRecipeIngId("");
                setDraftRecipeIngAmt("");
              }}
              className="bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-black px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow"
            >
              + Нэмэх
            </button>
          </div>

          {/* 3-Р МӨР: ШИНЭ ЖОРТ НЭМЭГДСЭН ОРЦУУД (ГРАММЫГ НЬ ЗАСАХ БОЛОМЖТОЙ) */}
          {newRecipeItemsDraft.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {newRecipeItemsDraft.map((item, idx) => {
                const ing = ingredients.find(
                  (i) => i.id === item.ingredient_id,
                );
                return (
                  <div
                    key={idx}
                    className="bg-zinc-950 border border-zinc-700 hover:border-zinc-800/60 px-3 py-1.5 rounded-xl text-sm flex items-center gap-2 font-bold text-white shadow-sm"
                  >
                    <span>{ing?.name || "Орц"}</span>

                    {/* 👈 ОРСНЫ ДАРАА ТООГ НЬ ШУУД ӨӨРЧИЛЖ БОЛОХ INPUT */}
                    <div className="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-800/50">
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => {
                          const newAmt = e.target.value;
                          setNewRecipeItemsDraft((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, amount: newAmt } : it,
                            ),
                          );
                        }}
                        className="w-14 bg-transparent text-center text-zinc-300 font-mono font-black text-xs outline-none"
                      />
                      <span className="text-xs text-zinc-400 font-normal">
                        {ing?.unit || "гр"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setNewRecipeItemsDraft(
                          newRecipeItemsDraft.filter((_, i) => i !== idx),
                        )
                      }
                      className="text-rose-400 hover:text-rose-300 p-0.5 ml-1 font-bold cursor-pointer"
                      title="Хасах"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* ЖОР БҮРИЙН КАРТ */}
      <div className="max-h-[440px] overflow-y-auto space-y-3 pr-1">
        {Array.from(new Set(recipes.map((r: any) => r.product_name)))
          .filter(
            (pName: any) =>
              !recipeSearch.trim() ||
              pName.toLowerCase().includes(recipeSearch.toLowerCase().trim()),
          )
          .map((pName: any) => {
            const productRecipes = recipes.filter(
              (r: any) => r.product_name === pName,
            );
            const matchedProduct = productsList.find(
              (p) => p.name.toLowerCase().trim() === pName.toLowerCase().trim(),
            );
            const sellPrice = matchedProduct
              ? parseFloat(matchedProduct.selling_price)
              : 0;

            let calculatedCost = 0;
            productRecipes.forEach((r) => {
              const ing = ingredients.find((i) => i.id === r.ingredient_id);
              const uPrice = ing ? parseFloat(ing.unit_price || 0) : 0;
              calculatedCost += (parseFloat(r.amount) || 0) * uPrice;
            });

            const marginPct =
              sellPrice > 0
                ? ((sellPrice - calculatedCost) / sellPrice) * 100
                : 0;

            return (
              <div
                key={pName}
                // ❌ Бүхэл картыг чирэхийг болиулсан (draggable={false})
                className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2.5 hover:border-zinc-700 transition"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRecipeProducts.includes(pName)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedRecipeProducts([
                            ...selectedRecipeProducts,
                            pName,
                          ]);
                        else
                          setSelectedRecipeProducts(
                            selectedRecipeProducts.filter(
                              (name) => name !== pName,
                            ),
                          );
                      }}
                      className="w-4 h-4 accent-purple-500 cursor-pointer rounded"
                    />
                    <h4 className="text-sm font-black text-white">{pName}</h4>

                    <button
                      type="button"
                      onClick={() => openRecipeHistory(pName)}
                      className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800/30 px-2 py-0.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ml-1"
                    >
                      <span>🕒 Түүх</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-sm flex-wrap font-mono">
                    <span className="text-zinc-400">
                      Зарах:{" "}
                      <strong className="text-white">
                        {sellPrice.toLocaleString()} ₮
                      </strong>
                    </span>
                    <span className="text-zinc-700">•</span>
                    <span className="text-zinc-400">
                      Өртөг:{" "}
                      <strong className="text-rose-400">
                        {Math.round(calculatedCost).toLocaleString()} ₮
                      </strong>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                        marginPct >= 75
                          ? "bg-zinc-800/60 text-zinc-200 border-zinc-800"
                          : "bg-zinc-800/60 text-zinc-300 border-zinc-700"
                      }`}
                    >
                      Маржин: {marginPct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* ⚡ ОРЦ БҮРИЙГ ГАНЦ ГАНЦААР НЬ ЧИРЭХ ЭСВЭЛ [+] ДАРЖ ХУУЛАХ ХЭСЭГ */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-900">
                  {productRecipes.map((r: any) => {
                    const ing = ingredients.find(
                      (i) => i.id === r.ingredient_id,
                    );
                    const draftVal = recipeDrafts[r.id];
                    const isDrafting =
                      draftVal !== undefined &&
                      draftVal !== r.amount.toString();

                    // 🟢 А. ШИНЭ ЖОР УГСАРЧ БАЙХ ҮЕД (ХААНА Ч ДАРСАН ДЭЭШЭЭ ШУУД НЭМЭГДЭХ ГОРИМ)
                    if (isCreatingRecipeCard) {
                      return (
                        <div
                          key={r.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.setData(
                              "application/json",
                              JSON.stringify({
                                ingredient_id: r.ingredient_id,
                                amount: r.amount.toString(),
                              }),
                            );
                          }}
                          onClick={() => {
                            setNewRecipeItemsDraft((prev) => {
                              const exists = prev.some(
                                (item) =>
                                  item.ingredient_id === r.ingredient_id,
                              );
                              if (exists) return prev;
                              return [
                                ...prev,
                                {
                                  ingredient_id: r.ingredient_id,
                                  amount: r.amount.toString(),
                                },
                              ];
                            });
                          }}
                          className="bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-800/70 px-3 py-1.5 rounded-2xl text-sm flex items-center gap-2.5 transition shadow-sm cursor-pointer active:scale-95 select-none"
                          title="Дарж дээд талын шинэ жор руу шууд нэмэх"
                        >
                          <span className="text-zinc-200 font-bold">
                            {ing?.name || "Орц"}
                          </span>
                          <span className="text-zinc-300 font-mono text-xs bg-zinc-900 border border-zinc-800/30 px-2 py-0.5 rounded-lg">
                            {r.amount} {ing?.unit || "гр"}
                          </span>
                          <span className="h-5 w-5 bg-zinc-200 text-white rounded-full flex items-center justify-center text-xs font-black shrink-0">
                            +
                          </span>
                        </div>
                      );
                    }

                    // ⚪ Б. ЭНГИЙН ҮЕД: ГРАММ ЗАСАХ [✓] БАТЛАХ ТОBЧТОЙ ХУВИЛБАР (ШИНЭ КАРТ ҮҮСГЭНЭ)
                    return (
                      <div
                        key={r.id}
                        className={`bg-zinc-900/90 border px-3 py-1.5 rounded-2xl text-sm flex items-center gap-2 transition shadow-sm ${
                          isDrafting
                            ? "border-amber-400 bg-zinc-950"
                            : "border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        <span className="text-zinc-200 font-bold">
                          {ing?.name || "Орц"}
                        </span>

                        {/* Грамм бичих талбар */}
                        <div className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-700">
                          <input
                            type="number"
                            value={draftVal !== undefined ? draftVal : r.amount}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              setRecipeDrafts({
                                ...recipeDrafts,
                                [r.id]: e.target.value,
                              });
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter") {
                                const val = parseFloat(draftVal);
                                if (!isNaN(val) && val > 0) {
                                  await supabase
                                    .from("recipes")
                                    .update({ amount: val })
                                    .eq("id", r.id);
                                  // 👈 ГРАММ ӨӨРЧЛӨГДӨХӨД ШИНЭ ТҮҮХ/КАРТ ҮҮСГЭХ:
                                  await recordRecipeSnapshot(pName, "updated");
                                  setRecipeDrafts((prev) => {
                                    const n = { ...prev };
                                    delete n[r.id];
                                    return n;
                                  });
                                  await fetchRecipes();
                                }
                              }
                            }}
                            className="w-14 bg-transparent text-center text-zinc-300 font-mono font-black text-sm outline-none"
                          />
                          <span className="text-xs text-zinc-400 font-semibold">
                            {ing?.unit || "гр"}
                          </span>
                        </div>

                        {/* 👈 БУЦААЖ НЭМСЭН [✓ БАТЛАХ] & [✕ БОЛИУЛАХ] ТОВЧНУУД */}
                        {isDrafting && (
                          <div className="flex items-center gap-1 animate-in fade-in duration-100">
                            <button
                              type="button"
                              onClick={async () => {
                                const val = parseFloat(draftVal);
                                if (!isNaN(val) && val > 0) {
                                  await supabase
                                    .from("recipes")
                                    .update({ amount: val })
                                    .eq("id", r.id);
                                  // 👈 ДАРСАН ДАРУЙД ШИНЭ ТҮҮХ/КАРТ ҮҮСГЭНЭ:
                                  await recordRecipeSnapshot(pName, "updated");
                                  setRecipeDrafts((prev) => {
                                    const n = { ...prev };
                                    delete n[r.id];
                                    return n;
                                  });
                                  await fetchRecipes();
                                }
                              }}
                              className="h-7 px-2.5 bg-white hover:bg-zinc-200 text-zinc-950 rounded-xl font-black text-xs transition active:scale-95 shadow cursor-pointer flex items-center justify-center"
                              title="Хадгалах"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRecipeDrafts((prev) => {
                                  const n = { ...prev };
                                  delete n[r.id];
                                  return n;
                                });
                              }}
                              className="h-7 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center"
                              title="Болих"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {/* Орц устгах хогийн сав (УСТГАХАД БАС ШИНЭ КАРТ ҮҮСНЭ) */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !confirm(
                                `"${pName}"-ийн жороос "${ing?.name}" орцыг хасах уу?`,
                              )
                            )
                              return;
                            await supabase
                              .from("recipes")
                              .delete()
                              .eq("id", r.id);
                            // 👈 ОРЦ УСТГАХАД ШИНЭ ТҮҮХ ҮҮСГЭХ:
                            await recordRecipeSnapshot(pName, "updated");
                            await fetchRecipes();
                          }}
                          className="text-zinc-500 hover:text-rose-400 p-0.5 text-xs transition cursor-pointer ml-1"
                          title="Орц хасах"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}

                  {/* + Орц нэмэх товч */}
                  {inlineAddRecipeProduct === pName ? (
                    <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800/60 p-1 rounded-2xl">
                      <select
                        value={inlineRecipeDraft.ingredient_id}
                        onChange={(e) =>
                          setInlineRecipeDraft({
                            ...inlineRecipeDraft,
                            ingredient_id: e.target.value,
                          })
                        }
                        className="bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-1 text-xs text-white outline-none"
                      >
                        <option value="">-- Түүхий эд --</option>
                        {ingredients.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Тоо..."
                        value={inlineRecipeDraft.amount}
                        onChange={(e) =>
                          setInlineRecipeDraft({
                            ...inlineRecipeDraft,
                            amount: e.target.value,
                          })
                        }
                        className="w-16 bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-1 text-xs text-white outline-none font-mono"
                      />
                      <button
                        type="button"
                        disabled={
                          !inlineRecipeDraft.ingredient_id ||
                          !inlineRecipeDraft.amount
                        }
                        onClick={async () => {
                          await supabase.from("recipes").insert([
                            {
                              client_id: activeClient,
                              product_name: pName,
                              ingredient_id: inlineRecipeDraft.ingredient_id,
                              amount: parseFloat(inlineRecipeDraft.amount) || 0,
                            },
                          ]);
                          await recordRecipeSnapshot(pName, "updated");
                          setInlineAddRecipeProduct(null);
                          setInlineRecipeDraft({
                            ingredient_id: "",
                            amount: "",
                          });
                          await fetchRecipes();
                        }}
                        className="h-7 px-2.5 bg-white hover:bg-zinc-200 text-zinc-950 font-black rounded-xl text-xs"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setInlineAddRecipeProduct(null)}
                        className="h-7 px-2 bg-zinc-800 text-zinc-400 rounded-xl text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setInlineAddRecipeProduct(pName);
                        setInlineRecipeDraft({ ingredient_id: "", amount: "" });
                      }}
                      className="h-7 px-2.5 bg-zinc-800/60 hover:bg-zinc-800/60 text-zinc-300 border border-zinc-700 rounded-2xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <span>+ Орц нэмэх</span>
                    </button>
                  )}

                  {/* Бүхэл жорыг устгах */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        !confirm(
                          `"${pName}" бүтээгдэхүүний бүх жорыг устгах уу?`,
                        )
                      )
                        return;
                      await recordRecipeSnapshot(pName, "deleted");
                      await supabase
                        .from("recipes")
                        .delete()
                        .eq("client_id", activeClient)
                        .eq("product_name", pName);
                      await fetchRecipes();
                    }}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold underline ml-auto py-1"
                  >
                    Бүхэл жорыг устгах
                  </button>
                </div>
              </div>
            );
          })}
      </div>
      {/* 🕒 1. Жорын түүхийн модал */}
      <RecipeHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        productName={selectedHistoryProduct}
        activeClient={activeClient}
        recipes={recipes}
        ingredients={ingredients}
        recordRecipeSnapshot={recordRecipeSnapshot}
        onRestored={fetchRecipes}
      />

      {/* 📥 2. JSON Сэргээх модал */}
      {jsonBackupModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150"
          onClick={() => setJsonBackupModal(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>📥 Нөөц Файлаас Жор Сэргээх</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Файлд нийт{" "}
                  <strong className="text-zinc-300">
                    {Object.keys(jsonBackupModal.recipesByProduct).length}
                  </strong>{" "}
                  бүтээгдэхүүний жор байна.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setJsonBackupModal(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                ✕ Хаах
              </button>
            </div>

            {/* ⚡ БҮГДИЙГ НЭГ ДОР СЭРГЭЭХ ТОМ ТОВЧ */}
            <button
              type="button"
              disabled={loading}
              onClick={handleRestoreAllFromJson}
              className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-black py-3 rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {loading ? "Сэргээж байна..." : "✓ БҮХ ЖОРЫГ БӨӨНӨӨР НЬ СЭРГЭЭХ"}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-3 text-xs text-zinc-500 font-bold uppercase">
                эсвэл тус тусад нь сонгох
              </span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            {/* 🔍 ТУХАЙЛСАН ЖОРЫГ СОНГОЖ СЭРГЭЭХ ЖАГСААЛТ (Жишээ нь: Chicken Sandwich) */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/60">
              {Object.keys(jsonBackupModal.recipesByProduct).map((pName) => {
                const itemsCount =
                  jsonBackupModal.recipesByProduct[pName].length;
                return (
                  <div
                    key={pName}
                    className="pt-2 flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-bold text-white text-sm block">
                        {pName}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        {itemsCount} төрлийн орцтой
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreSingleRecipe(pName)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer"
                    >
                      ↩️ Сэргээх
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* ➕ 3. ШИНЭ ЖОР УГСРАХ МОДАЛ                                                */}
      {/* ========================================================================= */}

      {showAddRecipeModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-zinc-950 border border-zinc-700 p-5 rounded-3xl max-w-md w-full space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-black text-white">
                📖 Бүрэн Жор Угсрах & Маржин Бодох
              </h3>
              <button
                onClick={() => setShowAddRecipeModal(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* 1. Бүтээгдэхүүний мэдээлэл ба Зарах үнэ */}
            <div className="space-y-2 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
              <input
                type="text"
                value={recipeBuilder.product_name}
                onChange={(e) =>
                  setRecipeBuilder({
                    ...recipeBuilder,
                    product_name: e.target.value,
                  })
                }
                placeholder="Бүтээгдэхүүний нэр (Жишээ: Oat Latte, Халуун аньс)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-sm text-white font-bold outline-none focus:border-zinc-800"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={recipeBuilder.category}
                  onChange={(e) =>
                    setRecipeBuilder({
                      ...recipeBuilder,
                      category: e.target.value,
                    })
                  }
                  placeholder="Ангилал (COFFEE, FOOD)"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-sm text-zinc-300 outline-none"
                />
                <input
                  type="number"
                  value={recipeBuilder.selling_price}
                  onChange={(e) =>
                    setRecipeBuilder({
                      ...recipeBuilder,
                      selling_price: e.target.value,
                    })
                  }
                  placeholder="Зарах үнэ ₮"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-sm text-zinc-200 font-mono font-bold outline-none"
                />
              </div>
            </div>

            {/* 2. Олон орц нэмэх хэсэг (Орц 1, Орц 2, Орц 3...) */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-400">
                  Орцууд ба Грамм:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setRecipeBuilder({
                      ...recipeBuilder,
                      items: [
                        ...recipeBuilder.items,
                        { ingredient_id: "", amount: "" },
                      ],
                    })
                  }
                  className="text-xs font-black text-zinc-300 hover:text-zinc-300 bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-zinc-800/20"
                >
                  + Орц нэмэх
                </button>
              </div>

              {recipeBuilder.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex gap-2 items-center bg-zinc-950 p-2 rounded-xl border border-zinc-800"
                >
                  <select
                    value={item.ingredient_id}
                    onChange={(e) => {
                      const updated = [...recipeBuilder.items];
                      updated[idx].ingredient_id = e.target.value;
                      setRecipeBuilder({
                        ...recipeBuilder,
                        items: updated,
                      });
                    }}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm text-white outline-none"
                  >
                    <option value="">-- Түүхий эд сонгох --</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => {
                      const updated = [...recipeBuilder.items];
                      updated[idx].amount = e.target.value;
                      setRecipeBuilder({
                        ...recipeBuilder,
                        items: updated,
                      });
                    }}
                    placeholder="Тоо..."
                    className="w-20 bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-center text-sm text-white font-mono outline-none"
                  />

                  {recipeBuilder.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = recipeBuilder.items.filter(
                          (_, i) => i !== idx,
                        );
                        setRecipeBuilder({
                          ...recipeBuilder,
                          items: updated,
                        });
                      }}
                      className="text-rose-400 hover:text-rose-300 p-1 text-sm font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 3. ⚡ ШУУД ӨРТӨГ БА МАРЖИНГ ТООЦОЖ ХАРУУЛАХ КАРТ */}
            {(() => {
              let totalCost = 0;
              recipeBuilder.items.forEach((it) => {
                const ing = ingredients.find((i) => i.id === it.ingredient_id);
                const uPrice = ing ? parseFloat(ing.unit_price) || 0 : 0;
                totalCost += (parseFloat(it.amount) || 0) * uPrice;
              });

              const sellP = parseFloat(recipeBuilder.selling_price) || 0;
              const margin =
                sellP > 0 ? ((sellP - totalCost) / sellP) * 100 : 0;

              return (
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex justify-between items-center text-sm font-mono">
                  <div>
                    <span className="text-zinc-500 block text-xs">
                      Нэг аяганы өртөг:
                    </span>
                    <span className="text-rose-400 font-bold text-sm">
                      {Math.round(totalCost).toLocaleString()} ₮
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 block text-xs">
                      Бохир ашиг:
                    </span>
                    <span
                      className={`font-black text-sm ${margin >= 75 ? "text-zinc-200" : margin >= 60 ? "text-zinc-300" : "text-rose-400"}`}
                    >
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 4. БҮГДИЙГ ЗЭРЭГ ХАДГАЛАХ (Бүтээгдэхүүн + Бүрэн Жор) */}
            <button
              type="button"
              disabled={
                !recipeBuilder.product_name.trim() ||
                !recipeBuilder.items.some(
                  (i) => i.ingredient_id && parseFloat(i.amount) > 0,
                )
              }
              onClick={async () => {
                setLoading(true);
                const pName = recipeBuilder.product_name.trim();

                // 1. Бүтээгдэхүүний зарах үнийг Products хүснэгтэд хадгалах
                if (recipeBuilder.selling_price) {
                  await supabase.from("products").upsert(
                    [
                      {
                        client_id: activeClient,
                        name: pName,
                        category: recipeBuilder.category || "General",
                        selling_price:
                          parseFloat(recipeBuilder.selling_price) || 0,
                      },
                    ],
                    { onConflict: "client_id,name" },
                  );
                }

                // 2. Бүрэн жорыг Recipes хүснэгтэд оруулах
                const validRecipeRows = recipeBuilder.items
                  .filter((it) => it.ingredient_id && parseFloat(it.amount) > 0)
                  .map((it) => ({
                    client_id: activeClient,
                    product_name: pName,
                    ingredient_id: it.ingredient_id,
                    amount: parseFloat(it.amount),
                  }));

                await supabase.from("recipes").insert(validRecipeRows);

                setLoading(false);
                setShowAddRecipeModal(false);
                setRecipeBuilder({
                  product_name: "",
                  category: "COFFEE",
                  selling_price: "",
                  items: [{ ingredient_id: "", amount: "" }],
                });
                fetchRecipes();
                alert(
                  `✅ "${pName}" бүтээгдэхүүний жор болон зарах үнэ амжилттай хадгалагдлаа!`,
                );
              }}
              className="w-full bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-black py-3 rounded-xl text-sm transition"
            >
              Бүтээгдэхүүн & Жорыг Хадгалах
            </button>
          </div>
        </div>
      )}

      {/* ➕ Тухайн бүтээгдэхүүнд шуурхай орц нэмэх жижиг цонх */}
      {addIngToRecipeProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-700 p-5 rounded-3xl max-w-sm w-full space-y-3">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-black text-white">
                + <span className="text-zinc-300">{addIngToRecipeProduct}</span>
                -д орц нэмэх
              </h3>
              <button
                onClick={() => setAddIngToRecipeProduct(null)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <select
              value={quickIngId}
              onChange={(e) => setQuickIngId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white outline-none"
            >
              <option value="">-- Түүхий эд сонгох --</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} ({ing.unit})
                </option>
              ))}
            </select>

            <input
              type="number"
              value={quickIngAmount}
              onChange={(e) => setQuickIngAmount(e.target.value)}
              placeholder="Орцын хэмжээ (гр/мл/ш)..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white outline-none"
            />

            <button
              type="button"
              disabled={
                !quickIngId ||
                !quickIngAmount ||
                parseFloat(quickIngAmount) <= 0
              }
              onClick={async () => {
                const { data } = await supabase
                  .from("recipes")
                  .insert([
                    {
                      client_id: activeClient,
                      product_name: addIngToRecipeProduct,
                      ingredient_id: quickIngId,
                      amount: parseFloat(quickIngAmount),
                    },
                  ])
                  .select()
                  .single();

                if (data) setRecipes((prev) => [...prev, data]);
                setAddIngToRecipeProduct(null);
                fetchRecipes();
              }}
              className="w-full bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-black py-2.5 rounded-xl text-sm transition"
            >
              Орцыг Жорд Нэмэх
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
