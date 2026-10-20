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
import ProductsPanel from "../products/ProductsPanel";
import { useIngredients } from "../ingredients/useIngredients";
import { useProducts } from "../products/useProducts";
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

  recipes: any[];
  setRecipes: React.Dispatch<React.SetStateAction<any[]>>;
  salesLogs?: any[];       
  learnedMenus?: any[];
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
  salesLogs = [],   
  learnedMenus = [],
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

    const { ingredients, setIngredients } = useIngredients(activeClient);
    const {productsList, setProductsList } = useProducts(activeClient);
              const [targetRecipeDraft, setTargetRecipeDraft] = useState<{ name: string; price: string } | null>(null);
        
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
                 <IngredientsPanel activeClient={activeClient} 
                  ingredients={ingredients}       
                   setIngredients={setIngredients}  
                 />
                    
              )}

              {/* ========================================================================= */}
              {/* 2. ☕ МЕНЮ & ЗАРАХ ҮНЭ (ХҮСНЭГТ ДОТРОО ШУУД НЭМЭХ & ШУУД ЗАСАХ)            */}
              {/* ========================================================================= */}
              {catalogTab === "products" && (
              <ProductsPanel
              activeClient={activeClient}
              recipes={recipes}
              salesLogs={salesLogs}
              learnedMenus={learnedMenus}
              onStartRecipe={(name: string, price: string) => {
              setTargetRecipeDraft({ name, price }); 
              setCatalogTab("recipes");   
               
            }}
              productsList = {productsList}
              setProductsList = {setProductsList}     
         
  />
              )}

              {/* ========================================================================= */}
              {/* 3. 📖 ЖОР (САДААГҮЙ, САНАМСАРГҮЙ ЗАСАГДАХААС ХАМГААЛАГДСАН ШУУД ӨӨРЧЛӨЛТ) */}
              {/* ========================================================================= */}
               {catalogTab === "recipes" && (() => {
                return (
              <RecipeEditor 
              activeClient={activeClient}
              ingredients={ingredients}
              productsList={productsList}
              initialDraft={targetRecipeDraft} // 👈 Тэр цээжилсэн нэр, үнээ RecipeEditor руу өгнө
              onDraftCleared={() => setTargetRecipeDraft(null)}
              setProductsList = {setProductsList}
            />
                );
             
             })()}
              
            </div>
    

          

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