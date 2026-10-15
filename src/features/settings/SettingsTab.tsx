// src/features/settings/SettingsTab.tsx
"use client";
import React, { useState, startTransition } from "react";
import { Coffee, Database, Save, AlertTriangle, Layers3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { AutoPilotChange } from "@/types/dashboard";
import RecipeEditor from "../recipes/RecipeEditor";
import GeneralSettings from "./GeneralSettings";
import IngredientsPanel from "../ingredients/IngredientsPanel";
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
  handleExportRecipeBackup,
  handleExportToExcel,
  handleJsonFileSelect,
  pendingCategoryReview,
  updatePendingReview,
  commitFinalSales, 
}: SettingsTabProps) {


  // Каталогийн дотоод төлөвүүд (ingSearch, menuSearch, recipeSearch, catalogTab, ноорог нэмэх state-үүд энд байрлана)
  const [catalogTab, setCatalogTab] = useState<"ingredients" | "products" | "recipes">("ingredients");
  // 🎯 Мастер Каталог: Checkbox олноор сонгох & Шинээр нэмэх State-үүд

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
   
   
         
            const [menuSearch, setMenuSearch] = useState("");
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
           
            const [showAddProdModal, setShowAddProdModal] = useState(false);
            const [newProdForm, setNewProdForm] = useState({
                name: "",
                category: "COFFEE",
                price: "",
            });
       
      
         
            const [editingProduct, setEditingProduct] = useState<any | null>(null);

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
                 <IngredientsPanel activeClient={activeClient} />
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
                return (
               <RecipeEditor
               activeClient = {activeClient}
               ingredients = {ingredients}
               productsList = {productsList}
               aliasMap = {aliasMap}
               />
                );
             
             })()}
              
            </div>
    

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

            

           <GeneralSettings activeClient={activeClient} />
           
          </div>
    </>
  );
}