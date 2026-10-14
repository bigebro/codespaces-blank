// src/features/imports/ImportTab.tsx
"use client";
import React, { useState } from "react";
import { FileSpreadsheet, Check, UploadCloud, Trash2, Coffee } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { autoCategorizeProduct, evaluateSaleItem, sanitizeName, transliterate } from "@/lib/autoReconcile";
import { AutoPilotChange } from "@/types/dashboard";
interface ImportTabProps {
  activeClient: string;
  startDate: string;
  endDate: string;
  ingredients: any[];
  salesLogs: any[];
  inventoryLogs: any[];
  productsList: any[];
  setProductsList: React.Dispatch<React.SetStateAction<any[]>>;
  learnedMenus: any[];
  learnedCategories: any[];
  userRole: string;
  user: any;
  loading: boolean;
  setLoading: (l: boolean) => void;
  fetchDatabaseData: (client?: string) => Promise<void>;
  setAutoPilotActivity: React.Dispatch<React.SetStateAction<any>>;
  updatePendingReview: (val: any) => void;
}

export default function ImportTab({
  activeClient,
  startDate,
  endDate,
  ingredients,
  salesLogs,
  inventoryLogs,
  productsList,
  setProductsList,
  learnedMenus,
  learnedCategories,
  userRole,
  user,
  loading,
  setLoading,
  fetchDatabaseData,
  setAutoPilotActivity,
  updatePendingReview,
}: ImportTabProps) {
  
const [salesPasteText, setSalesPasteText] = useState("");
const [purchasePasteText, setPurchasePasteText] = useState("");
const [inventoryPasteText, setInventoryPasteText] = useState("");
const [kitchenPasteText, setKitchenPasteText] = useState(""); 
const [ingredientsPasteText, setIngredientsPasteText] = useState("");
const [recipesPasteText, setRecipesPasteText] = useState("");
const [productsPasteText, setProductsPasteText] = useState("");
const [overwriteSales, setOverwriteSales] = useState(false);
const [overwritePurchases, setOverwritePurchases] = useState(false);
const [purchaseImportSuccess, setPurchaseImportSuccess] = useState(false);
const [recipesImportSuccess, setRecipesImportSuccess] = useState(false);
const [salesImportSuccess, setSalesImportSuccess] = useState(false);
const [ingredientsImportSuccess, setIngredientsImportSuccess] = useState(false);
const [productsImportSuccess, setProductsImportSuccess] = useState(false);
const [inventoryImportSuccess, setInventoryImportSuccess] = useState(false);
const [overwriteAudit, setOverwriteAudit] = useState(false);
const [kitchenImportSuccess, setKitchenImportSuccess] = useState(false); 
const [overwriteKitchen, setOverwriteKitchen] = useState(false);
const [auditDate, setAuditDate] = useState("2026-09-01");
const [auditType, setAuditType] = useState<"start" | "end">("start");
const [activeSampleModal, setActiveSampleModal] = useState<string | null>(null,);


const existingKitchenCount = inventoryLogs.filter((l) => {
    if (
      !l.date ||
      l.client_id !== activeClient ||
      !["spoilage", "staff_meal", "testing", "other"].includes(l.type)
    )
      return false;
    const d = l.date.split("T")[0];
    return d >= startDate && d <= endDate;
  }).length;
const existingPurchases = inventoryLogs.filter((l) => {
    if (!l.date || l.client_id !== activeClient || l.type !== "purchase")
      return false;
    const d = l.date.split("T")[0];
    return d >= startDate && d <= endDate;
  });
const existingPurchasesCost = existingPurchases.reduce(
    (sum, l) => sum + (parseFloat(l.total_cost) || 0),
    0,
  );
const cleanNameForMatch = (str: string) => {
    return str
      .replace(/[\r\n\u00a0"'\.]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };
// 🌍 УНИВЕРСАЛ 6 АНГИЛАЛ (ЭМОЖИ БА ӨНГӨТЭЙ)
const UNIVERSAL_CATEGORIES = [
  { id: 'HOT_BEVERAGE', name: '☕ Халуун ундаа', icon: '☕', color: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
  { id: 'COLD_BEVERAGE', name: '🍹 Хүйтэн ундаа', icon: '🍹', color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30' },
  { id: 'FOOD_PREP', name: '🍳 Хоол & Зууш', icon: '🍳', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'BAKERY_DESSERT', name: '🥐 Бэйкэри & Десерт', icon: '🥐', color: 'text-purple-300 bg-purple-500/10 border-purple-500/30' },
  { id: 'RETAIL_FMCG', name: '🥤 Бэлэн бараа (Лааз/Сав)', icon: '🥤', color: 'text-blue-300 bg-blue-500/10 border-blue-500/30' },
  { id: 'GENERAL', name: '📦 Бусад', icon: '📦', color: 'text-slate-300 bg-slate-800 border-slate-700' }
];

 // Сонгосон огноон дахь бодит төлөвүүдийг тоолох (Status Badges)
  const existingSales = salesLogs.filter((s) => {
    if (!s.date || s.client_id !== activeClient) return false;
    const d = s.date.split("T")[0];
    return d >= startDate && d <= endDate;
  });

    const existingSalesRevenue = existingSales.reduce(
    (sum, s) => sum + (parseFloat(s.total_revenue) || 0),
    0,
  );

const aliasMap: Record<string, string> = {};
// 🇲🇳 Монголын цагийн бүсээр YYYY-MM-DD огноог 100% зөв гаргах функц:
function getLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function cleanString(str: string) {
  return String(str || "")
    .replace(/[\u00a0\s]+/g, " ")
    .trim();
}
 // 1. Олон сул зай, tab-ийг автоматаар 1 зай болгож цэвэрлэх ("Caffe   Latte" -> "Caffe Latte")
  const cleanCell = (str: string) =>
    (str || "").replace(/[\u00a0\s]+/g, " ").trim();
// ⚡ МОНГОЛЫН ЦАГИЙН БҮСЭЭР БОДИТ ЦАГ, МИНУТЫГ ЗАЛГАЖ ХАДГАЛАХ
  const parseSafeDate = (rawDate: string | undefined, fallbackIso?: string): string => {
    const now = new Date();
    
    // Одоогийн Улаанбаатарын цаг, минут, секундыг авах (HH:mm:ss)
    const timeParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ulaanbaatar',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).format(now);

    let targetDay = getLocalDateStr(now);

    if (rawDate) {
      let cleaned = rawDate.replace(/[\r\n\u00a0"']/g, "").trim().replace(/[./]/g, "-");
      if (cleaned && !cleaned.toLowerCase().includes("date") && !cleaned.toLowerCase().includes("огноо")) {
        const match = cleaned.match(/\d{4}-\d{2}-\d{2}/);
        if (match) targetDay = match[0];
      }
    } else if (fallbackIso) {
      targetDay = fallbackIso.split('T')[0];
    }

    // Улаанбаатарын цагийн бүсээр (+08:00) ISO string үүсгэх
    return new Date(`${targetDay}T${timeParts}+08:00`).toISOString();
  };
  const cleanHeader = (str: string) =>
    (str || "")
      .toLowerCase()
      .replace(/[\r\n\s\-_.]/g, "")
      .trim();

 // 1. Стэйтийг sessionStorage-оос сэргээж эхлүүлэх
 const [pendingCategoryReview, setPendingCategoryReview] = useState<{
   salesToInsert: any[];
   productsToReview: Array<{ name: string; category: string; method: string; price: number; isUnknown?: boolean }>;
   productsToUpdateBatch: Array<{ id: string; name: string; selling_price: number }>;
   existingChanges: AutoPilotChange[];
   isProcessing: boolean;
 } | null>(() => {
   if (typeof window !== 'undefined') {
     const saved = sessionStorage.getItem('operlink_pending_review');
     if (saved) {
       try { return JSON.parse(saved); } catch (e) {}
     }
   }
   return null;
 });
  // ... бусад import paste state-үүд


    // =========================================================================
      // ⚡ ЭЦСИЙН ХАДГАЛАЛТ ХИЙХ ЦӨМ ФУНКЦ (БҮХ НЭРСИЙГ ЖИГДЭЛСЭН)
      // =========================================================================
    const commitFinalSales = async (
        sales: any[],
        newProductsList: any[] = [],
        updates: any[] = [],
        existingChanges: AutoPilotChange[] = []
      ) => {
        setLoading(true);
        try {
          if (overwriteSales) {
            await supabase.from("sales_logs").delete()
              .eq("client_id", activeClient)
              .gte("date", `${startDate}T00:00:00.000Z`)
              .lte("date", `${endDate}T23:59:59.999Z`);
          }
    
          // Борлуулалт оруулах (хэрэв байгаа бол):
          if (sales && sales.length > 0) {
            const { error: salesErr } = await supabase.from("sales_logs").insert(sales);
            if (salesErr) throw salesErr;
          }
    
          // Шинэ цэсүүдийг каталогт болон learned_categories-д хадгалах:
          let insertedNewProds: any[] = [];
          if (newProductsList && newProductsList.length > 0) {
            const prodBatch = newProductsList.map((p: any) => ({
              client_id: activeClient,
              name: p.name,
              category: p.category,
              selling_price: p.price || 0
            }));
    
            const { data, error: prodErr } = await supabase
              .from("products")
              .upsert(prodBatch, { onConflict: "client_id,name" })
              .select();
    
            if (prodErr) throw prodErr;
            if (data) insertedNewProds = data;
    
            // 🧠 Сурсан ангиллуудыг learned_categories рүү хадгалах:
            const learnedCatsToInsert = newProductsList.map((p: any) => ({
              client_id: activeClient,
              product_name: p.name,
              category: p.category
            }));
    
            if (learnedCatsToInsert.length > 0) {
              await supabase.from('learned_categories').upsert(learnedCatsToInsert, { onConflict: 'client_id,product_name' });
            }
          }
    
     if (updates && updates.length > 0) {
              await Promise.all(
                updates.map(async (p: any) => {
                  // 1. Зөвхөн зарах үнийг шууд шинэчлэх (Нэрний алдаа гарахгүй)
                  const { error } = await supabase
                    .from("products")
                    .update({ selling_price: p.selling_price })
                    .eq("id", p.id);
                  if (error) console.error("Price update error:", error);
                })
              );
    
              // 2. Дэлгэц дээрх цэсний үнийг refresh хийлгүй шууд 0ms-д шинэчлэх
              setProductsList(prev => prev.map(prod => {
                const up = updates.find((u: any) => u.id === prod.id);
                return up ? { ...prod, selling_price: up.selling_price } : prod;
              }));
            }
    
      // ⚡ АВТО-ПИЛОТ: Үнэ өөрчлөгдсөн ч бай, Шинэ бараа нэмэгдсэн ч бай ЗААВАЛ МЭДЭГДЭХ!
          const newProductChanges: AutoPilotChange[] = insertedNewProds.map((p: any) => ({
            id: `new-${p.id}-${Date.now()}`,
            productId: p.id,
            productName: p.name,
            type: 'NEW_PRODUCT',
            oldName: 'Байхгүй',
            newName: `${p.name} (${Number(p.selling_price).toLocaleString()} ₮) [${p.category}]`,
            oldPrice: 0,
            newPrice: Number(p.selling_price),
            oldCategory: p.category || 'General',
            reverted: false
          }));
    
          const allAutoPilotChanges = [...existingChanges, ...newProductChanges];
    
          // Хэрэв үнэ өөрчлөгдсөн ЭСВЭЛ шинэ бараа нэмэгдсэн л бол Поп-ап цонхыг асаана!
          if (allAutoPilotChanges.length > 0) {
            setAutoPilotActivity({
              totalSales: sales.length,
              changes: allAutoPilotChanges
            });
          }
    
          // ⚡ SessionStorage болон Попап цонхыг бүрэн хаах:
          updatePendingReview(null);
          await fetchDatabaseData(activeClient);
    
        } catch (err: any) {
          alert(`Хадгалах үед алдаа гарлаа: ${err.message}`);
        } finally {
          setLoading(false);
        }
      };
  // =========================================================================
    // 📈 БОРЛУУЛАЛТ ИМПОРТЛОХ ЦӨМ ФУНКЦ (Дараалал нь 100% зөв)
    // =========================================================================
    const handleBulkSalesPaste = async (e: React.FormEvent) => {
        // 🧠 AI ЦЭС ТААГЧ: Танигдаагүй ПОС нэрсийг 20 жишээ харуулан таалгах
      
      e.preventDefault();
      if (!salesPasteText.trim()) return;
  
      setLoading(true);
      try {
        const rows = salesPasteText.replace(/\r/g, "").trim().split("\n");
        if (rows.length < 2) {
          alert("Толгой мөр болон өгөгдлөө хамтад нь хуулна уу.");
          setLoading(false);
          return;
        }
  
          const splitRow = (line: string) => {
          const trimmed = line.trim();
          if (trimmed.includes("\t")) return trimmed.split("\t").map(c => c.trim());
          if (/\s{2,}/.test(trimmed)) return trimmed.split(/\s{2,}/).map(c => c.trim());
          return [trimmed];
        };
  
         const headerCols = splitRow(rows[0]).map(cleanHeader);
        const nameIdx = headerCols.findIndex(c => c.includes("бүтээгдэхүүн") || c.includes("product") || c.includes("item") || c.includes("нэр"));
        const qtyIdx = headerCols.findIndex(c => c.includes("тоо") || c.includes("хэмжээ") || c.includes("qty") || c.includes("count") || c.includes("ширхэг"));
        const revIdx = headerCols.findIndex(c => c.includes("орлого") || c.includes("revenue") || c.includes("total") || c.includes("дүн"));
        const dateIdx = headerCols.findIndex(c => c.includes("огноо") || c.includes("date"));
  
        if (nameIdx === -1 || qtyIdx === -1) {
          alert("Багануудыг таньж чадсангүй. Толгой мөрөө шалгана уу.");
          setLoading(false);
          return;
        }
  
        const activeMonthFallback = endDate ? `${endDate}T12:00:00.000Z` : `${startDate}T12:00:00.000Z`;
        const salesToInsert: any[] = [];
  
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i].trim();
          if (!row) continue;
          const cols = splitRow(row);
            if (cols.length < 2) {
              alert(`⚠️ Алдаа: Багануудын хооронд заавал TAB эсвэл 2-оос дээш зай (Space) авна уу!\nБуруу мөр: "${row}"`);
              setLoading(false);
              return;
            }
          const pName = cleanCell(cols[nameIdx] || "");
          const qty = parseInt((cols[qtyIdx] || "0").replace(/[^0-9.-]/g, "")) || 0;
          const revenue = parseFloat((cols[revIdx >= 0 ? revIdx : 2] || "0").replace(/[^0-9.-]/g, "")) || 0;
          const dateVal = parseSafeDate(dateIdx >= 0 ? cols[dateIdx] : undefined, activeMonthFallback);
  
          if (pName && qty > 0) {
            salesToInsert.push({
              client_id: activeClient,
              product_name: pName,
              quantity_sold: qty,
              total_revenue: revenue,
              date: dateVal,
            });
          }
        }
  
        if (salesToInsert.length === 0) {
          alert("Оруулах борлуулалт олдсонгүй.");
          setLoading(false);
          return;
        }
  
        const dynamicAliasMap: Record<string, string> = { ...aliasMap };
        (learnedMenus || []).forEach((lm: any) => {
          if (lm.pos_name && lm.official_product_name) {
            dynamicAliasMap[sanitizeName(lm.pos_name)] = lm.official_product_name;
          }
        });
  
        const seenInBatch = new Set<string>();
        const productsToUpdateBatch: Array<{ id: string; name: string; selling_price: number }> = [];
        const existingAutoPilotChanges: AutoPilotChange[] = [];
        const rawNewProducts: Array<{ name: string; price: number }> = [];
  
        for (const s of salesToInsert) {
          const rawPosName = cleanString(s.product_name);
          const posPrice = s.quantity_sold > 0 ? Math.round(s.total_revenue / s.quantity_sold) : 0;
          if (!rawPosName || seenInBatch.has(rawPosName.toLowerCase())) continue;
          seenInBatch.add(rawPosName.toLowerCase());
  
          const result = evaluateSaleItem(rawPosName, posPrice, productsList, dynamicAliasMap, learnedMenus);
  
          if (result.decision === 'AUTO_MERGE' && result.targetProduct) {
            const target = result.targetProduct;
            const oldPrice = Number(target.selling_price) || 0;
            const nameChanged = cleanString(rawPosName).toLowerCase() !== cleanString(target.name).toLowerCase();
            const priceChanged = posPrice > 0 && oldPrice !== posPrice;
  
          if (priceChanged) {
          productsToUpdateBatch.push({
            id: target.id,
            name: target.name, // Албан ёсны нэр хэвээрээ үлдэнэ
            selling_price: posPrice
          });
  
          existingAutoPilotChanges.push({
            id: `price-${target.id}-${Date.now()}`,
            productId: target.id,
            productName: target.name,
            type: 'PRICE_UPDATE', // 👈 Үргэлж ЦЭВЭР ҮНИЙН ӨӨРЧЛӨЛТ гэж бүртгэнэ
            oldName: target.name,
            newName: rawPosName !== target.name ? `${target.name} (ПОС: ${rawPosName})` : target.name,
            oldPrice: oldPrice,
            newPrice: posPrice,
            oldCategory: target.category || 'General',
            reverted: false
          });
        }
          } else {
            rawNewProducts.push({ name: rawPosName, price: posPrice });
          }
        }
          // =========================================================================
        // 🧠 AI ЦЭС ТААГЧ: 20 жишээ харуулан таалгаж, Auto-Pilot Pop-up цонхонд бүртгэх
        // =========================================================================
        if (rawNewProducts.length > 0) {
          try {
            const aiResolveRes = await fetch('/api/kiosk-ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'resolve_pos_menu',
                unmatchedPosNames: rawNewProducts.map(p => p.name),
                officialMenuNames: productsList.map(p => p.name),
                clientId: activeClient
              })
            });
            const aiResolveData = await aiResolveRes.json();
            if (aiResolveData.success && aiResolveData.matches) {
              const resolvedMatches = aiResolveData.matches;
              const learnedBatch: any[] = [];
  
              // Бараа бүрийг араас нь урагш шалгах
              for (let i = rawNewProducts.length - 1; i >= 0; i--) {
                const posItem = rawNewProducts[i];
                const matchedOfficial = resolvedMatches[posItem.name];
  
                if (matchedOfficial) {
                  const targetProd = productsList.find(p => cleanString(p.name).toLowerCase() === cleanString(matchedOfficial).toLowerCase());
                  if (targetProd) {
                    // 1. learned_menus-д цээжлэх жагсаалтад нэмэх
                    learnedBatch.push({
                      client_id: activeClient,
                      pos_name: posItem.name,
                      official_product_name: targetProd.name
                    });
  
                    const oldPrice = Number(targetProd.selling_price) || 0;
                    const newPrice = posItem.price > 0 ? posItem.price : oldPrice;
  
                    // 2. Хэрэв үнэ нь өөрчлөгдсөн бол үнийг шинэчлэх жагсаалтад оруулах
                    if (posItem.price > 0 && oldPrice !== posItem.price) {
                      productsToUpdateBatch.push({
                        id: targetProd.id,
                        name: targetProd.name,
                        selling_price: posItem.price
                      });
                    }
  
                    // 3. ⚡ AUTO-PILOT POP-UP ЦОНХОНД ХАРУУЛАХ МЭДЭЭЛЭЛ НЭМЭХ (Буцаах товчтойгоо гарна)
                    existingAutoPilotChanges.push({
                      id: `ai-resolve-${targetProd.id}-${Date.now()}`,
                      productId: targetProd.id,
                      productName: posItem.name,
                      type: 'NAME_MERGE',
                      oldName: posItem.name, // ПОС дээрх нэр: "americo"
                      newName: `${targetProd.name} (AI таасан 🤖)`, // Үндсэн цэс: "Americano"
                      oldPrice: oldPrice,
                      newPrice: newPrice,
                      oldCategory: targetProd.category || 'General',
                      reverted: false
                    });
  
                    // 4. Энэ нь шинэ цэс биш тул шинэ цэс үүсгэх жагсаалтаас хасах
                    rawNewProducts.splice(i, 1);
                  }
                }
              }
  
              // 5. learned_menus хүснэгтэд баталгаажуулж хадгалах
              if (learnedBatch.length > 0) {
                await supabase.from('learned_menus').upsert(learnedBatch, { onConflict: 'client_id,pos_name' });
              }
            }
          } catch (err) {
            console.warn("AI menu resolve error:", err);
          }
        }
        // =========================================================================
        // ⚡ 1. ЭХЛЭЭД productsToReview ХУВЬСАГЧАА ЗАРЛАЖ БЭЛТГЭНЭ
        // =========================================================================
        const productsToReview: Array<{ name: string; category: string; method: string; price: number; isUnknown?: boolean }> = [];
        const needsAiClassification: Array<{ name: string; price: number; index: number }> = [];
  
        rawNewProducts.forEach((item) => {
          const learned = (learnedCategories || []).find(
            (lc: any) => sanitizeName(lc.product_name) === sanitizeName(item.name)
          );
  
          if (learned) {
            productsToReview.push({
              name: item.name,
              category: learned.category,
              method: '🧠 Систем сурсан',
              price: item.price,
              isUnknown: false
            });
          } else {
            const localCat = autoCategorizeProduct(item.name);
            if (localCat) {
              productsToReview.push({
                name: item.name,
                category: localCat,
                method: '🤖 Толь бичиг',
                price: item.price,
                isUnknown: false
              });
            } else {
              const curIdx = productsToReview.length;
              productsToReview.push({
                name: item.name,
                category: 'GENERAL',
                method: '⏳ AI ангилж байна...',
                price: item.price,
                isUnknown: true
              });
              needsAiClassification.push({ name: item.name, price: item.price, index: curIdx });
            }
          }
        });
  
        // AI Багцлалт
        if (needsAiClassification.length > 0) {
          try {
            const res = await fetch('/api/kiosk-ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'categorize',
                names: needsAiClassification.map(x => x.name)
              })
            });
            const aiData = await res.json();
            if (aiData.success && aiData.categories) {
              needsAiClassification.forEach(item => {
                const detected = aiData.categories[item.name];
                if (detected && UNIVERSAL_CATEGORIES.some(c => c.id === detected)) {
                  productsToReview[item.index].category = detected;
                  productsToReview[item.index].method = '✨ AI таамагласан';
                  productsToReview[item.index].isUnknown = false;
                } else {
                  productsToReview[item.index].category = 'GENERAL';
                  productsToReview[item.index].method = '⚠️ Шалгах шаардлагатай';
                  productsToReview[item.index].isUnknown = true;
                }
              });
            } else {
              needsAiClassification.forEach(item => {
                productsToReview[item.index].category = 'GENERAL';
                productsToReview[item.index].method = '⚠️ Шалгах шаардлагатай';
                productsToReview[item.index].isUnknown = true;
              });
            }
          } catch (err) {
            needsAiClassification.forEach(item => {
              productsToReview[item.index].category = 'GENERAL';
              productsToReview[item.index].method = '⚠️ Шалгах шаардлагатай';
              productsToReview[item.index].isUnknown = true;
            });
          }
        }
  
        // =========================================================================
        // ⚡ ДАРАА НЬ БОРЛУУЛАЛТАА ХАДГАЛЖ, САНАХ ОЙД ХАДГАЛНА
        // =========================================================================
        await commitFinalSales(salesToInsert, [], productsToUpdateBatch, existingAutoPilotChanges);
  
        setSalesImportSuccess(true);
        setSalesPasteText("");
        setOverwriteSales(false);
        setTimeout(() => setSalesImportSuccess(false), 4000);
  
  
        if (productsToReview.length > 0) {
          const reviewData = {
            salesToInsert: [],
            productsToReview,
            productsToUpdateBatch: [],
            existingChanges: [],
            isProcessing: false
          };
          updatePendingReview(reviewData);
        }
  
      } catch (err: any) {
        alert(`Алдаа гарлаа: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
   
    // =========================================================================
    // 📦 ТАТАН АВАЛТ ХУУЛАХ ЭЦСИЙН УХААЛАГ ФУНКЦ (HEADER-BASED)
    // =========================================================================
  
    const handleBulkPurchasePaste = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!purchasePasteText.trim()) return;
  
      setLoading(true);
      try {
        const rows = purchasePasteText.replace(/\r/g, "").trim().split("\n");
        if (rows.length < 2) {
          alert("Алдаа: Толгой мөр болон өгөгдлийг хамтад нь хуулна уу.");
          setLoading(false);
          return;
        }
        // ⚡ Мөрийг Tab эсвэл 2+ зайгаар салгагч
        const splitRow = (line: string) => {
          const trimmed = line.trim();
          if (trimmed.includes("\t")) return trimmed.split("\t").map(c => c.trim());
          if (/\s{2,}/.test(trimmed)) return trimmed.split(/\s{2,}/).map(c => c.trim());
          return [trimmed];
        };
        const headerCols = splitRow(rows[0]).map(cleanHeader);
        const nameIdx = headerCols.findIndex(c => c.includes("бараа") || c.includes("түүхий") || c.includes("нэр") || c.includes("item") || c.includes("ingredient") || c.includes("product"));
        const qtyIdx = headerCols.findIndex(c => c.includes("тоо") || c.includes("хэмжээ") || c.includes("qty") || c.includes("count") || c.includes("ширхэг"));
        const costIdx = headerCols.findIndex(c => c.includes("өртөг") || c.includes("нийт") || c.includes("дүн") || c.includes("cost") || c.includes("total") || c.includes("үнэ") || c.includes("price"));
        const dateIdx = headerCols.findIndex(c => c.includes("огноо") || c.includes("date") || c.includes("өдөр"));
  
        if (nameIdx === -1 || qtyIdx === -1) {
          alert("Алдаа: 'Барааны нэр' болон 'Тоо хэмжээ' баганыг таньж чадсангүй.");
          setLoading(false);
          return;
        }
  
        const ingMap = new Map();
        ingredients
          .filter((i) => i.client_id === activeClient)
          .forEach((i) => ingMap.set(cleanNameForMatch(i.name), i));
  
        const nonFoodKeywords = ["сальфетка", "аяга", "уут", "угаагч", "соруул", "таг", "саван", "bucket", "soap", "napkin", "rubber", "lid", "straw", "cup", "bags"];
        const activeMonthFallback = endDate ? `${endDate}T12:00:00.000Z` : `${startDate}T12:00:00.000Z`;
  
        const newIngsToCreate = new Map<string, { name: string; unit_price: number }>();
        const latestPriceUpdates = new Map<string, number>();
        const parsedRows: any[] = [];
  
        // 1. БҮХ 100+ МӨРИЙГ САНАХ ОЙД 1 МИЛЛИСЕКУНДЭД ЯЛГАЖ АВАХ
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i].trim();
          if (!row) continue;
          const cols = splitRow(row);
  
            // 🚨 Хэрэв 1 зай авсан бол (cols.length нь 1 байх тул) анхааруулга өгч зогсоно:
            if (cols.length < 2) {
              alert(`⚠️ Алдаа: Багануудын хооронд заавал TAB эсвэл 2-оос дээш зай (Space) авна уу!\nБуруу мөр: "${row}"`);
              setLoading(false);
              return;
            }
  
          const ingName = cleanCell(cols[nameIdx] || "");
          if (!ingName || !isNaN(Number(ingName)) || ingName.length < 2) continue;
          if (ingName.toLowerCase().includes("item") || ingName.toLowerCase().includes("бараа")) continue;
  
          // ₮ болон таслалыг автоматаар цэвэрлэх:
          const qty = parseFloat((cols[qtyIdx] || "0").replace(/[^0-9.-]/g, "")) || 0;
          const totalCost = parseFloat((cols[costIdx >= 0 ? costIdx : 2] || "0").replace(/[^0-9.-]/g, "")) || 0;
          if (qty <= 0) continue;
  
          const rawDate = dateIdx >= 0 && cols[dateIdx] ? cols[dateIdx].trim() : undefined;
          const dateVal = parseSafeDate(rawDate, activeMonthFallback);
          const cleanKey = cleanNameForMatch(ingName);
          const isKnownNonFood = nonFoodKeywords.some((k) => ingName.toLowerCase().includes(k));
  
          parsedRows.push({ ingName, cleanKey, qty, totalCost, dateVal, isKnownNonFood });
  
          // Шинэ бараа мөн эсэхийг санах ойд шалгах
          if (!ingMap.has(cleanKey) && !isKnownNonFood && !newIngsToCreate.has(cleanKey)) {
            newIngsToCreate.set(cleanKey, {
              name: ingName,
              unit_price: qty > 0 ? Math.round(totalCost / qty) : 0
            });
          }
  
          // Хамгийн сүүлийн үнийг хадгалах
          if (qty > 0 && totalCost > 0) {
            latestPriceUpdates.set(cleanKey, Math.round(totalCost / qty));
          }
        }
  
        // 2. ХЭРЭВ ШИНЭ БАРААНУУД БАЙВАЛ БААЗ РУУ ГАНЦХАН ХҮСЭЛТЭЭР БӨӨНӨӨР НЬ ОРУУЛАХ
        if (newIngsToCreate.size > 0) {
          const toInsert = Array.from(newIngsToCreate.values()).map(item => ({
            client_id: activeClient,
            name: item.name,
            unit: "ш",
            unit_price: item.unit_price,
            current_stock: 0
          }));
          const { data: createdData } = await supabase.from("ingredients").insert(toInsert).select();
          if (createdData) {
            createdData.forEach(ing => ingMap.set(cleanNameForMatch(ing.name), ing));
          }
        }
        const currentActor = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Менежер";
        // 3. БҮХ ТАТАН АВАЛТЫН ЖАГСААЛТЫГ БЭЛТГЭХ
        const purchasesToInsert = parsedRows.map(r => {
          const matched = ingMap.get(r.cleanKey);
          return {
            client_id: activeClient,
            ingredient_id: matched ? matched.id : null,
            non_food_item: matched ? null : r.ingName,
            quantity: r.qty,
            type: "purchase",
            total_cost: r.totalCost,
            date: r.dateVal,
            payment_method: "bank",
            is_ebarimt: true,
            notes: matched ? `Татан авалт (${r.totalCost.toLocaleString()}₮)` : "Хүнсний бус OPEX",
            worker_name: `${currentActor} (Татан авалт)`,
          };
        });
  
        // Хэрэв хуучныг цэвэрлэх чеклэгдсэн бол:
        if (overwritePurchases) {
          await supabase
            .from("inventory_logs")
            .delete()
            .eq("client_id", activeClient)
            .eq("type", "purchase")
            .gte("date", `${startDate}T00:00:00.000Z`)
            .lte("date", `${endDate}T23:59:59.999Z`);
        }
  
        // 4. 100+ МӨРИЙГ ГАНЦХАН СҮЛЖЭЭНИЙ ХҮСЭЛТЭЭР БААЗАД ОРУУЛАХ (0.1 секунд!)
        if (purchasesToInsert.length > 0) {
          const { error } = await supabase.from("inventory_logs").insert(purchasesToInsert);
          if (error) throw error;
        }
  
   // 5. Каталог дахь сүүлийн үнийг зэрэг шинэчлэх (TypeScript-д 100% нийцсэн хувилбар)
        const updatePromises = Array.from(latestPriceUpdates.entries()).map(async ([key, newPrice]) => {
          const ing = ingMap.get(key);
          if (ing && ing.id) {
            await supabase.from("ingredients").update({ unit_price: newPrice }).eq("id", ing.id);
          }
        });
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
        }
  
        setPurchaseImportSuccess(true);
        setPurchasePasteText("");
        setOverwritePurchases(false);
        await fetchDatabaseData(activeClient);
        alert(`✅ Амжилттай! Нийт ${purchasesToInsert.length} татан авалт хадгалагдлаа.`);
        setTimeout(() => setPurchaseImportSuccess(false), 4000);
      } catch (err: any) {
        alert(`Алдаа гарлаа: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    // =========================================================================
    //  ТҮҮХИЙ ЭД & ҮНЭ БӨӨНӨӨР ОРУУЛАХ (Огноо хэрэггүй - Каталог)
    // =========================================================================
    const handleBulkIngredientsPaste = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!ingredientsPasteText.trim()) return;
  
      setLoading(true);
      try {
        const rows = ingredientsPasteText.replace(/\r/g, "").trim().split("\n");
        const itemsMap = new Map<string, any>();
        // ⚡ Мөрийг Tab эсвэл 2+ зайгаар салгагч
        const splitRow = (line: string) => {
          const trimmed = line.trim();
          if (trimmed.includes("\t")) return trimmed.split("\t").map(c => c.trim());
          if (/\s{2,}/.test(trimmed)) return trimmed.split(/\s{2,}/).map(c => c.trim());
          return [trimmed];
        };
        rows.forEach((row) => {
          if (!row.trim()) return;
          const cols = splitRow(row);
            // 🚨 Хэрэв 1 зай авсан бол (cols.length нь 1 байх тул) анхааруулга өгч зогсоно:
            if (cols.length < 2) {
              alert(`⚠️ Алдаа: Багануудын хооронд заавал TAB эсвэл 2-оос дээш зай (Space) авна уу!\nБуруу мөр: "${row}"`);
              setLoading(false);
              return;
            }
          if (cols.length >= 2) {
            const rawName = cols[0]?.trim() || "";
            if (
              !rawName ||
              rawName.toLowerCase().includes("item") ||
              rawName.toLowerCase().includes("нэр")
            )
              return;
  
            let unit = "ш";
            let price = 0;
            let par = 0;
  
            const col1IsNum = !isNaN(
              parseFloat(cols[1]?.replace(/[^0-9.-]/g, "")),
            );
            const col2IsNum = cols[2]
              ? !isNaN(parseFloat(cols[2]?.replace(/[^0-9.-]/g, "")))
              : false;
  
            if (col1IsNum && !col2IsNum) {
              price = parseFloat(cols[1]?.replace(/[^0-9.-]/g, "")) || 0;
              unit = cols[2]?.replace(/per\s*|1\s*/gi, "").trim() || "ш";
              par = cols[3]
                ? parseFloat(cols[3]?.replace(/[^0-9.-]/g, "")) || 0
                : 0;
            } else {
              unit = cols[1]?.replace(/per\s*|1\s*/gi, "").trim() || "ш";
              price = parseFloat(cols[2]?.replace(/[^0-9.-]/g, "")) || 0;
              par = cols[3]
                ? parseFloat(cols[3]?.replace(/[^0-9.-]/g, "")) || 0
                : 0;
            }
  
            itemsMap.set(rawName.toLowerCase().trim(), {
              client_id: activeClient,
              name: rawName,
              unit: unit,
              unit_price: price,
              par_level: par,
            });
          }
        });
  
        const itemsToUpsert = Array.from(itemsMap.values());
        if (itemsToUpsert.length > 0) {
          const { error } = await supabase
            .from("ingredients")
            .upsert(itemsToUpsert, { onConflict: "client_id,name" });
          if (error) throw error;
        }
  
        setIngredientsImportSuccess(true);
        setIngredientsPasteText("");
        await fetchDatabaseData(activeClient);
        alert(
          `✅ Амжилттай! Нийт ${itemsToUpsert.length} түүхий эд хадгалагдлаа.`,
        );
        setTimeout(() => setIngredientsImportSuccess(false), 4000);
      } catch (err: any) {
        alert(`Алдаа: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
  
  
    // 🎯 ТЕХНОЛОГИЙН КАРТ (ЖОР) БӨӨНӨӨР ОРУУЛАХ БҮРЭН АВТОМАТ УХААЛАГ ФУНКЦ
    // =========================================================================
    const handleBulkRecipesPaste = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!recipesPasteText.trim()) return;
  
      setLoading(true);
      try {
        const rows = recipesPasteText.replace(/\r/g, "").trim().split("\n");
        if (rows.length === 0) return;
  
        // 1. Баазад байгаа түүхий эдүүдийн санах ой бэлтгэх (Англи ба Монголоор нь хоёулангаар нь танина)
        const { data: currentIngs } = await supabase
          .from("ingredients")
          .select("id, name")
          .ilike("client_id", activeClient.trim());
  
        const ingMap = new Map<string, string>();
        currentIngs?.forEach((i) => {
          // Бүтэн нэр: "milk (сүү)"
          ingMap.set(cleanNameForMatch(i.name), i.id);
          // Англи суурь нэр: "milk"
          const enPart = cleanNameForMatch(i.name.split('(')[0]);
          if (enPart) ingMap.set(enPart, i.id);
          // Монгол хэсэг: "сүү"
          const mnMatch = i.name.match(/\((.*?)\)/);
          if (mnMatch && mnMatch[1]) {
            ingMap.set(cleanNameForMatch(mnMatch[1]), i.id);
          }
        });
  
        // 2. ⚡ ТОЛГОЙ МӨР (HEADER)-ИЙГ ШАЛГАХ
        const splitCols = (line: string) => line.includes("\t") ? line.split("\t") : line.split(/\s{2,}/);
        const firstRowCols = splitCols(rows[0]).map(cleanHeader);
  
        let prodIdx = firstRowCols.findIndex(c => c.includes("бүтээгдэхүүн") || c.includes("product") || c.includes("цэс") || c.includes("хоол") || c.includes("menu"));
        let ingIdx = firstRowCols.findIndex(c => c.includes("орц") || c.includes("түүхий") || c.includes("ingredient") || c.includes("item") || c.includes("материал"));
        let amtIdx = firstRowCols.findIndex(c => c.includes("хэмжээ") || c.includes("тоо") || c.includes("amount") || c.includes("qty") || c.includes("грамм") || c.includes("мл"));
  
        const hasHeader = prodIdx !== -1 || ingIdx !== -1 || amtIdx !== -1;
        const startIdx = hasHeader ? 1 : 0;
  
        // Анхдагч дараалал: 0=Бүтээгдэхүүн, 1=Орц, 2=Тоо хэмжээ
        if (prodIdx === -1) prodIdx = 0;
        if (ingIdx === -1) ingIdx = 1;
        if (amtIdx === -1) amtIdx = 2;
  
        const newIngsToCreate = new Map<string, { name: string; unit: string }>();
        const parsedRecipeRows: Array<{ prodName: string; rawIng: string; amount: number }> = [];
  
        // 3. МӨР БҮРИЙГ УХААЛГААР ТАНИХ
        for (let r = startIdx; r < rows.length; r++) {
          const row = rows[r].trim();
          if (!row) continue;
  
          const cols = splitCols(row);
          if (cols.length < 2) continue;
  
          let prodName = cleanCell(cols[prodIdx] || "");
          let rawIng = cleanCell(cols[ingIdx] || "");
          let rawAmt = cols[amtIdx] !== undefined ? cleanCell(cols[amtIdx]) : "";
  
          // 💡 АВТОМАТ ШАЛГАЛТ: Хэрэв тоо нь 1-р баганад, орц нь 2-р баганад байвал байрыг нь солих!
          const isIngNumeric = !isNaN(parseFloat(rawIng.replace(/[^0-9.-]/g, ""))) && !isNaN(Number(rawIng.trim()[0]));
          const isAmtText = isNaN(parseFloat(rawAmt.replace(/[^0-9.-]/g, "")));
  
          if (isIngNumeric && isAmtText) {
            const temp = rawIng;
            rawIng = rawAmt;
            rawAmt = temp;
          }
  
          // Хэрэв 3 дахь багана байхгүй ч 2 баганатай (Бараа, Тоо) байвал
          if (!rawAmt && cols.length === 2) {
            rawAmt = rawIng;
            rawIng = prodName;
          }
  
          const amount = parseFloat(rawAmt.replace(/[^0-9.-]/g, "")) || 0;
          if (!prodName || !rawIng || amount <= 0) continue;
          if (prodName.toLowerCase().includes("product") || prodName.toLowerCase().includes("бүтээгдэхүүн")) continue;
  
          parsedRecipeRows.push({ prodName, rawIng, amount });
  
          // Баазад байхгүй түүхий эд байвал өөрөө автоматаар үүсгэх жагсаалтад оруулах
          const cleanKey = cleanNameForMatch(rawIng);
          const enKey = cleanNameForMatch(rawIng.split('(')[0]);
          if (!ingMap.has(cleanKey) && !ingMap.has(enKey) && !newIngsToCreate.has(cleanKey)) {
            newIngsToCreate.set(cleanKey, { name: rawIng, unit: "гр" });
          }
        }
  
        // 4. ⚡ БААЗАД БАЙХГҮЙ ТҮҮХИЙ ЭДИЙГ ӨӨРӨӨ ШУУД ҮҮСГЭХ (Жор хэзээ ч гацахгүй!)
        if (newIngsToCreate.size > 0) {
          const toInsert = Array.from(newIngsToCreate.values()).map(it => ({
            client_id: activeClient,
            name: it.name,
            unit: "гр",
            unit_price: 0,
            current_stock: 0
          }));
          const { data: createdIngs } = await supabase.from("ingredients").insert(toInsert).select();
          if (createdIngs) {
            createdIngs.forEach(ci => {
              ingMap.set(cleanNameForMatch(ci.name), ci.id);
              ingMap.set(cleanNameForMatch(ci.name.split('(')[0]), ci.id);
            });
          }
        }
  
        // 5. Жорыг баазад оруулах
        const recipesToUpsert: any[] = [];
        parsedRecipeRows.forEach(rowItem => {
          const cleanKey = cleanNameForMatch(rowItem.rawIng);
          const enKey = cleanNameForMatch(rowItem.rawIng.split('(')[0]);
          const ingId = ingMap.get(cleanKey) || ingMap.get(enKey);
  
          if (ingId) {
            recipesToUpsert.push({
              client_id: activeClient,
              product_name: rowItem.prodName,
              ingredient_id: ingId,
              amount: rowItem.amount
            });
          }
        });
  
        if (recipesToUpsert.length > 0) {
          const { error } = await supabase
            .from("recipes")
            .upsert(recipesToUpsert, { onConflict: "client_id,product_name,ingredient_id" });
          if (error) throw error;
        }
  
        setRecipesImportSuccess(true);
        setRecipesPasteText("");
        await fetchDatabaseData(activeClient);
        alert(`✅ Амжилттай! Нийт ${recipesToUpsert.length} технологийн карт (жор) хадгалагдлаа.`);
        setTimeout(() => setRecipesImportSuccess(false), 4000);
      } catch (err: any) {
        alert(`Жор оруулахад алдаа гарлаа: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
  
  
  // =========================================================================
    // 5. МЕНЮНИЙ ЗАРАХ ҮНЭ ИМПОРТЛОХ (СИСТЕМ ӨӨРӨӨ АВТОМАТААР АНГИЛНА)
    // =========================================================================
  
    const handleBulkProductsPaste = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!productsPasteText.trim()) return;
  
      setLoading(true);
      try {
        const rows = productsPasteText.replace(/\r/g, "").trim().split("\n");
        const productsToUpsert: any[] = [];
        // ⚡ Мөрийг Tab эсвэл 2+ зайгаар салгагч
        const splitRow = (line: string) => {
          const trimmed = line.trim();
          if (trimmed.includes("\t")) return trimmed.split("\t").map(c => c.trim());
          if (/\s{2,}/.test(trimmed)) return trimmed.split(/\s{2,}/).map(c => c.trim());
          return [trimmed];
        };
        rows.forEach((row) => {
          if (!row.trim()) return;
          const cols = splitRow(row);
           if (cols.length < 2) {
              alert(`⚠️ Алдаа: Багануудын хооронд заавал TAB эсвэл 2-оос дээш зай (Space) авна уу!\nБуруу мөр: "${row}"`);
              setLoading(false);
              return;
            }
          if (cols.length >= 2) {
            let name = "";
            let price = 0;
  
            // Хэрэглэгч 2 багана эсвэл 3 багана хуулсан аль ч тохиолдолд нэр ба үнийг зөв олно:
            if (cols.length >= 3 && isNaN(Number(cols[0]))) {
              name = cols[1]?.trim() || "";
              price = parseFloat(cols[2]?.replace(/[^0-9.-]/g, "")) || 0;
            } else {
              name = cols[0]?.trim() || "";
              price = parseFloat(cols[1]?.replace(/[^0-9.-]/g, "")) || 0;
            }
  
            if (name && price > 0 && !name.toLowerCase().includes("item") && !name.toLowerCase().includes("нэр")) {
              // 🧠 СИСТЕМ ӨӨРӨӨ СУРСАН САНАХ ОЙ БА ТОЛЬ БИЧГЭЭРЭЭ 6 АНГИЛАЛД ОНООНО:
              const learned = (learnedCategories || []).find(
                (lc: any) => sanitizeName(lc.product_name) === sanitizeName(name)
              );
              const smartCategory = learned?.category || autoCategorizeProduct(name) || 'GENERAL';
  
              productsToUpsert.push({
                client_id: activeClient,
                name: name,
                category: smartCategory, // 👈 100% автомат ангилал!
                selling_price: price,
              });
            }
          }
        });
  
        if (productsToUpsert.length > 0) {
          const { error } = await supabase
            .from("products")
            .upsert(productsToUpsert, { onConflict: "client_id,name" });
          if (error) throw error;
        }
  
        setProductsImportSuccess(true);
        setProductsPasteText("");
        await fetchDatabaseData(activeClient);
        alert(`✅ Амжилттай! Нийт ${productsToUpsert.length} цэсийг систем автоматаар ухаалгаар ангилж хадгаллаа.`);
        setTimeout(() => setProductsImportSuccess(false), 4000);
      } catch (err: any) {
        alert(`Меню оруулахад алдаа гарлаа: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    // =========================================================================
    // 🗑️ ГАЛ ТОГООНЫ ХАЯГДАЛ ХУУЛАХ (ОГНООГҮЙ Ч СОНГОСОН САРД ЗӨВ ОРНО)
    // =========================================================================
    const handleBulkKitchenLogsPaste = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!kitchenPasteText.trim()) return;
  
      setLoading(true);
      try {
        const rows = kitchenPasteText.replace(/\r/g, "").trim().split("\n");
        if (rows.length < 1) return;
  
        const logsToInsert: any[] = [];
        // 💡 Огноо байхгүй бол тухайн сонгосон сарын (9-р сарын) огноог авах:
        const activeMonthFallback = endDate
          ? `${endDate}T12:00:00.000Z`
          : `${startDate}T12:00:00.000Z`;
  
        const ingMap = new Map();
        ingredients
          .filter((i) => i.client_id === activeClient)
          .forEach((i) => ingMap.set(cleanNameForMatch(i.name), i));
  
        // Хэрэв эхний мөр нь толгой мөр (Header) байвал шалгах:
        const firstRowLower = rows[0].toLowerCase();
        const hasHeader =
          firstRowLower.includes("төрөл") ||
          firstRowLower.includes("type") ||
          firstRowLower.includes("бараа") ||
          firstRowLower.includes("item");
        const startIndex = hasHeader ? 1 : 0;
  
          const splitRow = (line: string) => {
          const trimmed = line.trim();
          if (trimmed.includes("\t")) return trimmed.split("\t").map(c => c.trim());
          if (/\s{2,}/.test(trimmed)) return trimmed.split(/\s{2,}/).map(c => c.trim());
          return [trimmed];
        };
  
        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i].trim();
          if (!row) continue;
          const cols = splitRow(row).map((c) => c.trim());
  
              // 🚨 Хэрэв 1 зай авсан бол (cols.length нь 1 байх тул) анхааруулга өгч зогсоно:
             if (cols.length < 2) {
              alert(`⚠️ Алдаа: Багануудын хооронд заавал TAB эсвэл 2-оос дээш зай (Space) авна уу!\nБуруу мөр: "${row}"`);
              setLoading(false);
              return;
            }
  
          let dateVal = activeMonthFallback;
          let rawType = "spoilage";
          let ingName = "";
          let qty = 0;
          let note = "";
  
          // 💡 ОГНОО БАЙГАА ЭСЭХИЙГ УХААЛГААР ТАНИХ:
          if (cols[0] && /\d{4}[./-]\d{2}/.test(cols[0])) {
            // 1. Хэрэв 1-р багана нь Огноо бол: [Огноо, Төрөл, Бараа, Хэмжээ, Тайлбар]
            dateVal = parseSafeDate(cols[0], activeMonthFallback);
            rawType = cols[1]?.toLowerCase() || "spoilage";
            ingName = cleanCell(cols[2] || "");
            qty = parseFloat((cols[3] || "0").replace(/[^0-9.-]/g, "")) || 0;
            note = cols[4] || "";
          } else {
            // 2. Хэрэв Огнооны багана БАЙХГҮЙ бол: [Төрөл, Бараа, Хэмжээ, Тайлбар]
            dateVal = activeMonthFallback; // ✅ Сонгогдсон сарын (9-р сарын) огноог өгнө
            rawType = cols[0]?.toLowerCase() || "spoilage";
            ingName = cleanCell(cols[1] || "");
            qty = parseFloat((cols[2] || "0").replace(/[^0-9.-]/g, "")) || 0;
            note = cols[3] || "";
          }
  
          // Төрлүүдийг системд таниулах:
          let dbType = "spoilage";
          if (
            rawType.includes("staff") ||
            rawType.includes("хоол") ||
            rawType.includes("ажилчдын")
          )
            dbType = "staff_meal";
          else if (
            rawType.includes("test") ||
            rawType.includes("турш") ||
            rawType.includes("амталгаа")
          )
            dbType = "testing";
          else if (rawType.includes("other") || rawType.includes("бусад"))
            dbType = "other";
          
          const matchedIng = ingMap.get(cleanNameForMatch(ingName));
          const currentActor = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Менежер";
  
          if (matchedIng && qty > 0) {
            logsToInsert.push({
              client_id: activeClient,
              ingredient_id: matchedIng.id,
              quantity: -Math.abs(qty),
              type: dbType,
              notes: note || `${dbType} logged in bulk`,
              date: dateVal, // ✅ Сонгосон сард заавал багтана!
               worker_name: `${currentActor} (Хаягдал)`,
            });
          }
        }
  
        if (overwriteKitchen) {
          await supabase
            .from("inventory_logs")
            .delete()
            .eq("client_id", activeClient)
            .in("type", ["spoilage", "staff_meal", "testing", "other"])
            .gte("date", `${startDate}T00:00:00.000Z`)
            .lte("date", `${endDate}T23:59:59.999Z`);
        }
  
        if (logsToInsert.length > 0) {
          const { error } = await supabase
            .from("inventory_logs")
            .insert(logsToInsert);
          if (error) throw error;
        }
  
        setKitchenImportSuccess(true);
        setKitchenPasteText("");
        setOverwriteKitchen(false);
        await fetchDatabaseData(activeClient);
        alert(
          `✅ Амжилттай! Нийт ${logsToInsert.length} хаягдал [${startDate.substring(0, 7)}] сард хадгалагдлаа.`,
        );
        setTimeout(() => setKitchenImportSuccess(false), 4000);
      } catch (err: any) {
        alert(`Алдаа гарлаа: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    // =========================================================================
    // 🗂️ БОСОО ТООЛЛОГО (SMART HEADER & AUTO-DETECT)
    // =========================================================================
    const handleBulkInventoryPaste = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inventoryPasteText.trim()) return;
  
      setLoading(true);
      try {
        const rows = inventoryPasteText.trim().split("\n");
        if (rows.length < 1) return;
  
        const ingMap = new Map();
        ingredients
          .filter((i) => i.client_id === activeClient)
          .forEach((i) => {
            ingMap.set(cleanNameForMatch(i.name), i);
            if (i.name.toLowerCase().includes("milk")) ingMap.set("сүү", i);
            if (i.name.toLowerCase().includes("beans")) ingMap.set("кофе", i);
          });
  
        const countsToInsert: any[] = [];
        const defaultDate = auditDate
          ? `${auditDate}T00:00:00.000Z`
          : `${startDate}T00:00:00.000Z`;
        const cleanType = auditType === "start" ? "start" : "end";
  // ⚡ Мөрийг Tab эсвэл 2+ зайгаар салгагч
        const splitRow = (line: string) => {
          const trimmed = line.trim();
          if (trimmed.includes("\t")) return trimmed.split("\t").map(c => c.trim());
          if (/\s{2,}/.test(trimmed)) return trimmed.split(/\s{2,}/).map(c => c.trim());
          return [trimmed];
        };
  
        // 🧠 1. SMART HEADER ШАЛГАХ (Баганын дараалал хамаарахгүй)
          const headerCols = splitRow(rows[0]).map(cleanHeader);
        let nameIdx = headerCols.findIndex(
          (c) =>
            c.includes("бараа") ||
            c.includes("item") ||
            c.includes("нэр") ||
            c.includes("ингредиент") ||
            c.includes("product"),
        );
        let qtyIdx = headerCols.findIndex(
          (c) =>
            c.includes("тоо") ||
            c.includes("хэмжээ") ||
            c.includes("qty") ||
            c.includes("count") ||
            c.includes("үлдэгдэл") ||
            c.includes("amount"),
        );
        let dateIdx = headerCols.findIndex(
          (c) => c.includes("огноо") || c.includes("date") || c.includes("өдөр"),
        );
  
        const hasSmartHeader = nameIdx !== -1 && qtyIdx !== -1;
        const startRowIdx = hasSmartHeader ? 1 : 0; // Толгой мөртэй бол 1-ээс эхэлнэ
  
        for (let r = startRowIdx; r < rows.length; r++) {
          const row = rows[r].trim();
          if (!row) continue;
          const cols = splitRow(row).map((c) => c.trim());
  
           // 🚨 Хэрэв 1 зай авсан бол (cols.length нь 1 байх тул) анхааруулга өгч зогсоно:
            if (cols.length < 2) {
              alert(`⚠️ Алдаа: Багануудын хооронд заавал TAB эсвэл 2-оос дээш зай (Space) авна уу!\nБуруу мөр: "${row}"`);
              setLoading(false);
              return;
            }
            
          let itemName = "";
          let qty = 0;
          let rowDate = defaultDate;
  
          if (hasSmartHeader) {
            // Толгой мөрөөр нь олох (Бараа эхэнд байна уу, Тоо эхэнд байна уу хамаагүй!)
            itemName = cleanCell(cols[nameIdx] || "");
            qty = parseFloat((cols[qtyIdx] || "0").replace(/[^0-9.-]/g, "")) || 0;
            if (
              dateIdx !== -1 &&
              cols[dateIdx] &&
              /\d{4}[./-]\d{2}/.test(cols[dateIdx])
            ) {
              rowDate = parseSafeDate(cols[dateIdx], defaultDate);
            }
          } else {
            // Толгой мөргүй үед: Автоматаар тоо ба текстийг нь ялгах!
            // Хэрэв эхний баганад тоо (10000), хоёр дахь баганад нэр (Milk) байвал байрыг нь солино:
            const col0IsNum = !isNaN(Number(cols[0]?.replace(/[^0-9.-]/g, "")));
            const col1IsText = isNaN(Number(cols[1]));
  
            if (cols.length >= 2 && col0IsNum && col1IsText) {
              qty = parseFloat(cols[0].replace(/[^0-9.-]/g, "")) || 0;
              itemName = cleanCell(cols[1]);
            } else if (cols.length >= 2) {
              itemName = cleanCell(cols[0]);
              qty = parseFloat(cols[1].replace(/[^0-9.-]/g, "")) || 0;
            }
  
            if (cols[2] && /\d{4}[./-]\d{2}/.test(cols[2])) {
              rowDate = parseSafeDate(cols[2], defaultDate);
            }
          }
  
          if (!itemName || isNaN(qty)) continue;
  
          const currentActor = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Менежер";
  
          const matchedIng = ingMap.get(cleanNameForMatch(itemName));
          if (matchedIng) {
            countsToInsert.push({
              client_id: activeClient,
              ingredient_id: matchedIng.id,
              quantity: qty,
              type: "count",
              notes: `Бөөнөөр Тоолсон Үлдэгдэл (${cleanType})`,
               worker_name: `${currentActor} (Dashboard)`,
              date: rowDate,
            });
          }
        }
  
        if (overwriteAudit) {
          await supabase
            .from("inventory_logs")
            .delete()
            .eq("client_id", activeClient)
            .eq("type", "count")
            .gte("date", `${auditDate}T00:00:00.000Z`)
            .lte("date", `${auditDate}T23:59:59.999Z`);
        }
  
        if (countsToInsert.length > 0) {
          const { error } = await supabase
            .from("inventory_logs")
            .insert(countsToInsert);
          if (error) throw error;
        }
  
        setInventoryImportSuccess(true);
        setInventoryPasteText("");
        setOverwriteAudit(false);
        await fetchDatabaseData(activeClient);
        alert(
          `✅ Амжилттай! Нийт ${countsToInsert.length} барааны тооллого (${cleanType}: ${auditDate}) хадгалагдлаа.`,
        );
        setTimeout(() => setInventoryImportSuccess(false), 4000);
      } catch (err: any) {
        alert(`Алдаа: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
  
  
  return (
    <>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
                  <h3 className="text-lg font-bold">
                    Борлуулалт Импортлох (Sales Paste)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSampleModal("sales")}
                  className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg"
                >
                  👁️ Загвар харах
                </button>
              </div>

              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                Google Sheets-ээс{" "}
                <strong>Бүтээгдэхүүн, Тоо ширхэг, Орлого</strong> гэсэн 3
                баганыг хуулаад доор шууд хуулж тавина уу.
              </p>

              {salesImportSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-4 flex items-center gap-2.5">
                  <Check className="h-5 w-5" />
                  <p className="text-sm font-semibold">
                    Амжилттай импортлогдлоо!
                  </p>
                </div>
              )}

              {/* 🟢 БОРЛУУЛАЛТЫН ТӨЛӨВ ХАРУУЛАХ ЦЭВЭРХЭН BADGE */}
              <div className="mb-4 p-3 rounded-xl border text-sm bg-slate-950/80 border-slate-800/80 flex items-center gap-2.5">
                {existingSales.length > 0 ? (
                  <>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <p className="text-slate-300 leading-normal">
                      <span className="font-bold text-emerald-400 font-mono">
                        {startDate} ~ {endDate}
                      </span>
                      <span> хооронд нийт </span>
                      <span className="font-black text-white">
                        {existingSales.length.toLocaleString()} ширхэг
                      </span>
                      <span> борлуулалт </span>
                      <span className="font-bold text-emerald-400 font-mono">
                        ({Math.round(existingSalesRevenue).toLocaleString()}₮)
                      </span>
                      <span> бүртгэлтэй байна.</span>
                    </p>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-slate-600 shrink-0" />
                    <p className="text-slate-400">
                      <span className="font-mono">
                        {startDate} ~ {endDate}
                      </span>{" "}
                      хооронд борлуулалт одоогоор бүртгэгдээгүй байна.
                    </p>
                  </>
                )}
              </div>

              <form onSubmit={handleBulkSalesPaste} className="space-y-4">
                <textarea
                  rows={8}
                  value={salesPasteText}
                  onChange={(e) => setSalesPasteText(e.target.value)}
                  placeholder="Жишээ:&#10;Caffe Latte&#9;34&#10;Tiramisu&#9;62"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 font-mono focus:border-emerald-500"
                />

                {/* ☑️ ДАВХАРДЛААС ХАМГААЛАХ OVERWRITE CHECKBOX */}
                {existingSales.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overwriteSales}
                      onChange={(e) => setOverwriteSales(e.target.checked)}
                      className="rounded border-slate-700 accent-amber-500"
                    />
                    <span>
                      Энэ хугацааны ({startDate} - {endDate}){" "}
                      <strong>
                        хуучин борлуулалтыг цэвэрлээд, шинээр дарж оруулах
                      </strong>{" "}
                      (Давхардахаас сэргийлнэ)
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 ${
                    overwriteSales
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                      : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                  }`}
                >
                  <UploadCloud className="h-4 w-4" />
                  {overwriteSales
                    ? "Хуучныг Дарж Шинэчлэх (Overwrite)"
                    : "Орлого Бөөнөөр Оруулах (Import)"}
                </button>
              </form>
            </div>

            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-6 w-6 text-blue-400" />
                  <h3 className="text-lg font-bold">
                    Татан авалт Импортлох (Purchases Paste)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSampleModal("purchases")}
                  className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg"
                >
                  👁️ Загвар харах
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                Google Sheets-ээс{" "}
                <strong>Барааны нэр, Авсан тоо, Нийт өртөг</strong> гэсэн 3
                баганыг хуулаад доор шууд хуулж тавина уу.
              </p>

              {purchaseImportSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-4 flex items-center gap-2.5">
                  <Check className="h-5 w-5" />
                  <p className="text-sm font-semibold">
                    Амжилттай импортлогдлоо!
                  </p>
                </div>
              )}
              {/* 🔵 ТАТАН АВАЛТЫН ТӨЛӨВ ХАРУУЛАХ ЦЭВЭРХЭН BADGE */}
              <div className="mb-4 p-3 rounded-xl border text-sm bg-slate-950/80 border-slate-800/80 flex items-center gap-2.5">
                {existingPurchases.length > 0 ? (
                  <>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <p className="text-slate-300 leading-normal">
                      <span className="font-bold text-blue-400 font-mono">
                        {startDate} ~ {endDate}
                      </span>
                      <span> хооронд нийт </span>
                      <span className="font-black text-white">
                        {existingPurchases.length.toLocaleString()} ширхэг
                      </span>
                      <span> татан авалт </span>
                      <span className="font-bold text-blue-400 font-mono">
                        ({Math.round(existingPurchasesCost).toLocaleString()}₮)
                      </span>
                      <span> бүртгэлтэй байна.</span>
                    </p>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-slate-600 shrink-0" />
                    <p className="text-slate-400">
                      <span className="font-mono">
                        {startDate} ~ {endDate}
                      </span>{" "}
                      хооронд татан авалт одоогоор бүртгэгдээгүй байна.
                    </p>
                  </>
                )}
              </div>

              <form onSubmit={handleBulkPurchasePaste} className="space-y-4">
                <textarea
                  rows={8}
                  value={purchasePasteText}
                  onChange={(e) => setPurchasePasteText(e.target.value)}
                  placeholder="Жишээ:&#10;Milk&#9;10000&#9;58000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 font-mono focus:border-blue-500"
                />

                {/* OVERWRITE CHECKBOX */}
                {existingPurchases.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overwritePurchases}
                      onChange={(e) => setOverwritePurchases(e.target.checked)}
                      className="rounded border-slate-700 accent-amber-500"
                    />
                    <span>
                      Энэ хугацааны хуучин татан авалтыг{" "}
                      <strong>цэвэрлээд, шинээр дарж оруулах</strong>
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 ${
                    overwritePurchases
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                      : "bg-blue-500 hover:bg-blue-400 text-slate-950"
                  }`}
                >
                  <UploadCloud className="h-4 w-4" />
                  {overwritePurchases
                    ? "Хуучныг Дарж Шинэчлэх (Overwrite)"
                    : "Татан авалт Бөөнөөр Нэмэх (Import)"}
                </button>
              </form>
            </div>

            {/* 🗂️ БОСОО ТООЛЛОГО ИМПОРТЛОХ КАРТ */}
            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 col-span-1 md:col-span-2">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-6 w-6 text-teal-400" />
                  <h3 className="text-lg font-bold">
                    Агуулахын Босоо Тооллого (Vertical Audit Paste)
                  </h3>
                </div>
                {/* 👁️ ЗАГВАР ХАРАХ ТОВЧ */}
                <button
                  type="button"
                  onClick={() => setActiveSampleModal("audit")}
                  className="text-xs font-bold text-teal-400 hover:text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  👁️ Загвар харах
                </button>
              </div>

              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                Excel дээрх <strong>[Барааны нэр] болон [Тоо хэмжээ]</strong>{" "}
                гэсэн 2 босоо баганыг хуулаад доор тавина уу. (Хэвтээ 125 багана
                шаардлагагүй).
              </p>

              {inventoryImportSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-4 flex items-center gap-2.5">
                  <Check className="h-5 w-5" />
                  <p className="text-sm font-semibold">
                    Тооллого амжилттай импортлогдож, үлдэгдлүүд шинэчлэгдлээ!
                  </p>
                </div>
              )}

              {/* 📅 ОГНОО БА ТӨРӨЛ СОНГОХ (УХААЛАГ КОНТРОЛ) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Тооллогын Огноо:
                  </label>
                  <input
                    type="date"
                    value={auditDate}
                    onChange={(e) => setAuditDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-bold outline-none focus:border-teal-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Тооллогын Төрөл:
                  </label>
                  <select
                    value={auditType}
                    onChange={(e) =>
                      setAuditType(e.target.value as "start" | "end")
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-teal-400 font-bold outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="start">
                      🟢 Эхний үлдэгдэл (Start Balance)
                    </option>
                    <option value="end">
                      🔴 Эцсийн тооллого (Ending Count)
                    </option>
                  </select>
                </div>
              </div>

              <form onSubmit={handleBulkInventoryPaste} className="space-y-4">
                <textarea
                  rows={8}
                  value={inventoryPasteText}
                  onChange={(e) => setInventoryPasteText(e.target.value)}
                  placeholder="Жишээ:&#10;Matcha powder&#9;41.9&#10;Eggs&#9;5&#10;Hazelnut syrup&#9;833.9"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 font-mono focus:outline-none focus:border-teal-500 leading-normal"
                />

                {/* OVERWRITE CHECKBOX */}
                <label className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteAudit}
                    onChange={(e) => setOverwriteAudit(e.target.checked)}
                    className="rounded border-slate-700 accent-amber-500"
                  />
                  <span>
                    Сонгосон огнооны ({auditDate}){" "}
                    <strong>
                      хуучин тооллогыг цэвэрлээд, шинээр дарж оруулах
                    </strong>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 active:scale-95"
                >
                  <UploadCloud className="h-4 w-4" />
                  Босоо Тооллого Хадгалах (Import Vertical Audit)
                </button>
              </form>
            </div>

            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 col-span-1 md:col-span-2">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 mb-4">
                  <Trash2 className="h-6 w-6 text-rose-400" />
                  <h3 className="text-lg font-bold">
                    Гал тогооны хаягдал бөөнөөр импортлох (Kitchen Logs Paste)
                  </h3>
                </div>

                {/* 👁️ ЖИШЭЭ ХАРАХ ТОВЧ */}
                <button
                  type="button"
                  onClick={() => setActiveSampleModal("kitchen")}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  👁️ Загвар харах
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                Google Sheets-ээс{" "}
                <strong>Огноо, Төрөл, Бараа, Хэмжээ, Тайлбар</strong> гэсэн 5
                баганыг чирж хуулаад доор шууд хуулж тавина уу.
              </p>

              {kitchenImportSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-4 flex items-center gap-2.5">
                  <Check className="h-5 w-5" />
                  <p className="text-sm font-semibold">
                    Гал тогооны хаягдлууд амжилттай импортлогдож, үлдэгдлүүд
                    хасагдлаа!
                  </p>
                </div>
              )}

              {/* STATUS BADGE */}
              <div className="mb-3 p-3 rounded-xl border text-sm font-semibold flex items-center gap-2 bg-slate-950 border-slate-800">
                {existingKitchenCount > 0 ? (
                  <span className="text-rose-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                    🔴{" "}
                    <strong>
                      {startDate} - {endDate}
                    </strong>{" "}
                    хооронд нийт{" "}
                    <strong>{existingKitchenCount} удаагийн зардал</strong>{" "}
                    бүртгэгдсэн байна.
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-600" />⚪{" "}
                    {startDate} - {endDate} хооронд хаягдал бүртгэгдээгүй байна.
                  </span>
                )}
              </div>

              <form onSubmit={handleBulkKitchenLogsPaste} className="space-y-4">
                <textarea
                  rows={6}
                  value={kitchenPasteText}
                  onChange={(e) => setKitchenPasteText(e.target.value)}
                  placeholder="Жишээ:&#10;2026-06-04&#9;Spoilage&#9;Whipped cream&#9;500&#9;Асгарч муудсан"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 font-mono focus:outline-none focus:border-rose-500 leading-normal"
                />

                {/* OVERWRITE CHECKBOX */}
                {existingKitchenCount > 0 && (
                  <label className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overwriteKitchen}
                      onChange={(e) => setOverwriteKitchen(e.target.checked)}
                      className="rounded border-slate-700 accent-amber-500"
                    />
                    <span>
                      Энэ хугацааны хуучин хаягдлыг{" "}
                      <strong>цэвэрлээд, шинээр дарж оруулах</strong>
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
                >
                  <UploadCloud className="h-4 w-4" />
                  Хаягдал Бөөнөөр Шивэх (Import Kitchen Logs)
                </button>
              </form>
            </div>

            {userRole === "owner" && (
              <>
                <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
                      <h3 className="text-lg font-bold">
                        1. Түүхий эд, Үнэ бөөнөөр оруулах
                      </h3>
                    </div>
                    {/* 👁️ ЖИШЭЭ ХАРАХ ТОВЧ */}
                    <button
                      type="button"
                      onClick={() => setActiveSampleModal("ingredients")}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      👁️ Загвар харах
                    </button>
                  </div>
                  <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                    Excel-ээс{" "}
                    <strong>
                      Барааны нэр, Нэгж (мл/гр/ш), Нэгжийн үнэ, Хэвийн нөөц
                      (Par)
                    </strong>{" "}
                    гэсэн 4 баганыг хуулаад доор хуулж тавина уу.
                  </p>

                  {ingredientsImportSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl mb-4 text-sm font-bold">
                      ✅ Түүхий эд, үнийн мэдээлэл амжилттай хадгалагдлаа!
                    </div>
                  )}

                  <form
                    onSubmit={handleBulkIngredientsPaste}
                    className="space-y-4"
                  >
                    <textarea
                      rows={6}
                      value={ingredientsPasteText}
                      onChange={(e) => setIngredientsPasteText(e.target.value)}
                      placeholder="Жишээ:&#10;Milk&#9;ml&#9;5.8&#9;20000&#10;Beans&#9;gram&#9;85&#9;5000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Түүхий эдүүд хадгалах (Import Catalog)
                    </button>
                  </form>
                </div>

                {/* 2. RECIPE / ТЕХНОЛОГИЙН КАРТ SETUP BOX */}
                <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileSpreadsheet className="h-6 w-6 text-purple-400" />
                      <h3 className="text-lg font-bold">
                        2. Технологийн карт (Жор) бөөнөөр оруулах
                      </h3>
                    </div>
                    {/* 👁️ ЖИШЭЭ ХАРАХ ТОВЧ */}
                    <button
                      type="button"
                      onClick={() => setActiveSampleModal("recipes")}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      👁️ Загвар харах
                    </button>
                  </div>
                  <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                    Excel-ээс{" "}
                    <strong>
                      Бүтээгдэхүүн, Орцын нэр, Орцын хэмжээ (гр/мл)
                    </strong>{" "}
                    гэсэн 3 баганыг хуулаад доор хуулж тавина уу.
                  </p>

                  {recipesImportSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl mb-4 text-sm font-bold">
                      ✅ Бүх бүтээгдэхүүний жор амжилттай бүртгэгдлээ!
                    </div>
                  )}

                  <form onSubmit={handleBulkRecipesPaste} className="space-y-4">
                    <textarea
                      rows={6}
                      value={recipesPasteText}
                      onChange={(e) => setRecipesPasteText(e.target.value)}
                      placeholder="Жишээ:&#10;Caffe Latte&#9;Milk&#9;200&#10;Caffe Latte&#9;Beans&#9;16&#10;Chicken Sandwich&#9;Cheese slice&#9;1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 font-mono focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Жор бөөнөөр хадгалах (Import Recipes)
                    </button>
                  </form>
                </div>

                <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 mb-8">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Coffee className="h-6 w-6 text-emerald-400" />
                      <h3 className="text-lg font-bold">
                        Меню / Цэс бөөнөөр оруулах (Products & Selling Prices)
                      </h3>
                    </div>

                    {/* 👁️ ЖИШЭЭ ХАРАХ ТОВЧ */}
                    <button
                      type="button"
                      onClick={() => setActiveSampleModal("products")}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      👁️ Загвар харах
                    </button>
                  </div>
                  <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                    Google Sheets-ээс{" "}
                    <strong>
                      Category (Ангилал), Item (Нэр), Selling Price (Зарах үнэ)
                    </strong>{" "}
                    гэсэн 3 баганыг хуулаад доор paste хийнэ үү.
                  </p>

                  {productsImportSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl mb-4 text-sm font-bold">
                      ✅ Бүх цэсний зарах үнэ амжилттай хадгалагдлаа!
                    </div>
                  )}

                  <form
                    onSubmit={handleBulkProductsPaste}
                    className="space-y-4"
                  >
                    <textarea
                      rows={5}
                      value={productsPasteText}
                      onChange={(e) => setProductsPasteText(e.target.value)}
                      placeholder="Жишээ:&#10;SANDWICH&#9;Chicken Sandwich&#9;8900&#10;COLD COFFEE&#9;Americano /мөстэй/&#9;8500&#10;COLD COFFEE&#9;Caffe latte /мөстэй/&#9;9500"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Цэсний үнийг хадгалах (Import Menu)
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* 🔍 БҮХ 7 ТӨРЛИЙН EXCEL ЖИШЭЭ ХАРУУЛАХ ПОПАП ЦОНХ (MODAL) */}
            {activeSampleModal && (
              <div
                className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setActiveSampleModal(null)}
              >
                <div
                  className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Толгой хэсэг */}
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      📊 Excel / Sheets-ээс хуулах албан ёсны загвар
                    </h3>
                    <button
                      onClick={() => setActiveSampleModal(null)}
                      className="text-slate-400 hover:text-white text-sm font-bold bg-slate-800 px-3 py-1.5 rounded-lg cursor-pointer transition hover:bg-slate-700"
                    >
                      ✕ Хаах
                    </button>
                  </div>

                  <p className="text-sm text-slate-400">
                    Та Excel эсвэл Google Sheets дээрх багануудаа{" "}
                    <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400">
                      Ctrl+C
                    </code>{" "}
                    хийж хуулаад, талбарт{" "}
                    <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400">
                      Ctrl+V
                    </code>{" "}
                    дарж оруулна.
                  </p>

                  {/* ========================================================================= */}
                  {/* 1. БОРЛУУЛАЛТ (SALES) ЗАГВАР */}
                  {/* ========================================================================= */}
                  {activeSampleModal === "sales" && (
                    <div className="space-y-3">
                      <div className="border border-slate-800 rounded-xl overflow-hidden font-mono text-sm text-center">
                        <div className="grid grid-cols-4 bg-slate-950 p-2.5 font-black text-emerald-400 border-b border-slate-800">
                          <span>1. Бүтээгдэхүүн</span>
                          <span>2. Тоо ширхэг</span>
                          <span>3. Нийт орлого (₮)</span>
                          <span>4. Огноо</span>
                        </div>
                        <div className="grid grid-cols-4 p-2.5 bg-[#111827] text-slate-300 border-b border-slate-800">
                          <span>Caffe Latte</span>
                          <span>30</span>
                          <span>285000</span>
                          <span>2026-09-15</span>
                        </div>
                        <div className="grid grid-cols-4 p-2.5 bg-[#111827] text-slate-300">
                          <span>Americano</span>
                          <span>20</span>
                          <span>160000</span>
                          <span>2026-09-15</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                        <p>
                          💡 <strong className="text-slate-200">Санамж:</strong>
                        </p>
                        <p>
                          • Баганын дараалал ямар ч байсан систем толгой
                          мөрөөрөө өөрөө танина.
                        </p>
                        <p>
                          • Хэрэв Огноо баганыг бичилгүй орхивол систем
                          сонгогдсон сарын ({startDate.substring(0, 7)}) огноог
                          өөрөө автоматаар өгнө.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            "Бүтээгдэхүүн\tТоо ширхэг\tНийт орлого\tОгноо\nCaffe Latte\t30\t285000\t2026-09-15\nAmericano\t20\t160000\t2026-09-15",
                          );
                          alert(
                            "Борлуулалтын загвар хуулагдлаа! Одоо талбартаа Ctrl+V дарж тавина уу.",
                          );
                        }}
                        className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        📋 Борлуулалтын загвар хуулах (Copy Sales Template)
                      </button>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* 2. ТАТАН АВАЛТ (PURCHASES) ЗАГВАР */}
                  {/* ========================================================================= */}
                  {activeSampleModal === "purchases" && (
                    <div className="space-y-3">
                      <div className="border border-slate-800 rounded-xl overflow-hidden font-mono text-sm text-center">
                        <div className="grid grid-cols-4 bg-slate-950 p-2.5 font-black text-blue-400 border-b border-slate-800">
                          <span>1. Барааны нэр</span>
                          <span>2. Тоо хэмжээ</span>
                          <span>3. Нийт өртөг (₮)</span>
                          <span>4. Огноо</span>
                        </div>
                        <div className="grid grid-cols-4 p-2.5 bg-[#111827] text-slate-300 border-b border-slate-800">
                          <span>Milk</span>
                          <span>5000</span>
                          <span>27500</span>
                          <span>2026-09-15</span>
                        </div>
                        <div className="grid grid-cols-4 p-2.5 bg-[#111827] text-slate-300">
                          <span>Beans</span>
                          <span>1000</span>
                          <span>85000</span>
                          <span>2026-09-15</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                        <p>
                          💡 <strong className="text-slate-200">Санамж:</strong>
                        </p>
                        <p>
                          • Хүнсний түүхий эдээс гадна сальфетка, аяга, угаалгын
                          саван зэрэг OPEX зардлуудыг хамт хуулж болно.
                        </p>
                        <p>
                          • Хэрэв Огноо баганыг бичилгүй орхивол систем
                          сонгогдсон сарын ({startDate.substring(0, 7)}) огноог
                          өөрөө автоматаар өгнө.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            "Барааны нэр\tТоо хэмжээ\tНийт өртөг\tОгноо\nMilk\t5000\t27500\t2026-09-15\nBeans\t1000\t85000\t2026-09-15",
                          );
                          alert(
                            "Татан авалтын загвар хуулагдлаа! Одоо талбартаа Ctrl+V дарж тавина уу.",
                          );
                        }}
                        className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        📋 Татан авалтын загвар хуулах (Copy Purchases Template)
                      </button>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* 3. АГУУЛАХЫН ТОЛЛОГО (HORIZONTAL INVENTORY AUDIT) ЗАГВАР */}
                  {/* ========================================================================= */}
                  {activeSampleModal === "audit" && (
                    <div className="space-y-3">
                      <div className="border border-slate-800 rounded-xl overflow-hidden font-mono text-sm text-center">
                        <div className="grid grid-cols-2 bg-slate-950 p-2.5 font-black text-teal-400 border-b border-slate-800">
                          <span>1. Барааны нэр (Item Name)</span>
                          <span>2. Тоо хэмжээ (Quantity)</span>
                        </div>
                        <div className="grid grid-cols-2 p-2 bg-[#111827] text-slate-300 border-b border-slate-800">
                          <span>Matcha powder</span>
                          <span>41.9</span>
                        </div>
                        <div className="grid grid-cols-2 p-2 bg-[#111827] text-slate-300 border-b border-slate-800">
                          <span>Eggs</span>
                          <span>5</span>
                        </div>
                        <div className="grid grid-cols-2 p-2 bg-[#111827] text-slate-300">
                          <span>Hazelnut syrup</span>
                          <span>833.9</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                        <p>
                          💡 <strong className="text-slate-200">Заавар:</strong>
                        </p>
                        <p>
                          • Дээрх огноо сонгогчоос <strong>Огноо</strong> болон{" "}
                          <strong>Эхний/Эцсийн</strong> үлдэгдлээ сонгоно.
                        </p>
                        <p>
                          • Excel дээрх 2 баганаа шууд хуулаад талбарт Ctrl+V
                          хийнэ.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          // 📋 Толгой мөртэйгөө хамт хуулагдана:
                          navigator.clipboard.writeText(
                            "Барааны нэр\tТоо хэмжээ\nMatcha powder\t41.9\nEggs\t5\nHazelnut syrup\t833.9\nMilk\t352.4",
                          );
                          alert(
                            "Босоо тооллогын загвар (Толгой мөртэй) хуулагдлаа! Ctrl+V дарж тавина уу.",
                          );
                        }}
                        className="w-full bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/30 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        📋 Босоо тооллогын загвар хуулах (Copy Template with
                        Header)
                      </button>
                    </div>
                  )}
                  {/* ========================================================================= */}
                  {/* 4. ГАЛ ТОГООНЫ ХАЯГДАЛ (KITCHEN LOGS - "OTHER" ОРСОН) ЗАГВАР */}
                  {/* ========================================================================= */}
                  {activeSampleModal === "kitchen" && (
                    <div className="space-y-3">
                      <div className="border border-slate-800 rounded-xl overflow-hidden font-mono text-xs text-center">
                        <div className="grid grid-cols-5 bg-slate-950 p-2 font-black text-rose-400 border-b border-slate-800">
                          <span>1. Огноо</span>
                          <span>2. Төрөл</span>
                          <span>3. Барааны нэр</span>
                          <span>4. Хэмжээ</span>
                          <span>5. Тайлбар</span>
                        </div>
                        <div className="grid grid-cols-5 p-2 bg-[#111827] text-slate-300 border-b border-slate-800">
                          <span>2026-09-15</span>
                          <span className="text-rose-400 font-bold">
                            spoilage
                          </span>
                          <span>Milk</span>
                          <span>1000</span>
                          <span>Өглөө асгарсан</span>
                        </div>
                        <div className="grid grid-cols-5 p-2 bg-[#111827] text-slate-300 border-b border-slate-800">
                          <span>2026-09-15</span>
                          <span className="text-blue-400 font-bold">
                            staff_meal
                          </span>
                          <span>Eggs</span>
                          <span>2</span>
                          <span>Ажилтны хоолонд</span>
                        </div>
                        <div className="grid grid-cols-5 p-2 bg-[#111827] text-slate-300 border-b border-slate-800">
                          <span>2026-09-15</span>
                          <span className="text-purple-400 font-bold">
                            testing
                          </span>
                          <span>Beans</span>
                          <span>50</span>
                          <span>Кофены амталгаа</span>
                        </div>
                        <div className="grid grid-cols-5 p-2 bg-[#111827] text-slate-300">
                          <span>2026-09-15</span>
                          <span className="text-amber-400 font-bold">
                            other
                          </span>
                          <span>Bun</span>
                          <span>1</span>
                          <span>Үзүүлэнгийн тавиурт тавьсан</span>
                        </div>
                      </div>

                      {/* 💡 БҮХ 4 ТӨРЛИЙН САНХҮҮГИЙН НАРИЙН ТАЙЛБАР */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                        <p className="font-bold text-white">
                          📌 Төрөл (Type) сонголт ба санхүүгийн ялгаа:
                        </p>
                        <p>
                          •{" "}
                          <code className="text-rose-400 font-bold">
                            spoilage
                          </code>{" "}
                          (эсвэл <code className="text-rose-400">муудсан</code>
                          ): Хоолны хаягдал $\rightarrow$ COGS-д үлдэж, Татварын
                          хорогдлын албан актад орно (ТЕХ 14-р зүйл).
                        </p>
                        <p>
                          •{" "}
                          <code className="text-blue-400 font-bold">
                            staff_meal
                          </code>{" "}
                          (эсвэл <code className="text-blue-400">хоол</code>):
                          Ажилтны хоол $\rightarrow$ COGS-оос хасагдаж, OPEX
                          (Ажилчдын хоолны зардал) руу шилжинэ.
                        </p>
                        <p>
                          •{" "}
                          <code className="text-purple-400 font-bold">
                            testing
                          </code>{" "}
                          (эсвэл{" "}
                          <code className="text-purple-400">туршилт</code>):
                          Туршилт, шинэ цэс $\rightarrow$ COGS-оос хасагдаж,
                          OPEX (Туршилт, судалгааны зардал) руу шилжинэ.
                        </p>
                        <p>
                          •{" "}
                          <code className="text-amber-400 font-bold">
                            other
                          </code>{" "}
                          (эсвэл <code className="text-amber-400">бусад</code>):
                          Дотоод хэрэгцээ (үзүүлэн, сургалт г.м) $\rightarrow$
                          COGS-оос хасагдаж, OPEX руу шилжинэ.
                        </p>
                        <p className="text-xs text-slate-500 pt-1">
                          *(Хэрэв Огноо баганыг бичилгүй 4 баганаар хуулбал
                          систем сонгосон сарын огноог өөрөө автоматаар өгнө).*
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            "Огноо\tТөрөл\tБарааны нэр\tХэмжээ\tТайлбар\n2026-09-15\tspoilage\tMilk\t1000\tӨглөө асгарсан\n2026-09-15\tstaff_meal\tEggs\t2\tАжилтны хоолонд\n2026-09-15\ttesting\tBeans\t50\tКофены амталгаа\n2026-09-15\tother\tBun\t1\tҮзүүлэнгийн тавиурт тавьсан",
                          );
                          alert(
                            "Гал тогооны хаягдлын загвар (Бүх 4 төрөлтэйгөө) хуулагдлаа! Одоо талбартаа Ctrl+V дарж тавина уу.",
                          );
                        }}
                        className="w-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        📋 Загвар хуулах (Copy Kitchen Logs Template with Other)
                      </button>
                    </div>
                  )}

                  {/* 5. ТҮҮХИЙ ЭД & ҮНЭ (INGREDIENTS CATALOG) */}
                  {activeSampleModal === "ingredients" && (
                    <div className="space-y-3">
                      <div className="border border-slate-800 rounded-xl overflow-hidden font-mono text-sm text-center">
                        <div className="grid grid-cols-4 bg-slate-950 p-2 font-black text-emerald-400 border-b border-slate-800">
                          <span>1. Нэр</span>
                          <span>2. Нэгж (мл/гр/ш)</span>
                          <span>3. Нэгжийн үнэ (₮)</span>
                          <span>4. Хэвийн нөөц (Par)</span>
                        </div>
                        <div className="grid grid-cols-4 p-2 bg-[#111827] text-slate-300 border-b border-slate-800">
                          <span>Milk</span>
                          <span>ml</span>
                          <span>5.8</span>
                          <span>20000</span>
                        </div>
                        <div className="grid grid-cols-4 p-2 bg-[#111827] text-slate-300">
                          <span>Beans</span>
                          <span>gram</span>
                          <span>85</span>
                          <span>5000</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            "Milk\tml\t5.8\t20000\nBeans\tgram\t85\t5000",
                          );
                          alert(
                            "Жишээ хуулагдлаа! Та талбартаа Ctrl+V дарж тавина уу.",
                          );
                        }}
                        className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 py-2 rounded-xl text-sm font-bold transition"
                      >
                        📋 Жишээ хуулах (Copy Test Catalog)
                      </button>
                    </div>
                  )}

                  {/* 6. ТЕХНОЛОГИЙН КАРТ БУЮУ ЖОР (RECIPES) */}
                  {activeSampleModal === "recipes" && (
                    <div className="space-y-3">
                      <div className="border border-slate-800 rounded-xl overflow-hidden font-mono text-sm text-center">
                        <div className="grid grid-cols-3 bg-slate-950 p-2 font-black text-purple-400 border-b border-slate-800">
                          <span>1. Бүтээгдэхүүн</span>
                          <span>2. Орцын нэр</span>
                          <span>3. Орцын хэмжээ</span>
                        </div>
                        <div className="grid grid-cols-3 p-2 bg-[#111827] text-slate-300 border-b border-slate-800">
                          <span>Caffe Latte</span>
                          <span>Milk</span>
                          <span>200</span>
                        </div>
                        <div className="grid grid-cols-3 p-2 bg-[#111827] text-slate-300">
                          <span>Caffe Latte</span>
                          <span>Beans</span>
                          <span>16</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            "Caffe Latte\tMilk\t200\nCaffe Latte\tBeans\t16\nChicken Sandwich\tCheese\t1",
                          );
                          alert(
                            "Жишээ хуулагдлаа! Та талбартаа Ctrl+V дарж тавина уу.",
                          );
                        }}
                        className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 py-2 rounded-xl text-sm font-bold transition"
                      >
                        📋 Жишээ хуулах (Copy Test Recipes)
                      </button>
                    </div>
                  )}

                  {/* 7. МЕНЮ БА ЗАРАХ ҮНЭ (PRODUCTS MENU) */}
                  {activeSampleModal === "products" && (
                    <div className="space-y-3">
                      <div className="border border-slate-800 rounded-xl overflow-hidden font-mono text-sm text-center">
                        <div className="grid grid-cols-3 bg-slate-950 p-2 font-black text-teal-400 border-b border-slate-800">
                          <span>1. Ангилал (Category)</span>
                          <span>2. Бүтээгдэхүүний нэр</span>
                          <span>3. Зарах үнэ (₮)</span>
                        </div>
                        <div className="grid grid-cols-3 p-2 bg-[#111827] text-slate-300 border-b border-slate-800">
                          <span>COFFEE</span>
                          <span>Caffe Latte</span>
                          <span>9500</span>
                        </div>
                        <div className="grid grid-cols-3 p-2 bg-[#111827] text-slate-300">
                          <span>SANDWICH</span>
                          <span>Chicken Sandwich</span>
                          <span>12500</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            "COFFEE\tCaffe Latte\t9500\nCOFFEE\tAmericano\t8000\nSANDWICH\tChicken Sandwich\t12500",
                          );
                          alert(
                            "Жишээ хуулагдлаа! Та талбартаа Ctrl+V дарж тавина уу.",
                          );
                        }}
                        className="w-full bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/30 py-2 rounded-xl text-sm font-bold transition"
                      >
                        📋 Жишээ хуулах (Copy Test Menu)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
    </>
  );
}