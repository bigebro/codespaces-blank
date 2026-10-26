"use client";

import React, { useState, useEffect, useRef, startTransition } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
// @ts-ignore
import * as XLSX from "xlsx";

import {
  TrendingUp,
  Trash2,
  DollarSign,
  Activity,
  AlertTriangle,
  Database,
  Coffee,
  CupSoda,
  Utensils,
  Croissant,
  Package,
  Archive,
  Layers3,
  Save,
  Check,
  FileSpreadsheet,
  UploadCloud,
  Bot,
  ShieldAlert,
  Download,
  Camera,
  ExternalLink,
  Search,
  LayoutDashboard,
  CheckSquare,
  LogOut,
  Smartphone,
  Settings,
  PanelLeftClose,
  Menu,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";
import {
  autoCategorizeProduct,
  evaluateSaleItem,
  sanitizeName,
  transliterate,
} from "../../lib/autoReconcile";
import FinanceTab from "@/features/finance/FinanceTab";
import InventoryTab from "@/features/inventory/InventoryTab";
import { AutoPilotChange } from "@/types/dashboard";
import ImportTab from "@/features/imports/ImportTab";
import TasksTab from "@/features/tasks/TasksTab";
import SettingsTab from "@/features/settings/SettingsTab";
import AiCfoChat from "@/features/ai-cfo/AiCfoChat";
import CheckoutModal from "@/components/shared/CheckoutModal";

export function OperlinkLogo({
  className = "h-8 w-8",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* 1. Brilliant White: Adds a microscopic sheen so the solid shapes look premium, not flat */}
        <linearGradient id="pureWhite" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#f4f4f5" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>

        {/* 2. Optical Fade for the Diagonal Line: Brightest in the center, tapering off perfectly to the tips like a laser beam */}
        <linearGradient
          id="laserLine"
          x1="78"
          y1="434"
          x2="434"
          y2="78"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="30%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>

        {/* 3. Optical Ring: Gives the outer circle a dynamic, glass-like reflection instead of a flat dull gray */}
        <linearGradient
          id="glassRing"
          x1="0"
          y1="0"
          x2="512"
          y2="512"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* --- EXACT ORIGINAL SHAPES --- */}

      {/* Outer Circle */}
      <circle
        cx="256"
        cy="256"
        r="214"
        stroke="url(#glassRing)"
        strokeWidth="2"
      />

      {/* Thick Arcs */}
      <path
        d="M 286.9 351.1 A 100 100 0 0 1 160.9 225.1"
        stroke="url(#pureWhite)"
        strokeWidth="28"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 225.1 160.9 A 100 100 0 0 1 351.1 286.9"
        stroke="url(#pureWhite)"
        strokeWidth="28"
        strokeLinecap="round"
        fill="none"
      />

      {/* Diagonal Line */}
      <line
        x1="78"
        y1="434"
        x2="434"
        y2="78"
        stroke="url(#laserLine)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Center Dot */}
      <circle cx="256" cy="256" r="7" fill="#ffffff" />
    </svg>
  );
}
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

// 🧠 Үгсийн төстэй байдлыг (Fuzzy match) шалгах функц:
function getSimilarity(s1: string, s2: string): number {
  let longer = (s1 || "").toLowerCase().trim();
  let shorter = (s2 || "").toLowerCase().trim();
  if (longer.length < shorter.length) {
    let temp = longer;
    longer = shorter;
    shorter = temp;
  }
  let longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  let costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (
    (longerLength - costs[shorter.length]) / parseFloat(longerLength.toString())
  );
}

// =====================================================================
// ⚡ УНИВЕРСАЛ SKELETON ENGINE (Ачаалж байх үед датаг орлох ухаалаг дүрс)
// =====================================================================

// 1. Тоон үзүүлэлтүүд (Мөнгө, Хувь) харуулах компонент
function LiveMetric({
  isLive,
  isReady,
  liveValue,
  demoValue,
  type = "money", // "money" | "text"
  skeletonClass = "h-8 w-24",
}: {
  isLive: boolean;
  isReady: boolean;
  liveValue: any;
  demoValue: any;
  type?: "money" | "text";
  skeletonClass?: string;
}) {
  // Demo горим
  if (!isLive) {
    return (
      <>
        {type === "money"
          ? `${Math.round(demoValue).toLocaleString()}₮`
          : demoValue}
      </>
    );
  }
  // Live горим боловч дата ирээгүй үед (Skeleton лугших)
  if (!isReady) {
    return (
      <span
        className={`inline-block bg-zinc-800  rounded-md align-middle ${skeletonClass}`}
      />
    );
  }
  // Live дата ирсэн үед
  return (
    <>
      {type === "money"
        ? `${Math.round(liveValue).toLocaleString()}₮`
        : liveValue}
    </>
  );
}

// 2. Жагсаалт (Top Waste гэх мэт) ачаалж байх үеийн Skeleton
function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-zinc-800 pb-4 last:border-0">
          <div className="flex justify-between items-center mb-2">
            <div className="h-4 w-32 bg-zinc-800/80  rounded"></div>
            <div className="h-4 w-20 bg-zinc-800/80  rounded"></div>
          </div>
          <div className="h-3 w-48 bg-zinc-800/60  rounded"></div>
        </div>
      ))}
    </div>
  );
}

function Home() {
  //  add session checking state
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<{
    isExpired: boolean;
    isTrial: boolean;
    plan: string;
    daysLeft: number;
    endDate: string | null;
    formattedEndDate: string;
  } | null>(null);
  const [userClient, setUserClient] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Navigation State
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "operations"
    | "sales"
    | "inventory"
    | "import"
    | "tasks"
    | "settings"
    | "ai_cfo"
  >("dashboard");
  // 2. Динамик Тохиргооны State-үүд
  const [fixedAssets, setFixedAssets] = useState<any[]>([]);
  const [fixedOpexList, setFixedOpexList] = useState<any[]>([]);
  const [initialCash, setInitialCash] = useState("0");
  const [initialBank, setInitialBank] = useState("0");
  const [taxMode, setTaxMode] = useState("auto");

  // 3. Шинэ хөрөнгө, Тогтмол зардал нэмэх form state
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetCost, setNewAssetCost] = useState("");
  const [newAssetMonths, setNewAssetMonths] = useState("60");
  const [newAssetDate, setNewAssetDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  const [newOpexName, setNewOpexName] = useState("");
  const [newOpexCost, setNewOpexCost] = useState("");
  const [newOpexCategory, setNewOpexCategory] = useState("Байр, ашиглалт");
  const [userRole, setUserRole] = useState<string>("Ажилтан");
  const [isOwner, setIsOwner] = useState(false);
  const [shifts, setShifts] = useState<any[]>([]);
  const [activeClient, setActiveClient] = useState<string>("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  }); // Defaults to 1st of the month
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0],
  ); // Defaults to today
  const [workerSearchQuery, setWorkerSearchQuery] = useState("");
  // Database States
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);
  const [salesLogs, setSalesLogs] = useState<any[]>([]);
  const [liveAnalytics, setLiveAnalytics] = useState<any>(null);
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedImageModal, setSelectedImageModal] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);
 const [upsellFeature, setUpsellFeature] = useState<string | null>(null);

  const [kioskLogoUrl, setKioskLogoUrl] = useState<string | null>(null);
  // Form States
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [logType, setLogType] = useState("spoilage");
  const [logQty, setLogQty] = useState("");
  const [logNote, setLogNote] = useState("");
  const [isNonFood, setIsNonFood] = useState(false); // FIXED: Tracks if it is a non-food OPEX purchase
  const [nonFoodName, setNonFoodName] = useState(""); // FIXED: Stores non-food item name

  const [kitchenImportSuccess, setKitchenImportSuccess] = useState(false);
  const [logCost, setLogCost] = useState(""); // NEW: Holds the total purchase cost
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [companyRoles, setCompanyRoles] = useState<any[]>([]);

  const [ingredientsImportSuccess, setIngredientsImportSuccess] =
    useState(false);

  const [recipesImportSuccess, setRecipesImportSuccess] = useState(false);

  const [productsImportSuccess, setProductsImportSuccess] = useState(false);
  const [myPin, setMyPin] = useState("");
  const [invSearch, setInvSearch] = useState("");
  const [invFilter, setInvFilter] = useState<"all" | "low" | "critical">("all");
  const [activeSampleModal, setActiveSampleModal] = useState<string | null>(
    null,
  );
  const [showWasteGuideModal, setShowWasteGuideModal] = useState(false);
  // 1. Давхардлыг арилгаж, хуучныг цэвэрлэх 4 төлөв
  const [overwriteSales, setOverwriteSales] = useState(false);
  const [overwritePurchases, setOverwritePurchases] = useState(false);
  const [overwriteAudit, setOverwriteAudit] = useState(false);
  const [overwriteKitchen, setOverwriteKitchen] = useState(false);
  const [auditDate, setAuditDate] = useState("2026-09-01");
  const [auditType, setAuditType] = useState<"start" | "end">("start");

  // 🎯 Мастер Каталог: Checkbox олноор сонгох & Шинээр нэмэх State-үүд
  const [selectedIngIds, setSelectedIngIds] = useState<string[]>([]);
  const [selectedProdIds, setSelectedProdIds] = useState<string[]>([]);
  const [selectedRecipeProducts, setSelectedRecipeProducts] = useState<
    string[]
  >([]);
  // 🔍 Үнэ өссөн барааг хайх стэйт:
  const [spikeSearch, setSpikeSearch] = useState("");
  // 🚨 Үнийн өсөлтийг хумих/дэлгэх & Маржин хайх стэйтүүд:
  const [isSpikesExpanded, setIsSpikesExpanded] = useState(false);
  const [marginSearch, setMarginSearch] = useState("");
  // 🌐 ОРЧУУЛГЫН ХЯНАЛТЫН СТЭЙТҮҮД (Dashboard)
  const [translationsCache, setTranslationsCache] = useState<
    Record<string, string>
  >({});
  const [editingTranslation, setEditingTranslation] = useState<{
    original: string;
    text: string;
  } | null>(null);
  // ➕ Шинээр 1 бараа / цэс / жор нэмэх Modal State-үүд
  const [showAddIngModal, setShowAddIngModal] = useState(false);
  const [learnedMenus, setLearnedMenus] = useState<any[]>([]);
  const [learnedCategories, setLearnedCategories] = useState<any[]>([]);
  const [newIngForm, setNewIngForm] = useState({
    name: "",
    unit: "гр",
    price: "",
    par: "0",
  });

  // Төлбөрийн цонхны State-үүд:
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutInitialPlan, setCheckoutInitialPlan] =
    useState("professional");
  const [checkoutInitialCycle, setCheckoutInitialCycle] = useState("monthly");
  const [userPhone, setUserPhone] = useState("");
  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);
  // 🌍 УНИВЕРСАЛ 6 АНГИЛАЛ (ЭМОЖИ БА ӨНГӨТЭЙ)
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

  // 🎯 6 АНГИЛЛЫН АНХДАГЧ ГЛОБАЛ МАРЖИН
  const DEFAULT_GLOBAL_MARGINS: Record<string, number> = {
    HOT_BEVERAGE: 82,
    COLD_BEVERAGE: 78,
    FOOD_PREP: 68,
    BAKERY_DESSERT: 75,
    RETAIL_FMCG: 50,
    GENERAL: 70,
  };

  const [categoryMargins, setCategoryMargins] = useState<
    Record<string, number>
  >(DEFAULT_GLOBAL_MARGINS);
  const [customMarginPrices, setCustomMarginPrices] = useState<
    Record<string, number>
  >({});

  // 🎨 Хүснэгт дээр эможитой пайз харуулах туслах функц:
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
  const [addIngToRecipeProduct, setAddIngToRecipeProduct] = useState<
    string | null
  >(null);
  const [quickIngId, setQuickIngId] = useState("");
  const [quickIngAmount, setQuickIngAmount] = useState("");
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  // 📋 ХҮСНЭГТ ДОТРОО ШУУД НЭМЭХ БА ЗАСАХ STATE-ҮҮД (ЦОНХГҮЙ)
  const [productsList, setProductsList] = useState<any[]>([]);
  const [catalogTab, setCatalogTab] = useState<
    "ingredients" | "products" | "recipes"
  >("ingredients");
  const [ingSearch, setIngSearch] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");

  // 1. Түүхий эд: Хүснэгт дотор шинэ мөр нэмэх & мөр засах
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

  // 2. Меню: Хүснэгт дотор шинэ мөр нэмэх & мөр засах
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

  const aliasMap: Record<string, string> = {};

  // ⚡ 0.001 СЕКУНДЭД ШАЛГАХ ХЭТ ХУРДАН ХУВИЛБАР (CPU ХӨЛДӨХГҮЙ)

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
  // 🔗 ШАР САНУУЛГА ДЭЭР СОНГОСОН ЖОРЫГ НАЙДВАРТАЙ ХАДГАЛАХ СТЭЙТ:
  const [mergeSelections, setMergeSelections] = useState<
    Record<string, string>
  >({});
  // ⚡ БҮХ ЦЭСНИЙ ЖОРТОЙ ЭСЭХИЙГ 0.001ms-Д УРЬДЧИЛАН БОДОХ (CPU ГАЦАХГҮЙ)
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

  // 🚨 Түүхий эдийн үнийн өсөлтийн дохио (% бодох):
  const priceSpikeAlerts = React.useMemo(() => {
    const alerts: any[] = [];
    const seenIngs = new Set<string>();

    const currentPurchases = inventoryLogs.filter(
      (l: any) =>
        l.client_id === activeClient &&
        l.type === "purchase" &&
        l.ingredient_id &&
        l.date >= startDate &&
        l.date <= endDate,
    );

    currentPurchases.forEach((p: any) => {
      const ing = ingredients.find((i: any) => i.id === p.ingredient_id);
      if (!ing || !p.quantity || !p.total_cost) return;

      const newUnitP = Math.round(
        parseFloat(p.total_cost) / parseFloat(p.quantity),
      );
      const oldUnitP = parseFloat(ing.unit_price) || 0;

      // Хэрэв үнэ 3%-иас дээш өссөн бол:
      if (oldUnitP > 0 && newUnitP > oldUnitP * 1.03 && !seenIngs.has(ing.id)) {
        seenIngs.add(ing.id);
        const pct = Math.round(((newUnitP - oldUnitP) / oldUnitP) * 100);
        alerts.push({
          id: ing.id,
          name: ing.name,
          oldPrice: oldUnitP,
          newPrice: newUnitP,
          percent: pct,
          unit: ing.unit,
        });
      }
    });

    return alerts;
  }, [inventoryLogs, ingredients, activeClient, startDate, endDate]);
  // 📖 Шинэ жор инлайнаар үүсгэх төлөвүүд
  const [isCreatingRecipeCard, setIsCreatingRecipeCard] = useState(false);
  const [newRecipeNameDraft, setNewRecipeNameDraft] = useState("");
  const [newRecipePriceDraft, setNewRecipePriceDraft] = useState("");
  const [newRecipeItemsDraft, setNewRecipeItemsDraft] = useState<
    Array<{ ingredient_id: string; amount: string }>
  >([]);
  const [draftRecipeIngId, setDraftRecipeIngId] = useState("");
  const [draftRecipeIngAmt, setDraftRecipeIngAmt] = useState("");

  const [autoPilotActivity, setAutoPilotActivity] = useState<{
    totalSales: number;
    changes: AutoPilotChange[];
  } | null>(null);

  const [showChangesModal, setShowChangesModal] = useState(false);

  // ⚡ 1-CLICK ЗӨВ БУЦААХ (UNDO) ФУНКЦ
  const handleSingleUndo = async (changeId: string) => {
    if (!autoPilotActivity) return;
    const targetChange = autoPilotActivity.changes.find(
      (c) => c.id === changeId,
    );
    if (!targetChange || targetChange.reverted) return;

    setLoading(true);

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
    } finally {
      setLoading(false);
    }
  };
  // 🔒 Kiosk түгжээний State-үүд:

  const [isKioskLocked, setIsKioskLocked] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("kiosk_device_locked") === "true") {
      setIsKioskLocked(true);
    }
  }, []);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

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
  // 📥 JSON НӨӨЦ ФАЙЛЫГ УНШИХ & СОНГОЖ СЭРГЭЭХ СТЭЙТҮҮД
  const [jsonBackupModal, setJsonBackupModal] = useState<{
    fileData: any;
    recipesByProduct: Record<string, any[]>;
  } | null>(null);

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
      await fetchDatabaseData(activeClient);
      alert(" Бүх жор амжилттай сэргээгдлээ!");
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

      await fetchDatabaseData(activeClient);
      alert(` "${productName}" амжилттай сэргээгдлээ!`);
    } catch (err: any) {
      alert(`Алдаа гарлаа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🕒 1. БҮТЭЭГДЭХҮҮНИЙ ЖОР ӨӨРЧЛӨГДӨХ БҮРД ТҮҮХ ХАДГАЛАХ (ТӨГС УХААЛАГ ХУВИЛБАР)
  const recordRecipeSnapshot = async (
    productName: string,
    arg2?: "created" | "updated" | "deleted" | any[],
    arg3?: "created" | "updated" | "deleted" | any[],
  ) => {
    // Параметрүүд аль ч дарааллаар орж ирсэн автоматаар зөв ялгах логик:
    let action: "created" | "updated" | "deleted" = "updated";
    let customItems: any[] | undefined = undefined;

    if (typeof arg2 === "string") {
      action = arg2 as "created" | "updated" | "deleted";
      if (Array.isArray(arg3)) customItems = arg3;
    } else if (Array.isArray(arg2)) {
      customItems = arg2;
      if (typeof arg3 === "string")
        action = arg3 as "created" | "updated" | "deleted";
    }

    const currentActor =
      user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Менежер";

    // Хэрэв бэлэн орц өгөөгүй бол одоо баазад байгаа тухайн бүтээгдэхүүний орцуудыг татна
    let itemsToSave = customItems;
    if (!itemsToSave || itemsToSave.length === 0) {
      const prodRecipes = recipes.filter(
        (r: any) =>
          cleanString(r.product_name).toLowerCase() ===
          cleanString(productName).toLowerCase(),
      );
      itemsToSave = prodRecipes.map((r: any) => {
        const ing = ingredients.find((i: any) => i.id === r.ingredient_id);
        return {
          ingredient_id: r.ingredient_id,
          name: ing?.name || "Орц",
          unit: ing?.unit || "гр",
          amount: parseFloat(r.amount) || 0,
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
          amount: parseFloat(it.amount) || 0,
        };
      });
    }

    await supabase.from("recipe_snapshots").insert([
      {
        client_id: activeClient,
        product_name: productName,
        action: action,
        ingredients_snapshot: itemsToSave,
        author: `${currentActor} (Dashboard)`,
      },
    ]);
  };
  const createSnapshotFromDb = recordRecipeSnapshot;

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

  // =========================================================================
  // 🔍 ХАЙЛТТАЙ УХААЛАГ УНАДАГ ЦЭС (SEARCHABLE DROPDOWN)
  // =========================================================================
  function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "-- Сонгоно уу --",
    className = "",
  }: {
    options: Array<{ value: string; label: string; sublabel?: string }>;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
  }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    // Гадуур дарахад цэсийг автоматаар хаах
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find((o) => o.value === value);
    const filtered = options.filter(
      (o) =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase())),
    );

    return (
      <div ref={containerRef} className={`relative ${className}`}>
        {/* Сонгогдсон утгыг харуулах товчлуур */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setSearch("");
          }}
          className="w-full bg-zinc-950 border border-zinc-700 hover:border-zinc-800 rounded-xl px-3 py-2 text-sm text-left text-white flex items-center justify-between gap-2 transition cursor-pointer shadow-sm"
        >
          <span className="truncate font-bold">
            {selectedOption ? (
              selectedOption.label
            ) : (
              <span className="text-zinc-500 font-normal">{placeholder}</span>
            )}
          </span>
          <span className="text-xs text-zinc-500 shrink-0">▼</span>
        </button>

        {/* Хайлттай хөвөгч цэс */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-full min-w-[260px] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-50 p-2 space-y-1.5 animate-in fade-in duration-100">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Нэрээр хайх..."
              className="w-full bg-zinc-950 border border-zinc-800/60 rounded-xl px-3 py-2 text-sm text-white outline-none font-bold placeholder:text-zinc-500"
            />

            <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
              {filtered.length === 0 ? (
                <p className="text-xs text-zinc-500 p-2.5 text-center">
                  Олдсонгүй
                </p>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition flex items-center justify-between cursor-pointer ${
                      opt.value === value
                        ? "bg-zinc-200/30 text-zinc-300 font-bold border border-zinc-800/30"
                        : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-xs text-zinc-500 ml-2 font-mono shrink-0">
                        {opt.sublabel}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Эзний нууц үгээр түгжээг тайлах функц:
  const handleUnlockDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword) return;
    setIsUnlocking(true);
    setUnlockError("");

    try {
      // 1. Одоогийн session-оос эзний жинхэнэ имэйлийг авах
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const ownerEmail = session?.user?.email;

      if (!ownerEmail) {
        // Хэрэв ямар ч имэйл нэвтрээгүй бол шууд нэвтрэх хуудас руу шилжүүлнэ
        sessionStorage.removeItem("kiosk_device_locked");
        router.push("/login");
        return;
      }

      // 2. Эзний нууц үгийг шалгах
      const { error } = await supabase.auth.signInWithPassword({
        email: ownerEmail,
        password: unlockPassword,
      });

      if (error) {
        setUnlockError("❌ Эзний нууц үг буруу байна!");
      } else {
        sessionStorage.removeItem("kiosk_device_locked");
        setIsKioskLocked(false);
        setUnlockPassword("");
      }
    } catch (err: any) {
      setUnlockError(err.message || "Түгжээ тайлахад алдаа гарлаа.");
    } finally {
      setIsUnlocking(false);
    }
  };
  // 2. Сонгосон огноон дахь бодит төлөвүүдийг тоолох (Status Badges)
  const existingSales = salesLogs.filter((s) => {
    if (!s.date || s.client_id !== activeClient) return false;
    const d = s.date.split("T")[0];
    return d >= startDate && d <= endDate;
  });
  const existingSalesRevenue = existingSales.reduce(
    (sum, s) => sum + (parseFloat(s.total_revenue) || 0),
    0,
  );

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

  // 1. Олон сул зай, tab-ийг автоматаар 1 зай болгож цэвэрлэх ("Caffe   Latte" -> "Caffe Latte")
  const cleanCell = (str: string) =>
    (str || "").replace(/[\u00a0\s]+/g, " ").trim();

  // 2. Үг ба тоо хоорондоо наалдсан эсэхийг шалгах (Жишээ нь: "latte30", "талх5", "milk5000")
  const isGluedTextNumber = (str: string) =>
    /[a-zA-Zа-яА-ЯөүӨҮ]{2,}\d+$/.test((str || "").trim());
  // June 2026 Demo Data

  const demoStats: Record<string, any> = {
    "SF Coffee": {
      revenue: 2284400,
      actualCogs: 954823,
      theoCogs: 905438,
      grossMargin: "58.20%",
      opex: 2691832,
      ebit: -1362255,
      netProfit: -1226029,
      netMargin: "-53.67%",
      totalWaste: 203660,
      efficiency: "82.86%",
    },
    "Cafe B": {
      revenue: 4150000,
      actualCogs: 1450000,
      theoCogs: 1380000,
      grossMargin: "65.06%",
      opex: 2100000,
      ebit: 600000,
      netProfit: 540000,
      netMargin: "13.01%",
      totalWaste: 70000,
      efficiency: "95.17%",
    },
  };

  // 💡 Шинэ салбар нээгдэхэд crash болохоос сэргийлэх fallback
  const currentDemoStats = demoStats[activeClient] ||
    demoStats["SF Coffee"] || {
      revenue: 0,
      actualCogs: 0,
      theoCogs: 0,
      grossMargin: "0%",
      opex: 0,
      ebit: 0,
      netProfit: 0,
      netMargin: "0%",
      totalWaste: 0,
      efficiency: "0%",
    };

  const demoWasters: Record<string, any[]> = {
    "SF Coffee": [
      {
        name: "Mango fruit fr.s.",
        unit: "ml",
        impact: 14924,
        notes: "Бүртгэлгүй алдагдал",
      },
      {
        name: "Calpis Water",
        unit: "ш",
        impact: 14000,
        notes: "Зөрүү 4ш илүүдэл",
      },
      {
        name: "Eggs (Өндөг)",
        unit: "ш",
        impact: 10660,
        notes: "Муудаж хаягдсан, оройн хоолонд",
      },
    ],
    "Cafe B": [
      {
        name: "Milk (Сүү)",
        unit: "мл",
        impact: 35000,
        notes: "Сар бүрийн хэвийн хаягдал",
      },
      {
        name: "Beans (Кофе)",
        unit: "гр",
        impact: 20000,
        notes: "Тохиргоо алдагдсан",
      },
      {
        name: "Sugar (Элсэн чихэр)",
        unit: "гр",
        impact: 15000,
        notes: "Уут цоорсон",
      },
    ],
  };

  const demoProducts: Record<string, any[]> = {
    "SF Coffee": [
      {
        name: "Tiramisu",
        sold: 62,
        profit: 369489,
        cost: 5940.5,
        price: 11900,
      },
      {
        name: "Caffe Latte",
        sold: 34,
        profit: 237320,
        cost: 2520,
        price: 9500,
      },
      { name: "Americano", sold: 23, profit: 1360, price: 8000 },
    ],
    "Cafe B": [
      {
        name: "Caffe Latte",
        sold: 120,
        profit: 840000,
        cost: 2520,
        price: 9500,
      },
      { name: "Americano", sold: 95, profit: 630800, cost: 1360, price: 8000 },
      {
        name: "Mango Smoothie",
        sold: 45,
        profit: 335205,
        cost: 5051,
        price: 12500,
      },
    ],
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkUserSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
    } else {
      setUser(session.user);

      // ✍️ ЗАСВАР: Жинхэнэ үүргийг нь шууд авах:
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, client_id, pin_code, phone")
        .eq("id", session.user.id)
        .single();

      if (profile?.phone) {
        setUserPhone(profile.phone);
      } else if (session.user.user_metadata?.phone) {
        setUserPhone(session.user.user_metadata.phone);
      }

      if (profile?.pin_code) {
        setMyPin(profile.pin_code);
      }

      const realBranch = (
        profile?.client_id ||
        session.user.user_metadata?.client_id ||
        "SF Coffee"
      ).trim();

      if (realBranch) {
        setUserClient(realBranch);
        setActiveClient(realBranch);

        // 🔒 Үүргийг цэвэрлэж шалгах:
        const rawRole = (
          profile?.role ||
          session.user.user_metadata?.role ||
          "Ажилтан"
        ).trim();
        const userIsOwner = rawRole.toLowerCase() === "owner";
        setIsOwner(userIsOwner);
        setUserRole(userIsOwner ? "owner" : rawRole); // Бааз дээрх 'Тогооч', 'Бармен' гэдэг нэр нь шууд хадгалагдана

        if (userIsOwner) {
          setActiveTab("dashboard");
        } else {
          setActiveTab("operations");
        }

        fetchDatabaseData(realBranch);
      }
      setIsAuthChecking(false);
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  // Хэрэв нүүр хуудаснаас "Сонгож төлөх" гэж орж ирсэн бол цонхыг шууд нээх:
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("checkout") === "open") {
        setShowCheckoutModal(true);
        if (params.get("plan")) setCheckoutInitialPlan(params.get("plan")!);
        if (params.get("cycle")) setCheckoutInitialCycle(params.get("cycle")!);
        if (params.get("phone")) setUserPhone(params.get("phone")!);
      }
    }
  }, []);

  // 💡 Огноо болон Салбарын дагуу санхүүгийн бодит тооцооллыг анхнаасаа зөв татах
  // ⚡ БҮХ ТОВЧЛУУРЫГ 0ms ХУРДТАЙ БОЛГОХ ХӨНГӨН ФУНКЦ
  const fetchDatabaseData = async (
    clientId?: string,
    start?: string,
    end?: string,
    includeAnalytics: boolean = false, // 👈 Байнга хүнд аналитик дуудахгүй!
    targetTab?: string,
  ) => {
    const targetClient = (clientId || activeClient || userClient || "").trim();
    if (!targetClient) {
      setWorkersList([]);
      return;
    }
    const tabToLoad = targetTab || activeTab;

    try {
      //  Зөвхөн үндсэн өгөгдлийг татах (Маш хурдан 0.1s)
      const [
        { data: ingData },
        { data: recData },
        { data: logData },
        { data: saleData },
        { data: staffData },
        { data: settData },
        { data: prodData },
        { data: lmData },
      ] = await Promise.all([
        supabase
          .from("ingredients")
          .select("*")
          .ilike("client_id", targetClient)
          .order("name", { ascending: true }),
        supabase.from("recipes").select("*").ilike("client_id", targetClient),
        supabase
          .from("inventory_logs")
          .select("*")
          .ilike("client_id", targetClient),
        supabase
          .from("sales_logs")
          .select("*")
          .ilike("client_id", targetClient),
        supabase
          .from("profiles")
          .select("*")
          .ilike("client_id", targetClient)
          .neq("role", "owner"),
        supabase
          .from("client_settings")
          .select("*")
          .ilike("client_id", targetClient)
          .maybeSingle(),
        supabase.from("products").select("*").ilike("client_id", targetClient),
        supabase
          .from("learned_menus")
          .select("*")
          .ilike("client_id", targetClient),
      ]);

      if (ingData) setIngredients(ingData);
      if (recData) {
        setRecipes(recData);
      }
      if (logData) setInventoryLogs(logData);
      if (saleData) setSalesLogs(saleData);
      if (staffData) setWorkersList(staffData);
      if (settData) {
        setInitialCash(settData.initial_cash?.toString() || "0");
        setInitialBank(settData.initial_bank?.toString() || "0");
        setTaxMode(settData.tax_mode || "auto");
        setKioskLogoUrl(settData.logo_url || null);

        // 🎯 Хэрэв эзэн өөрөө маржин тохируулсан бол тэрийг авна, үгүй бол глобал стандартыг авна:
        if (
          settData.category_margins &&
          Object.keys(settData.category_margins).length > 0
        ) {
          setCategoryMargins({
            ...DEFAULT_GLOBAL_MARGINS,
            ...settData.category_margins,
          });
        } else {
          setCategoryMargins(DEFAULT_GLOBAL_MARGINS);
        }
      }
      if (prodData) setProductsList(prodData);
      if (lmData) setLearnedMenus(lmData);

      // 🚀 LAZY LOADING: ЗӨВХӨН "ТОХИРГОО" БА "ДААЛГАВАР" ТАБ РУУ ОРОХОД Л ЭНЭ ХҮНД 7 ХҮСНЭГТИЙГ ТАТНА!
      if (tabToLoad === "settings" || tabToLoad === "tasks") {
        const [
          { data: taskData },
          { data: shiftData },
          { data: rolesData },
          { data: faData },
          { data: opexData },
          { data: lcData },
          { data: transData },
        ] = await Promise.all([
          supabase.from("tasks").select("*").ilike("client_id", targetClient),
          supabase
            .from("shifts")
            .select("*")
            .ilike("client_id", targetClient)
            .order("start_time", { ascending: false }),
          supabase
            .from("company_roles")
            .select("*")
            .ilike("client_id", targetClient),
          supabase
            .from("fixed_assets")
            .select("*")
            .ilike("client_id", targetClient),
          supabase
            .from("fixed_opex")
            .select("*")
            .ilike("client_id", targetClient)
            .eq("is_active", true),
          supabase
            .from("learned_categories")
            .select("*")
            .ilike("client_id", targetClient),
          supabase
            .from("learned_translations")
            .select("*")
            .ilike("client_id", targetClient),
        ]);
        if (taskData) setTasks(taskData);
        if (shiftData) setShifts(shiftData);
        if (rolesData) setCompanyRoles(rolesData);
        if (faData) setFixedAssets(faData);
        if (opexData) setFixedOpexList(opexData);
        if (lcData) setLearnedCategories(lcData);
        if (transData) {
          const tMap: Record<string, string> = {};
          transData.forEach((t: any) => {
            tMap[t.original_text.toLowerCase()] = t.translated_text;
          });
          setTranslationsCache(tMap);
        }
      }

      // 💳 1. Эрх сунгагдсан эсэхийг шалгах

      const { data: tenantData } = await supabase
        .from("tenants")
        .select("status, plan, subscription_end_date, feature_flags")
        .ilike("client_id", targetClient)
        .maybeSingle();

      if (tenantData && tenantData.subscription_end_date) {
        const end = new Date(tenantData.subscription_end_date);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isExpired = diffTime <= 0;
        const isTrial =
          tenantData.status === "trial" || tenantData.plan === "trial";
        const formattedEndDate = `${end.getFullYear()} оны ${end.getMonth() + 1}-р сарын ${end.getDate()}`;

        setTenantInfo({
          isExpired,
          isTrial,
          plan: tenantData.plan || "professional",
          daysLeft,
          endDate: tenantData.subscription_end_date,
          formattedEndDate,
        });

        // ⚡ ШИНЭ ЛОГИК: Хэрэв админ шинээр огноо сунгасан бөгөөд хэрэглэгч хараахан "Хаах" дараагүй бол 1 удаа харуулна
        const ackKey = `ack_sub_${targetClient.toLowerCase().trim()}`;
        const lastAckDate = localStorage.getItem(ackKey);

        if (!lastAckDate) {
          // Анх удаа орж ирж байгаа бол одоогийн огноог цээжилж, зүгээр өнгөрнө
          localStorage.setItem(ackKey, tenantData.subscription_end_date);
        } else if (
          lastAckDate !== tenantData.subscription_end_date &&
          !isTrial
        ) {
          // Хэрэв админ огноог шинэчилсэн бол цонхыг 1 удаа нээнэ!
          setShowUpgradeSuccess(true);
        }
      }

      if (includeAnalytics || tabToLoad === "dashboard") {
        const activeStart = start || startDate;
        const activeEnd = end || endDate;

        // 🔒 1. Session-оос токен авах
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token || "";

        // 🔒 2. URL дээрээс clientId-г ХАССАН, Header-т токен нэмсэн:
        const res = await fetch(
          `/api/analytics?startDate=${encodeURIComponent(activeStart)}T00:00:00.000Z&endDate=${encodeURIComponent(activeEnd)}T23:59:59.999Z`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );
        if (res.ok) {
          const analData = await res.json();
          setLiveAnalytics(analData);
        }
      }
    } catch (err) {
      console.error("Error fetching database:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategoryMargins = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("client_settings").upsert(
        {
          client_id: activeClient,
          category_margins: categoryMargins,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id" },
      );

      if (error) throw error;
      alert(
        " Ангилал тус бүрийн ашгийн маржингийн бодлого амжилттай хадгалагдлаа!",
      );
      // Аналитикийг шинэчлэн бодох
      await fetchDatabaseData(activeClient, startDate, endDate, true);
    } catch (err: any) {
      alert("Маржин хадгалахад алдаа гарлаа: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!activeClient) return;

    // 1. Салбарын нэрээр тусгай суваг үүсгэнэ
    const channelName = `shop-updates-${activeClient.replace(/\s+/g, "_")}`;

    const channel = supabase
      .channel(channelName)
      // ⚡ 2. БААЗААС БИШ, АДМИНААС ШУУД ИРЭХ ДОХИОГ БАРЬЖ АВАХ (Broadcast)
      .on("broadcast", { event: "payment_approved" }, () => {
        console.log("⚡ Админаас шууд дохио ирлээ! Батлагдлаа!");
        fetchDatabaseData(activeClient);
        // 1. ТӨЛБӨРИЙН ЦОНХЫГ АВТОМАТААР ХААХ:
        setShowCheckoutModal(false);
        setShowUpgradeSuccess(true);
          // ⚡ 2. URL ЦЭВЭРЛЭХ (Refresh хийхэд дахиж гарч ирэхээс сэргийлнэ)
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("checkout");
          url.searchParams.delete("plan");
          url.searchParams.delete("cycle");
          url.searchParams.delete("phone");
          window.history.replaceState({}, "", url.pathname + url.search);
        }
      })
      // Бусад жирийн хүснэгтүүдийн шинэчлэлт (Хуучнаараа байна)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_logs" },
        () => fetchDatabaseData(activeClient),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shifts" },
        () => fetchDatabaseData(activeClient),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchDatabaseData(activeClient),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => fetchDatabaseData(activeClient),
      )
      .subscribe((status) => {
        console.log("📡 Холболтын төлөв:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeClient]);

  const cleanNameForMatch = (str: string) => {
    return str
      .replace(/[\r\n\u00a0"'\.]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  // 1. БАРИСТА ГАРААР ЗАРЛАГА БҮРТГЭХ (Зассан)
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNonFood && !selectedIngredientId) return;
    if (isNonFood && !nonFoodName) return;
    if (!logQty) return;

    setLoading(true);
    const parsedQty = parseFloat(logQty);
    const finalQty = isNonFood
      ? Math.abs(parsedQty)
      : logType === "purchase" || logType === "count"
        ? Math.abs(parsedQty)
        : -Math.abs(parsedQty);
    const costValue = logType === "purchase" ? parseFloat(logCost) || 0 : 0;
    const finalType = isNonFood ? "purchase" : logType;
    const currentDate = new Date().toISOString();

    try {
      const { data: logData, error } = await supabase
        .from("inventory_logs")
        .insert([
          {
            client_id: activeClient, //
            ingredient_id: isNonFood ? null : selectedIngredientId,
            non_food_item: isNonFood ? nonFoodName : null,
            quantity: finalQty,
            type: finalType,
            total_cost: costValue,
            notes: logNote || `${finalType} logged manually`,
            date: currentDate, //  Бодит огноо
            worker_name: "Менежер",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (logData) {
        setSelectedIngredientId("");
        setNonFoodName("");
        setIsNonFood(false);
        setLogQty("");
        setLogNote("");
        setLogCost("");
        await fetchDatabaseData(activeClient);
      }
    } catch (err: any) {
      alert(`Бүртгэл хийхэд алдаа гарлаа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ⚡ МОНГОЛЫН ЦАГИЙН БҮСЭЭР БОДИТ ЦАГ, МИНУТЫГ ЗАЛГАЖ ХАДГАЛАХ
  const parseSafeDate = (
    rawDate: string | undefined,
    fallbackIso?: string,
  ): string => {
    const now = new Date();

    // Одоогийн Улаанбаатарын цаг, минут, секундыг авах (HH:mm:ss)
    const timeParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ulaanbaatar",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);

    let targetDay = getLocalDateStr(now);

    if (rawDate) {
      let cleaned = rawDate
        .replace(/[\r\n\u00a0"']/g, "")
        .trim()
        .replace(/[./]/g, "-");
      if (
        cleaned &&
        !cleaned.toLowerCase().includes("date") &&
        !cleaned.toLowerCase().includes("огноо")
      ) {
        const match = cleaned.match(/\d{4}-\d{2}-\d{2}/);
        if (match) targetDay = match[0];
      }
    } else if (fallbackIso) {
      targetDay = fallbackIso.split("T")[0];
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
    productsToReview: Array<{
      name: string;
      category: string;
      method: string;
      price: number;
      isUnknown?: boolean;
    }>;
    productsToUpdateBatch: Array<{
      id: string;
      name: string;
      selling_price: number;
    }>;
    existingChanges: AutoPilotChange[];
    isProcessing: boolean;
  } | null>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("operlink_pending_review");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return null;
  });

  // Стэйт өөрчлөгдөх бүрд sessionStorage-д синхрончлох туслах функц
  const updatePendingReview = (val: any) => {
    setPendingCategoryReview(val);
    if (typeof window !== "undefined") {
      if (val)
        sessionStorage.setItem("operlink_pending_review", JSON.stringify(val));
      else sessionStorage.removeItem("operlink_pending_review");
    }
  };
  // =========================================================================
  // ⚡ ЭЦСИЙН ХАДГАЛАЛТ ХИЙХ ЦӨМ ФУНКЦ (БҮХ НЭРСИЙГ ЖИГДЭЛСЭН)
  // =========================================================================
  const commitFinalSales = async (
    sales: any[],
    newProductsList: any[] = [],
    updates: any[] = [],
    existingChanges: AutoPilotChange[] = [],
  ) => {
    setLoading(true);
    try {
      if (overwriteSales) {
        await supabase
          .from("sales_logs")
          .delete()
          .eq("client_id", activeClient)
          .gte("date", `${startDate}T00:00:00.000Z`)
          .lte("date", `${endDate}T23:59:59.999Z`);
      }

      // Борлуулалт оруулах (хэрэв байгаа бол):
      if (sales && sales.length > 0) {
        const { error: salesErr } = await supabase
          .from("sales_logs")
          .insert(sales);
        if (salesErr) throw salesErr;
      }

      // Шинэ цэсүүдийг каталогт болон learned_categories-д хадгалах:
      let insertedNewProds: any[] = [];
      if (newProductsList && newProductsList.length > 0) {
        const prodBatch = newProductsList.map((p: any) => ({
          client_id: activeClient,
          name: p.name,
          category: p.category,
          selling_price: p.price || 0,
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
          category: p.category,
        }));

        if (learnedCatsToInsert.length > 0) {
          await supabase
            .from("learned_categories")
            .upsert(learnedCatsToInsert, {
              onConflict: "client_id,product_name",
            });
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
          }),
        );

        // 2. Дэлгэц дээрх цэсний үнийг refresh хийлгүй шууд 0ms-д шинэчлэх
        setProductsList((prev) =>
          prev.map((prod) => {
            const up = updates.find((u: any) => u.id === prod.id);
            return up ? { ...prod, selling_price: up.selling_price } : prod;
          }),
        );
      }

      // ⚡ АВТО-ПИЛОТ: Үнэ өөрчлөгдсөн ч бай, Шинэ бараа нэмэгдсэн ч бай ЗААВАЛ МЭДЭГДЭХ!
      const newProductChanges: AutoPilotChange[] = insertedNewProds.map(
        (p: any) => ({
          id: `new-${p.id}-${Date.now()}`,
          productId: p.id,
          productName: p.name,
          type: "NEW_PRODUCT",
          oldName: "Байхгүй",
          newName: `${p.name} (${Number(p.selling_price).toLocaleString()} ₮) [${p.category}]`,
          oldPrice: 0,
          newPrice: Number(p.selling_price),
          oldCategory: p.category || "General",
          reverted: false,
        }),
      );

      const allAutoPilotChanges = [...existingChanges, ...newProductChanges];

      // Хэрэв үнэ өөрчлөгдсөн ЭСВЭЛ шинэ бараа нэмэгдсэн л бол Поп-ап цонхыг асаана!
      if (allAutoPilotChanges.length > 0) {
        setAutoPilotActivity({
          totalSales: sales.length,
          changes: allAutoPilotChanges,
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

  // 💡 Тухайн сонгогдсон салбарын дататай БҮХ саруудыг автоматаар илрүүлж жагсаах

  const availableMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();

    // 1. Зөвхөн борлуулалт орсон саруудыг л авна
    salesLogs
      .filter((s) => s.client_id === activeClient && s.date)
      .forEach((s) => monthsSet.add(s.date.substring(0, 7)));

    // Хэрэв огт борлуулалт ороогүй шинэ салбар бол одоогийн сарыг харуулна
    if (monthsSet.size === 0) {
      monthsSet.add(new Date().toISOString().substring(0, 7));
    }

    return Array.from(monthsSet).sort().reverse();
  }, [salesLogs, activeClient]);

  // Сар сонгох үед тухайн сарын эхний ба эцсийн огноог автоматаар бодож датаг дуудах
  const handleMonthChange = (selectedYearMonth: string) => {
    const [year, month] = selectedYearMonth.split("-").map(Number);

    // Тухайн сарын эхний өдөр: YYYY-MM-01
    const firstDay = `${selectedYearMonth}-01`;

    // Тухайн сарын хамгийн сүүлийн өдрийг автоматаар бодно (28, 30 эсвэл 31)
    const lastDayNum = new Date(year, month, 0).getDate();
    const lastDay = `${selectedYearMonth}-${String(lastDayNum).padStart(2, "0")}`;

    setStartDate(firstDay);
    setEndDate(lastDay);
    fetchDatabaseData(activeClient, firstDay, lastDay);
  };

  // console.log(liveAnalytics?.menu_performance,"menu_performance")
  // console.log(liveAnalytics?.financial_ladder,"financial_ladder")
  // console.log(liveAnalytics?.tax_summary,"tax_summary")
  // console.log(liveAnalytics?.cashflow_summary,"cashflow_summary")
  // console.log(liveAnalytics?.payroll_summary,"payroll_summary")
  // console.log(liveAnalytics?.top_wasters,"top_wasters")
  // console.log(liveAnalytics?.top_expensive,"top_expensive")
  // console.log(liveAnalytics?.all_inventory_data,"all_inventory_data")
  // console.log(liveAnalytics?.wasted_only,"wasted_only")
  // console.log(liveAnalytics?.underpoured_only,"underpoured_only")
  // console.log(liveAnalytics?.menu_performance,"menu_performance")
  // console.log(liveAnalytics?.all_recipes,"all_recipes")
  // console.log(liveAnalytics?.opex_details,"opex_details")
  // console.log(liveAnalytics?.all_timeline_logs,"all_timeline_logs")
  // console.log(liveAnalytics?.recent_shifts,"recent_shifts")
  // console.log(liveAnalytics?.recent_worker_log,"recent_worker_log")
  // console.log(liveAnalytics?.total_waste_loss,"total_waste_loss")
  // console.log(liveAnalytics?.total_unexplained_waste,"total_unexplained_waste")
  // console.log(liveAnalytics?.total_logged_spoilage,"total_logged_spoilage")
  // console.log(liveAnalytics?.total_logged_testing,"total_logged_testing")
  // console.log(liveAnalytics?.total_logged_staff_meal,"total_logged_staff_meal")
  // console.log(liveAnalytics?.total_logged_other,"total_logged_other")
  // console.log(liveAnalytics?.total_surplus_savings,"total_surplus_savings")
  // console.log(liveAnalytics?.efficiency,"efficiency")
  // 🔒 ХЭРЭВ KIOSK ГАЛ ТОГООНЫ ТӨХӨӨРӨМЖӨӨС ОРОХ ГЭЖ БАЙГАА БОЛ ЭНЭ ДЭЛГЭЦ ГАРНА:
  if (isKioskLocked) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900/60 p-8 rounded-3xl border border-zinc-800 shadow-2xl backdrop-blur-md text-center">
      

        
          <p className="text-sm text-zinc-400 mt-1 mb-6">
             Мэдээлэл харахын тулд
            нууц үгээ оруулна уу.
          </p>

          {unlockError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl mb-4 text-sm font-bold">
              {unlockError}
            </div>
          )}

          <form onSubmit={handleUnlockDashboard} className="space-y-4">
            <input
              type="password"
              required
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              placeholder="Нууц үг оруулах..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:border-zinc-700 outline-none text-center tracking-widest"
            />

            <button
              type="submit"
              disabled={isUnlocking}
              className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-black py-3 rounded-xl transition text-sm shadow-lg"
            >
              {isUnlocking
                ? "Шалгаж байна..."
                : "Түгжээ тайлах"}
            </button>
          </form>

          {/* 🔄 ӨӨР ХАЯГААР НЭВТРЭХ: Safari дээр найдвартай гарахын тулд window.location ашиглана */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                sessionStorage.removeItem("kiosk_device_locked");
                router.push("/login");
              }}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition underline underline-offset-4 font-bold"
            >
              Өөр хаягаар нэвтрэх 
            </button>
          </div>

          {/*  📱 KIOSK РУУ БУЦАХ ТОМ ТОВЧИЙГ Link БОЛГОХ: */}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <Link
              href="/kiosk"
              className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              📱 Гал тогооны Kiosk руу буцах
            </Link>
          </div>
        </div>
      </div>
    );
  }
  // ⚡ АЛТАН ХАМГААЛАЛТ: Эрхийг шалгаж дуустал Ажилтны дэлгэцийг огт харуулахгүй
  //   if (loading && userRole !=="owner") {
  //   return (
  //     <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center select-none">
  //       <div className="relative w-12 h-12 flex items-center justify-center mb-4">
  //         <div className="absolute inset-0 bg-zinc-800 rounded-full " />
  //         <div className="h-8 w-8 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin" />
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden text-zinc-100 font-sans antialiased selection:bg-zinc-800">
      {/* ========================================== */}
      {/* 1. LEFT SIDEBAR (БОСОО ЦЭС) */}
      {/* ========================================== */}
      {/* 📱 УТСАН ДЭЭР: Цэс нээлттэй үед арын дэвсгэрийг бүдгэрүүлэх (Backdrop) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 🖥️ БОСОО ЦЭС (Sidebar) */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-40 h-full
          flex flex-col flex-shrink-0 bg-zinc-950 border-zinc-800/80
          transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap
          ${
            isSidebarOpen
              ? "translate-x-0 w-64 border-r"
              : "-translate-x-full w-64 md:translate-x-0 md:w-0 border-r-0"
          }
        `}
      >
        {/* Logo & Close Button Area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="bg-black p-1.5 rounded-xl border border-zinc-700/20 flex items-center justify-center">
              <OperlinkLogo className="h-5 w-5" />
            </div>
          </div>

          {/* 👈 ХУРААХ ТОВЧ */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors md:block"
            title="Цэс хураах"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-1 px-3">
          {isAuthChecking ? (
            /* ⚡ Ачаалж байх үед харагдах зүүн талын Скелетон (Гялсхийхээс хамгаална) */
            <div className="space-y-3  px-2 pt-4">
              <div className="h-10 bg-zinc-800/60 rounded-xl w-full"></div>
              <div className="h-10 bg-zinc-800/60 rounded-xl w-full"></div>
              <div className="h-10 bg-zinc-800/60 rounded-xl w-full"></div>
            </div>
          ) : (
            <>
              <div className="text-xs font-black text-zinc-500 uppercase tracking-widest px-3 mb-2">
                Үйл ажиллагаа
              </div>

              {/* 🚀 AI CFO ЗӨВЛӨХ (LAZY LOAD НЭМСЭН) */}
              {isOwner && (
                <>
                  <button
                    onClick={() => {
                      setActiveTab("dashboard");
                      fetchDatabaseData(
                        activeClient,
                        startDate,
                        endDate,
                        true,
                        "dashboard",
                      );
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "dashboard" ? "bg-zinc-800/60 text-zinc-200" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
                  >
                    <LayoutDashboard className="h-4 w-4" /> Санхүүгийн Самбар
                  </button>
                  <button
                    onClick={() => {
                      startTransition(() => {
                        setActiveTab("ai_cfo");
                        setLoading(true);
                        fetchDatabaseData(
                          activeClient,
                          startDate,
                          endDate,
                          true,
                          "ai_cfo",
                        ); // 👈 CFO нь аналитик шаардана
                      });
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "ai_cfo" ? "bg-zinc-800/60 text-zinc-200" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
                  >
                    <Bot className="h-4 w-4" /> OP Ai
                  </button>
                </>
              )}

              {!isOwner && (
                <button
                  onClick={() => setActiveTab("operations")}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "operations" || (userRole === "barista" && activeTab === "dashboard") ? "bg-zinc-800/60 text-zinc-200" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
                >
                  <Coffee className="h-4 w-4" /> Үйл ажиллагаа
                </button>
              )}

              {!isOwner && (
                <button
                  onClick={() => router.push("/kiosk")}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-300 hover:bg-zinc-800/60 transition-all mt-1"
                >
                  <Smartphone className="h-4 w-4" /> Гал тогооны Kiosk
                </button>
              )}

              <div className="text-xs font-black text-zinc-500 uppercase tracking-widest px-3 mt-6 mb-2">
                Агуулах & Бүртгэл
              </div>

              <button
                onClick={() => {
                  startTransition(() => {
                    setActiveTab("inventory");
                    setLoading(true);
                    fetchDatabaseData(
                      activeClient,
                      startDate,
                      endDate,
                      false,
                      "inventory",
                    ); // 👈 Аналитик татахгүй хурдан онгойно
                  });
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "inventory" ? "bg-zinc-800/60 text-zinc-200" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
              >
                <Database className="h-4 w-4" /> Агуулахын Тооллого
              </button>

              <button
                onClick={() => {
                  startTransition(() => {
                    setActiveTab("import");
                    setLoading(true);
                    fetchDatabaseData(
                      activeClient,
                      startDate,
                      endDate,
                      false,
                      "import",
                    ); // 👈 Аналитик татахгүй хурдан онгойно
                  });
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "import" ? "bg-zinc-800/60 text-zinc-200" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
              >
                <UploadCloud className="h-4 w-4" /> Бөөнөөр Импортлох
              </button>

              {isOwner && (
                <>
                  <div className="text-xs font-black text-zinc-500 uppercase tracking-widest px-3 mt-6 mb-2">
                    Тохиргоо
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("tasks");
                      setLoading(true); // Татах хооронд loading харуулна
                      fetchDatabaseData(
                        activeClient,
                        startDate,
                        endDate,
                        false,
                        "tasks",
                      ); // 👈 Зөвхөн Tasks-ийн хүнд датаг татна
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "tasks" ? "bg-zinc-800/60 text-zinc-200" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
                  >
                    <CheckSquare className="h-4 w-4" /> Ажлын Даалгавар
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("settings");
                      setLoading(true); // Татах хооронд loading харуулна
                      fetchDatabaseData(
                        activeClient,
                        startDate,
                        endDate,
                        false,
                        "settings",
                      ); // 👈 Тохиргооны 10 хүснэгтийг дөнгөж одоо л татна
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "settings" ? "bg-zinc-800/60 text-zinc-200" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
                  >
                    <Settings className="h-4 w-4" /> Системийн Тохиргоо
                  </button>
                </>
              )}
            </>
          )}
        </div>
        {/* ⚡ CHATGPT ЗАГВАРЫН UPGRADE ТОBЧ (Зөвхөн туршилттай үед зүүн цэсэнд ил харагдана) */}
        {tenantInfo?.isTrial && (
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={() => setShowCheckoutModal(true)}
              className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-between shadow-lg transition active:scale-95 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                  <span>Эрх идэвхжүүлэх</span>
              </span>
              <span className="text-xs bg-zinc-950/20 px-1.5 py-0.5 rounded">
                 Авах 
              </span>
            </button>
          </div>
        )}
        {/* User Profile Footer */}
        {user && (
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/30">
            <div className="flex items-center justify-between">
              <div className="overflow-hidden">
                <p className="text-white font-bold text-sm truncate">
                  {user.email}
                </p>
                <p className="text-zinc-500 text-xs uppercase font-bold mt-0.5">
                  {userRole}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                title="Гарах"
                className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ========================================== */}
      {/* 2. MAIN CONTENT WRAPPER */}
      {/* ========================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* TOP HEADER BAR */}
        {/* TOP HEADER BAR */}
        <header className="h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* 👈 HAMBURGER MENU (Зөвхөн цэс хураагдсан үед л гарч ирнэ) */}
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer mr-1 animate-in fade-in zoom-in-95 duration-200"
                title="Цэс дэлгэх"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <select
              value={activeClient}
              onChange={(e) => {
                const selected = e.target.value;
                setActiveClient(selected);
                fetchDatabaseData(selected);
              }}
              className="bg-zinc-900 border border-zinc-700 text-white font-bold text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer focus:border-zinc-700"
            >
              <option value={userClient}>{userClient}</option>
              {/* Хэрэв олон салбартай бол энд map хийж болно */}
            </select>
          </div>

          {/* ⚡ Ачаалж байх үед Header дээр гарч ирэх гоёмсог ногоон цагираг */}

          <div className="flex items-center gap-2 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setIsLive(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!isLive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              Demo
            </button>
            <button
              onClick={() => setIsLive(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${isLive ? "bg-zinc-800 text-white shadow-md" : "text-zinc-400 hover:text-white"}`}
            >
              <Database className="h-3 w-3" /> Live DB
            </button>
          </div>
        </header>
        {/* SCROLLABLE BODY (Tab Contents go here) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative w-full">
          <div className="max-w-7xl mx-auto w-full max-w-full relative">
            {/* 🚨 ЭРХ ДУУССАН ҮЕД ДЭЛГЭЦИЙГ БҮХЭЛД НЬ ТҮГЖИХ (FIXED VIEWPORT LOCK) */}
            {tenantInfo?.isExpired && (
              <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                <ShieldAlert className="h-16 w-16 text-rose-500 mb-4 " />
                <h2 className="text-2xl font-black text-white mb-2">
                  Үйлчилгээний эрх зогссон байна
                </h2>
                <p className="text-zinc-400 text-sm max-w-md mb-6 leading-relaxed">
                  Таны{" "}
                  {tenantInfo.isTrial ? "үнэгүй туршилтын" : "үйлчилгээний"}{" "}
                  хугацаа <strong>{tenantInfo.formattedEndDate}</strong>-нд
                  дууссан байна. Системээ үргэлжлүүлэн ашиглахын тулд эрхээ
                  сунгана уу.
                </p>
                <button
                  onClick={() => setShowCheckoutModal(true)}
                  className="bg-white hover:bg-zinc-200 text-zinc-950 px-8 py-3.5 rounded-2xl font-black transition shadow-lg active:scale-95 cursor-pointer"
                >
                   ЭРХ СЭРГЭЭХ
                </button>
              </div>
            )}

            {/* 🟡 3 ХОНОГ ҮЛДСЭН ҮЕД ХАРАГДАХ ДАРУУХАН ШАР ТУУЗ (Vercel, ChatGPT загвар) */}
            {tenantInfo &&
              tenantInfo.daysLeft <= 3 &&
              !tenantInfo.isExpired && (
                <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 p-3.5 rounded-2xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <span className="text-amber-400 text-base">⚠️</span>
                    <p className="text-xs text-zinc-300">
                      Таны{" "}
                      {tenantInfo.isTrial
                        ? "14 хоногийн туршилт"
                        : `${tenantInfo.plan.toUpperCase()} эрх`}{" "}
                      <strong>{tenantInfo.formattedEndDate}</strong>-нд дуусна.
                      Үйл ажиллагаагаа тасалдуулахгүйн тулд сунгана уу.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(true)}
                    className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-3.5 py-1.5 rounded-xl text-xs transition active:scale-95 shrink-0 shadow cursor-pointer"
                  >
                    {tenantInfo.isTrial
                      ? "Албан ёсны эрх авах ➔"
                      : "Эрх сунгах ➔"}
                  </button>
                </div>
              )}

            <div className="max-w-7xl mx-auto w-full max-w-full">
              {isAuthChecking ? (
                <div className=" space-y-6">
                  {/* 1. Толгой хэсгийн скелетон - Голд нь томорсон цагираг тасралтгүй эргэлдэнэ */}
                  <div className="relative h-24 w-full rounded-2xl border border-zinc-700/50 overflow-hidden flex items-center justify-center">
                    {/* Арын дэвсгэр нь л лугшина (Pulse) */}
                    <div className="absolute inset-0 bg-zinc-800/40 " />

                    {/* Урд талын ногоон цагираг хэзээ ч бүдгэрэхгүй (Relative & Set Middle) */}
                    <div className="relative z-10 flex items-center justify-center">
                      <div className="absolute inset-0 bg-zinc-800 rounded-full " />
                      {/* Арай томруулсан цагираг: h-10 w-10 */}
                      <div className="h-10 w-10 border-[3px] border-zinc-700 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                    </div>
                  </div>

                  {/* 2. Доод талын 4 картын скелетон (Эдгээр нь хэвийн лугшина) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="h-32 bg-zinc-800/40 rounded-2xl w-full border border-zinc-700/50 "></div>
                    <div className="h-32 bg-zinc-800/40 rounded-2xl w-full border border-zinc-700/50 "></div>
                    <div className="h-32 bg-zinc-800/40 rounded-2xl w-full border border-zinc-700/50 "></div>
                    <div className="h-32 bg-zinc-800/40 rounded-2xl w-full border border-zinc-700/50 "></div>
                  </div>

                  {/* 3. Том графикийн скелетон */}
                  <div className="h-96 bg-zinc-800/40 rounded-2xl w-full border border-zinc-700/50 "></div>
                </div>
              ) : (
                <>
                  {/* ========================================================================= */}
                  {/* 1. САНХҮҮГИЙН ХЯНАЛТ (COGS ALIGNMENT & LIVE FEED БҮХИЙ ШИНЭ ИНТЕРФЕЙС)      */}
                  {/* ========================================================================= */}
                  {activeTab === "dashboard" && userRole === "owner" && (
                    <FinanceTab
                      isLive={isLive}
                      activeClient={activeClient}
                      startDate={startDate}
                      endDate={endDate}
                      setStartDate={setStartDate}
                      setEndDate={setEndDate}
                      availableMonths={availableMonths}
                      handleMonthChange={handleMonthChange}
                      priceSpikeAlerts={priceSpikeAlerts}
                      liveAnalytics={liveAnalytics}
                      loading={loading}
                      setLoading={setLoading}
                      productsList={productsList}
                      fetchDatabaseData={fetchDatabaseData}
                      tenantInfo={tenantInfo}
                      setShowWasteGuideModal={setShowWasteGuideModal}
                      setActiveTab={setActiveTab}
                      setCatalogTab={setCatalogTab}
                       setShowCheckoutModal={setShowCheckoutModal}
                       setUpsellFeature = {setUpsellFeature}
                    />
                  )}
              
         {/* 2. AI CFO CHAT TAB (OWNER ONLY) */}

              {userRole === "owner" && (
                <div className={activeTab === "ai_cfo" ? "block" : "hidden"}>
                  {tenantInfo?.plan === "starter" ? (
                    <div className="flex flex-col items-center justify-center h-[75vh] bg-zinc-900/40 rounded-3xl border border-zinc-800 p-6 text-center">
                      <div className="bg-zinc-800/60 p-4 rounded-full mb-4"><Bot className="h-10 w-10 text-zinc-300" /></div>
                    
                      <p className="text-sm text-zinc-200 max-w-md mb-6">
                     Танай бизнесийн бүх датанд суурилсан AI шинжээч. Борлуулалт, орцын өртөг, цэвэр ашгаа гүнзгийрүүлэн шинжлүүлж, шууд асуулт асуух боломжтой
                      </p>
                     <button 
                  onClick={() => {
                    setUpsellFeature("AI CFO Санхүүгийн зөвлөх"); // 👈 Шалтгаан
                    setCheckoutInitialPlan("professional");
                    setShowCheckoutModal(true);
                  }} 
                  className="bg-white hover:bg-zinc-200 text-zinc-950 px-5 py-2.5 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
                >
                  Багц ахиулах
                </button>
                    </div>
                  ) : (
                    <AiCfoChat
                      activeClient={activeClient}
                      startDate={startDate}
                      endDate={endDate}
                    />
                  )}
                </div>
              )}
                  {/* 3.  STAFF PORTAL (INPUTS) */}
                  {activeTab === "operations" && (
                    <div>
                      {/* 🔐 ЗӨВХӨН АЖИЛТАНД ХАРАГДАХ PIN ТОХИРУУЛАХ КАРТ */}
                      {userRole !== "owner" && (
                        <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <p className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                             Миний Kiosk PIN код
                            </p>
                            <p className="text-sm text-zinc-400 mt-0.5">
                              Гал тогооны дундын таблет дээр нэвтрэх нууц код:
                              <span className="ml-2 font-mono font-black text-sm text-zinc-200 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-700">
                                {myPin || "1234 (Анхдагч)"}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                              type="password"
                              maxLength={4}
                              value={myPin}
                              onChange={(e) =>
                                setMyPin(e.target.value.replace(/\D/g, ""))
                              }
                              placeholder="Шинэ PIN (4 тоо)"
                              className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-center text-white font-bold text-sm tracking-widest w-32 focus:border-zinc-700 outline-none"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (myPin.length !== 4) {
                                  alert(
                                    "PIN код заавал 4 оронтой тоо байх ёстой!",
                                  );
                                  return;
                                }
                                const { error } = await supabase
                                  .from("profiles")
                                  .update({ pin_code: myPin })
                                  .eq("id", user.id);
                                if (error) alert(`Алдаа: ${error.message}`);
                                else
                                  alert(
                                    "Таны хувийн PIN код амжилттай солигдлоо! ",
                                  );
                              }}
                              className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-4 py-2 rounded-xl text-sm transition"
                            >
                              Шинэчлэх
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 5. SPREADSHEET BULK STOCK TAKE TAB */}
                  {activeTab === "inventory" && (
                    <InventoryTab
                      activeClient={activeClient}
                      ingredients={ingredients}
                      setIngredients={setIngredients}
                      liveAnalytics={liveAnalytics}
                      loading={loading}
                      fetchDatabaseData={fetchDatabaseData}
                      translationsCache={translationsCache}
                      setTranslationsCache={setTranslationsCache}
                      editingTranslation={editingTranslation}
                      setEditingTranslation={setEditingTranslation}
                    />
                  )}

                  {/* 6. BULK CLIPBOARD PASTE TAB */}

                  {activeTab === "import" && (
                    <ImportTab
                      activeClient={activeClient}
                      startDate={startDate}
                      endDate={endDate}
                      ingredients={ingredients}
                      salesLogs={salesLogs}
                      inventoryLogs={inventoryLogs}
                      productsList={productsList}
                      setProductsList={setProductsList}
                      learnedMenus={learnedMenus}
                      learnedCategories={learnedCategories}
                      userRole={userRole}
                      user={user}
                      loading={loading}
                      setLoading={setLoading}
                      fetchDatabaseData={fetchDatabaseData}
                      setAutoPilotActivity={setAutoPilotActivity}
                      updatePendingReview={updatePendingReview}
                    />
                  )}

                  {/* 7. TASK & ROLE MANAGEMENT TAB */}
                  {activeTab === "tasks" && userRole === "owner" && (
                    <TasksTab
                      activeClient={activeClient}
                      workersList={workersList}
                      companyRoles={companyRoles}
                      tasks={tasks}
                      shifts={shifts}
                      loading={loading}
                      setLoading={setLoading}
                      fetchDatabaseData={fetchDatabaseData}
                      setSelectedImageModal={setSelectedImageModal}
                    />
                  )}

                  {/* DYNAMIC DAILY OPERATIONAL AUDIT TIMELINE */}
                  {userRole === "owner" &&
                    activeTab !== "inventory" &&
                    activeTab !== "import" &&
                    activeTab !== "ai_cfo" &&
                    activeTab !== "operations" &&
                    activeTab !== "sales" &&
                    activeTab !== "dashboard" &&
                    activeTab !== "settings" && (
                      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 mb-8 mt-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-zinc-800">
                          <div>
                            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                              <Activity className="h-5 w-5 text-zinc-200" />
                              Өдөр тутмын үйл ажиллагааны Хяналтын Лог
                            </h3>
                            <p className="text-sm text-zinc-400 mt-1">
                              Ажилтан тус бүрийн хийсэн бүх гүйлгээ, зураг болон
                              баримтын хяналт
                            </p>
                          </div>

                          {/* Date & Worker Range Filter Inputs */}
                          <div className="flex items-center gap-4 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-zinc-400">
                                Ажилтан Хайх:
                              </span>
                              <input
                                type="text"
                                value={workerSearchQuery}
                                onChange={(e) =>
                                  setWorkerSearchQuery(e.target.value)
                                }
                                placeholder="Нэр бичих..."
                                className="bg-transparent text-sm text-white font-bold outline-none border-0 p-0 focus:ring-0 w-36 placeholder:text-zinc-600"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-zinc-400">
                                Эхлэх:
                              </span>
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-sm text-white font-bold outline-none cursor-pointer border-0 p-0"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-zinc-400">
                                Дуусах:
                              </span>
                              <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-sm text-white font-bold outline-none cursor-pointer border-0 p-0"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="overflow-x-auto max-h-[400px]">
                          <table className="w-full text-left">
                            <thead className="sticky top-0 bg-zinc-900/90 backdrop-blur">
                              <tr className="text-zinc-400 text-sm font-bold uppercase border-b border-zinc-800">
                                <th className="pb-3 px-2">Төрөл</th>
                                <th className="pb-3 px-2">Ажилтан</th>
                                <th className="pb-3 px-2">Барааны Нэр</th>
                                <th className="pb-3 px-2 text-right">Хэмжээ</th>
                                <th className="pb-3 px-2 text-right">
                                  Үнэ (Cost)
                                </th>
                                <th className="pb-3 px-2 text-center">
                                  Баримт (Proof)
                                </th>
                                <th className="pb-3 px-2">Тайлбар</th>
                                <th className="pb-3 px-2">Огноо</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-slate-800/50">
                              {inventoryLogs.filter((log) => {
                                const logDate = log.date
                                  ? log.date.split("T")[0]
                                  : "";
                                const dateMatch =
                                  logDate >= startDate && logDate <= endDate;

                                // Live, case-insensitive partial match search logic
                                const workerMatch =
                                  !workerSearchQuery.trim() ||
                                  (log.worker_name || "Үл мэдэгдэх")
                                    .toLowerCase()
                                    .includes(
                                      workerSearchQuery.toLowerCase().trim(),
                                    );

                                return (
                                  dateMatch &&
                                  workerMatch &&
                                  log.client_id === activeClient
                                );
                              }).length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={7}
                                    className="py-8 text-center text-zinc-500 italic"
                                  >
                                    Энэ хугацаанд агуулахын ямар нэгэн хөдөлгөөн
                                    бүртгэгдээгүй байна.
                                  </td>
                                </tr>
                              ) : (
                                inventoryLogs
                                  .filter((log) => {
                                    const logDate = log.date
                                      ? log.date.split("T")[0]
                                      : "";
                                    const dateMatch =
                                      logDate >= startDate &&
                                      logDate <= endDate;

                                    // Same dynamic search matching applied to the mapping loop
                                    const workerMatch =
                                      !workerSearchQuery.trim() ||
                                      (log.worker_name || "Үл мэдэгдэх")
                                        .toLowerCase()
                                        .includes(
                                          workerSearchQuery
                                            .toLowerCase()
                                            .trim(),
                                        );

                                    return (
                                      dateMatch &&
                                      workerMatch &&
                                      log.client_id === activeClient
                                    );
                                  })
                                  .map((log) => {
                                    const ing = ingredients.find(
                                      (i) => i.id === log.ingredient_id,
                                    );
                                    const name = ing
                                      ? ing.name
                                      : log.non_food_item || "Unknown";
                                    const unit = ing ? ing.unit : "ш";
                                    const noteText = (
                                      log.notes || ""
                                    ).toLowerCase();
                                    const isPhotoVerified =
                                      noteText.includes("scan") ||
                                      noteText.includes("e-barimt") ||
                                      noteText.includes("proof") ||
                                      noteText.includes("зураг");

                                    return (
                                      <tr
                                        key={log.id}
                                        className="hover:bg-zinc-900/30"
                                      >
                                        <td className="py-3 px-2">
                                          <span
                                            className={`px-2 py-1 rounded-lg text-sm font-black uppercase ${
                                              log.type === "purchase"
                                                ? "bg-zinc-800/60 text-zinc-300"
                                                : log.type === "count"
                                                  ? "bg-zinc-800/60 text-zinc-300"
                                                  : "bg-rose-500/10 text-rose-400"
                                            }`}
                                          >
                                            {log.type}
                                          </span>
                                        </td>
                                        {/* АЖИЛТАН БАГАНА */}
                                        <td className="py-3 px-2 text-zinc-300 font-medium">
                                          {log.worker_name || "Үл мэдэгдэх"}
                                        </td>
                                        <td className="py-3 px-2 font-bold text-zinc-200">
                                          {name}
                                        </td>
                                        <td className="py-3 px-2 text-right font-semibold">
                                          {Math.abs(
                                            log.quantity,
                                          ).toLocaleString()}{" "}
                                          {unit}
                                        </td>
                                        <td className="py-3 px-2 text-right text-zinc-400">
                                          {log.total_cost
                                            ? `${parseFloat(log.total_cost).toLocaleString()}₮`
                                            : "-"}
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                          {log.image_url ? (
                                            <button
                                              onClick={() =>
                                                setSelectedImageModal({
                                                  url: log.image_url,
                                                  title: `Нотлох баримт: ${name}`,
                                                  subtitle: `${log.worker_name} • ${new Date(log.date).toLocaleString("mn-MN")}`,
                                                })
                                              }
                                              className="bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 px-2.5 py-1 rounded-lg text-sm font-black transition flex items-center gap-1 mx-auto"
                                            >
                                              <Camera className="h-3 w-3" />{" "}
                                              Зураг үзэх
                                            </button>
                                          ) : isPhotoVerified ? (
                                            <span className="bg-zinc-800/60 text-zinc-200 px-2 py-1 rounded-lg text-sm font-bold border border-zinc-700/20">
                                              Баримттай
                                            </span>
                                          ) : log.type === "purchase" ? (
                                            <span className="bg-rose-500/10 text-rose-400 px-2 py-1 rounded-lg text-sm font-bold border border-rose-500/20">
                                              Зураггүй
                                            </span>
                                          ) : (
                                            <span className="text-zinc-500 text-sm italic">
                                              Дотоод
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-3 px-2 text-zinc-400 max-w-[200px] truncate">
                                          {log.notes || "-"}
                                        </td>
                                        <td className="py-3 px-2 text-zinc-400 text-sm font-mono">
                                          {new Date(log.date).toLocaleString(
                                            "mn-MN",
                                            {
                                              year: "numeric",
                                              month: "2-digit",
                                              day: "2-digit",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                              second: "2-digit",
                                              timeZone: "Asia/Ulaanbaatar",
                                            },
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  {/* 8. ⚙️ 100% ДИНАМИК САНХҮҮ, ХӨРӨНГӨ, ТОХИРГООНЫ ТАБ */}
                  {activeTab === "settings" && userRole === "owner" && (
                    <div className="space-y-6">
                      {/* 🟢 ХЭРЭГЛЭГЧИЙН ИДЭВХТЭЙ БАГЦЫН МЭДЭЭЛЭЛ (SETTINGS) */}
                      <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-zinc-200"></span>
                            <h3 className="font-black text-white text-sm uppercase">
                              Идэвхтэй багц:{" "}
                              <span className="text-zinc-200">
                                {tenantInfo?.plan || "Professional"}
                              </span>
                            </h3>
                            {tenantInfo?.isTrial && (
                              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-black">
                                Туршилт
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400">
                            Дараагийн сунгалт:{" "}
                            <strong className="text-zinc-200">
                              {tenantInfo?.formattedEndDate || "2026.11.20"}{" "}
                              хүртэл
                            </strong>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowCheckoutModal(true)}
                          className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition border border-zinc-700 active:scale-95 cursor-pointer"
                        >
                          {tenantInfo?.isTrial ? "Эрх идэвхжүүлэх" : "Хугацаа сунгах"}
                        </button>
                      </div>

                      <SettingsTab
                        user={user}
                        startDate={startDate}
                        endDate={endDate}
                        activeClient={activeClient}
                        salesLogs={salesLogs}
                        learnedMenus={learnedMenus}
                        fixedAssets={fixedAssets}
                        fixedOpexList={fixedOpexList}
                        initialCash={initialCash}
                        setInitialCash={setInitialCash}
                        initialBank={initialBank}
                        setInitialBank={setInitialBank}
                        taxMode={taxMode}
                        setTaxMode={setTaxMode}
                        kioskLogoUrl={kioskLogoUrl}
                        setKioskLogoUrl={setKioskLogoUrl}
                        categoryMargins={categoryMargins}
                        setCategoryMargins={setCategoryMargins}
                        loading={loading}
                        setLoading={setLoading}
                        fetchDatabaseData={fetchDatabaseData}
                        productRecipeStatus={productRecipeStatus}
                        unmappedSales={unmappedSales}
                        handleExportRecipeBackup={handleExportRecipeBackup}
                        handleExportToExcel={handleExportToExcel}
                        handleJsonFileSelect={handleJsonFileSelect}
                        pendingCategoryReview={pendingCategoryReview}
                        updatePendingReview={updatePendingReview}
                        commitFinalSales={commitFinalSales}
                      />
                    </div>
                  )}

                  {/* 📸 FULL-SCREEN EVIDENCE IMAGE VIEWER MODAL */}
                  {selectedImageModal && (
                    <div
                      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
                      onClick={() => setSelectedImageModal(null)}
                    >
                      <div
                        className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                          <div>
                            <h3 className="text-base font-black text-white">
                              {selectedImageModal.title}
                            </h3>
                            {selectedImageModal.subtitle && (
                              <p className="text-sm text-zinc-400 mt-0.5">
                                {selectedImageModal.subtitle}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedImageModal(null)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl text-sm font-bold transition"
                          >
                            ✕ Хаах
                          </button>
                        </div>

                        <div className="flex-1 min-h-0 py-4 flex items-center justify-center overflow-auto">
                          <img
                            src={selectedImageModal.url}
                            alt="Evidence Preview"
                            className="max-h-[65vh] w-auto rounded-2xl object-contain shadow-md border border-zinc-800"
                          />
                        </div>

                        <div className="pt-2 border-t border-zinc-800 flex justify-end">
                          <a
                            href={selectedImageModal.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white hover:bg-zinc-200 text-zinc-950 font-bold px-4 py-2 rounded-xl text-sm transition flex items-center gap-1.5"
                          >
                            <span>Эх хувилбараар нээх</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 💡 UNEXPLAINED WASTE ANALYSIS GUIDE MODAL */}
                  {showWasteGuideModal && (
                    <div
                      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
                      onClick={() => setShowWasteGuideModal(false)}
                    >
                      <div
                        className="bg-zinc-950 border border-zinc-700 rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
                          <div>
                            <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                              <Search className="h-6 w-6 text-zinc-300" />
                              Алдагдлын Шинжилгээний Гарын Авлага
                            </h3>
                            <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
                              Систем дээр үүссэн "Шалтгаангүй алдагдал" нь шууд
                              хулгай гэсэн үг биш юм. Та менежерийн хувиар
                              дараах 4 нөхцөлийг шалгаж эрсдэлийг удирдах
                              боломжтой.
                            </p>
                          </div>
                          <button
                            onClick={() => setShowWasteGuideModal(false)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-xl text-sm font-bold transition"
                          >
                            ✕ Хаах
                          </button>
                        </div>
                        {/* 🤖 AI ЗӨВЛӨХТЭЙ ЯРИЛЦАХ ЗААВАР */}
                        <div className="bg-zinc-800/60 border border-blue-500/30 p-5 rounded-2xl mb-6">
                          <h4 className="font-black text-zinc-300 text-sm flex items-center gap-2 mb-2">
                            <Bot className="h-5 w-5" />
                            AI Зөвлөхөөс хэрхэн асуух вэ? (Хамгийн хурдан арга)
                          </h4>
                          <p className="text-sm text-zinc-300 mb-3 leading-relaxed">
                            Та дээрх алдагдал хулгай мөн эсэхийг өөрөө таах
                            шаардлагагүй. <strong>"🤖 AI Зөвлөх"</strong> таб
                            руу ороод доорх асуултуудаас хуулж асуугаарай. AI
                            өөрөө датаг шинжлээд хулгай юу, эсвэл алдаа юу
                            гэдгийг магадлалаар нь гаргаж өгнө.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                              <p className="text-xs text-zinc-500 font-bold mb-1 uppercase">
                                Жишээ асуулт 1:
                              </p>
                              <p className="text-sm text-white font-mono">
                                "Өнөөдрийн 15,000₮-ийн сүүний алдагдал хулгай
                                юу, эсвэл орц хэтрүүлэлт үү? Шинжилж өг."
                              </p>
                            </div>
                            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                              <p className="text-xs text-zinc-500 font-bold mb-1 uppercase">
                                Жишээ асуулт 2:
                              </p>
                              <p className="text-sm text-white font-mono">
                                "Сүү, Кофе хоёр зэрэгцээд дутсан байна. ПОС дээр
                                бэлэн мөнгөөр зараагүй нуусан хулгай байх
                                магадлалтай юу?"
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* НӨХЦӨЛ 1 */}
                          <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="bg-zinc-800/60 p-2 rounded-xl">
                                <Coffee className="h-5 w-5 text-zinc-200" />
                              </div>
                              <h4 className="font-bold text-zinc-200 text-sm">
                                1. Орц хэтрүүлэлт (Overpouring)
                              </h4>
                            </div>
                            <p className="text-sm text-zinc-400 mb-2">
                              <strong>Шинж тэмдэг:</strong> Аяга бүрээс 10-20мл
                              гэх мэт маш бага хэмжээгээр, тогтмол дутаад байх.
                            </p>
                            <div className="bg-white/5 border-l-2 border-zinc-700 p-2.5 text-sm text-zinc-300/90 rounded-r-lg">
                              <strong>Авах арга хэмжээ:</strong> Бариста нарт
                              сүүний хөөсрүүлэгч савны зураасаар сүүгээ тааруулж
                              хийхийг анхааруулах, кофены бутлагчийн (grinder)
                              граммын тохиргоог дахин жигнэж тааруулах.
                            </div>
                          </div>

                          {/* НӨХЦӨЛ 2 */}
                          <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="bg-zinc-800/60 p-2 rounded-xl">
                                <Layers3 className="h-5 w-5 text-zinc-300" />
                              </div>
                              <h4 className="font-bold text-zinc-200 text-sm">
                                2. Бүртгэхээ мартсан (Forgot Log)
                              </h4>
                            </div>
                            <p className="text-sm text-zinc-400 mb-2">
                              <strong>Шинж тэмдэг:</strong> Ажилтан хоолондоо
                              хэрэглэсэн, эсвэл санамсаргүй асгасан ч Kiosk-д
                              оруулж амжаагүй байх.
                            </p>
                            <div className="bg-blue-500/5 border-l-2 border-blue-500 p-2.5 text-sm text-zinc-300/90 rounded-r-lg">
                              <strong>Авах арга хэмжээ:</strong> Ажилтнаас
                              асуух. Хэрэв асгасан байвал Kiosk руу ороод "1л
                              сүү асгасан" гэж нөхөж оруулахад л системийн энэ
                              алдагдал автоматаар 0 болж засагдана.
                            </div>
                          </div>

                          {/* НӨХЦӨЛ 3 */}
                          <div className="bg-zinc-900 p-5 rounded-2xl border border-rose-900/50 hover:border-rose-500/30 transition md:col-span-2">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="bg-rose-500/10 p-2 rounded-xl">
                                <DollarSign className="h-5 w-5 text-rose-400" />
                              </div>
                              <h4 className="font-bold text-rose-400 text-sm">
                                3. Бэлэн мөнгөний хулгай (Un-rung Sales)
                              </h4>
                            </div>
                            <p className="text-sm text-zinc-400 mb-2">
                              <strong>Шинж тэмдэг:</strong> Системд ямар ч
                              борлуулалт (Орлого) ороогүй мөртлөө Сүү, Кофе үр,
                              Аяга 3 зэрэг дутсан байх.
                            </p>
                            <div className="bg-rose-500/5 border-l-2 border-rose-500 p-2.5 text-sm text-rose-300/90 rounded-r-lg flex flex-col gap-1.5">
                              <span>
                                <strong>Авах арга хэмжээ:</strong> Энэ бол
                                бариста үйлчлүүлэгчээс бэлэн мөнгө аваад ПОС-д
                                шивэлгүй кофе хийж өгсөн хамгийн ноцтой үйлдэл
                                юм.
                              </span>
                              <span>
                                Агуулахын Тооллого цэсний "Үйл ажиллагааны
                                Хяналтын Лог" хэсгээс тооллого дутсан яг тэр цаг
                                мөчийг шүүж, хяналтын камертай (CCTV) тулгаж
                                шалгана уу.
                              </span>
                            </div>
                          </div>

                          {/* НӨХЦӨЛ 4 */}
                          <div className="bg-zinc-900 p-5 rounded-2xl border border-amber-900/50 hover:border-amber-500/30 transition md:col-span-2">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="bg-amber-500/10 p-2 rounded-xl">
                                <AlertTriangle className="h-5 w-5 text-amber-400" />
                              </div>
                              <h4 className="font-bold text-amber-400 text-sm">
                                4. Физик хулгай эсвэл Том асгаралт
                              </h4>
                            </div>
                            <p className="text-sm text-zinc-400 mb-2">
                              <strong>Шинж тэмдэг:</strong> Бүтэн 1 хайрцаг сүү
                              (12л), эсвэл 1 бүтэн уут кофе гэнэт алга болох.
                            </p>
                            <div className="bg-amber-500/5 border-l-2 border-amber-500 p-2.5 text-sm text-amber-300/90 rounded-r-lg">
                              <strong>Авах арга хэмжээ:</strong> Хэрэв Kiosk
                              дээр зурагтай "Хаягдал" бүртгэгдээгүй байвал
                              тухайн ээлжийн ажилтнаас шууд тайлбар нэхэж,
                              хариуцлага тооцох шаардлагатай.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* 📥 JSON НӨӨЦӨӨС БҮГДИЙГ ЭСВЭЛ СОНГОЖ СЭРГЭЭХ ЦОНХ                        */}
                  {/* ========================================================================= */}
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
                                {
                                  Object.keys(jsonBackupModal.recipesByProduct)
                                    .length
                                }
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
                          onClick={handleRestoreAllFromJson}
                          className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-black py-3 rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <span>✓ БҮХ ЖОРЫГ БӨӨНӨӨР НЬ СЭРГЭЭХ</span>
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
                          {Object.keys(jsonBackupModal.recipesByProduct).map(
                            (pName) => {
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
                                    onClick={() =>
                                      handleRestoreSingleRecipe(pName)
                                    }
                                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer"
                                  >
                                    ↩️ Сэргээх
                                  </button>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            {/* ТӨЛБӨРИЙН БЭЛЭН ЦОНХ (CHECKOUT MODAL) */}
            <CheckoutModal
              isOpen={showCheckoutModal}
               onClose={() => {
                setShowCheckoutModal(false);
                setUpsellFeature(null); 
              }}
              clientId={activeClient}
              userPhone={userPhone}
              initialPlan={checkoutInitialPlan}
              initialCycle={checkoutInitialCycle}
              currentPlan={tenantInfo?.plan || "trial"}
              upsellFeature={upsellFeature}
            />
            {/* 🎉 АМЖИЛТТАЙ СУНГАГДСАНЫГ МЭДЭГДЭХ ЦОНХ */}
            {showUpgradeSuccess && (
              <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                <div className="bg-zinc-950 border-2 border-zinc-700 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(16,185,129,0.2)] text-center space-y-4">
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Таны төлбөр баталгаажиж, үйлчилгээний эрх амжилттай
                    сунгагдлаа.
                  </p>

                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl inline-block mt-2 min-w-[200px]">
                    <span className="text-xs text-zinc-500 block uppercase font-bold mb-1">
                      Таны эрх:
                    </span>
                    <span className="text-zinc-200 block font-black text-lg mb-1">
                      {tenantInfo?.formattedEndDate}
                    </span>
                    <span className="text-xs text-zinc-500 block uppercase font-bold">
                      хүртэл нээлттэй
                    </span>
                  </div>

                  <button
                    onClick={async () => {
                      // 1. Дэлгэцээс хаах
                      setShowUpgradeSuccess(false);

                      // 2. Баазаас "модал харуулах" дохиог устгаж цэвэрлэх
                      const { data: tData } = await supabase
                        .from("tenants")
                        .select("feature_flags")
                        .eq("client_id", activeClient)
                        .single();
                      const currentFlags = tData?.feature_flags || {};

                      // show_success_modal-ийг false болгоно
                      const newFlags = {
                        ...currentFlags,
                        show_success_modal: false,
                      };

                      await supabase
                        .from("tenants")
                        .update({ feature_flags: newFlags })
                        .eq("client_id", activeClient);

                      if (tenantInfo?.endDate) {
                        localStorage.setItem(
                          `ack_sub_${activeClient.toLowerCase().trim()}`,
                          tenantInfo.endDate,
                        );
                      }
                    }}
                    className="w-full mt-6 bg-white hover:bg-zinc-200 text-zinc-950 font-black py-3.5 rounded-xl transition shadow-lg active:scale-95 cursor-pointer"
                  >
                    Хаах
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Page() {
  return <Home />;
}
