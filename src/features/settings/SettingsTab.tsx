// src/features/settings/SettingsTab.tsx
"use client";
import React, { useState, startTransition } from "react";
import { Coffee, Database, Save, AlertTriangle, Layers3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { AutoPilotChange } from "@/types/dashboard";

 function cleanString(str: string) {
            return String(str || "")
                .replace(/[\u00a0\s]+/g, " ")
                .trim();
            }

interface SettingsTabProps {
  startDate: string; 
  endDate: string;  
  activeClient: string;
  user: any;
  ingredients: any[];
  setIngredients: React.Dispatch<React.SetStateAction<any[]>>;
  productsList: any[];
  setProductsList: React.Dispatch<React.SetStateAction<any[]>>;
  recipes: any[];
  setRecipes: React.Dispatch<React.SetStateAction<any[]>>;
  fixedAssets: any[];
  fixedOpexList: any[];
  initialCash: string;
  setInitialCash: (s: string) => void;
  initialBank: string;
  setInitialBank: (s: string) => void;
  taxMode: string;
  setTaxMode: (s: string) => void;
  kioskLogoUrl: string | null;
  setKioskLogoUrl: (s: string | null) => void;
  categoryMargins: Record<string, number>;
  setCategoryMargins: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  loading: boolean;
  setLoading: (l: boolean) => void;
  fetchDatabaseData: (client?: string, start?: string, end?: string, includeAnalytics?: boolean, targetTab?: string) => Promise<void>;
  productRecipeStatus: Map<string, { count: number }>;
  unmappedSales: any[];
  openRecipeHistory: (prodName: string) => Promise<void>;
  handleExportRecipeBackup: () => void;
  handleExportToExcel: () => void;
  handleJsonFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  pendingCategoryReview: any;
  updatePendingReview: (val: any) => void;
  commitFinalSales: (sales: any[], newProductsList?: any[], updates?: any[], existingChanges?: any[]) => Promise<void>;
 
}
         
     

export default function SettingsTab({
  startDate,
  endDate,
  activeClient,
  user,
  ingredients,
  setIngredients,
  productsList,
  setProductsList,
  recipes,
  setRecipes,
  fixedAssets,
  fixedOpexList,
  initialCash,
  setInitialCash,
  initialBank,
  setInitialBank,
  taxMode,
  setTaxMode,
  kioskLogoUrl,
  setKioskLogoUrl,
  categoryMargins,
  setCategoryMargins,
  loading,
  setLoading,
  fetchDatabaseData,
  productRecipeStatus,
  unmappedSales,
  openRecipeHistory,
  handleExportRecipeBackup,
  handleExportToExcel,
  handleJsonFileSelect,
  pendingCategoryReview,
  updatePendingReview,
  commitFinalSales, 
}: SettingsTabProps) {
    // 🎯 6 АНГИЛЛЫН АНХДАГЧ ГЛОБАЛ МАРЖИН
const DEFAULT_GLOBAL_MARGINS: Record<string, number> = {
  'HOT_BEVERAGE': 82,
  'COLD_BEVERAGE': 78,
  'FOOD_PREP': 68,
  'BAKERY_DESSERT': 75,
  'RETAIL_FMCG': 50,
  'GENERAL': 70
};

  // Каталогийн дотоод төлөвүүд (ingSearch, menuSearch, recipeSearch, catalogTab, ноорог нэмэх state-үүд энд байрлана)
  const [catalogTab, setCatalogTab] = useState<"ingredients" | "products" | "recipes">("ingredients");
  // 🎯 Мастер Каталог: Checkbox олноор сонгох & Шинээр нэмэх State-үүд
  const [selectedIngIds, setSelectedIngIds] = useState<string[]>([]);
  const [selectedProdIds, setSelectedProdIds] = useState<string[]>([]);
  const [selectedRecipeProducts, setSelectedRecipeProducts] = useState<string[]>([]);
    // Түүхий эд: Хүснэгт дотор шинэ мөр нэмэх & мөр засах
        const [isAddingIngRow, setIsAddingIngRow] = useState(false);
        const [newIngDraft, setNewIngDraft] = useState({
        name: "",
        unit: "гр",
        price: "",
        par: "0",
        });
        const [editingIngId, setEditingIngId] = useState<string | null>(null);
        const [editingIngDraft, setEditingIngDraft] = useState({
            name: "",
            unit: "гр",
            price: "",
            par: "0",
        });
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
            // 3. Жор: Санамсаргүй өөрчлөгдөхөөс хамгаалах ноорог тоо & Инлайн орц нэмэх
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
            const [ingSearch, setIngSearch] = useState("");
            const [menuSearch, setMenuSearch] = useState("");
            const [recipeSearch, setRecipeSearch] = useState("");
            const [autoPilotActivity, setAutoPilotActivity] = useState<{
                totalSales: number;
                changes: AutoPilotChange[];
              } | null>(null);
            const [showChangesModal, setShowChangesModal] = useState(false);
       
            // ⚡ 1-CLICK ЗӨВ БУЦААХ (UNDO) ФУНКЦ
              const handleSingleUndo = async (changeId: string) => {
                if (!autoPilotActivity) return;
                const targetChange = autoPilotActivity.changes.find(c => c.id === changeId);
                if (!targetChange || targetChange.reverted) return;
            
                setLoading(true);
            
                try {
                  if (targetChange.type === 'NEW_PRODUCT') {
                    await supabase
                      .from('products')
                      .delete()
                      .eq('client_id', activeClient)
                      .or(`id.eq.${targetChange.productId},name.eq.${targetChange.productName}`);
            
                    setProductsList(prev => prev.filter(p => p.id !== targetChange.productId && p.name !== targetChange.productName));
                  } else {
                          // Нэр ба үнийг хуучин Меню дээр байсан хэвэнд нь буцааж UPDATE хийнэ:
                    await supabase
                      .from('products')
                      .update({
                        name: targetChange.oldName,
                        selling_price: targetChange.oldPrice,
                        category: targetChange.oldCategory
                      })
                      .eq('id', targetChange.productId);
            
                    // Жорон дээрх нэрийг хуучин нэр рүү нь буцаана:
                    await supabase
                      .from('recipes')
                      .update({ product_name: targetChange.oldName })
                      .eq('client_id', activeClient)
                      .ilike('product_name', targetChange.newName);
            
                    // Local state-ийг шинэчлэх:
                    setProductsList(prev => prev.map(p => 
                      p.id === targetChange.productId ? {
                        ...p,
                        name: targetChange.oldName,
                        selling_price: targetChange.oldPrice,
                        category: targetChange.oldCategory
                      } : p
                    ));
                  }
            
                  // Төлөвийг буцаагдсан болгох:
                  setAutoPilotActivity(prev => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      changes: prev.changes.map(c => c.id === changeId ? { ...c, reverted: true } : c)
                    };
                  });
            
                  alert(`↩️ "${targetChange.newName}" амжилттай буцаж "${targetChange.oldName}" (${targetChange.oldPrice.toLocaleString()}₮) боллоо!`);
                } catch (err: any) {
                  alert(`Алдаа гарлаа: ${err.message}`);
                } finally {
                  setLoading(false);
                }
              };

              // 🕒 1. БҮТЭЭГДЭХҮҮНИЙ ЖОР ӨӨРЧЛӨГДӨХ БҮРД ТҮҮХ ХАДГАЛАХ (ТӨГС УХААЛАГ ХУВИЛБАР)
                const recordRecipeSnapshot = async (
                  productName: string, 
                  arg2?: 'created' | 'updated' | 'deleted' | any[],
                  arg3?: 'created' | 'updated' | 'deleted' | any[]
                ) => {
                  // Параметрүүд аль ч дарааллаар орж ирсэн автоматаар зөв ялгах логик:
                  let action: 'created' | 'updated' | 'deleted' = 'updated';
                  let customItems: any[] | undefined = undefined;
              
                  if (typeof arg2 === 'string') {
                    action = arg2 as 'created' | 'updated' | 'deleted';
                    if (Array.isArray(arg3)) customItems = arg3;
                  } else if (Array.isArray(arg2)) {
                    customItems = arg2;
                    if (typeof arg3 === 'string') action = arg3 as 'created' | 'updated' | 'deleted';
                  }
              
                 const { data: { session: currentSession } } = await supabase.auth.getSession();
const currentActor = currentSession?.user?.user_metadata?.full_name || currentSession?.user?.email?.split('@')[0] || "Админ";
                  
                  // Хэрэв бэлэн орц өгөөгүй бол одоо баазад байгаа тухайн бүтээгдэхүүний орцуудыг татна
                  let itemsToSave = customItems;
                  if (!itemsToSave || itemsToSave.length === 0) {
                    const prodRecipes = recipes.filter(
                      (r: any) => cleanString(r.product_name).toLowerCase() === cleanString(productName).toLowerCase()
                    );
                    itemsToSave = prodRecipes.map((r: any) => {
                      const ing = ingredients.find((i: any) => i.id === r.ingredient_id);
                      return {
                        ingredient_id: r.ingredient_id,
                        name: ing?.name || "Орц",
                        unit: ing?.unit || "гр",
                        amount: parseFloat(r.amount) || 0
                      };
                    });
                  } else {
                    // Орцын нэр дутуу байвал нөхөх
                    itemsToSave = itemsToSave.map((it: any) => {
                      const ing = ingredients.find((i: any) => i.id === it.ingredient_id);
                      return {
                        ingredient_id: it.ingredient_id,
                        name: it.name || ing?.name || "Орц",
                        unit: it.unit || ing?.unit || "гр",
                        amount: parseFloat(it.amount) || 0
                      };
                    });
                  }
              
                  await supabase.from("recipe_snapshots").insert([{
                    client_id: activeClient,
                    product_name: productName,
                    action: action,
                    ingredients_snapshot: itemsToSave,
                    author: `${currentActor} (Dashboard)`
                  }]);
                };
              // 🔗 ШАР САНУУЛГА ДЭЭР СОНГОСОН ЖОРЫГ НАЙДВАРТАЙ ХАДГАЛАХ СТЭЙТ:
              const [mergeSelections, setMergeSelections] = useState<Record<string, string>>({});

              const createSnapshotFromDb = recordRecipeSnapshot;
                    // 📖 Шинэ жор инлайнаар үүсгэх төлөвүүд
                    const [isCreatingRecipeCard, setIsCreatingRecipeCard] = useState(false);
                    const [newRecipeNameDraft, setNewRecipeNameDraft] = useState('');
                    const [newRecipePriceDraft, setNewRecipePriceDraft] = useState('');
                    const [newRecipeItemsDraft, setNewRecipeItemsDraft] = useState<Array<{ ingredient_id: string; amount: string }>>([]);
                    const [draftRecipeIngId, setDraftRecipeIngId] = useState('');
                    const [draftRecipeIngAmt, setDraftRecipeIngAmt] = useState('');
                    
            // 🌍 УНИВЕРСАЛ 6 АНГИЛАЛ (ЭМОЖИ БА ӨНГӨТЭЙ)
                const UNIVERSAL_CATEGORIES = [
                { id: 'HOT_BEVERAGE', name: '☕ Халуун ундаа', icon: '☕', color: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
                { id: 'COLD_BEVERAGE', name: '🍹 Хүйтэн ундаа', icon: '🍹', color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30' },
                { id: 'FOOD_PREP', name: '🍳 Хоол & Зууш', icon: '🍳', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
                { id: 'BAKERY_DESSERT', name: '🥐 Бэйкэри & Десерт', icon: '🥐', color: 'text-purple-300 bg-purple-500/10 border-purple-500/30' },
                { id: 'RETAIL_FMCG', name: '🥤 Бэлэн бараа (Лааз/Сав)', icon: '🥤', color: 'text-blue-300 bg-blue-500/10 border-blue-500/30' },
                { id: 'GENERAL', name: '📦 Бусад', icon: '📦', color: 'text-slate-300 bg-slate-800 border-slate-700' }
                ];
                // 🎨 Хүснэгт дээр эможитой пайз харуулах туслах функц:
                const renderCategoryBadge = (catId: string) => {
                const found = UNIVERSAL_CATEGORIES.find(c => c.id === catId) || UNIVERSAL_CATEGORIES[5];
                return (
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 shadow-sm ${found.color}`}>
                    <span>{found.icon}</span>
                    <span>{found.name.replace(/^[^\s]+\s/, '')}</span>
                    </span>
                );
                };

                const aliasMap: Record<string, string> = {};
                const [showAddIngModal, setShowAddIngModal] = useState(false);
        
                            
            const [newIngForm, setNewIngForm] = useState({
                name: "",
                unit: "гр",
                price: "",
                par: "0",
            });
            const [showAddProdModal, setShowAddProdModal] = useState(false);
            const [newProdForm, setNewProdForm] = useState({
                name: "",
                category: "COFFEE",
                price: "",
            });
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

            const [editingIngredient, setEditingIngredient] = useState<any | null>(null);
            const [editingProduct, setEditingProduct] = useState<any | null>(null);

            const [addIngToRecipeProduct, setAddIngToRecipeProduct] = useState<
                string | null
            >(null);

            const [quickIngId, setQuickIngId] = useState("");
            const [quickIngAmount, setQuickIngAmount] = useState("");

          
            

            


                    const handleSaveCategoryMargins = async () => {
                    setLoading(true);
                    try {
                      const { error } = await supabase
                        .from("client_settings")
                        .upsert({
                          client_id: activeClient,
                          category_margins: categoryMargins,
                          updated_at: new Date().toISOString()
                        }, { onConflict: "client_id" });
                  
                      if (error) throw error;
                      alert("✅ Ангилал тус бүрийн ашгийн маржингийн бодлого амжилттай хадгалагдлаа!");
                      // Аналитикийг шинэчлэн бодох
                      await fetchDatabaseData(activeClient,  startDate, endDate, true);
                    } catch (err: any) {
                      alert("Маржин хадгалахад алдаа гарлаа: " + err.message);
                    } finally {
                      setLoading(false);
                    }
                  };
                   const [newOpexName, setNewOpexName] = useState("");
                    const [newOpexCost, setNewOpexCost] = useState("");
                    const newOpexCategory = "Байр, ашиглалт";

                      // 3. Шинэ хөрөнгө, Тогтмол зардал нэмэх form state
                      const [newAssetName, setNewAssetName] = useState("");
                      const [newAssetCost, setNewAssetCost] = useState("");
                      const [newAssetMonths, setNewAssetMonths] = useState("60");
                      const newAssetDate = new Date().toISOString().split("T")[0];
  return (
    <>
      <div className="space-y-8">
            {/* ========================================================================= */}
            {/* 🎯 МАСТЕР КАТАЛОГ (ЦОНХГҮЙ, ХҮСНЭГТ ДОТРОО ШУУД НЭМЭХ БА ЗАСАХ)            */}
            {/* ========================================================================= */}
            <div className="col-span-1 md:col-span-2 bg-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-2xl mt-8">
              {/* ТОЛГОЙ БА 3 ТАБ СОЛИГЧ */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>🎯 Мастер Каталог & Нарийн Тохиргоо</span>
                  </h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Хүснэгт дотроо шууд мөрөөр нэмэх, засах, баталгаажуулах
                  </p>
                </div>

                <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                    startTransition(() => {
                    setCatalogTab("ingredients");
                    setSelectedIngIds([]);
                    setIsAddingIngRow(false);
                    setEditingIngId(null);
                  });
                    }}
                    className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-sm font-black transition ${
                      catalogTab === "ingredients"
                        ? "bg-emerald-500 text-slate-950 shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    📦 Түүхий эд ({ingredients.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                       startTransition(() => {
                    setCatalogTab("products");
                    setSelectedProdIds([]);
                    setIsAddingProdRow(false);
                    setEditingProdId(null);
                  });
                    }}
                    className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-sm font-black transition ${
                      catalogTab === "products"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ☕ Менюний үнэ ({productsList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                        startTransition(() => {
                      setCatalogTab("recipes");
                      setSelectedRecipeProducts([]);
                      setInlineAddRecipeProduct(null);
                    });
                    }}
                    className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-sm font-black transition ${
                      catalogTab === "recipes"
                        ? "bg-purple-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    📖 Жорууд (
                    {
                      Array.from(
                        new Set(recipes.map((r: any) => r.product_name)),
                      ).length
                    }
                    )
                  </button>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 1. 📦 ТҮҮХИЙ ЭД (ХҮСНЭГТ ДОТРОО ШУУД НЭМЭХ & ШУУД ЗАСАХ)                   */}
              {/* ========================================================================= */}
              {catalogTab === "ingredients" && (
                <div className="pt-4 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <input
                      type="text"
                      value={ingSearch}
                      onChange={(e) => setIngSearch(e.target.value)}
                      placeholder="🔍 Түүхий эдийн нэрээр хайх..."
                      className="w-full sm:flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500"
                    />

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      {selectedIngIds.length > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !confirm(
                                `Сонгосон ${selectedIngIds.length} түүхий эдийг устгах уу?`,
                              )
                            )
                              return;
                            setIngredients((prev) =>
                              prev.filter(
                                (i) => !selectedIngIds.includes(i.id),
                              ),
                            );
                            const ids = [...selectedIngIds];
                            setSelectedIngIds([]);
                            await supabase
                              .from("ingredients")
                              .delete()
                              .in("id", ids);
                            fetchDatabaseData(activeClient);
                          }}
                          className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2.5 rounded-xl text-sm font-black transition active:scale-95 flex items-center gap-1.5 shadow"
                        >
                          <span>
                            🗑️ Сонгосон ({selectedIngIds.length}) устгах
                          </span>
                        </button>
                      )}

                      {/* ⚡ Шинэ мөр нээх товч (Поп-ап ЦОНХГҮЙ!) */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingIngRow(!isAddingIngRow);
                          setNewIngDraft({
                            name: "",
                            unit: "гр",
                            price: "",
                            par: "0",
                          });
                        }}
                        className={`${
                          isAddingIngRow
                            ? "bg-slate-800 text-slate-300"
                            : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                        } px-4 py-2.5 rounded-xl text-sm font-black transition flex items-center gap-1.5 active:scale-95 shadow`}
                      >
                        <span>
                          {isAddingIngRow ? "✕ Цуцлах" : "+ Түүхий эд нэмэх"}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[420px] border border-slate-800 rounded-2xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-bold sticky top-0 border-b border-slate-800 z-10">
                        <tr>
                          <th className="py-3 px-3 w-8">
                            <input
                              type="checkbox"
                              checked={
                                selectedIngIds.length > 0 &&
                                selectedIngIds.length === ingredients.length
                              }
                              onChange={(e) => {
                                if (e.target.checked)
                                  setSelectedIngIds(
                                    ingredients.map((i) => i.id),
                                  );
                                else setSelectedIngIds([]);
                              }}
                              className="w-4 h-4 accent-emerald-500 cursor-pointer rounded"
                            />
                          </th>
                          <th className="py-3 px-3">Барааны нэр</th>
                          <th className="py-3 px-3">Хэмжих нэгж</th>
                          <th className="py-3 px-3 text-right">
                            Нэгжийн өртөг (₮)
                          </th>
                          <th className="py-3 px-3 text-right">
                            Хэвийн нөөц (PAR)
                          </th>
                          <th className="py-3 px-3 text-right">Үйлдэл</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-medium">
                        {/* ⚡ 1. ХҮСНЭГТ ДОТОР НЭЭГДЭХ ШИНЭ МӨР (ЦОНХГҮЙ!) */}
                        {isAddingIngRow && (
                          <tr className="bg-emerald-950/40 border-b-2 border-emerald-500/60 animate-in fade-in duration-150">
                            <td className="py-2 px-3 text-emerald-400 font-bold">
                              New
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                autoFocus
                                value={newIngDraft.name}
                                onChange={(e) =>
                                  setNewIngDraft({
                                    ...newIngDraft,
                                    name: e.target.value,
                                  })
                                }
                                placeholder="Түүхий эдийн нэр..."
                                className="w-full bg-[#060b17] border border-emerald-500/60 rounded-lg px-2.5 py-1 text-sm text-white font-bold outline-none focus:border-emerald-400"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={newIngDraft.unit}
                                onChange={(e) =>
                                  setNewIngDraft({
                                    ...newIngDraft,
                                    unit: e.target.value,
                                  })
                                }
                                className="bg-[#060b17] border border-emerald-500/60 rounded-lg px-2 py-1 text-sm text-white outline-none cursor-pointer"
                              >
                                <option value="гр">гр</option>
                                <option value="мл">мл</option>
                                <option value="ш">ш</option>
                                <option value="кг">кг</option>
                                <option value="л">л</option>
                                <option value="порц">порц</option>
                              </select>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                value={newIngDraft.price}
                                onChange={(e) =>
                                  setNewIngDraft({
                                    ...newIngDraft,
                                    price: e.target.value,
                                  })
                                }
                                placeholder="Өртөг ₮..."
                                className="w-24 bg-[#060b17] border border-emerald-500/60 rounded-lg px-2 py-1 text-right text-sm text-emerald-400 font-mono font-bold outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                value={newIngDraft.par}
                                onChange={(e) =>
                                  setNewIngDraft({
                                    ...newIngDraft,
                                    par: e.target.value,
                                  })
                                }
                                placeholder="PAR..."
                                className="w-20 bg-[#060b17] border border-emerald-500/60 rounded-lg px-2 py-1 text-right text-sm text-white font-mono outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  disabled={!newIngDraft.name.trim()}
                                  onClick={async () => {
                                    const { data } = await supabase
                                      .from("ingredients")
                                      .insert([
                                        {
                                          client_id: activeClient,
                                          name: newIngDraft.name.trim(),
                                          unit: newIngDraft.unit || "гр",
                                          unit_price:
                                            parseFloat(newIngDraft.price) || 0,
                                          par_level:
                                            parseFloat(newIngDraft.par) || 0,
                                          current_stock: 0,
                                        },
                                      ])
                                      .select()
                                      .single();
                                    if (data)
                                      setIngredients((prev) => [data, ...prev]);
                                    setIsAddingIngRow(false);
                                    setNewIngDraft({
                                      name: "",
                                      unit: "гр",
                                      price: "",
                                      par: "0",
                                    });
                                  }}
                                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-2.5 py-1 rounded-lg text-sm transition"
                                  title="Хадгалах"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsAddingIngRow(false)}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded-lg text-sm"
                                  title="Болих"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* ТҮҮХИЙ ЭДИЙН ЖАГСААЛТ */}
                        {ingredients
                          .filter(
                            (i) =>
                              !ingSearch.trim() ||
                              i.name
                                .toLowerCase()
                                .includes(ingSearch.toLowerCase().trim()),
                          )
                          .map((ing) => {
                            const isEditingThis = editingIngId === ing.id;

                            // ⚡ 2. ХҮСНЭГТ ДОТОР МӨР ШУУД ЗАСАГДАХ ГОРИМ
                            if (isEditingThis) {
                              return (
                                <tr
                                  key={ing.id}
                                  className="bg-blue-950/40 border-b-2 border-blue-500/60"
                                >
                                  <td className="py-2 px-3"></td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="text"
                                      autoFocus
                                      value={editingIngDraft.name}
                                      onChange={(e) =>
                                        setEditingIngDraft({
                                          ...editingIngDraft,
                                          name: e.target.value,
                                        })
                                      }
                                      className="w-full bg-[#060b17] border border-blue-500 rounded-lg px-2.5 py-1 text-sm text-white font-bold outline-none"
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <select
                                      value={editingIngDraft.unit}
                                      onChange={(e) =>
                                        setEditingIngDraft({
                                          ...editingIngDraft,
                                          unit: e.target.value,
                                        })
                                      }
                                      className="bg-[#060b17] border border-blue-500 rounded-lg px-2 py-1 text-sm text-white outline-none cursor-pointer"
                                    >
                                      <option value="гр">гр</option>
                                      <option value="мл">мл</option>
                                      <option value="ш">ш</option>
                                      <option value="кг">кг</option>
                                      <option value="л">л</option>
                                      <option value="порц">порц</option>
                                    </select>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <input
                                      type="number"
                                      value={editingIngDraft.price}
                                      onChange={(e) =>
                                        setEditingIngDraft({
                                          ...editingIngDraft,
                                          price: e.target.value,
                                        })
                                      }
                                      className="w-24 bg-[#060b17] border border-blue-500 rounded-lg px-2 py-1 text-right text-sm text-emerald-400 font-mono font-bold outline-none"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <input
                                      type="number"
                                      value={editingIngDraft.par}
                                      onChange={(e) =>
                                        setEditingIngDraft({
                                          ...editingIngDraft,
                                          par: e.target.value,
                                        })
                                      }
                                      className="w-20 bg-[#060b17] border border-blue-500 rounded-lg px-2 py-1 text-right text-sm text-white font-mono outline-none"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const updatedObj = {
                                            ...ing,
                                            name:
                                              editingIngDraft.name.trim() ||
                                              ing.name,
                                            unit: editingIngDraft.unit,
                                            unit_price:
                                              parseFloat(
                                                editingIngDraft.price,
                                              ) || 0,
                                            par_level:
                                              parseFloat(editingIngDraft.par) ||
                                              0,
                                          };
                                          // ⚡ 0ms Optimistic UI
                                          setIngredients((prev) =>
                                            prev.map((i) =>
                                              i.id === ing.id ? updatedObj : i,
                                            ),
                                          );
                                          setEditingIngId(null);
                                          await supabase
                                            .from("ingredients")
                                            .update({
                                              name: updatedObj.name,
                                              unit: updatedObj.unit,
                                              unit_price: updatedObj.unit_price,
                                              par_level: updatedObj.par_level,
                                            })
                                            .eq("id", ing.id);
                                          fetchDatabaseData(activeClient);
                                        }}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-2.5 py-1 rounded-lg text-sm transition"
                                        title="Батлах"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingIngId(null)}
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded-lg text-sm"
                                        title="Цуцлах"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }

                            // ЭНГИЙН МӨР
                            return (
                              <tr
                                key={ing.id}
                                className="hover:bg-slate-900/60 transition"
                              >
                                <td className="py-2.5 px-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedIngIds.includes(ing.id)}
                                    onChange={(e) => {
                                      if (e.target.checked)
                                        setSelectedIngIds((prev) => [
                                          ...prev,
                                          ing.id,
                                        ]);
                                      else
                                        setSelectedIngIds((prev) =>
                                          prev.filter((id) => id !== ing.id),
                                        );
                                    }}
                                    className="w-4 h-4 accent-emerald-500 cursor-pointer rounded"
                                  />
                                </td>
                                <td className="py-2.5 px-3 font-bold text-white">
                                  {ing.name}
                                </td>
                                <td className="py-2.5 px-3 text-slate-400">
                                  {ing.unit}
                                </td>
                                <td className="py-2.5 px-3 text-right text-emerald-400 font-mono font-bold">
                                  {parseFloat(
                                    ing.unit_price || 0,
                                  ).toLocaleString()}{" "}
                                  ₮
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-300 font-mono">
                                  {ing.par_level || 0} {ing.unit}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingIngId(ing.id);
                                        setEditingIngDraft({
                                          name: ing.name,
                                          unit: ing.unit || "гр",
                                          price: (
                                            ing.unit_price || 0
                                          ).toString(),
                                          par: (ing.par_level || 0).toString(),
                                        });
                                      }}
                                      className="h-7 w-7 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-400 hover:text-purple-300 text-slate-400 flex items-center justify-center transition active:scale-95 shrink-0"
                                      title="Мөр дотор засах"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (
                                          !confirm(
                                            `"${ing.name}" түүхий эдийг устгах уу?`,
                                          )
                                        )
                                          return;
                                        setIngredients((prev) =>
                                          prev.filter((i) => i.id !== ing.id),
                                        );
                                        await supabase
                                          .from("ingredients")
                                          .delete()
                                          .eq("id", ing.id);
                                        fetchDatabaseData(activeClient);
                                      }}
                                      className="h-7 w-7 rounded-xl bg-slate-950/70 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 flex items-center justify-center text-sm transition active:scale-95 shrink-0 cursor-pointer shadow-sm"
                                      title="Устгах"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 2. ☕ МЕНЮ & ЗАРАХ ҮНЭ (ХҮСНЭГТ ДОТРОО ШУУД НЭМЭХ & ШУУД ЗАСАХ)            */}
              {/* ========================================================================= */}
              {catalogTab === "products" && (
                <div className="pt-4 space-y-3">
           
             {/* ⚡ АВТО-ПИЛОТ ТУУЗ: ЯГ ТАНЫ ХҮССЭН ТЕКСТ & ТОВЧ */}
                {autoPilotActivity && (
                  <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-4 rounded-2xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <p className="text-sm sm:text-sm text-emerald-300 font-black leading-relaxed">
                        ⚡ Авто-Пилот: {autoPilotActivity.totalSales} борлуулалт амжилттай бодлоо. 
                        {autoPilotActivity.changes.length > 0 
                          ? ` Нийт ${autoPilotActivity.changes.filter(c => !c.reverted).length} бараанд өөрчлөлт орсон байна.` 
                          : " Бүх үнэ, жор 100% таарсан байна."}
                      </p>
                    </div>

                    {autoPilotActivity.changes.length > 0 && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowChangesModal(true)}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-sm font-black transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          <span>👁️ Өөрчлөлтүүдийг харах ({autoPilotActivity.changes.filter(c => !c.reverted).length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAutoPilotActivity(null)}
                          className="text-slate-500 hover:text-slate-300 p-1 text-sm"
                          title="Хаах"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}

                              {/* 📋 [ 👁️ ӨӨРЧЛӨЛТҮҮДИЙГ ХАРАХ ] ПОПАП ЦОНХ */}
                  {showChangesModal && autoPilotActivity && (
                    <div 
                      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-150"
                      onClick={() => setShowChangesModal(false)}
                    >
                      <div 
                        className="bg-[#0F172A] border border-slate-700 rounded-3xl p-5 w-full max-w-2xl shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                          <div>
                            <h3 className="font-black text-white text-base flex items-center gap-2">
                              <span>📋 Авто-Пилотын хийсэн өөрчлөлтүүд</span>
                            </h3>
                            <p className="text-sm text-slate-400 mt-0.5">
                              Шинээр орж ирсэн ПОС-ын нэр болон үнийг шалгаж, шаардлагатай бол буцаана уу.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowChangesModal(false)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl text-sm font-bold"
                          >
                            ✕ Хаах
                          </button>
                        </div>

                        {/* ХҮСНЭГТ: ХУУЧИН БА ШИНЭ УТГУУД ЗӨВ БАЙРАНДАА */}
                        <div className="flex-1 overflow-y-auto border border-slate-800 rounded-2xl">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-950 text-slate-400 uppercase font-bold sticky top-0 border-b border-slate-800">
                              <tr>
                                <th className="py-2.5 px-3">Шинэ бүтээгдэхүүн (ПОС)</th>
                                <th className="py-2.5 px-3">Төлөв</th>
                                <th className="py-2.5 px-3 text-right">Хуучин (Меню)</th>
                                <th className="py-2.5 px-3 text-right">Шинэ (ПОС)</th>
                                <th className="py-2.5 px-3 text-center">Үйлдэл</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                              {autoPilotActivity.changes.map((ch) => (
                               <tr key={ch.id} className={ch.reverted ? "opacity-40 line-through bg-slate-900/20" : "hover:bg-slate-900/40"}>
                                  <td className="py-2.5 px-3 font-bold text-white">
                                    <div>
                                      <span>{ch.oldName}</span>
                                      {ch.newName && ch.newName !== ch.oldName && (
                                        <span className="block text-xs text-slate-400 font-normal">{ch.newName}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded text-xs font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                      Үнэ шинэчлэгдсэн
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-slate-400 font-mono">
                                    {ch.oldPrice.toLocaleString()} ₮
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-emerald-400 font-mono font-black">
                                    {ch.newPrice.toLocaleString()} ₮
                                  </td>


                                  <td className="py-2.5 px-3 text-center">
                                    {ch.reverted ? (
                                      <span className="text-xs text-slate-500 font-bold">Буцаагдсан ↩️</span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleSingleUndo(ch.id)}
                                        className="bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 border border-slate-700 hover:border-rose-500/40 px-2.5 py-1 rounded-xl text-sm font-bold transition active:scale-95 cursor-pointer"
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
                          <p className="text-xs text-slate-500">
                            💡 Буцаах товч дармагц тухайн бараа хуучин нэр болон үнэ рүүгээ тэр дороо шилжинэ.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowChangesModal(false)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-sm cursor-pointer transition shadow"
                          >
                            ✓ Ойлголоо, цонхыг хаах
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                      {/* ⚠️ ПОС-ООС ИРСЭН БҮТЭЭГДЭХҮҮНИЙГ СОЛЬЖ НЭГТГЭХ ЭСВЭЛ ШИНЭЭР НЭМЭХ ШАР БАННЕР */}
                  {unmappedSales.length > 0 && (
                    <div className="bg-amber-500/10 border-2 border-amber-500/40 p-4 rounded-2xl space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 animate-pulse" />
                        <div>
                          <h4 className="text-sm sm:text-sm font-black text-amber-300">
                            ПОС дээр нэр зөрсөн/шинэ бүтээгдэхүүнүүд ({unmappedSales.length}):
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Хэрэв хуучин цэсний товчлол бол <strong>"Сольж нэгтгэх"</strong>, цоо шинэ бараа бол <strong>"+ Шинэ цэс үүсгэх"</strong> дарна уу.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-1">
                        {unmappedSales.map((item, idx) => (
                          <div key={idx} className="bg-slate-950 p-3 rounded-2xl border border-amber-500/30 text-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 shadow-sm">
                            <div>
                              <span className="text-white font-black text-sm">{item.name}</span>
                              <span className="text-emerald-400 font-mono text-xs ml-2">
                                ПОС үнэ: {item.unitPrice.toLocaleString()} ₮ ({item.soldCount}ш)
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                              
                              {/* ⚡ СОНГОЛТ 1: ХУУЧИН ЖОРТОЙ СОЛЬЖ НЭГТГЭХ (ХАЙЛТТАЙ, АРИЛАХГҮЙ) */}
                              <div className="flex items-center gap-1.5 flex-1 lg:flex-none">
                                <div className="w-56">
                                  <SearchableSelect
                                    placeholder="-- Жор хайж сонгох --"
                                    value={mergeSelections[item.name] || ""}
                                    options={Array.from(new Set(recipes.map((r: any) => r.product_name))).map((rName: any) => ({
                                      value: rName,
                                      label: `📖 ${rName}`
                                    }))}
                                    onChange={(chosenRecipe) => {
                                      // Сонголтыг найдвартай хадгална (Арилж алга болохгүй)
                                      setMergeSelections(prev => ({ ...prev, [item.name]: chosenRecipe }));
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
                                    setLoading(true);

                                    const existingProd = productsList.find(p => p.name.toLowerCase().trim() === selectedOldName.toLowerCase().trim());
                                    const preservedCategory = existingProd?.category || 'General';

                            
                                  // 1. Хуучин бүтээгдэхүүний орцуудыг татаж авах
                                const { data: existingRecipeRows } = await supabase
                                  .from('recipes')
                                  .select('ingredient_id, amount')
                                  .eq('client_id', activeClient)
                                  .eq('product_name', selectedOldName);

                                if (existingRecipeRows && existingRecipeRows.length > 0) {
                                  // 2. ⚡ Шинэ цэс дээр уг жорыг ХУУЛБАРЛАЖ (COPY) өгнө (Хуучин жор нь хэвээрээ үлдэнэ!):
                                  const rowsToClone = existingRecipeRows.map((r: any) => ({
                                    client_id: activeClient,
                                    product_name: posName, // "Нэрийн цай" дээр шинэ жор үүснэ
                                    ingredient_id: r.ingredient_id,
                                    amount: r.amount
                                  }));

                                  await supabase.from('recipes').upsert(rowsToClone, {
                                    onConflict: 'client_id,product_name,ingredient_id'
                                  });
                                }

                                    // 2. Products хүснэгт дэх нэрийг шинэчлэх:
                                    if (existingProd) {
                                      await supabase
                                        .from('products')
                                        .update({
                                          name: posName,
                                          selling_price: item.unitPrice > 0 ? item.unitPrice : existingProd.selling_price,
                                          category: preservedCategory
                                        })
                                        .eq('id', existingProd.id);
                                    } else {
                                      await supabase.from('products').upsert([{
                                        client_id: activeClient,
                                        name: posName,
                                        category: preservedCategory,
                                        selling_price: item.unitPrice
                                      }], { onConflict: 'client_id,name' });
                                    }

                                    // 3. Түүхэнд бичих
                                    await createSnapshotFromDb(posName, 'updated');
                                      // 4. "🔗 СОЛЬЖ НЭГТГЭХ" ТОВЧ (Шар туузан дээр) ДАРАХАД СУРАХ
                                    
                                // Зөвхөн ПОС-ын нэр ба Жорын нэр өөр байвал л цээжилнэ (Ижил нэрийг дэмий хадгалахгүй):
                                    if (cleanString(posName).toLowerCase() !== cleanString(selectedOldName).toLowerCase()) {
                                      await supabase.from('learned_menus').upsert([{
                                        client_id: activeClient,
                                        pos_name: posName,
                                        official_product_name: selectedOldName
                                      }], { onConflict: 'client_id,pos_name' });
}

    
                                    setLoading(false);
                                    fetchDatabaseData(activeClient);
                                    alert(`✅ "${selectedOldName}"-ийн жорыг "${posName}"-тай амжилттай холболоо!`);
                                  }}
                                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl font-black text-xs transition active:scale-95 whitespace-nowrap shadow cursor-pointer"
                                >
                                  🔗 Сольж нэгтгэх
                                </button>
                              </div>

                              <span className="text-slate-600 text-sm hidden lg:inline">эсвэл</span>

                              {/* ⚡ СОНГОЛТ 2: ЦОО ШИНЭЭР ЦЭСЭНД НЭМЭХ */}
                              <button
                                type="button"
                                onClick={async () => {
                                  const { data } = await supabase.from('products').upsert([{
                                    client_id: activeClient,
                                    name: item.name.trim(),
                                    category: 'General',
                                    selling_price: item.unitPrice
                                  }], { onConflict: 'client_id,name' }).select().single();

                                  if (data) {
                                     setProductsList(prev => [data, ...prev.filter(p => p.id !== data.id)]);
                                  }
                                  fetchDatabaseData(activeClient);
                                }}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl font-bold text-sm transition active:scale-95 whitespace-nowrap"
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
                      placeholder="🔍 Менюний нэрээр хайх..."
                      className="w-full sm:flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                    />

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      {selectedProdIds.length > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Сонгосон ${selectedProdIds.length} цэсийг устгах уу?`)) return;
                            setProductsList(prev => prev.filter(p => !selectedProdIds.includes(p.id)));
                            const ids = [...selectedProdIds];
                            setSelectedProdIds([]);
                            await supabase.from('products').delete().in('id', ids);
                            fetchDatabaseData(activeClient);
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
                          setNewProdDraft({ name: '', category: 'COFFEE', price: '' });
                        }}
                        className={`${
                          isAddingProdRow ? 'bg-slate-800 text-slate-300' : 'bg-blue-600 hover:bg-blue-500 text-white'
                        } px-4 py-2.5 rounded-xl text-sm font-black transition flex items-center gap-1.5 active:scale-95 shadow`}
                      >
                        <span>{isAddingProdRow ? '✕ Цуцлах' : '+ Менюний цэс нэмэх'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 📋 МЕНЮНИЙ ХҮСНЭГТ (МӨР ДОТРОО ЖОР СОНГОЖ ХОЛБОХ БАГАНАТАЙ) */}
                  <div className="overflow-x-auto max-h-[440px] border border-slate-800 rounded-2xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-bold sticky top-0 border-b border-slate-800 z-10">
                        <tr>
                          <th className="py-3 px-3 w-8">
                            <input
                              type="checkbox"
                              checked={selectedProdIds.length > 0 && selectedProdIds.length === productsList.length}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedProdIds(productsList.map(p => p.id));
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
                      <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-medium">
                        
                        {/* Шинэ цэс нэмэх инлайн мөр */}
                        {isAddingProdRow && (
                          <tr className="bg-blue-950/40 border-b-2 border-blue-500/60 animate-in fade-in duration-150">
                            <td className="py-2 px-3 text-blue-400 font-bold">New</td>
                           <td className="py-2 px-3">
                            <select
                              value={newProdDraft.category}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewProdDraft({ ...newProdDraft, category: e.target.value })}
                              className="bg-[#060b17] border border-blue-500 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none cursor-pointer"
                            >
                              {UNIVERSAL_CATEGORIES.map(cat => (
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
                                onChange={e => setNewProdDraft({ ...newProdDraft, name: e.target.value })}
                                placeholder="Бүтээгдэхүүний нэр..."
                                className="w-full bg-[#060b17] border border-blue-500 rounded-lg px-2.5 py-1 text-sm text-white font-bold outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                value={newProdDraft.price}
                                onChange={e => setNewProdDraft({ ...newProdDraft, price: e.target.value })}
                                placeholder="Зарах үнэ ₮..."
                                className="w-24 bg-[#060b17] border border-blue-500 rounded-lg px-2 py-1 text-right text-sm text-emerald-400 font-mono font-bold outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-slate-500">-</td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  disabled={!newProdDraft.name.trim()}
                                  onClick={async () => {
                                    const { data } = await supabase.from('products').insert([{
                                      client_id: activeClient,
                                      name: newProdDraft.name.trim(),
                                      category: newProdDraft.category || 'General',
                                      selling_price: parseFloat(newProdDraft.price) || 0
                                    }]).select().single();
                                    if (data) setProductsList(prev => [data, ...prev]);
                                    setIsAddingProdRow(false);
                                    setNewProdDraft({ name: '', category: 'COFFEE', price: '' });
                                  }}
                                  className="bg-blue-600 hover:bg-blue-500 text-white font-black px-2.5 py-1 rounded-lg text-sm transition"
                                  title="Хадгалах"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsAddingProdRow(false)}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded-lg text-sm"
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
                          .filter((p) => 
                            !menuSearch.trim() || 
                            p.name.toLowerCase().includes(menuSearch.toLowerCase().trim()) ||
                            (p.category && p.category.toLowerCase().includes(menuSearch.toLowerCase().trim()))
                          )
                          .map((prod, idx) => { // 👈 idx нэмсэн
                            const isEditingThis = editingProdId === prod.id;

              
                   

                            if (isEditingThis) {
                              return (
                                <tr key={`edit-${prod.id}-${idx}`} className="bg-blue-950/40 border-b-2 border-blue-500/60"> 
                                  <td className="py-2 px-3"></td>
                                  <td className="py-2 px-3">
                                  <select
                                    value={editingProdDraft.category}
                                    onChange={e => setEditingProdDraft({ ...editingProdDraft, category: e.target.value })}
                                    className="bg-[#060b17] border border-blue-500 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none cursor-pointer"
                                  >
                                    {UNIVERSAL_CATEGORIES.map(cat => (
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
                                      onChange={e => setEditingProdDraft({ ...editingProdDraft, name: e.target.value })}
                                      className="w-full bg-[#060b17] border border-blue-500 rounded-lg px-2.5 py-1 text-sm text-white font-bold outline-none"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <input
                                      type="number"
                                      value={editingProdDraft.price}
                                      onChange={e => setEditingProdDraft({ ...editingProdDraft, price: e.target.value })}
                                      className="w-24 bg-[#060b17] border border-blue-500 rounded-lg px-2 py-1 text-right text-sm text-emerald-400 font-mono font-bold outline-none"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-center text-slate-500">-</td>
                                  <td className="py-2 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const oldName = prod.name;
                                          const newName = editingProdDraft.name.trim() || prod.name;
                                          const newPrice = parseFloat(editingProdDraft.price) || 0;
                                          const newCat = editingProdDraft.category || 'General';

                                          setProductsList(prev => prev.map(p => p.id === prod.id ? { ...p, name: newName, category: newCat, selling_price: newPrice } : p));
                                          setEditingProdId(null);

                                          await supabase.from('products').update({
                                            name: newName,
                                            category: newCat,
                                            selling_price: newPrice
                                          }).eq('id', prod.id);

                                         // 🧠 ⚡ ЭЗЭН МЕНЮ ДЭЭР АНГИЛЛЫГ ЗАСМАГЦ LEARNED_CATEGORIES БААЗ ДАВХАР ЗАСАГДАНА:
                                      await supabase.from('learned_categories').upsert([{
                                        client_id: activeClient,
                                        product_name: newName,
                                        category: newCat
                                      }], { onConflict: 'client_id,product_name' }); 
                                          if (oldName && oldName !== newName) {
                                            setRecipes(prev => prev.map(r => r.product_name === oldName ? { ...r, product_name: newName } : r));
                                            await supabase.from('recipes').update({ product_name: newName }).eq('client_id', activeClient).eq('product_name', oldName);
                                            await recordRecipeSnapshot(newName, 'updated'); // 👈 ТҮҮХ АВТОМАТААР ХАДГАЛАГДАНА
                                          }

                                          fetchDatabaseData(activeClient);
                                        }}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-2.5 py-1 rounded-lg text-sm transition"
                                        title="Батлах"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingProdId(null)}
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded-lg text-sm"
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
                              <tr key={`prod-${prod.id}-${idx}`} className="hover:bg-slate-900/60 transition">
                                <td className="py-2.5 px-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedProdIds.includes(prod.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) setSelectedProdIds(prev => [...prev, prod.id]);
                                      else setSelectedProdIds(prev => prev.filter(id => id !== prod.id));
                                    }}
                                    className="w-4 h-4 accent-blue-500 cursor-pointer rounded"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="   ">
                                    {renderCategoryBadge(prod.category)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-bold text-white">{prod.name}</td>
                                <td className="py-2.5 px-3 text-right text-emerald-400 font-mono font-black text-sm">
                                  {parseFloat(prod.selling_price || 0).toLocaleString()} ₮
                                </td>
                           {/* ⚡ УХААЛАГ ЖОРЫН ТӨЛӨВ & ХОЛБООС БАГАНА */}
               <td className="py-2.5 px-3 text-center">
              {(() => {
                const status = productRecipeStatus.get(prod.id);
                const hasRecipe = status && status.count > 0;

                if (hasRecipe) {
                  return (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1 shadow-sm">
                      <span>🟢 Жортой</span>
                      <span className="text-xs text-emerald-500/80">({status.count} орц)</span>
                    </span>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogTab('recipes');
                      setIsCreatingRecipeCard(true);
                      setNewRecipeNameDraft(prod.name);
                      setNewRecipePriceDraft(prod.selling_price?.toString() || '');
                    }}
                    className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 mx-auto active:scale-95 shadow-sm cursor-pointer"
                  >
                    <span>📖 + Орц угсрах</span>
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
                                          category: prod.category || 'General',
                                          price: (prod.selling_price || 0).toString()
                                        });
                                      }}
                                      className="text-slate-400 hover:text-blue-400 p-1 text-sm transition"
                                      title="Мөр дотор засах"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!confirm(`"${prod.name}" бүтээгдэхүүнийг цэснээс устгах уу?`)) return;
                                        setProductsList(prev => prev.filter(p => p.id !== prod.id));
                                        await supabase.from('products').delete().eq('id', prod.id);
                                        fetchDatabaseData(activeClient);
                                      }}
                                      className="text-slate-500 hover:text-rose-400 p-1 text-sm transition"
                                      title="Устгах"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 3. 📖 ЖОР (САДААГҮЙ, САНАМСАРГҮЙ ЗАСАГДАХААС ХАМГААЛАГДСАН ШУУД ӨӨРЧЛӨЛТ) */}
              {/* ========================================================================= */}
               {catalogTab === "recipes" && (() => {
                // Нийт жортой бүтээгдэхүүний давхардаагүй нэрс:
                const allRecipeProductNames = Array.from(new Set(recipes.map((r: any) => r.product_name)));

                return (
                  <div className="pt-4 space-y-3">
                    {/* ТОЛГОЙ ХЭСЭГ: ХАЙЛТ, БҮГДИЙГ СОНГОХ БА ОЛНООР НЬ УСТГАХ */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                      <input
                        type="text"
                        value={recipeSearch}
                        onChange={(e) => setRecipeSearch(e.target.value)}
                        placeholder="🔍 Бүтээгдэхүүний жор хайх..."
                        className="w-full sm:flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-purple-500"
                      />

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
                        {/* ☑️ БҮГДИЙГ СОНГОХ CHECKBOX */}
                        <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:text-white cursor-pointer select-none">
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
                                  `Сонгосон ${selectedRecipeProducts.length} бүтээгдэхүүний бүх жорыг устгахдаа итгэлтэй байна уу?`
                                )
                              )
                                return;

                              setLoading(true);
                              const namesToDelete = [...selectedRecipeProducts];

                              // ⚡ 0ms Optimistic UI (Дэлгэцнээс шууд арилгана)
                              setRecipes((prev) =>
                                prev.filter((r) => !namesToDelete.includes(r.product_name))
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
                                alert(`✅ Сонгосон ${namesToDelete.length} бүтээгдэхүүний жор бүрэн устгагдлаа.`);
                              }

                              setLoading(false);
                              fetchDatabaseData(activeClient);
                            }}
                            className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2.5 rounded-xl text-sm font-black transition active:scale-95 flex items-center gap-1.5 shadow"
                          >
                            <span>🗑️ Сонгосон ({selectedRecipeProducts.length}) устгах</span>
                          </button>
                        )}
                         <button
                        type="button"
                        onClick={handleExportRecipeBackup}
                        className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        title={`${activeClient}-ийн бүх жорыг файлд хадгалж авах`}
                      >
                        <span>💾 Жор татах</span>
                      </button>
                      {/* 📊 EXCEL (Google Sheets) РҮҮ ТАТАХ ТОВЧ */}
                  <button
                    type="button"
                    onClick={handleExportToExcel}
                    className="bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 border border-emerald-500/40 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
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
                        className="bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
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
                              ? "bg-slate-800 text-slate-300"
                              : "bg-purple-600 hover:bg-purple-500 text-white"
                          } px-3.5 py-2.5 rounded-xl text-sm font-black transition active:scale-95 flex items-center gap-1.5 shadow`}
                        >
                          <span>{isCreatingRecipeCard ? "✕ Болиулах" : "+ Шинэ жор үүсгэх"}</span>
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
                          setNewRecipeItemsDraft(prev => {
                            const exists = prev.some(item => item.ingredient_id === dropped.ingredient_id);
                            if (exists) return prev;
                            return [...prev, { ingredient_id: dropped.ingredient_id, amount: dropped.amount }];
                          });
                        }
                      } catch (err) {}
                    }}
                    className="bg-slate-950 p-5 rounded-2xl border-2 border-purple-500/80 space-y-4 shadow-xl"
                  >
                      
                      {/* ЧИРЧ УНАГАХ ЗААВАР ТУУЗ */}
                      <div className="bg-purple-950/30 border border-dashed border-purple-500/50 p-2.5 rounded-xl text-center">
                        <p className="text-xs text-purple-300 font-bold">
                          💡 Зөвлөмж: Доорх бэлэн жорыг (эсвэл орцуудыг) хулганаараа чирж энэ хайрцаг руу унагавал шууд хуулагдана!
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
                                sublabel: alreadyHas ? "✓ Жортой" : "⚠️ Жоргүй"
                              };
                            })}
                            onChange={(chosen) => {
                              setNewRecipeNameDraft(chosen);
                              const matched = productsList.find((p) => p.name === chosen);
                              if (matched?.selling_price) setNewRecipePriceDraft(matched.selling_price.toString());
                            }}
                          />
                        </div>

                        {/* Зарах үнэ */}
                        <div className="w-36 shrink-0 flex items-center bg-[#0B1120] border border-purple-500/80 rounded-xl px-3 py-2">
                          <input
                            type="number"
                            value={newRecipePriceDraft}
                            onChange={(e) => setNewRecipePriceDraft(e.target.value)}
                            placeholder="Зарах үнэ"
                            className="w-full bg-transparent text-sm text-emerald-400 font-mono font-black outline-none"
                          />
                          <span className="text-slate-500 text-xs font-bold">₮</span>
                        </div>

                        {/* Батлах / Болиулах */}
                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                          <button
                            type="button"
                            disabled={!newRecipeNameDraft.trim() || newRecipeItemsDraft.length === 0}
                            onClick={async () => {
                              const pName = newRecipeNameDraft.trim();
                              if (newRecipePriceDraft) {
                                await supabase.from("products").upsert([{
                                  client_id: activeClient,
                                  name: pName,
                                  category: "General",
                                  selling_price: parseFloat(newRecipePriceDraft) || 0
                                }], { onConflict: "client_id,name" });
                              }

                              const recipeRows = newRecipeItemsDraft.map((it) => ({
                                client_id: activeClient,
                                product_name: pName,
                                ingredient_id: it.ingredient_id,
                                amount: parseFloat(it.amount) || 0
                              }));

                              const { data } = await supabase.from("recipes").insert(recipeRows).select();
                              if (data) setRecipes((prev) => [...prev, ...data]);

                              await createSnapshotFromDb(pName, 'created');
                              setIsCreatingRecipeCard(false);
                              setNewRecipeNameDraft("");
                              setNewRecipePriceDraft("");
                              setNewRecipeItemsDraft([]);
                              fetchDatabaseData(activeClient);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition active:scale-95 shadow cursor-pointer"
                          >
                            ✓ Батлах
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCreatingRecipeCard(false)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-2 rounded-xl text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* 2-Р МӨР: ОРЦ СОНГОХ + ГРАММ */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-900">
                        <div className="w-56 shrink-0">
                          <SearchableSelect
                            placeholder="-- Орц хайх --"
                            value={draftRecipeIngId}
                            options={ingredients.map((i) => ({
                              value: i.id,
                              label: i.name,
                              sublabel: i.unit
                            }))}
                            onChange={(id) => setDraftRecipeIngId(id)}
                          />
                        </div>
                        
                        <input
                          type="number"
                          placeholder="Хэмжээ"
                          value={draftRecipeIngAmt}
                          onChange={(e) => setDraftRecipeIngAmt(e.target.value)}
                          className="w-24 bg-[#0B1120] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none font-mono focus:border-purple-500"
                        />

                        <button
                          type="button"
                          disabled={!draftRecipeIngId || !draftRecipeIngAmt}
                          onClick={() => {
                            setNewRecipeItemsDraft([
                              ...newRecipeItemsDraft,
                              { ingredient_id: draftRecipeIngId, amount: draftRecipeIngAmt }
                            ]);
                            setDraftRecipeIngId("");
                            setDraftRecipeIngAmt("");
                          }}
                          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow"
                        >
                          + Нэмэх
                        </button>
                      </div>

                     {/* 3-Р МӨР: ШИНЭ ЖОРТ НЭМЭГДСЭН ОРЦУУД (ГРАММЫГ НЬ ЗАСАХ БОЛОМЖТОЙ) */}
                        {newRecipeItemsDraft.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-2">
                            {newRecipeItemsDraft.map((item, idx) => {
                              const ing = ingredients.find((i) => i.id === item.ingredient_id);
                              return (
                                <div
                                  key={idx}
                                  className="bg-[#0B1120] border border-slate-700 hover:border-purple-500/60 px-3 py-1.5 rounded-xl text-sm flex items-center gap-2 font-bold text-white shadow-sm"
                                >
                                  <span>{ing?.name || "Орц"}</span>
                                  
                                  {/* 👈 ОРСНЫ ДАРАА ТООГ НЬ ШУУД ӨӨРЧИЛЖ БОЛОХ INPUT */}
                                  <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-purple-500/50">
                                    <input
                                      type="number"
                                      value={item.amount}
                                      onChange={(e) => {
                                        const newAmt = e.target.value;
                                        setNewRecipeItemsDraft(prev =>
                                          prev.map((it, i) => i === idx ? { ...it, amount: newAmt } : it)
                                        );
                                      }}
                                      className="w-14 bg-transparent text-center text-purple-200 font-mono font-black text-xs outline-none"
                                    />
                                    <span className="text-xs text-slate-400 font-normal">{ing?.unit || "гр"}</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setNewRecipeItemsDraft(newRecipeItemsDraft.filter((_, i) => i !== idx))
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
                    {Array.from(
                      new Set(recipes.map((r: any) => r.product_name)),
                    )
                      .filter(
                        (pName: any) =>
                          !recipeSearch.trim() ||
                          pName
                            .toLowerCase()
                            .includes(recipeSearch.toLowerCase().trim()),
                      )
                      .map((pName: any) => {
                        const productRecipes = recipes.filter(
                          (r: any) => r.product_name === pName,
                        );
                        const matchedProduct = productsList.find(
                          (p) =>
                            p.name.toLowerCase().trim() ===
                            pName.toLowerCase().trim(),
                        );
                        const sellPrice = matchedProduct
                          ? parseFloat(matchedProduct.selling_price)
                          : 0;

                        let calculatedCost = 0;
                        productRecipes.forEach((r) => {
                          const ing = ingredients.find(
                            (i) => i.id === r.ingredient_id,
                          );
                          const uPrice = ing
                            ? parseFloat(ing.unit_price || 0)
                            : 0;
                          calculatedCost +=
                            (parseFloat(r.amount) || 0) * uPrice;
                        });

                        const marginPct =
                          sellPrice > 0
                            ? ((sellPrice - calculatedCost) / sellPrice) * 100
                            : 0;

                        return (
                         <div
                            key={pName}
                            // ❌ Бүхэл картыг чирэхийг болиулсан (draggable={false})
                            className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 hover:border-slate-700 transition"
                          >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedRecipeProducts.includes(pName)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedRecipeProducts([...selectedRecipeProducts, pName]);
                                    else setSelectedRecipeProducts(selectedRecipeProducts.filter(name => name !== pName));
                                  }}
                                  className="w-4 h-4 accent-purple-500 cursor-pointer rounded"
                                />
                                <h4 className="text-sm font-black text-white">{pName}</h4>

                                <button
                                  type="button"
                                  onClick={() => openRecipeHistory(pName)}
                                  className="bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ml-1"
                                >
                                  <span>🕒 Түүх</span>
                                </button>
                              </div>

                              <div className="flex items-center gap-2 text-sm flex-wrap font-mono">
                                <span className="text-slate-400">Зарах: <strong className="text-white">{sellPrice.toLocaleString()} ₮</strong></span>
                                <span className="text-slate-700">•</span>
                                <span className="text-slate-400">Өртөг: <strong className="text-rose-400">{Math.round(calculatedCost).toLocaleString()} ₮</strong></span>
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                                  marginPct >= 75 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                }`}>
                                  Маржин: {marginPct.toFixed(1)}%
                                </span>
                              </div>
                            </div>

                            {/* ⚡ ОРЦ БҮРИЙГ ГАНЦ ГАНЦААР НЬ ЧИРЭХ ЭСВЭЛ [+] ДАРЖ ХУУЛАХ ХЭСЭГ */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-900">
                        {productRecipes.map((r: any) => {
                                const ing = ingredients.find((i) => i.id === r.ingredient_id);
                                const draftVal = recipeDrafts[r.id];
                                const isDrafting = draftVal !== undefined && draftVal !== r.amount.toString();

                                // 🟢 А. ШИНЭ ЖОР УГСАРЧ БАЙХ ҮЕД (ХААНА Ч ДАРСАН ДЭЭШЭЭ ШУУД НЭМЭГДЭХ ГОРИМ)
                                if (isCreatingRecipeCard) {
                                  return (
                                    <div
                                      key={r.id}
                                      draggable={true}
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        e.dataTransfer.setData("application/json", JSON.stringify({
                                          ingredient_id: r.ingredient_id,
                                          amount: r.amount.toString()
                                        }));
                                      }}
                                      onClick={() => {
                                        setNewRecipeItemsDraft(prev => {
                                          const exists = prev.some(item => item.ingredient_id === r.ingredient_id);
                                          if (exists) return prev;
                                          return [...prev, { ingredient_id: r.ingredient_id, amount: r.amount.toString() }];
                                        });
                                      }}
                                      className="bg-slate-900/90 hover:bg-purple-950/60 border border-slate-800 hover:border-purple-500/70 px-3 py-1.5 rounded-2xl text-sm flex items-center gap-2.5 transition shadow-sm cursor-pointer active:scale-95 select-none"
                                      title="Дарж дээд талын шинэ жор руу шууд нэмэх"
                                    >
                                      <span className="text-slate-200 font-bold">{ing?.name || "Орц"}</span>
                                      <span className="text-purple-300 font-mono text-xs bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-lg">
                                        {r.amount} {ing?.unit || "гр"}
                                      </span>
                                      <span className="h-5 w-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-black shrink-0">
                                        +
                                      </span>
                                    </div>
                                  );
                                }

                                // ⚪ Б. ЭНГИЙН ҮЕД: ГРАММ ЗАСАХ [✓] БАТЛАХ ТОBЧТОЙ ХУВИЛБАР (ШИНЭ КАРТ ҮҮСГЭНЭ)
                                return (
                                  <div
                                    key={r.id}
                                    className={`bg-slate-900/90 border px-3 py-1.5 rounded-2xl text-sm flex items-center gap-2 transition shadow-sm ${
                                      isDrafting ? "border-amber-400 bg-slate-950" : "border-slate-800 hover:border-slate-700"
                                    }`}
                                  >
                                    <span className="text-slate-200 font-bold">{ing?.name || "Орц"}</span>

                                    {/* Грамм бичих талбар */}
                                    <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-purple-500/40">
                                      <input
                                        type="number"
                                        value={draftVal !== undefined ? draftVal : r.amount}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => {
                                          setRecipeDrafts({ ...recipeDrafts, [r.id]: e.target.value });
                                        }}
                                        onKeyDown={async (e) => {
                                          if (e.key === "Enter") {
                                            const val = parseFloat(draftVal);
                                            if (!isNaN(val) && val > 0) {
                                              await supabase.from("recipes").update({ amount: val }).eq("id", r.id);
                                              // 👈 ГРАММ ӨӨРЧЛӨГДӨХӨД ШИНЭ ТҮҮХ/КАРТ ҮҮСГЭХ:
                                              await createSnapshotFromDb(pName, 'updated');
                                              setRecipeDrafts(prev => { const n = { ...prev }; delete n[r.id]; return n; });
                                              fetchDatabaseData(activeClient);
                                            }
                                          }
                                        }}
                                        className="w-14 bg-transparent text-center text-purple-200 font-mono font-black text-sm outline-none"
                                      />
                                      <span className="text-xs text-slate-400 font-semibold">{ing?.unit || "гр"}</span>
                                    </div>

                                    {/* 👈 БУЦААЖ НЭМСЭН [✓ БАТЛАХ] & [✕ БОЛИУЛАХ] ТОВЧНУУД */}
                                    {isDrafting && (
                                      <div className="flex items-center gap-1 animate-in fade-in duration-100">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const val = parseFloat(draftVal);
                                            if (!isNaN(val) && val > 0) {
                                              await supabase.from("recipes").update({ amount: val }).eq("id", r.id);
                                              // 👈 ДАРСАН ДАРУЙД ШИНЭ ТҮҮХ/КАРТ ҮҮСГЭНЭ:
                                              await createSnapshotFromDb(pName, 'updated');
                                              setRecipeDrafts(prev => { const n = { ...prev }; delete n[r.id]; return n; });
                                              fetchDatabaseData(activeClient);
                                            }
                                          }}
                                          className="h-7 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs transition active:scale-95 shadow cursor-pointer flex items-center justify-center"
                                          title="Хадгалах"
                                        >
                                          ✓
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRecipeDrafts(prev => { const n = { ...prev }; delete n[r.id]; return n; });
                                          }}
                                          className="h-7 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center"
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
                                        if (!confirm(`"${pName}"-ийн жороос "${ing?.name}" орцыг хасах уу?`)) return;
                                        await supabase.from("recipes").delete().eq("id", r.id);
                                        // 👈 ОРЦ УСТГАХАД ШИНЭ ТҮҮХ ҮҮСГЭХ:
                                        await createSnapshotFromDb(pName, 'updated');
                                        fetchDatabaseData(activeClient);
                                      }}
                                      className="text-slate-500 hover:text-rose-400 p-0.5 text-xs transition cursor-pointer ml-1"
                                      title="Орц хасах"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                );
                              })}

                              {/* + Орц нэмэх товч */}
                              {inlineAddRecipeProduct === pName ? (
                                <div className="flex items-center gap-1.5 bg-purple-950/60 border border-purple-500/60 p-1 rounded-2xl">
                                  <select
                                    value={inlineRecipeDraft.ingredient_id}
                                    onChange={(e) => setInlineRecipeDraft({ ...inlineRecipeDraft, ingredient_id: e.target.value })}
                                    className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white outline-none"
                                  >
                                    <option value="">-- Түүхий эд --</option>
                                    {ingredients.map((i) => (
                                      <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    placeholder="Тоо..."
                                    value={inlineRecipeDraft.amount}
                                    onChange={(e) => setInlineRecipeDraft({ ...inlineRecipeDraft, amount: e.target.value })}
                                    className="w-16 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white outline-none font-mono"
                                  />
                                  <button
                                    type="button"
                                    disabled={!inlineRecipeDraft.ingredient_id || !inlineRecipeDraft.amount}
                                    onClick={async () => {
                                      await supabase.from("recipes").insert([{
                                        client_id: activeClient,
                                        product_name: pName,
                                        ingredient_id: inlineRecipeDraft.ingredient_id,
                                        amount: parseFloat(inlineRecipeDraft.amount) || 0,
                                      }]);
                                      await recordRecipeSnapshot(pName, 'updated');
                                      setInlineAddRecipeProduct(null);
                                      setInlineRecipeDraft({ ingredient_id: "", amount: "" });
                                      fetchDatabaseData(activeClient);
                                    }}
                                    className="h-7 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setInlineAddRecipeProduct(null)}
                                    className="h-7 px-2 bg-slate-800 text-slate-400 rounded-xl text-xs"
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
                                  className="h-7 px-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-2xl text-xs font-bold transition flex items-center gap-1"
                                >
                                  <span>+ Орц нэмэх</span>
                                </button>
                              )}

                              {/* Бүхэл жорыг устгах */}
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!confirm(`"${pName}" бүтээгдэхүүний бүх жорыг устгах уу?`)) return;
                                  await recordRecipeSnapshot(pName, 'deleted');
                                  await supabase.from("recipes").delete().eq("client_id", activeClient).eq("product_name", pName);
                                  fetchDatabaseData(activeClient);
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
                </div>);
              })()}
              
            </div>
            {/* ========================================================================= */}
            {/* ➕ 1. ШИНЭ ТҮҮХИЙ ЭД НЭМЭХ МОДАЛ                                           */}
            {/* ========================================================================= */}
            {showAddIngModal && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#0F172A] border border-slate-700 p-5 rounded-3xl max-w-sm w-full space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-black text-white">
                      + Шинэ Түүхий эд нэмэх
                    </h3>
                    <button
                      onClick={() => setShowAddIngModal(false)}
                      className="text-slate-400 hover:text-white text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newIngForm.name}
                    onChange={(e) =>
                      setNewIngForm({ ...newIngForm, name: e.target.value })
                    }
                    placeholder="Түүхий эдийн нэр (Жишээ: Овьёосны сүү)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newIngForm.unit}
                      onChange={(e) =>
                        setNewIngForm({ ...newIngForm, unit: e.target.value })
                      }
                      placeholder="Нэгж (мл/гр/ш)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none"
                    />
                    <input
                      type="number"
                      value={newIngForm.price}
                      onChange={(e) =>
                        setNewIngForm({ ...newIngForm, price: e.target.value })
                      }
                      placeholder="Нэгжийн өртөг ₮"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newIngForm.name.trim()) return;
                      const { data } = await supabase
                        .from("ingredients")
                        .insert([
                          {
                            client_id: activeClient,
                            name: newIngForm.name.trim(),
                            unit: newIngForm.unit || "гр",
                            unit_price: parseFloat(newIngForm.price) || 0,
                            par_level: parseFloat(newIngForm.par) || 0,
                            current_stock: 0,
                          },
                        ])
                        .select()
                        .single();
                      if (data) setIngredients((prev) => [...prev, data]);
                      setShowAddIngModal(false);
                      setNewIngForm({
                        name: "",
                        unit: "гр",
                        price: "",
                        par: "0",
                      });
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-sm transition"
                  >
                    Хадгалах
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ➕ 2. ШИНЭ МЕНЮНИЙ ЦЭС НЭМЭХ МОДАЛ                                         */}
            {/* ========================================================================= */}
            {showAddProdModal && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#0F172A] border border-slate-700 p-5 rounded-3xl max-w-sm w-full space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-black text-white">
                      + Шинэ Менюний Цэс нэмэх
                    </h3>
                    <button
                      onClick={() => setShowAddProdModal(false)}
                      className="text-slate-400 hover:text-white text-sm"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none"
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
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 rounded-xl text-sm transition"
                  >
                    Цэсэнд Нэмэх
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ➕ 3. ШИНЭ ЖОР УГСРАХ МОДАЛ                                                */}
            {/* ========================================================================= */}

            {showAddRecipeModal && (
              <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150">
                <div className="bg-[#0F172A] border border-slate-700 p-5 rounded-3xl max-w-md w-full space-y-4 max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-black text-white">
                      📖 Бүрэн Жор Угсрах & Маржин Бодох
                    </h3>
                    <button
                      onClick={() => setShowAddRecipeModal(false)}
                      className="text-slate-400 hover:text-white text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 1. Бүтээгдэхүүний мэдээлэл ба Зарах үнэ */}
                  <div className="space-y-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
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
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-bold outline-none focus:border-purple-500"
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
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-sm text-slate-300 outline-none"
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
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-sm text-emerald-400 font-mono font-bold outline-none"
                      />
                    </div>
                  </div>

                  {/* 2. Олон орц нэмэх хэсэг (Орц 1, Орц 2, Орц 3...) */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-400">
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
                        className="text-xs font-black text-purple-400 hover:text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20"
                      >
                        + Орц нэмэх
                      </button>
                    </div>

                    {recipeBuilder.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex gap-2 items-center bg-slate-950 p-2 rounded-xl border border-slate-800"
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
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-white outline-none"
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
                          className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-sm text-white font-mono outline-none"
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
                      const ing = ingredients.find(
                        (i) => i.id === it.ingredient_id,
                      );
                      const uPrice = ing ? parseFloat(ing.unit_price) || 0 : 0;
                      totalCost += (parseFloat(it.amount) || 0) * uPrice;
                    });

                    const sellP = parseFloat(recipeBuilder.selling_price) || 0;
                    const margin =
                      sellP > 0 ? ((sellP - totalCost) / sellP) * 100 : 0;

                    return (
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-sm font-mono">
                        <div>
                          <span className="text-slate-500 block text-xs">
                            Нэг аяганы өртөг:
                          </span>
                          <span className="text-rose-400 font-bold text-sm">
                            {Math.round(totalCost).toLocaleString()} ₮
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 block text-xs">
                            Бохир ашиг:
                          </span>
                          <span
                            className={`font-black text-sm ${margin >= 75 ? "text-emerald-400" : margin >= 60 ? "text-amber-400" : "text-rose-400"}`}
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
                        .filter(
                          (it) => it.ingredient_id && parseFloat(it.amount) > 0,
                        )
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
                      fetchDatabaseData(activeClient);
                      alert(
                        `✅ "${pName}" бүтээгдэхүүний жор болон зарах үнэ амжилттай хадгалагдлаа!`,
                      );
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black py-3 rounded-xl text-sm transition"
                  >
                    Бүтээгдэхүүн & Жорыг Хадгалах
                  </button>
                </div>
              </div>
            )}
            {/* ✏️ ТҮҮХИЙ ЭД БҮРЭН ЗАСАХ МОДАЛ */}
            {editingIngredient && (
              <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#0F172A] border border-slate-700 p-5 rounded-3xl max-w-sm w-full space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-black text-white">
                      ✏️ Түүхий эд засах
                    </h3>
                    <button
                      onClick={() => setEditingIngredient(null)}
                      className="text-slate-400 hover:text-white text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Барааны нэр:
                    </label>
                    <input
                      type="text"
                      value={editingIngredient.name}
                      onChange={(e) =>
                        setEditingIngredient({
                          ...editingIngredient,
                          name: e.target.value,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-sm text-white outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Нэгж (мл, гр, ш):
                      </label>
                      <input
                        type="text"
                        value={editingIngredient.unit}
                        onChange={(e) =>
                          setEditingIngredient({
                            ...editingIngredient,
                            unit: e.target.value,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-sm text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Нэгжийн өртөг (₮):
                      </label>
                      <input
                        type="number"
                        value={editingIngredient.unit_price}
                        onChange={(e) =>
                          setEditingIngredient({
                            ...editingIngredient,
                            unit_price: e.target.value,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-sm text-emerald-400 font-mono font-bold outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Хэвийн нөөц (PAR):
                    </label>
                    <input
                      type="number"
                      value={editingIngredient.par_level}
                      onChange={(e) =>
                        setEditingIngredient({
                          ...editingIngredient,
                          par_level: e.target.value,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-sm text-white outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const { error } = await supabase
                        .from("ingredients")
                        .update({
                          name: editingIngredient.name,
                          unit: editingIngredient.unit,
                          unit_price:
                            parseFloat(editingIngredient.unit_price) || 0,
                          par_level:
                            parseFloat(editingIngredient.par_level) || 0,
                        })
                        .eq("id", editingIngredient.id);

                      if (error) alert(error.message);
                      else {
                        setIngredients((prev) =>
                          prev.map((i) =>
                            i.id === editingIngredient.id
                              ? editingIngredient
                              : i,
                          ),
                        );
                        setEditingIngredient(null);
                        fetchDatabaseData(activeClient);
                      }
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-sm transition"
                  >
                    Хадгалах
                  </button>
                </div>
              </div>
            )}
            {/* ✏️ МЕНЮ БҮТЭЭГДЭХҮҮН ЗАСАХ МОДАЛ (Нэр болон Зарах үнийг хамтад нь засна) */}
            {editingProduct && (
              <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#0F172A] border border-slate-700 p-5 rounded-3xl max-w-sm w-full space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-black text-white">
                      ✏️ Цэс засах
                    </h3>
                    <button
                      onClick={() => setEditingProduct(null)}
                      className="text-slate-400 hover:text-white text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none focus:border-blue-500 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-300 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-emerald-400 font-mono font-bold outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
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

                      setLoading(false);
                      setEditingProduct(null);
                      fetchDatabaseData(activeClient);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 rounded-xl text-sm transition"
                  >
                    Хадгалах
                  </button>
                </div>
              </div>
            )}

            {/* ➕ Тухайн бүтээгдэхүүнд шуурхай орц нэмэх жижиг цонх */}
            {addIngToRecipeProduct && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#0F172A] border border-slate-700 p-5 rounded-3xl max-w-sm w-full space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-black text-white">
                      +{" "}
                      <span className="text-purple-400">
                        {addIngToRecipeProduct}
                      </span>
                      -д орц нэмэх
                    </h3>
                    <button
                      onClick={() => setAddIngToRecipeProduct(null)}
                      className="text-slate-400 hover:text-white text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <select
                    value={quickIngId}
                    onChange={(e) => setQuickIngId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white outline-none"
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
                      fetchDatabaseData(activeClient);
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black py-2.5 rounded-xl text-sm transition"
                  >
                    Орцыг Жорд Нэмэх
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
        {/* 🤖 ШИНЭ ЦЭСНИЙ АНГИЛАЛЫГ ХҮНЭЭР БАТЛУУЛАХ ЦОНХ (HUMAN-IN-THE-LOOP)        */}
        {/* ========================================================================= */}
     
{pendingCategoryReview && catalogTab === 'products' && (
  <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150">
    <div className="bg-[#0d1527] border border-slate-700 rounded-3xl p-5 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
      
      {/* Толгой хэсэг */}
      <div className="flex justify-between items-start border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <span>✨ Шинэ цэсүүдийг ангилах</span>
          </h3>
          <p className="text-xs text-amber-300 font-bold mt-1 leading-relaxed bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl">
            ℹ️ Шинээр орж ирсэн {pendingCategoryReview.productsToReview.length} цэсийн ангиллыг шалгаад баталгаажуулна уу.
          </p>
        </div>
        {/* ❌ 1. ЦУЦЛАХ ТОВЧ (SessionStorage-оос устгаж цонхыг хаана): */}
        <button
          type="button"
          onClick={() => updatePendingReview(null)}
          className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-xs font-bold text-slate-300 cursor-pointer"
          title="Цуцлах"
        >
          ✕ Цуцлах
        </button>
      </div>

      {/* Жагсаалт */}
      <div className="flex-1 overflow-y-auto pr-1">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-950 text-slate-400 uppercase font-bold sticky top-0 border-b border-slate-800 z-10 text-[10px]">
            <tr>
              <th className="py-2.5 px-3">Шинэ Цэсний Нэр</th>
              <th className="py-2.5 px-3">Ухаалаг Ангилал</th>
              <th className="py-2.5 px-3 text-right">Яаж таньсан бэ?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
            {pendingCategoryReview.productsToReview.map((item:any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-900/40">
                <td className="py-3 px-3 font-bold text-white text-sm">
                  {item.name}
                  <span className="block text-[10px] text-slate-500 font-mono mt-0.5">Үнэ: {item.price.toLocaleString()}₮</span>
                </td>
                <td className="py-3 px-3">
                  <select
                    value={item.category}
                    disabled={pendingCategoryReview.isProcessing}
                    onChange={(e) => {
                      const updated = [...pendingCategoryReview.productsToReview];
                      updated[idx].category = e.target.value;
                      updated[idx].method = "👤 Гараар зассан";
                      updatePendingReview({ ...pendingCategoryReview, productsToReview: updated });
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-200 outline-none cursor-pointer w-full max-w-[160px]"
                  >
                    {UNIVERSAL_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                    item.method.includes('Толь бичиг') ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                    item.method.includes('AI') && !item.isUnknown ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                    item.method.includes('Гараар') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                  }`}>
                    {item.method}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ 2. БАТЛАХ ТОВЧ (Баазад хадгалж, learned_categories-ийг дүүргэнэ): */}
      <button
        type="button"
        disabled={pendingCategoryReview.isProcessing}
        onClick={async () => {
          updatePendingReview({ ...pendingCategoryReview, isProcessing: true });
          await commitFinalSales(
            [], // Борлуулалт аль хэдийнэ хадгалагдсан тул хоосон
            pendingCategoryReview.productsToReview, // Шинэ цэс ба ангилал хадгалагдана
            [],
            []
          );
        }}
        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black py-3.5 rounded-2xl text-xs transition shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2"
      >
        {pendingCategoryReview.isProcessing ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>Баазад хадгалж байна...</span>
          </>
        ) : (
          '✅ БҮГД ЗӨВ, БАТЛАХ & ХАДГАЛАХ'
        )}
      </button>
    </div>
  </div>
)}      

            

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
            
              {/* 1. КАСС, БАНК БА ТАТВАРЫН ЭХНИЙ ТОХИРГОО */}
              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800">
                  
                <h3 className="text-base font-bold mb-4 text-emerald-400 flex items-center gap-2">
                  🏦 1. Мөнгөн Данс & Татварын Горим
                </h3>

                  {/* 🖼️ KIOSK ТӨХӨӨРӨМЖИЙН ЛОГО (Авсаархан, дизайн эвдэхгүй) */}
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Kiosk таблетын лого
                    </label>
                    <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 mb-1.5">
                      {kioskLogoUrl ? (
                        <img 
                          src={kioskLogoUrl} 
                          alt="Kiosk Logo" 
                          className="h-10 w-10 rounded-xl object-cover border border-slate-700 shrink-0" 
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                          <Coffee className="h-5 w-5" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                   <input 
  type="file" 
  accept="image/*" 
  id="kiosk-logo-upload"
  className="hidden"
          onChange={async (e) => {
            if (!e.target.files?.[0]) return;
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `logos/${activeClient}_${Date.now()}.${fileExt}`;

            // 1. Storage руу зургийг хуулах
            const { error: upErr } = await supabase.storage
              .from('receipts_evidence')
              .upload(fileName, file, { upsert: true });

            if (upErr) {
              alert("Зураг оруулахад алдаа: " + upErr.message);
              return;
            }

            // 2. Storage-аас нийтэд харагдах URL (Public URL) авах
            const { data: publicUrlData } = supabase.storage
              .from('receipts_evidence')
              .getPublicUrl(fileName);

            const newLogoUrl = publicUrlData.publicUrl;

            // 3. ⚡ ШУУД БААЗАД ХАДГАЛАХ (Үлдэгдэл товч дарахыг хүлээхгүй!)
            const { error: dbErr } = await supabase
              .from('client_settings')
              .update({ logo_url: newLogoUrl, updated_at: new Date().toISOString() })
              .eq('client_id', activeClient);

            if (dbErr) {
              alert("Баазад хадгалахад алдаа гарлаа: " + dbErr.message);
            } else {
              setKioskLogoUrl(newLogoUrl); // Дэлгэц дээрх зургийг тэр дор нь солих
              alert("✅ Лого амжилттай солигдлоо! Kiosk дээр шууд харагдана.");
              fetchDatabaseData(activeClient);
            }
          }}
        />
                        <label 
                          htmlFor="kiosk-logo-upload"
                          className="inline-block bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-1 px-2.5 rounded-lg cursor-pointer transition border border-slate-700"
                        >
                          Зураг солих
                        </label>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">Зөвхөн Kiosk таблет дээр харагдана</p>
                      </div>
                    </div>
                  </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setLoading(true);
                    const { error } = await supabase
                      .from("client_settings")
                      .upsert({
                        client_id: activeClient,
                        initial_cash: parseFloat(initialCash) || 0,
                        initial_bank: parseFloat(initialBank) || 0,
                        tax_mode: taxMode,
                        logo_url: kioskLogoUrl,
                        updated_at: new Date().toISOString(),
                      });
                    if (error) alert(`Алдаа: ${error.message}`);
                    else
                      alert("Салбарын эхний үлдэгдэл амжилттай хадгалагдлаа!");
                    await fetchDatabaseData(activeClient);
                    setLoading(false);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-1">
                      Кассын эхний бэлэн мөнгө (₮)
                    </label>
                    <input
                      type="number"
                      value={initialCash}
                      onChange={(e) => setInitialCash(e.target.value)}
                      placeholder="Жнь: 200000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-1">
                      Банкны дансны эхний үлдэгдэл (₮)
                    </label>
                    <input
                      type="number"
                      value={initialBank}
                      onChange={(e) => setInitialBank(e.target.value)}
                      placeholder="Жнь: 5000000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-1">
                      Татварын тооцоолох горим
                    </label>
                    <select
                      value={taxMode}
                      onChange={(e) => setTaxMode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-emerald-400 text-sm font-bold"
                    >
                      <option value="auto">
                        ⚡ Автомат (300 сая хүртэл 1%, давбал 10%)
                      </option>
                      <option value="simplified_1pct">
                        🟢 Зөвхөн Хялбаршуулсан 1% (Орлогоос)
                      </option>
                      <option value="standard_10pct">
                        🔴 Энгийн 10% (Цэвэр ашгаас + НӨАТ)
                      </option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition text-sm"
                  >
                    Үлдэгдэл Хадгалах
                  </button>
                </form>
              </div>
                
              {/* 2. ТОГТМОЛ ЗАРДАЛ (OPEX) НЭМЭХ/УСТГАХ */}
              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 lg:col-span-2">
                <h3 className="text-base font-bold mb-4 text-blue-400 flex items-center gap-2">
                  🏢 2. Сар бүрийн Тогтмол Зардал (Түрээс, Тог, Агааржуулалт,
                  Хий)
                </h3>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newOpexName.trim() || !newOpexCost) return;
                    setLoading(true);
                    await supabase.from("fixed_opex").insert([
                      {
                        client_id: activeClient,
                        name: newOpexName.trim(),
                        category: newOpexCategory,
                        monthly_cost: parseFloat(newOpexCost) || 0,
                        is_active: true,
                      },
                    ]);
                    setNewOpexName("");
                    setNewOpexCost("");
                    await fetchDatabaseData(activeClient);
                    setLoading(false);
                  }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4"
                >
                  <input
                    type="text"
                    required
                    value={newOpexName}
                    onChange={(e) => setNewOpexName(e.target.value)}
                    placeholder="Зардлын нэр (Жнь: Түрээс, Хий/Газ)"
                    className="sm:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-bold"
                  />
                  <input
                    type="number"
                    required
                    value={newOpexCost}
                    onChange={(e) => setNewOpexCost(e.target.value)}
                    placeholder="Сарын дүн (₮)"
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-bold"
                  />
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold py-2 rounded-xl text-sm"
                  >
                    + Зардал Нэмэх
                  </button>
                </form>

                <div className="overflow-x-auto max-h-[220px]">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="pb-2">Зардлын нэр</th>
                        <th className="pb-2 text-right">Сарын дүн (₮)</th>
                        <th className="pb-2 text-right">Үйлдэл</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {fixedOpexList.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="py-4 text-center text-slate-500 italic"
                          >
                            Тогтмол зардал оруулаагүй байна (Түрээс, тог г.м
                            нэмнэ үү).
                          </td>
                        </tr>
                      ) : (
                        fixedOpexList.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2.5 font-bold text-slate-200">
                              {item.name}
                            </td>
                            <td className="py-2.5 text-right font-black text-slate-100">
                              {parseFloat(item.monthly_cost).toLocaleString()} ₮
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={async () => {
                                  await supabase
                                    .from("fixed_opex")
                                    .delete()
                                    .eq("id", item.id);
                                  fetchDatabaseData(activeClient);
                                }}
                                className="text-rose-400 hover:text-rose-300 font-bold text-sm"
                              >
                                Устгах
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 3. ҮНДСЭН ХӨРӨНГӨ (ТОНОГ ТӨХӨӨРӨМЖ, ШАРАХ ШҮҮГЭЭ, КОФЕ МАШИН) */}
            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800">
              <h3 className="text-base font-bold mb-4 text-purple-400 flex items-center gap-2">
                🍳 3. Үндсэн Хөрөнгө & Тоног Төхөөрөмжийн Бүртгэл (Элэгдэл
                тооцоо)
              </h3>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newAssetName.trim() || !newAssetCost) return;
                  setLoading(true);
                  await supabase.from("fixed_assets").insert([
                    {
                      client_id: activeClient,
                      name: newAssetName.trim(),
                      initial_cost: parseFloat(newAssetCost) || 0,
                      useful_months: parseInt(newAssetMonths) || 60,
                      purchase_date: newAssetDate,
                    },
                  ]);
                  setNewAssetName("");
                  setNewAssetCost("");
                  await fetchDatabaseData(activeClient);
                  setLoading(false);
                }}
                className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-6"
              >
                <input
                  type="text"
                  required
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  placeholder="Хөрөнгийн нэр (Жнь: Rational зуух, Плитка, Хөргүүр)"
                  className="sm:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-bold"
                />
                <input
                  type="number"
                  required
                  value={newAssetCost}
                  onChange={(e) => setNewAssetCost(e.target.value)}
                  placeholder="Анхны өртөг (₮)"
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-bold"
                />
                <input
                  type="number"
                  value={newAssetMonths}
                  onChange={(e) => setNewAssetMonths(e.target.value)}
                  placeholder="Ашиглах сар (Жнь: 60)"
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-bold"
                />
                <button
                  type="submit"
                  className="bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold py-2 rounded-xl text-sm"
                >
                  + Хөрөнгө Нэмэх
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="pb-2">Хөрөнгийн нэр</th>
                      <th className="pb-2 text-right">Анхны өртөг</th>
                      <th className="pb-2 text-center">Ашиглах сар</th>
                      <th className="pb-2 text-right">Сарын элэгдэл</th>
                      <th className="pb-2 text-right">Үйлдэл</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {fixedAssets.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-6 text-center text-slate-500 italic"
                        >
                          Бүртгэлтэй үндсэн хөрөнгө байхгүй байна.
                        </td>
                      </tr>
                    ) : (
                      fixedAssets.map((fa) => {
                        const cost = parseFloat(fa.initial_cost) || 0;
                        const months = parseInt(fa.useful_months) || 60;
                        const monthly =
                          months > 0 ? Math.round(cost / months) : 0;
                        return (
                          <tr key={fa.id}>
                            <td className="py-2.5 font-bold text-slate-200">
                              {fa.name}
                            </td>
                            <td className="py-2.5 text-right text-slate-300">
                              {cost.toLocaleString()} ₮
                            </td>
                            <td className="py-2.5 text-center text-slate-400">
                              {months} сар ({(months / 12).toFixed(1)} жил)
                            </td>
                            <td className="py-2.5 text-right font-black text-purple-400">
                              {monthly.toLocaleString()} ₮/сар
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={async () => {
                                  await supabase
                                    .from("fixed_assets")
                                    .delete()
                                    .eq("id", fa.id);
                                  fetchDatabaseData(activeClient);
                                }}
                                className="text-rose-400 hover:text-rose-300 font-bold"
                              >
                                Устгах
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* 🎯 4. АНГИЛЛЫН АШГИЙН МАРЖИНГИЙН БОДЛОГО (TARGET MARGINS) */}
                <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 shadow-xl mt-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
                        <span>🎯 4. Ангиллын Ашгийн Маржингийн Бодлого (Target Margins)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Ангилал тус бүрийн хүрэх ёстой зорилтот бохир ашгийн % (Gross Margin). Түүхий эд өсөхөд систем энэ хувиар автоматаар зөвлөх зарах үнийг бодно.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleSaveCategoryMargins}
                      className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition active:scale-95 shadow cursor-pointer shrink-0"
                    >
                      💾 Маржингийн Бодлого Хадгалах
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                    {UNIVERSAL_CATEGORIES.map((cat) => {
                      const currentVal = categoryMargins[cat.id] ?? DEFAULT_GLOBAL_MARGINS[cat.id] ?? 70;
                      const isCustomized = categoryMargins[cat.id] !== undefined && categoryMargins[cat.id] !== DEFAULT_GLOBAL_MARGINS[cat.id];

                      return (
                        <div key={cat.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{cat.icon}</span>
                              <span>{cat.name.replace(/^[^\s]+\s/, '')}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Стандарт: {DEFAULT_GLOBAL_MARGINS[cat.id]}%
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min={20}
                                max={95}
                                value={currentVal}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setCategoryMargins(prev => ({ ...prev, [cat.id]: val }));
                                }}
                                className="w-full bg-[#0B1120] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-sm text-white font-mono font-black outline-none"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-amber-400 font-mono">%</span>
                            </div>

                            {isCustomized && (
                              <button
                                type="button"
                                onClick={() => setCategoryMargins(prev => ({ ...prev, [cat.id]: DEFAULT_GLOBAL_MARGINS[cat.id] }))}
                                className="text-[10px] text-slate-400 hover:text-white bg-slate-800 px-2 py-2 rounded-xl border border-slate-700"
                                title="Стандарт руу буцаах"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                          
                          <p className="text-[10px] text-slate-500 font-mono">
                            Зорилтот өртөг (Food Cost): <strong>{(100 - currentVal).toFixed(0)}%</strong>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
          </div>
    </>
  );
}