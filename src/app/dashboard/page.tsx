"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import {
  TrendingUp, Trash2, DollarSign, Activity, AlertTriangle, Database, Coffee, 
  Layers3, Save, Check, FileSpreadsheet, UploadCloud, Bot, 
  ShieldAlert, Download, Camera, ExternalLink, Search,
  LayoutDashboard, CheckSquare, LogOut, Smartphone, Settings,  PanelLeftClose, Menu 
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";
import { exportAuditExcel } from "../../lib/exportAudit";
import { evaluateSaleItem, sanitizeName } from "../../lib/autoReconcile";

function OperlinkLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <defs>
        {/* Хүчний шугамын градиент (Force Vector) */}
        <linearGradient id="vectorGrad" x1="56" y1="456" x2="456" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f59b" stopOpacity="0" />
          <stop offset="30%" stopColor="#00f59b" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="70%" stopColor="#00c8ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#00c8ff" stopOpacity="0" />
        </linearGradient>

        {/* Эрчим хүчний тойрог замын градиент (Link Orbit) */}
        <linearGradient id="energyGrad" x1="56" y1="456" x2="456" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f59b" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#00c8ff" />
        </linearGradient>

        {/* Физик материйн хүрээний градиент (Matter Stators) */}
        <linearGradient id="statorGrad" x1="120" y1="120" x2="392" y2="392" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f59b" />
          <stop offset="30%" stopColor="#005577" />
          <stop offset="70%" stopColor="#005577" />
          <stop offset="100%" stopColor="#00c8ff" />
        </linearGradient>

        {/* Төвийн квант цөмийн гэрэлтэлтийн градиент (Quantum Core Halo) */}
        <radialGradient id="coreHalo" cx="256" cy="256" r="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="25%" stopColor="#00f59b" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00f59b" stopOpacity="0" />
        </radialGradient>

        {/* Неон гэрэлтэлтийн шүүлтүүрүүд (Glow Filters) */}
        <filter id="neonCyan" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#00c8ff" floodOpacity="0.8" />
        </filter>
        <filter id="neonEmerald" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#00f59b" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* 1. OUTER HUD RING (SpaceX сансрын нарийвчлалтай хүрээ) */}
      <circle 
        cx="256" 
        cy="256" 
        r="220" 
        stroke="#00c8ff" 
        strokeOpacity="0.2" 
        strokeWidth="2" 
        strokeDasharray="4 12" 
      />
      {/* HUD-ийн 4 холбоос цэг */}
      <circle cx="411.5" cy="411.5" r="4" fill="#00f59b" />
      <circle cx="100.5" cy="411.5" r="4" fill="#00f59b" />
      <circle cx="100.5" cy="100.5" r="4" fill="#00f59b" />
      <circle cx="411.5" cy="100.5" r="4" fill="#00f59b" />

      {/* 2. THE FORCE VECTOR (Шууд чиглэсэн хүчний вектор шугам) */}
      <line 
        x1="56" 
        y1="456" 
        x2="456" 
        y2="56" 
        stroke="url(#vectorGrad)" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />

      {/* 3. BACK ORBIT (Орбитын арын хагас - Материйн цаагуур эргэх) */}
      <g transform="rotate(-45 256 256)">
        <path 
          d="M 56 256 A 200 60 0 0 1 456 256" 
          stroke="url(#energyGrad)" 
          strokeWidth="10" 
          strokeOpacity="0.4" 
          strokeLinecap="round" 
          fill="none" 
        />
      </g>

      {/* 4. MATTER STATORS (Физик материйн хуваагдсан 'O' цагираг) */}
      <g filter="url(#neonEmerald)">
        {/* Доод талын масс (Bottom Arc: 0.4*PI -> 1.1*PI) */}
        <path 
          d="M 286.9 351.1 A 100 100 0 0 1 160.9 225.1" 
          stroke="url(#statorGrad)" 
          strokeWidth="28" 
          strokeLinecap="round" 
          fill="none" 
        />
        {/* Дээд талын масс (Top Arc: 1.4*PI -> 2.1*PI) */}
        <path 
          d="M 225.1 160.9 A 100 100 0 0 1 351.1 286.9" 
          stroke="url(#statorGrad)" 
          strokeWidth="28" 
          strokeLinecap="round" 
          fill="none" 
        />
      </g>

      {/* Материйн дотоод ховил (Tech Detail Groove) */}
      <path 
        d="M 280.9 349.5 A 100 100 0 0 1 162.7 231.3" 
        stroke="#050a12" 
        strokeWidth="4" 
        strokeLinecap="round" 
        fill="none" 
      />
      <path 
        d="M 231.1 162.5 A 100 100 0 0 1 349.3 280.7" 
        stroke="#050a12" 
        strokeWidth="4" 
        strokeLinecap="round" 
        fill="none" 
      />

      {/* 5. FRONT ORBIT (Орбитын урд хагас - Материйн урдуур гарч ирэх) */}
      <g transform="rotate(-45 256 256)" filter="url(#neonCyan)">
        <path 
          d="M 456 256 A 200 60 0 0 1 56 256" 
          stroke="url(#energyGrad)" 
          strokeWidth="14" 
          strokeLinecap="round" 
          fill="none" 
        />
      </g>

      {/* 6. QUANTUM CORE (Төв дэх цөм - Singularity) */}
      <circle cx="256" cy="256" r="45" fill="url(#coreHalo)" />
      <circle cx="256" cy="256" r="8" fill="#ffffff" filter="url(#neonCyan)" />
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
  return (longerLength - costs[shorter.length]) / parseFloat(longerLength.toString());
}
function AiCfoChatTab({
  activeClient,
  startDate,
  endDate,
}: {
  activeClient: string;
  startDate: string;
  endDate: string;
}) {
  const [cfoChatInput, setCfoChatInput] = useState("");
  const [cfoChatHistory, setCfoChatHistory] = useState<
    { sender: "owner" | "ai"; text: string }[]
  >([]);
  const [isCfoLoading, setIsCfoLoading] = useState(false);

  // ⚡ ХОЛБОЛТ: Хөтчөө refresh хийх шаардлагагүй, шинэ дата орж ирэхэд дэлгэц шууд өөрөө шинэчлэгдэнэ

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfoChatInput.trim()) return;

    const text = cfoChatInput;
    setCfoChatHistory((prev) => [...prev, { sender: "owner", text }]);
    setCfoChatInput("");
    setIsCfoLoading(true);

    try {
      const res = await fetch("/api/kiosk-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantClientId: activeClient,
          workerName: "Owner",
          text: text,
          userRole: "owner",
          // 💡 Сонгосон сарын огноог AI руу илгээнэ:
          startDate: `${startDate}T00:00:00.000Z`,
          endDate: `${endDate}T23:59:59.999Z`,
        }),
      });

      // 💡 1. Хэрэв сервер 400, 429, 500 алдаа буцаасан бол JSON-оор алдааг нь уншина:
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: `HTTP ${res.status} алдаа` }));
        setCfoChatHistory((prev) => [
          ...prev,
          {
            sender: "ai",
            text: `❌ Алдаа: ${errorData.message || res.statusText}`,
          },
        ]);
        return;
      }

      const contentType = res.headers.get("content-type") || "";

      // 2. Хэрэв шууд JSON ирвэл:
      if (contentType.includes("application/json")) {
        const data = await res.json();
        setCfoChatHistory((prev) => [
          ...prev,
          { sender: "ai", text: data.message },
        ]);
      }
      // 3. Хэрэв Stream (Урсгал) ирвэл:
      else if (res.body) {
        setCfoChatHistory((prev) => [...prev, { sender: "ai", text: "" }]);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          setCfoChatHistory((prev) => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                sender: "ai",
                text: accumulatedText,
              };
            }
            return updated;
          });
        }
      }
    } catch (err: any) {
      console.error("Chat Error:", err);
      // 💡 Бодит алдааны тайлбарыг дэлгэцэнд харуулна
      setCfoChatHistory((prev) => [
        ...prev,
        { sender: "ai", text: `❌ Сүлжээний алдаа: ${err.message}` },
      ]);
    } finally {
      setIsCfoLoading(false);
    }
  };

  return (
    <div className="max-w-6xl w-full mx-auto bg-slate-900/40 rounded-3xl border border-slate-800 flex flex-col h-[82vh] shadow-2xl">
      <div className="p-5 border-b border-slate-800 flex items-center gap-3 bg-slate-900 rounded-t-3xl">
        <div className="bg-blue-500/20 p-2 rounded-xl border border-blue-500/30">
          <Bot className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h2 className="font-bold text-white">Operlink - Санхүүгийн Зөвлөх</h2>
          <p className="text-sm text-slate-400">
            Орлого, хаягдал, үнийн бодлогын талаар юу ч асууж болно.
          </p>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {cfoChatHistory.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-10">
            <p className="mb-4">Жишээ асуултууд:</p>
            <ul className="space-y-2 inline-block text-left">
              <li>👉 "Энэ сарын нийт хаягдал хэдэн төгрөг болсон бэ?"</li>
              <li>👉 "Латтены ашгийн маржин хэд байна?"</li>
              <li>👉 "Гүзээлзгэнэтэй шинэ цайны жор зохиож өг"</li>
            </ul>
          </div>
        )}
        {/* Чатны түүх харуулах хэсэг */}
        {cfoChatHistory.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.sender === "owner" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] p-4 text-sm leading-relaxed ${
                msg.sender === "owner"
                  ? "bg-blue-600 text-white rounded-2xl rounded-tr-none shadow-lg"
                  : "bg-slate-900 text-slate-200 rounded-2xl rounded-tl-none border border-slate-800 shadow-xl overflow-x-auto"
              }`}
            >
              {msg.sender === "owner" ? (
                msg.text
              ) : (
                /* 🚀 MARKDOWN ХҮСНЭГТИЙГ ГОЁМСОГ БОЛГОН ХУВИРГАХ ХЭСЭГ */
                <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node, ...props }) => (
                        <table
                          className="w-full my-3 border-collapse border border-slate-800 text-sm rounded-xl overflow-hidden"
                          {...props}
                        />
                      ),
                      thead: ({ node, ...props }) => (
                        <thead
                          className="bg-slate-950 text-emerald-400 border-b border-slate-800 font-bold"
                          {...props}
                        />
                      ),
                      th: ({ node, ...props }) => (
                        <th
                          className="border border-slate-800 px-3 py-2 text-left font-black"
                          {...props}
                        />
                      ),
                      td: ({ node, ...props }) => (
                        <td
                          className="border border-slate-800/80 px-3 py-1.5 text-slate-300 font-medium"
                          {...props}
                        />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3
                          className="text-sm font-black text-white mt-3 mb-1 flex items-center gap-1.5"
                          {...props}
                        />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul
                          className="list-disc list-inside space-y-1 my-2"
                          {...props}
                        />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-bold text-white" {...props} />
                      ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isCfoLoading && (
          <div className="text-blue-400 text-sm animate-pulse font-bold">
            AI бичиж байна...
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-900 rounded-b-3xl border-t border-slate-800">
        <form onSubmit={handleChatSubmit} className="flex gap-3">
          <input
            type="text"
            value={cfoChatInput}
            onChange={(e) => setCfoChatInput(e.target.value)}
            placeholder="Асуултаа энд бичнэ үү..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
          />
          <button
            type="submit"
            disabled={isCfoLoading || !cfoChatInput.trim()}
            className="bg-blue-500 text-white px-5 py-3 rounded-xl disabled:opacity-50 transition shadow-lg hover:bg-blue-400 font-bold text-sm"
          >
            Илгээх
          </button>
        </form>
      </div>
    </div>
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
  skeletonClass = "h-8 w-24"
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
    return <>{type === "money" ? `${Math.round(demoValue).toLocaleString()}₮` : demoValue}</>;
  }
  // Live горим боловч дата ирээгүй үед (Skeleton лугших)
  if (!isReady) {
    return <span className={`inline-block bg-slate-800 animate-pulse rounded-md align-middle ${skeletonClass}`} />;
  }
  // Live дата ирсэн үед
  return <>{type === "money" ? `${Math.round(liveValue).toLocaleString()}₮` : liveValue}</>;
}

// 2. Жагсаалт (Top Waste гэх мэт) ачаалж байх үеийн Skeleton
function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-slate-800 pb-4 last:border-0">
          <div className="flex justify-between items-center mb-2">
            <div className="h-4 w-32 bg-slate-800/80 animate-pulse rounded"></div>
            <div className="h-4 w-20 bg-slate-800/80 animate-pulse rounded"></div>
          </div>
          <div className="h-3 w-48 bg-slate-800/60 animate-pulse rounded"></div>
        </div>
      ))}
    </div>
  );
}

function Home() {
  //  add session checking state
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userClient, setUserClient] = useState<string>("SF Coffee");
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
  const [activeClient, setActiveClient] = useState<string | "Cafe B">(
    userClient,
  );
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
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskRole, setNewTaskRole] = useState("Бариста ☕");
  const [newTaskWeight, setNewTaskWeight] = useState("");
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
  // Bulk Edit State (The "Google Sheets" Feel)
  const [bulkStock, setBulkStock] = useState<Record<string, string>>({});
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Bulk Paste / Clipboard Parser States
  const [salesPasteText, setSalesPasteText] = useState("");
  const [purchasePasteText, setPurchasePasteText] = useState("");
  const [inventoryPasteText, setInventoryPasteText] = useState("");
  const [salesImportSuccess, setSalesImportSuccess] = useState(false);
  const [purchaseImportSuccess, setPurchaseImportSuccess] = useState(false);
  const [inventoryImportSuccess, setInventoryImportSuccess] = useState(false);

  // Form States
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [logType, setLogType] = useState("spoilage");
  const [logQty, setLogQty] = useState("");
  const [logNote, setLogNote] = useState("");
  const [isNonFood, setIsNonFood] = useState(false); // FIXED: Tracks if it is a non-food OPEX purchase
  const [nonFoodName, setNonFoodName] = useState(""); // FIXED: Stores non-food item name
  const [kitchenPasteText, setKitchenPasteText] = useState(""); // NEW
  const [kitchenImportSuccess, setKitchenImportSuccess] = useState(false); // NEW
  const [logCost, setLogCost] = useState(""); // NEW: Holds the total purchase cost
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [companyRoles, setCompanyRoles] = useState<any[]>([]);
  const [newRoleInput, setNewRoleInput] = useState("");
  const [ingredientsPasteText, setIngredientsPasteText] = useState("");
  const [ingredientsImportSuccess, setIngredientsImportSuccess] =
    useState(false);
  const [recipesPasteText, setRecipesPasteText] = useState("");
  const [recipesImportSuccess, setRecipesImportSuccess] = useState(false);
  const [productsPasteText, setProductsPasteText] = useState("");
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

  // ➕ Шинээр 1 бараа / цэс / жор нэмэх Modal State-үүд
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

const unmappedSales = React.useMemo(() => {
    // Зөвхөн Менюд ч байхгүй, Жоронд ч байхгүй ховор тохиолдлыг л шүүнэ:
    const productNames = new Set(productsList.map((p: any) => cleanString(p.name).toLowerCase().trim()));
    const missingItems: any[] = [];
    const seen = new Set<string>();

    salesLogs
      .filter((s: any) => s.client_id === activeClient)
      .forEach((s: any) => {
        const rawName = cleanString(s.product_name);
        const pNameLower = rawName.toLowerCase();

        // Хэрэв авто-пилотоос гадуур үлдсэн бол л оруулна:
        if (!productNames.has(pNameLower) && !aliasMap[pNameLower] && !seen.has(pNameLower)) {
          seen.add(pNameLower);
          const calculatedPrice = s.quantity_sold > 0 ? Math.round(s.total_revenue / s.quantity_sold) : 0;
          missingItems.push({
            name: s.product_name,
            soldCount: s.quantity_sold,
            unitPrice: calculatedPrice
          });
        }
      });

    return missingItems;
  }, [salesLogs, productsList, activeClient, aliasMap]);

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
  const [newRecipeNameDraft, setNewRecipeNameDraft] = useState('');
  const [newRecipePriceDraft, setNewRecipePriceDraft] = useState('');
  const [newRecipeItemsDraft, setNewRecipeItemsDraft] = useState<Array<{ ingredient_id: string; amount: string }>>([]);
  const [draftRecipeIngId, setDraftRecipeIngId] = useState('');
  const [draftRecipeIngAmt, setDraftRecipeIngAmt] = useState('');
  // 🔗 АЛХАМ 2: ЖОРГҮЙ МЕНЮГ БЭЛЭН ЖОРТОЙ НЭГТГЭЖ ХОЛБОХ ФУНКЦ
  const handleIntegrateMenuWithRecipe = async (menuProductName: string, existingRecipeName: string) => {
    if (!menuProductName || !existingRecipeName) return;
    setLoading(true);

    const cleanMenuName = cleanString(menuProductName);
    const cleanRecipeName = cleanString(existingRecipeName);

    // 1. Сонгосон хуучин жорын бүх орцуудыг олох
    const sourceRecipeRows = recipes.filter(
      (r: any) => cleanString(r.product_name).toLowerCase() === cleanRecipeName.toLowerCase()
    );

    if (sourceRecipeRows.length > 0) {
      // 2. Тэр жорын орцуудыг шинэ Менюний нэр дээр хуулж холбох (Recipes хүснэгтэд оруулах)
      const newRecipeRows = sourceRecipeRows.map((r: any) => ({
        client_id: activeClient,
        product_name: cleanMenuName,
        ingredient_id: r.ingredient_id,
        amount: parseFloat(r.amount) || 0,
      }));

      await supabase.from("recipes").upsert(newRecipeRows, {
        onConflict: "client_id,product_name,ingredient_id",
      });

      // 3. Төстэй нэрийг толь (aliasMap)-д мөнх хадгалах
      aliasMap[cleanMenuName.toLowerCase()] = cleanRecipeName.toLowerCase();
    }

    setLoading(false);
    fetchDatabaseData(activeClient);
    alert(`✅ "${cleanMenuName}" цэсийг "${cleanRecipeName}"-ийн жортой амжилттай холболоо!`);
  };



 interface AutoPilotChange {
    id: string;
    productId: string;
    productName: string;
    type: 'NAME_MERGE' | 'PRICE_UPDATE' | 'VARIANT_ADDED' | 'NEW_PRODUCT'; 
    oldName: string;
    newName: string;
    oldPrice: number;
    newPrice: number;
    oldCategory: string;
    reverted: boolean;
  }

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
        // Шинээр нэмэгдсэн барааг устгана:
        await supabase
          .from('products')
          .delete()
          .eq('client_id', activeClient)
          .eq('id', targetChange.productId);

        setProductsList(prev => prev.filter(p => p.id !== targetChange.productId));
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
        .select("role, client_id, pin_code")
        .eq("id", session.user.id)
        .single();

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
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  // 💡 Огноо болон Салбарын дагуу санхүүгийн бодит тооцооллыг анхнаасаа зөв татах
// ⚡ БҮХ ТОВЧЛУУРЫГ 0ms ХУРДТАЙ БОЛГОХ ХӨНГӨН ФУНКЦ
  const fetchDatabaseData = async (
    clientId?: string,
    start?: string,
    end?: string,
    includeAnalytics: boolean = false // 👈 Байнга хүнд аналитик дуудахгүй!
  ) => {
    const targetClient = clientId || activeClient || userClient;
    if (!targetClient) return;

    try {
      // 1. Зөвхөн үндсэн өгөгдлийг татах (Маш хурдан 0.1s)
      const [
        { data: ingData },
        { data: recData },
        { data: logData },
        { data: saleData },
        { data: taskData },
        { data: shiftData },
        { data: staffData },
        { data: rolesData },
        { data: faData },
        { data: opexData },
        { data: settData },
        { data: prodData }
      ] = await Promise.all([
        supabase.from("ingredients").select("*").ilike("client_id", targetClient).order("name", { ascending: true }),
        supabase.from("recipes").select("*").ilike("client_id", targetClient),
        supabase.from("inventory_logs").select("*").ilike("client_id", targetClient),
        supabase.from("sales_logs").select("*").ilike("client_id", targetClient),
        supabase.from("tasks").select("*").ilike("client_id", targetClient),
        supabase.from("shifts").select("*").ilike("client_id", targetClient).order("start_time", { ascending: false }),
        supabase.from("profiles").select("*").ilike("client_id", targetClient.trim()).neq("role", "owner"),
        supabase.from("company_roles").select("*").ilike("client_id", targetClient),
        supabase.from("fixed_assets").select("*").ilike("client_id", targetClient),
        supabase.from("fixed_opex").select("*").ilike("client_id", targetClient).eq("is_active", true),
        supabase.from("client_settings").select("*").ilike("client_id", targetClient).maybeSingle(),
        supabase.from("products").select("*").ilike("client_id", targetClient)
      ]);

      if (faData) setFixedAssets(faData);
      if (opexData) setFixedOpexList(opexData);
      if (settData) {
        setInitialCash(settData.initial_cash?.toString() || "0");
        setInitialBank(settData.initial_bank?.toString() || "0");
        setTaxMode(settData.tax_mode || "auto");
      }

      if (ingData) setIngredients(ingData);
      if (logData) setInventoryLogs(logData);
      if (saleData) setSalesLogs(saleData);
      if (recData) {
        setRecipes(recData);
      }
      if (taskData) setTasks(taskData);
      if (shiftData) setShifts(shiftData);
      if (staffData) setWorkersList(staffData);
      if (rolesData) setCompanyRoles(rolesData);
      if (prodData) setProductsList(prodData);

      // 2. Хүнд аналитикийг ЗӨВХӨН эзэн Санхүүгийн таб дээр байгаа үед л дуудна!
      if (includeAnalytics || activeTab === "dashboard") {
        const activeStart = start || startDate;
        const activeEnd = end || endDate;
        const res = await fetch(
          `/api/analytics?clientId=${encodeURIComponent(targetClient)}&startDate=${encodeURIComponent(activeStart)}T00:00:00.000Z&endDate=${encodeURIComponent(activeEnd)}T23:59:59.999Z`,
          { cache: "no-store" }
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

  useEffect(() => {
    if (!activeClient) return;

    const channel = supabase
      .channel("realtime-dashboard-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_logs" },
        () => {
          fetchDatabaseData(activeClient);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shifts" },
        () => {
          fetchDatabaseData(activeClient);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchDatabaseData(activeClient);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          fetchDatabaseData(activeClient);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeClient]);

  const lowStockItems = ingredients.filter(
    (i: any) => parseFloat(i.current_stock) <= 50,
  );

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
            client_id: activeClient, // ✅
            ingredient_id: isNonFood ? null : selectedIngredientId,
            non_food_item: isNonFood ? nonFoodName : null,
            quantity: finalQty,
            type: finalType,
            total_cost: costValue,
            notes: logNote || `${finalType} logged manually`,
            date: currentDate, // ✅ Бодит огноо
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

  // 2. GRID ТООЛЛОГО БӨӨНӨӨР ХАДГАЛАХ (Зассан)
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


  // 💡 ОГНООГ 100% АЛДААГҮЙ УНШИГЧ (Цэг, зураас, ташуу зураас бүгдийг танина)
  const parseSafeDate = (
    rawDate: string | undefined,
    fallbackIso?: string,
  ): string => {
    const defaultFallback =
      fallbackIso ||
      (endDate ? `${endDate}T12:00:00.000Z` : new Date().toISOString());
    if (!rawDate) return defaultFallback;

    let cleaned = rawDate.replace(/[\r\n\u00a0"']/g, "").trim();
    if (
      !cleaned ||
      cleaned.toLowerCase().includes("date") ||
      cleaned.toLowerCase().includes("огноо")
    ) {
      return defaultFallback;
    }

    // 2026.05.30 эсвэл 2026/05/30-ийг 2026-05-30 стандарт болгох
    cleaned = cleaned.replace(/[./]/g, "-");
    const parsed = new Date(cleaned);

    if (isNaN(parsed.getTime())) {
      return defaultFallback;
    }
    return parsed.toISOString();
  };

  const cleanHeader = (str: string) =>
    (str || "")
      .toLowerCase()
      .replace(/[\r\n\s\-_.]/g, "")
      .trim();

  // =========================================================================
  // 1. БОРЛУУЛАЛТ БӨӨНӨӨР ИМПОРТЛОХ (Огноотой & Огноогүй аль алийг нь танина)
  // =========================================================================
  // =========================================================================
  // 📈 БОРЛУУЛАЛТ ХУУЛАХ ЭЦСИЙН УХААЛАГ ФУНКЦ (HEADER-BASED)
  // =========================================================================
const handleBulkSalesPaste = async (e: React.FormEvent) => {
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

      const headerCols = rows[0].split("\t").map(cleanHeader);
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
        const cols = row.split("\t");
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

      if (overwriteSales) {
        await supabase.from("sales_logs").delete()
          .eq("client_id", activeClient)
          .gte("date", `${startDate}T00:00:00.000Z`)
          .lte("date", `${endDate}T23:59:59.999Z`);
      }
if (salesToInsert.length > 0) {
        // ⚡ АЛХАМ 1: Борлуулалтыг баазад хадгалах
        await supabase.from("sales_logs").insert(salesToInsert);

        // ⚡ АЛХАМ 2: Давталт дотор бааз руу хандахгүй, Бүх барааг нэг массив дотор цуглуулна:
        const recordedChanges: AutoPilotChange[] = [];
        const seenInBatch = new Set<string>();
        const productsToBatch: any[] = [];
        const recipesToRenameBatch: Array<{ from: string; to: string }> = [];

        for (const s of salesToInsert) {
          const rawPosName = cleanString(s.product_name);
          const posPrice = s.quantity_sold > 0 ? Math.round(s.total_revenue / s.quantity_sold) : 0;
          if (!rawPosName || seenInBatch.has(rawPosName.toLowerCase())) continue;
          seenInBatch.add(rawPosName.toLowerCase());

          // autoReconcile тархи дуудах (0.001ms):
          const result = evaluateSaleItem(rawPosName, posPrice, productsList, aliasMap);

              // 🔍 ЯГ ТАЙЛАХ ТҮЛХҮҮР:
          if (rawPosName.toLowerCase().includes("tymb")) {
            console.log("🔍 ПОС-оос ирсэн:", rawPosName);
            console.log("🔍 Системийн шийдвэр:", result);
            console.log("🔍 Менюд байгаа Tymbarko:", productsList.find(p => p.name.toLowerCase().includes("tymb")));
          }

          if (result.action === 'EXACT_MATCH' && result.targetProduct) {
            const target = result.targetProduct;
            if (result.shouldUpdatePrice && posPrice > 0 && Number(target.selling_price) !== posPrice) {
              productsToBatch.push({
                id: target.id,
                client_id: activeClient,
                name: target.name,
                category: target.category || 'General',
                selling_price: posPrice
              });

              recordedChanges.push({
                id: `exact-${target.id}-${Date.now()}`,
                productId: target.id,
                productName: target.name,
                type: 'PRICE_UPDATE',
                oldName: target.name,
                newName: target.name,
                oldPrice: Number(target.selling_price),
                newPrice: posPrice,
                oldCategory: target.category || 'General',
                reverted: false
              });
            }

          } else if (result.action === 'VARIANT_PRODUCT' && result.targetProduct) {
            const parent = result.targetProduct;
            const existingVar = productsList.find(p => sanitizeName(p.name) === sanitizeName(rawPosName));

            productsToBatch.push({
              ...(existingVar ? { id: existingVar.id } : {}),
              client_id: activeClient,
              name: rawPosName,
              category: parent.category || 'DESSERT',
              selling_price: posPrice
            });

            aliasMap[sanitizeName(rawPosName)] = sanitizeName(parent.name);

            recordedChanges.push({
              id: `var-${rawPosName}-${Date.now()}`,
              productId: existingVar?.id || '',
              productName: rawPosName,
              type: 'VARIANT_ADDED',
              oldName: `${parent.name}-ийн хувилбар`,
              newName: `${rawPosName} (${posPrice.toLocaleString()} ₮)`,
              oldPrice: Number(parent.selling_price),
              newPrice: posPrice,
              oldCategory: parent.category || 'DESSERT',
              reverted: false
            });

          } else if (result.decision === 'AUTO_MERGE' && !result.isVariant && result.targetProduct) {
              const target = result.targetProduct;
            const oldName = target.name;
            const oldPrice = Number(target.selling_price) || 0;
            const oldCategory = target.category || 'General';

            const nameChanged = cleanString(rawPosName).toLowerCase() !== cleanString(oldName).toLowerCase();
            const priceChanged = posPrice > 0 && oldPrice !== posPrice;

            if (nameChanged || priceChanged) {
              // 1. Хэрэв давхардсан бараа байвал урьдчилж цэвэрлэх
              if (nameChanged) {
                await supabase
                  .from('products')
                  .delete()
                  .eq('client_id', activeClient)
                  .ilike('name', rawPosName)
                  .neq('id', target.id);
              }

              // 2. Бүтээгдэхүүний нэр ба үнийг UPDATE хийх:
              const { error: upError } = await supabase.from("products").update({
                name: rawPosName,
                selling_price: posPrice > 0 ? posPrice : oldPrice,
                category: oldCategory
              }).eq("id", target.id);

              if (upError) console.error("Бүтээгдэхүүн шинэчлэх алдаа:", upError);

              // 3. ⚡ 409 CONFLICT-ООС СЭРГИЙЛЭХ:
              // Зөвхөн тэр шинэ нэрээр жор БАЙХГҮЙ үед л жорын нэрийг шинэчилнэ!
              const recipeAlreadyExists = recipes.some(
                (r: any) => cleanString(r.product_name).toLowerCase() === rawPosName.toLowerCase()
              );

              if (nameChanged && !recipeAlreadyExists) {
                await supabase.from("recipes").update({ product_name: rawPosName })
                  .eq("client_id", activeClient).ilike("product_name", target.name);
              }

              recordedChanges.push({
                id: `typo-${target.id}-${Date.now()}`,
                productId: target.id,
                productName: rawPosName,
                type: nameChanged ? 'NAME_MERGE' : 'PRICE_UPDATE',
                oldName: oldName,
                newName: rawPosName,
                oldPrice: oldPrice,
                newPrice: posPrice,
                oldCategory: oldCategory,
                reverted: false
              });
            }
          

          } else {
            productsToBatch.push({
              client_id: activeClient,
              name: rawPosName,
              category: 'General',
              selling_price: posPrice
            });

            recordedChanges.push({
              id: `new-${rawPosName}-${Date.now()}`,
              productId: '',
              productName: rawPosName,
              type: 'NEW_PRODUCT',
              oldName: 'Байхгүй',
              newName: `${rawPosName} (${posPrice.toLocaleString()} ₮)`,
              oldPrice: 0,
              newPrice: posPrice,
              oldCategory: 'General',
              reverted: false
            });
          }
        }

        // ⚡ АЛХАМ 3: БҮХ БАРААГ 52 УДАА БИШ, ГАНЦХАН СҮЛЖЭЭНИЙ ХҮСЭЛТЭЭР БӨӨНӨӨР НЬ ХАДГАЛАХ (0.2 секунд!):
        if (productsToBatch.length > 0) {
          await supabase.from("products").upsert(productsToBatch, { onConflict: "client_id,name" });
        }

        if (recipesToRenameBatch.length > 0) {
          await Promise.all(
            recipesToRenameBatch.map(rec =>
              supabase.from("recipes").update({ product_name: rec.to })
                .eq("client_id", activeClient).ilike("product_name", rec.from)
            )
          );
        }

        setAutoPilotActivity({
          totalSales: salesToInsert.length,
          changes: recordedChanges
        });
      }

      // ⚡ АЛХАМ 4: Ногоон амжилтын цонхыг тэр дор нь ШУУД асаана!
      setSalesImportSuccess(true);
      setSalesPasteText("");
      setOverwriteSales(false);

      // Датаг ард нь сэргээх
      await fetchDatabaseData(activeClient);
      setTimeout(() => setSalesImportSuccess(false), 4000);
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
        alert(
          "Алдаа: Толгой мөр (Header) болон доорх өгөгдлийг хамтад нь хуулна уу.",
        );
        setLoading(false);
        return;
      }

      // 1. Толгой мөрийг жижиг үсгээр цэвэрлэж авах:
      const headerCols = rows[0].split("\t").map(cleanHeader);

      // 2. Утгаар нь багануудын байршлыг автоматаар олох (Дараалал хамаарахгүй!):
      const nameIdx = headerCols.findIndex(
        (c) =>
          c.includes("бараа") ||
          c.includes("түүхий") ||
          c.includes("нэр") ||
          c.includes("item") ||
          c.includes("ingredient") ||
          c.includes("product"),
      );

      const qtyIdx = headerCols.findIndex(
        (c) =>
          c.includes("тоо") ||
          c.includes("хэмжээ") ||
          c.includes("qty") ||
          c.includes("count") ||
          c.includes("ширхэг"),
      );

      const costIdx = headerCols.findIndex(
        (c) =>
          c.includes("өртөг") ||
          c.includes("нийт") ||
          c.includes("дүн") ||
          c.includes("cost") ||
          c.includes("total") ||
          c.includes("үнэ") ||
          c.includes("price"),
      );

      const dateIdx = headerCols.findIndex(
        (c) => c.includes("огноо") || c.includes("date") || c.includes("өдөр"),
      );

      // Шаардлагатай гол 2 багана олдохгүй бол сануулах:
      if (nameIdx === -1 || qtyIdx === -1) {
        alert(
          "Алдаа: 'Барааны нэр' болон 'Тоо хэмжээ' баганыг таньж чадсангүй.\n\nТолгой мөрөн дээрээ: [Барааны нэр | Тоо хэмжээ | Нийт өртөг] гэж бичнэ үү.",
        );
        setLoading(false);
        return;
      }

      const ingMap = new Map();
      ingredients
        .filter((i) => i.client_id === activeClient)
        .forEach((i) => ingMap.set(cleanNameForMatch(i.name), i));
      const nonFoodKeywords = [
        "сальфетка",
        "аяга",
        "уут",
        "угаагч",
        "соруул",
        "таг",
        "саван",
      ];
      const purchasesToInsert: any[] = [];

      // 3. Огноо бичигдээгүй үед Dashboard дээр сонгосон сарын огноог авах:
      const activeMonthFallback = endDate
        ? `${endDate}T12:00:00.000Z`
        : `${startDate}T12:00:00.000Z`;

      // 4. Мөр бүрийг унших (0-р мөр нь Header тул 1-ээс эхэлнэ):
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row) continue; // Хоосон мөрийг алгасна
        const cols = row.split("\t");

        let ingName = cleanCell(cols[nameIdx] || "");

        // Үг ба тоо наалдсан эсэхийг шалгах ("Milk5000" гэх мэт):
        if (isGluedTextNumber(ingName)) {
          alert(
            `⚠️ Зайны алдаа: Мөр ${i + 1} дээр "${ingName}" наалдсан байна. Зай авна уу.`,
          );
          setLoading(false);
          return;
        }

        // Хэрэв барааны нэр нь цэвэр тоо байвал алгасах (Багана зөрсөнөөс хамгаалах):
        if (!isNaN(Number(ingName)) || ingName.length < 2) continue;

        const qty =
          parseFloat((cols[qtyIdx] || "0").replace(/[^0-9.-]/g, "")) || 0;
        const totalCost =
          parseFloat(
            (cols[costIdx >= 0 ? costIdx : 2] || "0").replace(/[^0-9.-]/g, ""),
          ) || 0;

        // Хэрэв огноогүй хуулсан бол сонгосон сарын огноог өгнө:
        const rawDate =
          dateIdx >= 0 && cols[dateIdx] ? cols[dateIdx].trim() : undefined;
        const dateVal = parseSafeDate(rawDate, activeMonthFallback);

        if (
          !ingName ||
          qty <= 0 ||
          ingName.toLowerCase().includes("item") ||
          ingName.toLowerCase().includes("бараа")
        )
          continue;

        const isKnownNonFood = nonFoodKeywords.some((k) =>
          ingName.toLowerCase().includes(k),
        );
        let matchedIng = ingMap.get(cleanNameForMatch(ingName));

        // Хэрэв шинэ түүхий эд бол автоматаар үүсгэх:
        if (!matchedIng && !isKnownNonFood) {
          const unitPrice = qty > 0 ? Math.round(totalCost / qty) : 0;
          const { data: newIng } = await supabase
            .from("ingredients")
            .insert([
              {
                client_id: activeClient,
                name: ingName,
                unit: "ш",
                unit_price: unitPrice,
                current_stock: 0,
              },
            ])
            .select()
            .single();
          if (newIng) {
            matchedIng = newIng;
            ingMap.set(cleanNameForMatch(ingName), newIng);
          }
        } else if (matchedIng && !isKnownNonFood && qty > 0) {
          // Хэрэв баазад өмнө нь байсан бараа бол сүүлийн авсан шинэ үнээр нь каталог дахь үнийг шинэчлэх:
          const latestUnitPrice = Math.round(totalCost / qty);
          if (latestUnitPrice > 0) {
            await supabase
              .from("ingredients")
              .update({ unit_price: latestUnitPrice })
              .eq("id", matchedIng.id);

            matchedIng.unit_price = latestUnitPrice; // Санах ой дээр хамт шинэчилнэ
          }
        }

        purchasesToInsert.push({
          client_id: activeClient,
          ingredient_id: matchedIng ? matchedIng.id : null,
          non_food_item: matchedIng ? null : ingName,
          quantity: qty,
          type: "purchase",
          total_cost: totalCost,
          date: dateVal,
          payment_method: "bank",
          is_ebarimt: true,
          notes: matchedIng
            ? `Бөөнөөр татан авалт (${totalCost}₮)`
            : "Хүнсний бус OPEX",
        });
      }

      // 5. Хэрэв "Хуучныг цэвэрлэх" сонгосон бол өмнөх татан авалтыг устгах:
      if (overwritePurchases) {
        await supabase
          .from("inventory_logs")
          .delete()
          .eq("client_id", activeClient)
          .eq("type", "purchase")
          .gte("date", `${startDate}T00:00:00.000Z`)
          .lte("date", `${endDate}T23:59:59.999Z`);
      }

      if (purchasesToInsert.length > 0) {
        const { error } = await supabase
          .from("inventory_logs")
          .insert(purchasesToInsert);
        if (error) throw error;
      }

      setPurchaseImportSuccess(true);
      setPurchasePasteText("");
      setOverwritePurchases(false);
      await fetchDatabaseData(activeClient);
      alert(
        `✅ Амжилттай! Нийт ${purchasesToInsert.length} татан авалт [${startDate.substring(0, 7)}] сард хадгалагдлаа.`,
      );
      setTimeout(() => setPurchaseImportSuccess(false), 4000);
    } catch (err: any) {
      alert(`Алдаа гарлаа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  // =========================================================================
  // 3. ТҮҮХИЙ ЭД & ҮНЭ БӨӨНӨӨР ОРУУЛАХ (Огноо хэрэггүй - Каталог)
  // =========================================================================
  const handleBulkIngredientsPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientsPasteText.trim()) return;

    setLoading(true);
    try {
      const rows = ingredientsPasteText.replace(/\r/g, "").trim().split("\n");
      const itemsMap = new Map<string, any>();

      rows.forEach((row) => {
        if (!row.trim()) return;
        const cols = row.split("\t");
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

  // =========================================================================
  // 4. ТЕХНОЛОГИЙН КАРТ (ЖОР) БӨӨНӨӨР ОРУУЛАХ (Огноо хэрэггүй)
  // =========================================================================
  const handleBulkRecipesPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipesPasteText.trim()) return;

    setLoading(true);
    try {
      const rows = recipesPasteText.replace(/\r/g, "").trim().split("\n");
      const { data: currentIngs } = await supabase
        .from("ingredients")
        .select("id, name")
        .eq("client_id", activeClient);
      const ingMap = new Map();
      currentIngs?.forEach((i) => ingMap.set(cleanNameForMatch(i.name), i.id));

      const recipesToUpsert: any[] = [];

      rows.forEach((row) => {
        if (!row.trim()) return;
        const cols = row.split("\t");
        if (cols.length >= 3) {
          const productName = cols[0]?.trim() || "";
          const ingredientName = cleanNameForMatch(cols[1] || "");
          const amount = parseFloat(cols[2]?.replace(/[^0-9.-]/g, "")) || 0;
          const ingredientId = ingMap.get(ingredientName);

          if (
            productName &&
            ingredientId &&
            amount > 0 &&
            !productName.toLowerCase().includes("product")
          ) {
            recipesToUpsert.push({
              client_id: activeClient,
              product_name: productName,
              ingredient_id: ingredientId,
              amount: amount,
            });
          }
        }
      });

      if (recipesToUpsert.length > 0) {
        const { error } = await supabase
          .from("recipes")
          .upsert(recipesToUpsert, {
            onConflict: "client_id,product_name,ingredient_id",
          });
        if (error) throw error;
      }

      setRecipesImportSuccess(true);
      setRecipesPasteText("");
      await fetchDatabaseData(activeClient);
      alert(
        `✅ Амжилттай! ${recipesToUpsert.length} бүтээгдэхүүний жор хадгалагдлаа.`,
      );
      setTimeout(() => setRecipesImportSuccess(false), 4000);
    } catch (err: any) {
      alert(`Жор оруулахад алдаа гарлаа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 5. МЕНЮНИЙ ЗАРАХ ҮНЭ ИМПОРТЛОХ (Огноо хэрэггүй)
  // =========================================================================
  const handleBulkProductsPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productsPasteText.trim()) return;

    setLoading(true);
    try {
      const rows = productsPasteText.replace(/\r/g, "").trim().split("\n");
      const productsToUpsert: any[] = [];

      rows.forEach((row) => {
        if (!row.trim()) return;
        const cols = row.split("\t");
        if (cols.length >= 2) {
          let category = "General";
          let name = "";
          let price = 0;

          if (cols.length >= 3) {
            category = cols[0]?.trim() || "General";
            name = cols[1]?.trim() || "";
            price = parseFloat(cols[2]?.replace(/[^0-9.-]/g, "")) || 0;
          } else {
            name = cols[0]?.trim() || "";
            price = parseFloat(cols[1]?.replace(/[^0-9.-]/g, "")) || 0;
          }

          if (
            name &&
            price > 0 &&
            !name.toLowerCase().includes("item") &&
            !name.toLowerCase().includes("нэр")
          ) {
            productsToUpsert.push({
              client_id: activeClient,
              category: category,
              name: name,
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
      alert(
        `✅ Амжилттай! ${productsToUpsert.length} цэсний зарах үнэ хадгалагдлаа.`,
      );
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

      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row) continue;
        const cols = row.split("\t").map((c) => c.trim());

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

        if (matchedIng && qty > 0) {
          logsToInsert.push({
            client_id: activeClient,
            ingredient_id: matchedIng.id,
            quantity: -Math.abs(qty),
            type: dbType,
            notes: note || `${dbType} logged in bulk`,
            date: dateVal, // ✅ Сонгосон сард заавал багтана!
            worker_name: "Менежер (Бөөнөөр)",
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

      // 🧠 1. SMART HEADER ШАЛГАХ (Баганын дараалал хамаарахгүй)
      const headerCols = rows[0].split("\t").map(cleanHeader);
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
        const cols = row.split("\t").map((c) => c.trim());

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

        const matchedIng = ingMap.get(cleanNameForMatch(itemName));
        if (matchedIng) {
          countsToInsert.push({
            client_id: activeClient,
            ingredient_id: matchedIng.id,
            quantity: qty,
            type: "count",
            notes: `Бөөнөөр Тоолсон Үлдэгдэл (${cleanType})`,
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/60 p-8 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-md text-center">
          <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 w-fit mx-auto mb-4">
            <ShieldAlert className="h-8 w-8 text-emerald-400" />
          </div>

          <h2 className="text-xl font-black text-white">
            Санхүүгийн Самбар Түгжигдсэн
          </h2>
          <p className="text-sm text-slate-400 mt-1 mb-6">
            Энэ төхөөрөмж Kiosk горимд байна. Санхүүгийн мэдээлэл харахын тулд
            Эзний нууц үгээ оруулна уу.
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
              placeholder="Эзний нууц үг оруулах..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:border-emerald-500 outline-none text-center tracking-widest"
            />

            <button
              type="submit"
              disabled={isUnlocking}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl transition text-sm shadow-lg"
            >
              {isUnlocking
                ? "Шалгаж байна..."
                : "🔓 Эзний эрхээр түгжээ тайлах"}
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
              className="text-sm text-slate-400 hover:text-emerald-400 transition underline underline-offset-4 font-bold"
            >
              🔄 Өөр хаягаар нэвтрэх (Ажилтан нэвтрэх)
            </button>
          </div>

          {/* ✅ 📱 KIOSK РУУ БУЦАХ ТОМ ТОВЧИЙГ Link БОЛГОХ: */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <Link
              href="/kiosk"
              className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-emerald-400 font-bold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              📱 Гал тогооны Kiosk руу буцах
            </Link>
          </div>
        </div>
      </div>
    );
  }
// ⚡ АЛТАН ХАМГААЛАЛТ: Эрхийг шалгаж дуустал Ажилтны дэлгэцийг огт харуулахгүй 
    if (loading && userRole !=="owner") {
    return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center select-none">
        <div className="relative w-12 h-12 flex items-center justify-center mb-4">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
          <div className="h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }
 
  return (
    <div className="flex h-screen bg-[#0B1120] overflow-hidden text-slate-100 font-sans antialiased selection:bg-emerald-500/20">
      
      {/* ========================================== */}
      {/* 1. LEFT SIDEBAR (БОСОО ЦЭС) */}
      {/* ========================================== */}
     {/* ========================================== */}
      {/* 1. LEFT SIDEBAR (БОСОО ЦЭС) */}
      {/* ========================================== */}
      <aside 
        className={`${
          isSidebarOpen ? "w-64" : "w-0 border-none"
        } bg-[#0F172A] border-r border-slate-800/80 flex flex-col flex-shrink-0 z-20 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap`}
      >
        {/* Logo & Close Button Area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="bg-[#07131d] p-1.5 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(0,245,155,0.15)] flex items-center justify-center">
              <OperlinkLogo className="h-5 w-5" />
            </div>
            <span className="font-black text-lg tracking-tight text-white uppercase">
              OPER<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">LINK</span>
            </span>
          </div>
          
          {/* 👈 ХУРААХ ТОВЧ (Google AI Studio шиг логоны баруун талд) */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title="Цэс хураах"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>
        
        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-1 px-3">
          
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest px-3 mb-2">Үйл ажиллагаа</div>
          
          {isOwner && (
            <>
              <button onClick={() => setActiveTab("dashboard")} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "dashboard" ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}>
                <LayoutDashboard className="h-4 w-4" /> Санхүүгийн Самбар
              </button>
              <button onClick={() => setActiveTab("ai_cfo")} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "ai_cfo" ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}>
                <Bot className="h-4 w-4" /> AI CFO Зөвлөх
              </button>
            </>
          )}

          {!isOwner && (
            <button onClick={() => setActiveTab("operations")} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "operations" || (userRole === "barista" && activeTab === "dashboard") ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}>
              <Coffee className="h-4 w-4" /> Үйл ажиллагаа
            </button>
          )}

          {!isOwner && (
            <button onClick={() => router.push("/kiosk")} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-blue-400 hover:bg-blue-500/10 transition-all mt-1">
              <Smartphone className="h-4 w-4" /> Гал тогооны Kiosk
            </button>
          )}

          <div className="text-xs font-black text-slate-500 uppercase tracking-widest px-3 mt-6 mb-2">Агуулах & Бүртгэл</div>
          
          <button onClick={() => setActiveTab("inventory")} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "inventory" ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}>
            <Database className="h-4 w-4" /> Агуулахын Тооллого
          </button>
          
          <button onClick={() => setActiveTab("import")} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "import" ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}>
            <UploadCloud className="h-4 w-4" /> Бөөнөөр Импортлох
          </button>

          {isOwner && (
            <>
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest px-3 mt-6 mb-2">Тохиргоо</div>
              <button onClick={() => setActiveTab("tasks")} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "tasks" ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}>
                <CheckSquare className="h-4 w-4" /> Ажлын Даалгавар
              </button>
              <button onClick={() => setActiveTab("settings")} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "settings" ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}>
                <Settings className="h-4 w-4" /> Системийн Тохиргоо
              </button>
            </>
          )}
        </div>

        {/* User Profile Footer */}
        {user && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/30">
            <div className="flex items-center justify-between">
              <div className="overflow-hidden">
                <p className="text-white font-bold text-sm truncate">{user.email}</p>
                <p className="text-slate-500 text-xs uppercase font-bold mt-0.5">{userRole}</p>
              </div>
              <button onClick={handleSignOut} title="Гарах" className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition">
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
        <header className="h-16 bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* 👈 HAMBURGER MENU (Зөвхөн цэс хураагдсан үед л гарч ирнэ) */}
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer mr-1 animate-in fade-in zoom-in-95 duration-200"
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
              className="bg-slate-900 border border-slate-700 text-white font-bold text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer focus:border-emerald-500"
            >
              <option value={userClient}>{userClient}</option>
              {/* Хэрэв олон салбартай бол энд map хийж болно */}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button onClick={() => setIsLive(false)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!isLive ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}>
              Demo
            </button>
            <button onClick={() => setIsLive(true)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${isLive ? "bg-slate-800 text-white shadow-md" : "text-slate-400 hover:text-white"}`}>
              <Database className="h-3 w-3" /> Live DB
            </button>
          </div>
        </header>
   {/* SCROLLABLE BODY (Tab Contents go here) */}
    <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative w-full">
    <div className="max-w-7xl mx-auto w-full max-w-full">
        {/* 1. FINANCIAL DASHBOARD TAB */}
        {activeTab === "dashboard" && userRole === "owner" && (
          <div>
            {/* ========================================================================= */}
            {/* 🚨 1. ТҮҮХИЙ ЭДИЙН ҮНИЙН ӨСӨЛТИЙН СЭРЭМЖЛҮҮЛЭГ (% БОДСОН)                  */}
            {/* ========================================================================= */}
            {priceSpikeAlerts.length > 0 && (
              <div className="bg-rose-500/10 border-2 border-rose-500/30 p-4 rounded-2xl mb-6 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-400 animate-pulse" />
                  <h4 className="text-sm font-black text-rose-300">
                    Анхаар: Түүхий эдийн үнэ зах зээл дээр өссөн байна!
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {priceSpikeAlerts.map((alert: any) => (
                    <div
                      key={alert.id}
                      className="bg-slate-950/80 p-2.5 rounded-xl border border-rose-500/20 text-sm"
                    >
                      <div className="flex justify-between font-bold">
                        <span className="text-white">{alert.name}</span>
                        <span className="text-rose-400 font-black">
                          ▲ +{alert.percent}% өссөн
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        {alert.oldPrice.toLocaleString()}₮ ➔{" "}
                        <strong className="text-rose-300">
                          {alert.newPrice.toLocaleString()}₮
                        </strong>{" "}
                        / {alert.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 💡 САЛБАР БҮРИЙН ДАТАТАЙ САРУУДЫГ ХАРУУЛАХ ДИНАМИК СОНГОГЧ */}
            {/* 💡 ДИНАМИК ОГНОО СОНГОГЧ (Өнөөдөр / 7 хоног / Сар / Дурын хугацаа) */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                  <Activity className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Тайлант Хугацаа
                  </h3>
                  <p className="text-sm text-slate-400">
                    Сонгосон хугацааны цэвэр ашиг, өртөг тооцоологдож байна
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {/* 1. ӨНӨӨДӨР (Шөнийн 03 цагт ч 9.15-аар зөв гарна!) */}
                <button
                  type="button"
                  onClick={() => {
                    const today = getLocalDateStr(new Date()); // 👈 2026-09-15 болно!
                    setStartDate(today);
                    setEndDate(today);
                    fetchDatabaseData(activeClient, today, today);
                  }}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-800 px-3 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition"
                >
                  ☀️ Өнөөдөр
                </button>

                {/* 2. СҮҮЛИЙН 7 ХОНОГ */}
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const past7Date = new Date(
                      now.getTime() - 7 * 24 * 60 * 60 * 1000,
                    );
                    const past7 = getLocalDateStr(past7Date);
                    const today = getLocalDateStr(now);
                    setStartDate(past7);
                    setEndDate(today);
                    fetchDatabaseData(activeClient, past7, today);
                  }}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-800 px-3 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition"
                >
                  📅 7 хоног
                </button>

                {/* 3. ДУРЫН САР СОНГОХ (БҮХ ДАТАТАЙ САРУУД) */}
                <select
                  value={startDate.substring(0, 7)}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-emerald-400 font-black text-sm rounded-xl px-3 py-2 outline-none cursor-pointer"
                >
                  {availableMonths.map((ym) => {
                    const [year, month] = ym.split("-");
                    return (
                      <option
                        key={ym}
                        value={ym}
                        className="bg-slate-950 text-white font-bold"
                      >
                        📅 {year} оны {month}-р сар
                      </option>
                    );
                  })}
                </select>

                {/* 4. ТАТВАРЫН АЛБАН ЁСНЫ EXCEL ТАТАХ ТОВЧ */}
                <button
                  onClick={() =>
                    exportAuditExcel(
                      liveAnalytics,
                      activeClient,
                      startDate,
                      endDate,
                    )
                  }
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-sm transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <Download className="h-3.5 w-3.5" />
                  E-Tax & Аудит (.xlsx)
                </button>
              </div>
            </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700/50 shadow-lg">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Нийт Орлого (Revenue)</p>
                <p className="text-2xl md:text-3xl font-extrabold text-white">
                  <LiveMetric isLive={isLive} isReady={!!liveAnalytics} liveValue={liveAnalytics?.financial_ladder?.revenue} demoValue={currentDemoStats.revenue} />
                </p>
              </div>

              <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700/50 shadow-lg">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Бодит өртөг (COGS)</p>
                <p className="text-2xl md:text-3xl font-extrabold text-white">
                  <LiveMetric isLive={isLive} isReady={!!liveAnalytics} liveValue={liveAnalytics?.financial_ladder?.actual_cogs} demoValue={currentDemoStats.actualCogs} />
                </p>
                <span className="text-xs text-slate-500 mt-2 block flex items-center gap-1">
                  Онолын өртөг: <LiveMetric isLive={isLive} isReady={!!liveAnalytics} liveValue={liveAnalytics?.financial_ladder?.theo_cogs} demoValue={currentDemoStats.theoCogs} skeletonClass="h-3 w-16" />
                </span>
              </div>

              <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700/50 shadow-lg">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Бохир ашиг</p>
                <p className="text-2xl md:text-3xl font-extrabold text-emerald-400">
                  <LiveMetric isLive={isLive} isReady={!!liveAnalytics} type="text" liveValue={liveAnalytics?.financial_ladder?.gross_margin} demoValue={currentDemoStats.grossMargin} />
                </p>
              </div>

              <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700/50 shadow-lg">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Ажлын Бүтээмж</p>
                <p className="text-2xl md:text-3xl font-extrabold text-blue-400">
                  <LiveMetric isLive={isLive} isReady={!!liveAnalytics} type="text" liveValue={liveAnalytics?.efficiency} demoValue={currentDemoStats.efficiency} />
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* P&L LADDER */}
              <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700/50 shadow-lg lg:col-span-2">
                <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-white">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  Бизнес Моделийн дүн шинжилгээ
                </h3>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between border-b border-slate-800 pb-3.5">
                    <span className="text-slate-400">Сар бүрийн OPEX (Түрээс, Цалин, Тог)</span>
                    <span className="font-bold text-white">
                      <LiveMetric isLive={isLive} isReady={!!liveAnalytics} liveValue={liveAnalytics?.financial_ladder?.opex} demoValue={currentDemoStats.opex} skeletonClass="h-5 w-20" />
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-3.5">
                    <span className="text-slate-400">Татварын өмнөх ашиг (EBIT)</span>
                    <span className={`font-bold ${isLive && liveAnalytics && liveAnalytics.financial_ladder.ebit < 0 ? "text-rose-400" : "text-white"}`}>
                      <LiveMetric isLive={isLive} isReady={!!liveAnalytics} liveValue={liveAnalytics?.financial_ladder?.ebit} demoValue={currentDemoStats.ebit} skeletonClass="h-5 w-24" />
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 items-center">
                    <span className="text-slate-200 font-extrabold text-base">ЦЭВЭР АШИГ (Net Profit)</span>
                    <div className="text-right">
                      <span className={`text-2xl font-black ${isLive && liveAnalytics && liveAnalytics.financial_ladder.net_profit < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        <LiveMetric isLive={isLive} isReady={!!liveAnalytics} liveValue={liveAnalytics?.financial_ladder?.net_profit} demoValue={currentDemoStats.netProfit} skeletonClass="h-8 w-32" />
                      </span>
                      <span className="text-xs text-slate-500 block mt-1 flex items-center justify-end gap-1">
                        Маржин: <LiveMetric isLive={isLive} isReady={!!liveAnalytics} type="text" liveValue={liveAnalytics?.financial_ladder?.net_margin} demoValue={currentDemoStats.netMargin} skeletonClass="h-3 w-10" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TOP WASTE CARD */}
              <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700/50 shadow-lg">
                <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-rose-400">
                  <Trash2 className="h-5 w-5" /> Top Waste
                </h3>

                <button
                  onClick={() => setShowWasteGuideModal(true)}
                  className="mb-5 text-[11px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5"
                >
                  💡 Энийг яаж шалгах вэ?
                </button>
                
                <div className="space-y-4">
                  {!isLive ? (
                    (demoWasters[activeClient] || demoWasters["SF Coffee"] || []).map((w, idx) => (
                      <div key={idx} className="border-b border-slate-800 pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between font-bold mb-1">
                          <span className="text-slate-200 text-sm">{w.name}</span>
                          <span className="text-rose-400 text-sm">-{w.impact.toLocaleString()}₮</span>
                        </div>
                        <p className="text-xs text-slate-500">{w.notes}</p>
                      </div>
                    ))
                  ) : !liveAnalytics ? (
                    // ⚡ СИСТЕМ УНШИЖ БАЙХ ҮЕД ЖАГСААЛТЫН SKELETON ХАРАГДАНА
                    <ListSkeleton rows={3} />
                  ) : liveAnalytics.top_wasters.length > 0 ? (
                    liveAnalytics.top_wasters.map((w: any, idx: number) => (
                      <div key={idx} className="border-b border-slate-800 pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between font-bold mb-1">
                          <span className="text-slate-200 text-sm">{w.name}</span>
                          <span className="text-rose-400 text-sm">-{w.impact.toLocaleString()}₮</span>
                        </div>
                        <p className="text-xs text-slate-500">Шалтгаангүй: {w.gap.toLocaleString()} {w.unit}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 italic text-center py-8">Хаягдал бүртгэгдээгүй байна.</p>
                  )}
                </div>
              </div>
            </div>
            {/* 🛡️ WAC MARGIN GUARD ALERTS */}
            {liveAnalytics?.margin_guard_alerts?.length > 0 && (
              <div className="mt-8 bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <h3 className="font-bold text-amber-300 text-sm">
                    Маржин Хамгаалагч: Түүхий эдийн үнэ өссөн тул үнээ нэмэх
                    шаардлагатай
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {liveAnalytics.margin_guard_alerts.map(
                    (alert: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-950/80 p-3.5 rounded-xl border border-amber-500/20 text-sm space-y-1"
                      >
                        <div className="flex justify-between font-bold">
                          <span className="text-white">
                            {alert.product_name}
                          </span>
                          <span className="text-rose-400">
                            Маржин: {alert.current_margin_pct}
                          </span>
                        </div>
                        <p className="text-slate-400">
                          Одоогийн өртөг:{" "}
                          <strong className="text-slate-200">
                            {alert.cost_price.toLocaleString()}₮
                          </strong>
                        </p>
                        <p className="text-emerald-400 font-black">
                          Зөвлөх зарах үнэ:{" "}
                          {alert.suggested_price.toLocaleString()}₮ (+
                          {alert.price_gap.toLocaleString()}₮)
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* 🚨 CROSS-SHIFT FRAUD & INCIDENT MATRIX */}
            {liveAnalytics?.worker_fraud_matrix &&
              Object.keys(liveAnalytics.worker_fraud_matrix).length > 0 && (
                <div className="mt-8 bg-[#1E293B] p-6 rounded-2xl border border-rose-900/40">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldAlert className="h-6 w-6 text-rose-400 animate-pulse" />
                    <div>
                      <h3 className="text-base font-black text-white">
                        Ээлжийн Дампуурал & Шалтгаантай Хаягдлын Матриц
                      </h3>
                      <p className="text-sm text-slate-400">
                        Өмнөх ээлжийн алдагдал, эвдрэл үүсгэсэн гэж бусад
                        ажилтнуудын мэдээлсэн дүн шинжилгээ
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(liveAnalytics.worker_fraud_matrix).map(
                      ([worker, data]: any) => (
                        <div
                          key={worker}
                          className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-black text-sm text-white">
                              👤 {worker}
                            </span>
                            <span className="text-sm font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                              Нийт {data.totalIncidents} удаагийн зөрчил
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 mb-3">
                            Учруулсан бодит хохирол:{" "}
                            <strong className="text-rose-400 font-mono text-sm">
                              -{data.totalLossAmount.toLocaleString()} ₮
                            </strong>
                          </p>
                          <div className="space-y-1.5 border-t border-slate-800 pt-2">
                            {data.incidents
                              .slice(0, 3)
                              .map((inc: any, i: number) => (
                                <div
                                  key={i}
                                  className="flex justify-between items-center text-xs text-slate-400"
                                >
                                  <span className="truncate max-w-[220px]">
                                    • {inc.notes || "Шалтгаангүй хаягдал"}
                                  </span>
                                  {inc.image_url && (
                                    <button
                                      onClick={() =>
                                        setSelectedImageModal({
                                          url: inc.image_url,
                                          title: `Зөрчлийн зураг: ${worker}`,
                                        })
                                      }
                                      className="text-emerald-400 underline font-bold ml-2 shrink-0 hover:text-emerald-300"
                                    >
                                      Зураг үзэх
                                    </button>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
          </div>
        )}
        {/* 2. AI CFO CHAT TAB (OWNER ONLY) */}
        {userRole === "owner" && (
          <div className={activeTab === "ai_cfo" ? "block" : "hidden"}>
            <AiCfoChatTab
              activeClient={activeClient}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
        )}
        {/* 3.  STAFF PORTAL (INPUTS) */}
        {activeTab === "operations" && (
          <div>
            {/* 🔐 ЗӨВХӨН АЖИЛТАНД ХАРАГДАХ PIN ТОХИРУУЛАХ КАРТ */}
            {userRole !== "owner" && (
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    🔐 Миний Kiosk PIN код
                  </p>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Гал тогооны дундын таблет дээр нэвтрэх нууц код:
                    <span className="ml-2 font-mono font-black text-sm text-emerald-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700">
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
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center text-white font-bold text-sm tracking-widest w-32 focus:border-emerald-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (myPin.length !== 4) {
                        alert("PIN код заавал 4 оронтой тоо байх ёстой!");
                        return;
                      }
                      const { error } = await supabase
                        .from("profiles")
                        .update({ pin_code: myPin })
                        .eq("id", user.id);
                      if (error) alert(`Алдаа: ${error.message}`);
                      else alert("Таны хувийн PIN код амжилттай солигдлоо! ✅");
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-sm transition"
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
  <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 w-full overflow-hidden">
    
    {/* ДЭЭД ЭГНЭЭ: Гарчиг + Хадгалах товч (Баруун буланд байнга ил харагдана) */}
    <div className="flex justify-between items-center pb-4 border-b border-slate-800 gap-4">
      <div>
        <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
          <Database className="h-5 w-5 text-emerald-400" />
          Агуулахын Тооллого
        </h3>
        <p className="text-sm text-slate-400 mt-0.5">
          Бодит үлдэгдлийг шивээд "Хадгалах" дарна уу
        </p>
      </div>

      <button
        onClick={handleBulkSave}
        disabled={isSavingBulk}
        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-xl transition text-sm flex items-center gap-2 shadow-lg shrink-0 cursor-pointer active:scale-95"
      >
        <Save className="h-4 w-4" />
        <span>{isSavingBulk ? "Хадгалж байна..." : "Хадгалах"}</span>
      </button>
    </div>

    {/* ДОР ЭГНЭЭ: Хайлт + Шүүлтүүр (Эвтэйхэн багтана) */}
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-slate-800/60">
      <input
        type="text"
        value={invSearch}
        onChange={(e) => setInvSearch(e.target.value)}
        placeholder="🔍 Бараа хайх..."
        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 w-full sm:w-56"
      />

      <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800 shrink-0 text-xs">
        <button
          onClick={() => setInvFilter("all")}
          className={`px-3 py-1 rounded-lg font-bold transition ${invFilter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
        >
          Бүгд
        </button>
        <button
          onClick={() => setInvFilter("low")}
          className={`px-3 py-1 rounded-lg font-bold transition ${invFilter === "low" ? "bg-rose-500/20 text-rose-400" : "text-slate-400 hover:text-white"}`}
        >
          ⚠️ Дуусаж буй
        </button>
        <button
          onClick={() => setInvFilter("critical")}
          className={`px-3 py-1 rounded-lg font-bold transition ${invFilter === "critical" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white"}`}
        >
          ⭐ A-Class
        </button>
      </div>
    </div>

            {loading ? (
              <p className="text-center text-slate-500 py-8 text-sm animate-pulse">
                Уншиж байна...
              </p>
            ) : (
                <div className="w-full max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead className="sticky top-0 bg-[#0d1527] border-b border-slate-800 z-10 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Барааны Нэр</th>
                  <th className="py-2.5 px-2 text-right">Өртөг</th>
                  <th className="py-2.5 px-2 text-center">PAR</th>
                  <th className="py-2.5 px-2 text-center">LEAD</th> 
                  <th className="py-2.5 px-2 text-right">Захиалга</th>
                  <th className="py-2.5 px-2 text-right text-emerald-400">Системд</th>
                  <th className="py-2.5 px-3 text-right">Бодит тооллого</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm">
                {ingredients
                  .filter((ing) => {
                    const matchSearch = ing.name.toLowerCase().includes(invSearch.toLowerCase());
                    const analItem = liveAnalytics?.all_inventory_data?.find(
                      (i: any) => i.id === ing.id || i.name.toLowerCase() === ing.name.toLowerCase()
                    );
                    const isAClass = ing.is_critical || analItem?.abc_class === "A";
                    const matchFilter =
                      invFilter === "all" ||
                      (invFilter === "low" && parseFloat(ing.current_stock) <= (ing.par_level || 50)) ||
                      (invFilter === "critical" && isAClass);
                    return matchSearch && matchFilter;
                  })
                  .map((ing) => {
                    const analItem = liveAnalytics?.all_inventory_data?.find(
                      (i: any) => i.id === ing.id || i.name.toLowerCase() === ing.name.toLowerCase()
                    );
                    const abc = ing.is_critical ? "A" : analItem?.abc_class || "C";

                    return (
                      <tr key={ing.id} className="hover:bg-slate-800/40 transition">
                        
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
                          prev.map((item) => (item.id === ing.id ? { ...item, is_critical: nextVal } : item))
                        );
                        await supabase.from("ingredients").update({ is_critical: nextVal }).eq("id", ing.id);
                      }}
                      title={ing.is_critical ? "Өдөр бүр заавал тоолох чухал бараа (Идэвхтэй)" : "Өдөр бүр тоолох чухал бараа болгох"}
                      className="p-1 rounded-lg transition active:scale-75 shrink-0 cursor-pointer"
                    >
                      {ing.is_critical ? (
                        <span className="text-amber-400 text-base leading-none drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">★</span>
                      ) : (
                        <span className="text-slate-600 hover:text-slate-400 text-2xl leading-none">☆</span>
                      )}
                    </button>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm sm:text-sm">{ing.name}</span>
                          
                          {/* 🏷️ A, B, C БҮХ ТӨЛӨВИЙГ БҮРЭН ӨНГӨТЭЙ БОЛГОСОН ХЭСЭГ: */}
                          <span className={`text-xs font-black px-1.5 py-0.5 rounded border ${
                            abc === "A" 
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30" 
                              : abc === "B"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}>
                            {abc}-Class
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          Нэгж: {ing.unit}
                        </span>
                      </div>
                    </div>
                  </td>

                        {/* 2. НЭГЖИЙН ӨРТӨГ */}
                        <td className="py-2.5 px-2 text-right font-mono text-sm text-slate-300">
                          {parseFloat(ing.unit_price).toLocaleString()} ₮
                        </td>

                        {/* 3. PAR ТҮВШИН (Input) */}
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            step="any"
                            value={ing.par_level !== undefined ? ing.par_level : 0}
                            onChange={(e) => handleIngredientUpdate(ing.id, "par_level", e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-center text-sm text-white w-14 font-mono outline-none focus:border-emerald-500"
                          />
                        </td>

                        {/* 4. LEAD - НИЙЛҮҮЛЭХ ХУГАЦАА (Input) 👈 БУЦААЖ НЭМСЭН ХЭСЭГ */}
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            value={ing.lead_time_days !== undefined ? ing.lead_time_days : 1}
                            onChange={(e) => handleIngredientUpdate(ing.id, "lead_time_days", e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-center text-sm text-white w-14 font-mono outline-none focus:border-emerald-500"
                          />
                        </td>

                        {/* 5. ЗӨВЛӨХ ЗАХИАЛГА */}
                        <td className="py-2.5 px-2 text-right font-black font-mono text-sm text-blue-400">
                          {liveAnalytics?.all_inventory_data?.find((i: any) => i.name === ing.name)?.suggested_order || 0} {ing.unit}
                        </td>

                        {/* 6. СИСТЕМД БАЙГАА ҮЛДЭГДЭЛ */}
                        <td className="py-2.5 px-2 text-right font-black font-mono text-sm text-emerald-400">
                          {parseFloat(ing.current_stock || 0).toLocaleString()} {ing.unit}
                        </td>

                        {/* 7. БОДИТ ТООЛЛОГО ЗАСАХ */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="any"
                            value={bulkStock[ing.id] !== undefined ? bulkStock[ing.id] : ing.current_stock || ""}
                            onChange={(e) => setBulkStock({ ...bulkStock, [ing.id]: e.target.value })}
                            placeholder="Тоо..."
                            className="bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-right text-white font-black text-sm w-20 sm:w-24 outline-none font-mono"
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
        )}

        {/* 6. BULK CLIPBOARD PASTE TAB */}

        {activeTab === "import" && (
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
        )}

        {/* 7. TASK & ROLE MANAGEMENT TAB */}
        {activeTab === "tasks" && userRole === "owner" && (
          <div className="space-y-8">
            {" "}
            {/* ➕ ЭЗЭН ШИНЭ АЖИЛТАН ШУУД НЭМЭХ ХЭСЭГ (Нэр зөрөхөөс сэргийлнэ) */}
            {/* 🚀 АЖИЛТАН БҮРТГЭХ & УРИХ ШИНЭ КАРТ */}
            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 mb-8 space-y-6">
              {/* 1. УРИЛГЫН ЛИНК ХУУЛАХ (Хамгийн амархан арга) */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    🔗 Ажилтан урих холбоос
                  </h4>
                  <p className="text-sm text-slate-400 mt-1">
                    Энэ линкийг ажилтандаа явуулснаар тэд салбарын нэрийг
                    алдаагүйгээр шууд нэгдэж бүртгүүлнэ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const inviteUrl = `${window.location.origin}/login?branch=${encodeURIComponent(activeClient)}&role=staff`;
                    navigator.clipboard.writeText(inviteUrl);
                    alert(`✅ Урилгын холбоос хуулагдлаа:\n${inviteUrl}`);
                  }}
                  className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0"
                >
                  📋 Урилгын линк хуулах
                </button>
              </div>

              {/* ➕ ЭЗЭН ШИНЭ АЖИЛТАН ШУУД НЭМЭХ ХЭСЭГ (ДИНАМИК ҮҮРГҮҮДТЭЙ) */}
              <div className="mb-6">
                <h3 className="text-base font-bold mb-3 text-emerald-400">
                  ➕ Салбартаа шинэ ажилтан нэмэх (Kiosk дээр шууд гарна)
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as any;
                    const workerName = form.workerName.value.trim();
                    const workerPin = form.workerPin.value.trim();
                    const workerRole = form.workerRole.value;

                    if (!workerName || workerPin.length !== 4) {
                      alert(
                        "Ажилтны нэр болон 4 оронтой PIN кодыг заавал оруулна уу!",
                      );
                      return;
                    }
                    if (!workerRole) {
                      alert("Ажилтны үүргийг сонгоно уу!");
                      return;
                    }

                    setLoading(true);
                    // ДИНАМИК ҮҮРЭГТЭЙ АЖИЛТНЫГ ШУУД БААЗАД ХАДГАЛАХ
                    const { error } = await supabase.from("profiles").insert([
                      {
                        id: crypto.randomUUID(),
                        client_id: activeClient,
                        full_name: workerName,
                        role: workerRole, // 👈 Эзний үүсгэсэн бодит үүрэг орно!
                        pin_code: workerPin,
                        email: `${workerName.toLowerCase().replace(/\s+/g, "")}@${activeClient.toLowerCase().replace(/\s+/g, "")}.internal`,
                      },
                    ]);

                    if (error) {
                      alert(`Алдаа: ${error.message}`);
                    } else {
                      alert(
                        `✅ [${workerName}] ажилтныг [${workerRole}] үүрэгтэйгээр амжилттай бүртгэлээ! Kiosk дээр шууд гарна.`,
                      );
                      form.reset();
                      fetchDatabaseData(activeClient);
                    }
                    setLoading(false);
                  }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-3"
                >
                  <input
                    name="workerName"
                    required
                    placeholder="Ажилтны нэр (жнь: Болд)"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-emerald-500"
                  />
                  <input
                    name="workerPin"
                    required
                    maxLength={4}
                    placeholder="4 оронтой PIN (жнь: 1234)"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-emerald-500 text-center"
                  />

                  {/* 💡 ДИНАМИК ҮҮРГҮҮДИЙН СОНГОЛТ (Эзний үүсгэсэн бүх үүрэг энд гарч ирнэ): */}
                  <select
                    name="workerRole"
                    required
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-emerald-400 font-bold outline-none cursor-pointer"
                  >
                    <option value="">-- Үүрэг сонгох --</option>
                    <option value="Ажилтан">Ерөнхий ажилтан</option>
                    {/* 🚀 ТАНЫ COMPANY_ROLES ДАХЬ БҮХ ҮҮРЭГ АВТОМАТААР ГАРНА: */}
                    {companyRoles.map((r) => (
                      <option key={r.id} value={r.role_name}>
                        {r.role_name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-sm transition"
                  >
                    + Ажилтан Бүртгэх
                  </button>
                </form>
              </div>
            </div>
            {/* SECTION 1: CREATE ROLES & ASSIGN ROLES TO WORKERS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Role Creator */}
              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold mb-4 text-emerald-400">
                  1. Албан тушаал / Үүрэг үүсгэх
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newRoleInput.trim()) return;
                    setLoading(true);
                    const { error } = await supabase
                      .from("company_roles")
                      .insert([
                        {
                          client_id: activeClient,
                          role_name: newRoleInput.trim(),
                        },
                      ]);
                    if (error) alert(`Алдаа: ${error.message}`);
                    setNewRoleInput("");
                    await fetchDatabaseData(activeClient);
                  }}
                  className="space-y-3"
                >
                  <input
                    type="text"
                    required
                    value={newRoleInput}
                    onChange={(e) => setNewRoleInput(e.target.value)}
                    placeholder="Жнь: Бармен, Талхчин, Зөөгч"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold"
                  />
                  <button
                    type="submit"
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-sm"
                  >
                    + Үүрэг Нэмэх
                  </button>
                </form>
                {/* Бүртгэлтэй үүргүүдийн жагсаалт ба Устгах товч */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {companyRoles.map((r) => (
                    <div
                      key={r.id}
                      className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-sm font-bold text-slate-200"
                    >
                      <span>🏷️ {r.role_name}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`"${r.role_name}" үүргийг устгах уу?`))
                            return;
                          await supabase
                            .from("company_roles")
                            .delete()
                            .eq("id", r.id);
                          fetchDatabaseData(activeClient);
                        }}
                        className="text-rose-400 hover:text-rose-300 ml-1 font-black text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assign Roles to Registered Workers */}
              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 md:col-span-2">
                <h3 className="text-base font-bold mb-4 text-blue-400">
                  {" "}
                  Ажилтнуудад үүрэг оноох
                </h3>
                <div className="overflow-x-auto max-h-[220px]">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-400 text-sm border-b border-slate-800">
                        <th className="pb-2">Ажилтны Нэр</th>
                        <th className="pb-2">Үүрэг</th>
                        <th className="pb-2">Цалингийн Төрөл</th>
                        <th className="pb-2">Үнэлгээ (₮)</th>
                        <th className="pb-2 text-right">Үйлдэл</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {workersList.map((w) => (
                        <tr key={w.id}>
                          <td className="py-2.5 font-bold text-slate-200">
                            {w.full_name || w.email.split("@")[0]}
                          </td>
                          <td className="py-2.5">
                            <select
                              value={w.role || "Ажилтан"}
                              onChange={async (e) => {
                                const updatedRole = e.target.value;
                                await supabase
                                  .from("profiles")
                                  .update({ role: updatedRole })
                                  .eq("id", w.id);
                                fetchDatabaseData(activeClient);
                              }}
                              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-sm text-emerald-400 font-bold"
                            >
                              <option value="Ажилтан">Ажилтан</option>
                              {companyRoles.map((r) => (
                                <option key={r.id} value={r.role_name}>
                                  {r.role_name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5">
                            <select
                              value={w.salary_type || "hourly"}
                              onChange={async (e) => {
                                const newType = e.target.value;
                                const defaultRate =
                                  newType === "fixed" ? 1200000 : 6500;
                                await supabase
                                  .from("profiles")
                                  .update({
                                    salary_type: newType,
                                    base_rate: defaultRate,
                                  })
                                  .eq("id", w.id);
                                fetchDatabaseData(activeClient);
                              }}
                              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-sm text-blue-400 font-bold"
                            >
                              <option value="hourly">⏱️ Цагийн хөлс</option>
                              <option value="fixed">📅 Сар бүр тогтмол</option>
                            </select>
                          </td>
                          <td className="py-2.5">
                            <input
                              type="number"
                              defaultValue={w.base_rate || 6500}
                              onBlur={async (e) => {
                                const val = parseFloat(e.target.value) || 0;
                                await supabase
                                  .from("profiles")
                                  .update({ base_rate: val })
                                  .eq("id", w.id);
                                fetchDatabaseData(activeClient);
                              }}
                              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-sm text-white font-bold w-24 text-right"
                            />
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  !confirm(
                                    `"${w.full_name}" ажилтныг устгах уу?`,
                                  )
                                )
                                  return;
                                const { error } = await supabase
                                  .from("profiles")
                                  .delete()
                                  .eq("id", w.id);
                                if (error) alert(error.message);
                                else fetchDatabaseData(activeClient);
                              }}
                              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-lg text-sm font-bold transition"
                            >
                              Устгах
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {/* SECTION 2: CREATE & VIEW TASKS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Task Form */}
              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 md:col-span-1 h-fit">
                <h3 className="text-base font-bold mb-4 text-emerald-400">
                  3. Шинэ даалгавар үүсгэх
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setLoading(true);
                    const { error } = await supabase.from("tasks").insert([
                      {
                        client_id: activeClient,
                        role: newTaskRole,
                        task_name: newTaskName,
                        weight: parseInt(newTaskWeight) || 10,
                      },
                    ]);

                    if (error) alert(`Алдаа: ${error.message}`);
                    else {
                      setNewTaskName("");
                      setNewTaskWeight("");
                      await fetchDatabaseData(activeClient);
                    }
                    setLoading(false);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">
                      Хэнд оноох вэ?
                    </label>
                    <select
                      value={newTaskRole}
                      onChange={(e) => setNewTaskRole(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold"
                    >
                      <option value="Бүх ажилтан">
                        Бүх ажилтан (Бүгд хийх)
                      </option>

                      {/* Dynamic Roles created by owner */}
                      <optgroup label="Үүргээр оноох (By Role)">
                        {companyRoles.map((r) => (
                          <option key={r.id} value={r.role_name}>
                            🏷️ {r.role_name} (Энэ үүрэгтэй бүх хүн)
                          </option>
                        ))}
                      </optgroup>

                      {/* Specific workers with their assigned roles */}
                      <optgroup label="Нэр зааж оноох (Specific Worker)">
                        {workersList.map((w) => {
                          const displayName =
                            w.full_name || w.email.split("@")[0];
                          return (
                            <option key={w.id} value={displayName}>
                              👤 {displayName} ({w.role})
                            </option>
                          );
                        })}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">
                      Даалгаврын нэр
                    </label>
                    <input
                      type="text"
                      required
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      placeholder="Жнь: Кофены машин угаах"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">
                      Ачааллын жин (Оноо 1-100)
                    </label>
                    <input
                      type="number"
                      required
                      value={newTaskWeight}
                      onChange={(e) => setNewTaskWeight(e.target.value)}
                      placeholder="Жнь: 15"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition text-sm"
                  >
                    Даалгавар Нэмэх
                  </button>
                </form>
              </div>

              {/* Tasks List */}
              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 md:col-span-2">
                <h3 className="text-base font-bold mb-4">
                  Бүртгэлтэй Даалгаврууд
                </h3>
                <div className="overflow-x-auto max-h-[350px]">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-400 text-sm border-b border-slate-800 uppercase">
                        <th className="pb-3 px-2">Оноосон Хаяг</th>
                        <th className="pb-3 px-2">Даалгаврын нэр</th>
                        <th className="pb-3 px-2">Ачаалал</th>
                        <th className="pb-3 px-2">
                          Үүсгэсэн Огноо (Цаг, Минут)
                        </th>
                        <th className="pb-3 px-2 text-right">Үйлдэл</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {tasks.filter((t) => t.client_id === activeClient)
                        .length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-6 text-center text-slate-500 italic"
                          >
                            Даалгавар байхгүй байна.
                          </td>
                        </tr>
                      ) : (
                        tasks
                          .filter((t) => t.client_id === activeClient)
                          .map((t) => (
                            <tr key={t.id} className="hover:bg-slate-900/30">
                              <td className="py-3 px-2 text-emerald-400 font-bold">
                                {t.role}
                              </td>
                              <td className="py-3 px-2 font-semibold text-slate-200">
                                {t.task_name}
                              </td>
                              <td className="py-3 px-2 text-blue-400 font-bold">
                                {t.weight} pts
                              </td>

                              {/* EXACT TIMESTAMPS: Year, Month, Day, Hour, Minute, Second */}
                              <td className="py-3 px-2 text-slate-400 text-sm font-mono">
                                {t.created_at
                                  ? new Date(t.created_at).toLocaleString(
                                      "mn-MN",
                                      {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                      },
                                    )
                                  : "-"}
                              </td>

                              <td className="py-3 px-2 text-right">
                                <button
                                  onClick={async () => {
                                    await supabase
                                      .from("tasks")
                                      .delete()
                                      .eq("id", t.id);
                                    fetchDatabaseData(activeClient);
                                  }}
                                  className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg text-sm font-bold transition"
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

              {/* Closed Shifts Report Table */}
              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 md:col-span-3 mt-8">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-400">
                  <Activity className="h-5 w-5" /> Хаагдсан ээлжүүдийн түүх
                  (Shift History)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 text-sm border-b border-slate-800 uppercase tracking-wider font-bold">
                        <th className="py-3 px-2">Ажилтан (Үүрэг)</th>
                        <th className="py-3 px-2">Эхэлсэн огноо</th>
                        <th className="py-3 px-2">Хаагдсан огноо</th>
                        <th className="py-3 px-2">Даалгаврын гүйцэтгэл</th>
                        <th className="py-3 px-2 text-right">Ээлжийн Статус</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-800/50">
                      {shifts.filter(
                        (s) => s.client_id === activeClient && !s.is_active,
                      ).length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-slate-500 italic"
                          >
                            Хаагдсан ээлж одоогоор байхгүй байна.
                          </td>
                        </tr>
                      ) : (
                        shifts
                          .filter(
                            (s) => s.client_id === activeClient && !s.is_active,
                          )
                          .map((s) => {
                            // Calculate task completion percentage
                            let tasksList = s.daily_tasks_checklist || [];
                            if (typeof tasksList === "string")
                              tasksList = JSON.parse(tasksList);
                            let completed = tasksList.filter(
                              (t: any) => t.done,
                            ).length;
                            let total = tasksList.length;
                            let percentage =
                              total > 0
                                ? Math.round((completed / total) * 100)
                                : 100;

                            return (
                              <tr key={s.id} className="hover:bg-slate-900/30">
                                <td className="py-3 px-2 font-bold text-slate-200">
                                  {s.character_role || "Ерөнхий ажилтан"}
                                </td>
                                <td className="py-3 px-2 text-slate-400">
                                  {new Date(s.start_time).toLocaleString(
                                    "mn-MN",
                                  )}
                                </td>
                                <td className="py-3 px-2 text-slate-400">
                                  {s.end_time
                                    ? new Date(s.end_time).toLocaleString(
                                        "mn-MN",
                                      )
                                    : "-"}
                                </td>
                                <td className="py-3 px-2 font-semibold">
                                  {total > 0 ? (
                                    <span
                                      className={
                                        percentage >= 80
                                          ? "text-emerald-400"
                                          : "text-amber-400"
                                      }
                                    >
                                      {percentage}% ({completed}/{total})
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 italic">
                                      Даалгавар байхгүй
                                    </span>
                                  )}
                                </td>
                                {/* Replace the Status <td> with this: */}
                                <td className="py-3 px-2 text-right flex items-center justify-end gap-2">
                                  {s.start_evidence_image && (
                                    <button
                                      onClick={() =>
                                        setSelectedImageModal({
                                          url: s.start_evidence_image,
                                          title: `Ээлж эхлэх үеийн зураг: ${s.character_role}`,
                                        })
                                      }
                                      className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-sm font-bold border border-blue-500/20 flex items-center gap-1"
                                    >
                                      <Camera className="h-3 w-3" /> Эхлэл
                                    </button>
                                  )}
                                  {s.pos_z_image_url && (
                                    <button
                                      onClick={() =>
                                        setSelectedImageModal({
                                          url: s.pos_z_image_url,
                                          title: `ПОС Z-Тайлан: ${s.character_role}`,
                                        })
                                      }
                                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg text-sm font-bold border border-emerald-500/20 flex items-center gap-1"
                                    >
                                      <Camera className="h-3 w-3" /> Z-Тайлан
                                    </button>
                                  )}
                                  <span className="bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg text-sm font-bold uppercase">
                                    Closed
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
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
            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800 mb-8 mt-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-400" />
                    Өдөр тутмын үйл ажиллагааны Хяналтын Лог
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Ажилтан тус бүрийн хийсэн бүх гүйлгээ, зураг болон баримтын
                    хяналт
                  </p>
                </div>

                {/* Date & Worker Range Filter Inputs */}
                <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-400">
                      Ажилтан Хайх:
                    </span>
                    <input
                      type="text"
                      value={workerSearchQuery}
                      onChange={(e) => setWorkerSearchQuery(e.target.value)}
                      placeholder="Нэр бичих..."
                      className="bg-transparent text-sm text-white font-bold outline-none border-0 p-0 focus:ring-0 w-36 placeholder:text-slate-600"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-400">
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
                    <span className="text-sm font-bold text-slate-400">
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
                  <thead className="sticky top-0 bg-slate-900/90 backdrop-blur">
                    <tr className="text-slate-400 text-sm font-bold uppercase border-b border-slate-800">
                      <th className="pb-3 px-2">Төрөл</th>
                      <th className="pb-3 px-2">Ажилтан</th>
                      <th className="pb-3 px-2">Барааны Нэр</th>
                      <th className="pb-3 px-2 text-right">Хэмжээ</th>
                      <th className="pb-3 px-2 text-right">Үнэ (Cost)</th>
                      <th className="pb-3 px-2 text-center">Баримт (Proof)</th>
                      <th className="pb-3 px-2">Тайлбар</th>
                      <th className="pb-3 px-2">Огноо</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-800/50">
                    {inventoryLogs.filter((log) => {
                      const logDate = log.date ? log.date.split("T")[0] : "";
                      const dateMatch =
                        logDate >= startDate && logDate <= endDate;

                      // Live, case-insensitive partial match search logic
                      const workerMatch =
                        !workerSearchQuery.trim() ||
                        (log.worker_name || "Үл мэдэгдэх")
                          .toLowerCase()
                          .includes(workerSearchQuery.toLowerCase().trim());

                      return (
                        dateMatch &&
                        workerMatch &&
                        log.client_id === activeClient
                      );
                    }).length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-8 text-center text-slate-500 italic"
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
                            logDate >= startDate && logDate <= endDate;

                          // Same dynamic search matching applied to the mapping loop
                          const workerMatch =
                            !workerSearchQuery.trim() ||
                            (log.worker_name || "Үл мэдэгдэх")
                              .toLowerCase()
                              .includes(workerSearchQuery.toLowerCase().trim());

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
                          const noteText = (log.notes || "").toLowerCase();
                          const isPhotoVerified =
                            noteText.includes("scan") ||
                            noteText.includes("e-barimt") ||
                            noteText.includes("proof") ||
                            noteText.includes("зураг");

                          return (
                            <tr key={log.id} className="hover:bg-slate-900/30">
                              <td className="py-3 px-2">
                                <span
                                  className={`px-2 py-1 rounded-lg text-sm font-black uppercase ${
                                    log.type === "purchase"
                                      ? "bg-blue-500/10 text-blue-400"
                                      : log.type === "count"
                                        ? "bg-purple-500/10 text-purple-400"
                                        : "bg-rose-500/10 text-rose-400"
                                  }`}
                                >
                                  {log.type}
                                </span>
                              </td>
                              {/* АЖИЛТАН БАГАНА */}
                              <td className="py-3 px-2 text-slate-300 font-medium">
                                {log.worker_name || "Үл мэдэгдэх"}
                              </td>
                              <td className="py-3 px-2 font-bold text-slate-200">
                                {name}
                              </td>
                              <td className="py-3 px-2 text-right font-semibold">
                                {Math.abs(log.quantity).toLocaleString()} {unit}
                              </td>
                              <td className="py-3 px-2 text-right text-slate-400">
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
                                        title: `📸 Нотлох баримт: ${name}`,
                                        subtitle: `${log.worker_name} • ${new Date(log.date).toLocaleString("mn-MN")}`,
                                      })
                                    }
                                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-sm font-black transition flex items-center gap-1 mx-auto"
                                  >
                                    <Camera className="h-3 w-3" /> Зураг үзэх
                                  </button>
                                ) : isPhotoVerified ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg text-sm font-bold border border-emerald-500/20">
                                    📸 Баримттай
                                  </span>
                                ) : log.type === "purchase" ? (
                                  <span className="bg-rose-500/10 text-rose-400 px-2 py-1 rounded-lg text-sm font-bold border border-rose-500/20">
                                    ⚠️ Зураггүй
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-sm italic">
                                    Дотоод
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-slate-400 max-w-[200px] truncate">
                                {log.notes || "-"}
                              </td>
                              <td className="py-3 px-2 text-slate-400 text-sm font-mono">
                                {new Date(log.date).toLocaleString("mn-MN", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
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

        {/* Live Database Inventory Table (Visible across all tabs except inventory bulk editor & bulk paste tabs) */}
        {activeTab !== "inventory" &&
          activeTab !== "import" &&
          activeTab !== "ai_cfo" &&
          activeTab !== "operations" &&
          activeTab !== "tasks" &&
          activeTab !== "sales" &&
          activeTab !== "settings" && (
            <div className="mt-8 bg-slate-900/30 p-6 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-400" />
                    Агуулахын бодит үлдэгдэл (Live Inventory)
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Supabase PostgreSQL-ээс уншиж буй бодит дата
                  </p>
                </div>
                {lowStockItems.length > 0 && (
                  <span className="bg-rose-500/10 text-rose-400 px-3 py-1 rounded-xl text-sm font-semibold border border-rose-500/20 flex items-center gap-1.5 animate-bounce">
                    <AlertTriangle className="h-4 w-4" />
                    {lowStockItems.length} Барааны нөөц дуусаж байна!
                  </span>
                )}
              </div>

              {loading ? (
                <p className="text-center text-slate-500 py-8 text-sm animate-pulse">
                  Агуулахын мэдээллийг татаж байна...
                </p>
              ) : ingredients.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">
                  Бараа материал бүртгэгдээгүй байна.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-sm font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Барааны Нэр</th>
                        <th className="py-3 px-4">Нэгж</th>
                        <th className="py-3 px-4 text-right">Стандарт Өртөг</th>

                        <th className="py-3 px-4 text-right">Бодит Үлдэгдэл</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-sm">
                      {ingredients.map((ing) => (
                        <tr
                          key={ing.id}
                          className="hover:bg-slate-900/20 transition-all duration-150"
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-200">
                            {ing.name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {ing.unit}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-300">
                            {parseFloat(ing.unit_price).toLocaleString()}₮
                          </td>

                          <td
                            className={`py-3.5 px-4 text-right font-black ${
                              parseFloat(ing.current_stock) <= 50
                                ? "text-rose-400 bg-rose-500/5"
                                : "text-slate-100"
                            }`}
                          >
                            {parseFloat(ing.current_stock).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        {/* 8. ⚙️ 100% ДИНАМИК САНХҮҮ, ХӨРӨНГӨ, ТОХИРГООНЫ ТАБ */}
        {activeTab === "settings" && userRole === "owner" && (
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
                      setCatalogTab("ingredients");
                      setSelectedIngIds([]);
                      setIsAddingIngRow(false);
                      setEditingIngId(null);
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
                      setCatalogTab("products");
                      setSelectedProdIds([]);
                      setIsAddingProdRow(false);
                      setEditingProdId(null);
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
                      setCatalogTab("recipes");
                      setSelectedRecipeProducts([]);
                      setInlineAddRecipeProduct(null);
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
                                    {ch.productName}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                                      ch.type === 'NAME_MERGE' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                      ch.type === 'PRICE_UPDATE' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    }`}>
                                      {ch.type === 'NAME_MERGE' ? 'Нэр нэгтгэгдсэн' :
                                      ch.type === 'PRICE_UPDATE' ? 'Үнэ шинэчлэгдсэн' : 'Шинэ цэс'}
                                    </span>
                                  </td>
                                  {/* ХУУЧИН МЭДЭЭЛЭЛ (Меню дээр байсан) */}
                                  <td className="py-2.5 px-3 text-right text-slate-400 font-mono">
                                    {ch.type === 'NAME_MERGE' ? (
                                      <div>
                                        <span>{ch.oldName}</span>
                                        <span className="block text-xs text-slate-500">{ch.oldPrice.toLocaleString()} ₮</span>
                                      </div>
                                    ) : ch.type === 'PRICE_UPDATE' ? (
                                      `${ch.oldPrice.toLocaleString()} ₮`
                                    ) : '-'}
                                  </td>
                                  {/* ШИНЭ МЭДЭЭЛЭЛ (ПОС-оос орж ирсэн) */}
                                  <td className="py-2.5 px-3 text-right text-emerald-400 font-mono font-black">
                                    {ch.type === 'NAME_MERGE' ? (
                                      <div>
                                        <span>{ch.newName}</span>
                                        <span className="block text-xs text-emerald-300">{ch.newPrice.toLocaleString()} ₮</span>
                                      </div>
                                    ) : (
                                      `${ch.newPrice.toLocaleString()} ₮`
                                    )}
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
                              
                              {/* ⚡ СОНГОЛТ 1: ХУУЧИН ЖОРТОЙ СОЛЬЖ НЭГТГЭХ (Chicken Sandwich -> Chicken sa) */}
                              <div className="flex items-center gap-1.5 flex-1 lg:flex-none">
                                <select
                                  id={`merge-select-${idx}`}
                                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-sm text-slate-200 outline-none w-full lg:w-48 cursor-pointer"
                                >
                                  <option value="">-- Жортой цэснээс сонгох --</option>
                                  {Array.from(new Set(recipes.map((r: any) => r.product_name))).map((rName: any) => (
                                    <option key={rName} value={rName}>
                                      📖 {rName}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    const selectEl = document.getElementById(`merge-select-${idx}`) as HTMLSelectElement;
                                    const selectedOldName = selectEl?.value;
                                    if (!selectedOldName) {
                                      alert("Сольж нэгтгэх хуучин жороо сонгоно уу!");
                                      return;
                                    }

                                    const posName = item.name.trim();
                                    setLoading(true);

                                    // Хуучин бүтээгдэхүүний ангиллыг хадгалах
                                    const existingProd = productsList.find(p => p.name.toLowerCase().trim() === selectedOldName.toLowerCase().trim());
                                    const preservedCategory = existingProd?.category || 'General';

                                    // A. Recipes хүснэгт дэх жорын нэрийг шинэчилнэ:
                                    await supabase
                                      .from('recipes')
                                      .update({ product_name: posName })
                                      .eq('client_id', activeClient)
                                      .eq('product_name', selectedOldName);

                                    // B. Products хүснэгт дэх нэр, үнийг шинэчилж, ангиллыг үлдээнэ:
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

                                    // C. aliasMap-д бүртгэх
                                    aliasMap[cleanString(posName).toLowerCase()] = cleanString(posName).toLowerCase();

                                    setLoading(false);
                                    fetchDatabaseData(activeClient);
                                    alert(`✅ "${selectedOldName}"-ийн жор ба ангиллыг "${posName}" (${item.unitPrice.toLocaleString()}₮) болгож амжилттай нэгтгэлээ!`);
                                  }}
                                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl font-black text-sm transition active:scale-95 whitespace-nowrap shadow"
                                >
                                  🔗 Сольж нэгтгэх
                                </button>
                              </div>

                              <span className="text-slate-600 text-sm hidden lg:inline">эсвэл</span>

                              {/* ⚡ СОНГОЛТ 2: ЦОО ШИНЭЭР ЦЭСЭНД НЭМЭХ (Хэрэв жоргүй шинэ бараа бол) */}
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
                              <input
                                type="text"
                                value={newProdDraft.category}
                                onChange={e => setNewProdDraft({ ...newProdDraft, category: e.target.value })}
                                placeholder="COFFEE, FOOD..."
                                className="w-24 bg-[#060b17] border border-blue-500 rounded-lg px-2 py-1 text-sm text-white outline-none"
                              />
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

                            // ⚡ ЖОРТОЙ ЭСЭХИЙГ ШАЛГАХ
                            const prodRecipes = recipes.filter(
                              (r: any) => cleanString(r.product_name).toLowerCase() === cleanString(prod.name).toLowerCase() ||
                                          (aliasMap[cleanString(prod.name).toLowerCase()] === cleanString(r.product_name).toLowerCase())
                            );
                            const hasRecipe = prodRecipes.length > 0;

                            if (isEditingThis) {
                              return (
                                <tr key={`edit-${prod.id}-${idx}`} className="bg-blue-950/40 border-b-2 border-blue-500/60"> 
                                  <td className="py-2 px-3"></td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="text"
                                      value={editingProdDraft.category}
                                      onChange={e => setEditingProdDraft({ ...editingProdDraft, category: e.target.value })}
                                      className="w-24 bg-[#060b17] border border-blue-500 rounded-lg px-2 py-1 text-sm text-white outline-none"
                                    />
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

                                          if (oldName && oldName !== newName) {
                                            setRecipes(prev => prev.map(r => r.product_name === oldName ? { ...r, product_name: newName } : r));
                                            await supabase.from('recipes').update({ product_name: newName }).eq('client_id', activeClient).eq('product_name', oldName);
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
                                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-bold">
                                    {prod.category || 'General'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-bold text-white">{prod.name}</td>
                                <td className="py-2.5 px-3 text-right text-emerald-400 font-mono font-black text-sm">
                                  {parseFloat(prod.selling_price || 0).toLocaleString()} ₮
                                </td>
                           {/* ⚡ УХААЛАГ ЖОРЫН ТӨЛӨВ & ХОЛБООС БАГАНА */}
                                <td className="py-2.5 px-3 text-center">
                                  {(() => {
                                    // 1. Шууд яг таарсан жор баазад байгаа эсэх
                                    const exactRecipes = recipes.filter(
                                      (r: any) => cleanString(r.product_name).toLowerCase() === cleanString(prod.name).toLowerCase() ||
                                                  (aliasMap[cleanString(prod.name).toLowerCase()] === cleanString(r.product_name).toLowerCase())
                                    );

                                    if (exactRecipes.length > 0) {
                                      return (
                                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1">
                                          <span>🟢 Жортой</span>
                                          <span className="text-xs text-emerald-500/80">({exactRecipes.length} орц)</span>
                                        </span>
                                      );
                                    }

                                    // 2. Баазад байгаа бүх өнчин/бэлэн жоруудаас төстэйг нь хайх:
                                    const allRecipeNames = Array.from(new Set(recipes.map((r: any) => r.product_name)));
                                    const matchedExistingRecipe = allRecipeNames.find((rName: any) =>
                                      getSimilarity(cleanString(rName), cleanString(prod.name)) >= 0.70
                                    );

                                    // ХЭРЭВ БААЗАД ХУУЧИН ЖОР НЬ БЭЛЭН БАЙВАЛ: (10 орцыг дахиж шивэхгүй шууд холбоно!)
                                    if (matchedExistingRecipe) {
                                      return (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            await handleIntegrateMenuWithRecipe(prod.name, matchedExistingRecipe);
                                          }}
                                          className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 mx-auto active:scale-95 shadow-sm"
                                          title={`Баазад байгаа "${matchedExistingRecipe}" жорыг дахин шивэлгүй шууд холбох`}
                                        >
                                          <span>🔗 Бэлэн жор холбох ({matchedExistingRecipe})</span>
                                        </button>
                                      );
                                    }

                                    // ЦОО ШИНЭ БҮТЭЭГДЭХҮҮН БОЛ: (Шинээр орц угсрах товч гарна)
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCatalogTab('recipes');
                                          setIsCreatingRecipeCard(true);
                                          setNewRecipeNameDraft(prod.name);
                                          setNewRecipePriceDraft(prod.selling_price?.toString() || '');
                                        }}
                                        className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 mx-auto active:scale-95 shadow-sm"
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
                  

               {/* ⚡ ТАНЫ ЗУРАГ ШИГ ХАРАГДАХ ШИНЭ ЖОРЫН ХООСОН КАРТ */}
                  {isCreatingRecipeCard && (
                    <div className="bg-slate-950 p-4 rounded-2xl border-2 border-purple-500/70 space-y-3 animate-in fade-in duration-150">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                          
                            <select
                            value={newRecipeNameDraft}
                            onChange={(e) => {
                              const chosenName = e.target.value;
                              setNewRecipeNameDraft(chosenName);
                              const matchedProd = productsList.find(p => p.name === chosenName);
                              if (matchedProd && matchedProd.selling_price) {
                                setNewRecipePriceDraft(matchedProd.selling_price.toString());
                              }
                            }}
                            className="w-full sm:w-72 bg-[#060b17] border border-purple-500 rounded-xl px-3 py-2 text-sm text-white font-black outline-none cursor-pointer"
                          >
                            <option value="">-- Жор холбох цэсээ сонгоно уу --</option>
                            {productsList.map((p) => {
                              const alreadyHasRecipe = recipes.some((r: any) => cleanString(r.product_name).toLowerCase() === cleanString(p.name).toLowerCase());
                              return (
                                <option key={p.id} value={p.name}>
                                  {alreadyHasRecipe ? `✓ ${p.name} (Жортой)` : `⚠️ ${p.name} (ЖОРГҮЙ - Сонгох)`}
                                </option>
                              );
                            })}
                          </select>

                          {/* Зарах үнэ (Менюнээс өөрөө бөглөгдөнө, хүсвэл засаж болно) */}
                          <input
                            type="number"
                            value={newRecipePriceDraft}
                            onChange={(e) => setNewRecipePriceDraft(e.target.value)}
                            placeholder="Зарах үнэ ₮..."
                            className="w-28 bg-[#060b17] border border-purple-500/80 rounded-xl px-3 py-1.5 text-sm text-emerald-400 font-mono font-black outline-none"
                          />
                        </div>

                        {/* ✓ Батлах ба ✕ Болиулах товчнууд */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={!newRecipeNameDraft.trim() || newRecipeItemsDraft.length === 0}
                            onClick={async () => {
                              const pName = newRecipeNameDraft.trim();
                              
                              // 1. Бүтээгдэхүүний үнэ өөрчлөгдсөн бол шинэчлэх
                              if (newRecipePriceDraft) {
                                await supabase.from('products').upsert([{
                                  client_id: activeClient,
                                  name: pName,
                                  category: 'General',
                                  selling_price: parseFloat(newRecipePriceDraft) || 0
                                }], { onConflict: 'client_id,name' });
                              }

                              // 2. Жорыг Recipes хүснэгтэд хадгалах
                              const recipeRows = newRecipeItemsDraft.map(it => ({
                                client_id: activeClient,
                                product_name: pName,
                                ingredient_id: it.ingredient_id,
                                amount: parseFloat(it.amount) || 0
                              }));

                              const { data } = await supabase.from('recipes').insert(recipeRows).select();
                              if (data) setRecipes(prev => [...prev, ...data]);

                              setIsCreatingRecipeCard(false);
                              setNewRecipeNameDraft('');
                              setNewRecipePriceDraft('');
                              setNewRecipeItemsDraft([]);
                              fetchDatabaseData(activeClient);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-sm flex items-center gap-1 transition active:scale-95 shadow"
                          >
                            <span>✓ Батлах</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsCreatingRecipeCard(false)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-xl text-sm transition"
                          >
                            ✕ Болиулах
                          </button>
                        </div>
                      </div>

                      {/* Орцуудын хайрцаг ба дотор нь орц нэмэх хэсэг */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                        {newRecipeItemsDraft.map((item, idx) => {
                          const ing = ingredients.find(i => i.id === item.ingredient_id);
                          return (
                            <div key={idx} className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl text-sm flex items-center gap-1.5 font-bold text-white">
                              <span>{ing?.name || 'Орц'}</span>
                              <span className="text-purple-400 font-mono">{item.amount} {ing?.unit}</span>
                              <button
                                type="button"
                                onClick={() => setNewRecipeItemsDraft(newRecipeItemsDraft.filter((_, i) => i !== idx))}
                                className="text-rose-400 hover:text-rose-300 p-0.5"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}

                        {/* Инлайн орц нэмэх жижиг сонгогч */}
                        <div className="flex items-center gap-1 bg-purple-950/40 border border-purple-500/40 p-1 rounded-xl">
                          <select
                            value={draftRecipeIngId}
                            onChange={e => setDraftRecipeIngId(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white outline-none cursor-pointer"
                          >
                            <option value="">-- Орц сонгох --</option>
                            {ingredients.map(i => (
                              <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Хэмжээ..."
                            value={draftRecipeIngAmt}
                            onChange={e => setDraftRecipeIngAmt(e.target.value)}
                            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white outline-none font-mono"
                          />
                          <button
                            type="button"
                            disabled={!draftRecipeIngId || !draftRecipeIngAmt}
                            onClick={() => {
                              setNewRecipeItemsDraft([...newRecipeItemsDraft, { ingredient_id: draftRecipeIngId, amount: draftRecipeIngAmt }]);
                              setDraftRecipeIngId('');
                              setDraftRecipeIngAmt('');
                            }}
                            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black px-2 py-1 rounded-lg text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
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
                            className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 hover:border-slate-700 transition"
                          >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={selectedRecipeProducts.includes(
                                    pName,
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked)
                                      setSelectedRecipeProducts((prev) => [
                                        ...prev,
                                        pName,
                                      ]);
                                    else
                                      setSelectedRecipeProducts((prev) =>
                                        prev.filter((name) => name !== pName),
                                      );
                                  }}
                                  className="w-4 h-4 accent-purple-500 cursor-pointer rounded"
                                />
                                <h4 className="text-sm font-black text-white">
                                  {pName}
                                </h4>
                              </div>

                              <div className="flex items-center gap-2 text-sm flex-wrap font-mono">
                                <span className="text-slate-400">
                                  Зарах:{" "}
                                  <strong className="text-white">
                                    {sellPrice.toLocaleString()} ₮
                                  </strong>
                                </span>
                                <span className="text-slate-700">•</span>
                                <span className="text-slate-400">
                                  Өртөг:{" "}
                                  <strong className="text-rose-400">
                                    {Math.round(
                                      calculatedCost,
                                    ).toLocaleString()}{" "}
                                    ₮
                                  </strong>
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                                    marginPct >= 75
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                      : marginPct >= 60
                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                        : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  }`}
                                >
                                  Маржин: {marginPct.toFixed(1)}%
                                </span>
                              </div>
                            </div>

                            {/* ⚡ ОРЦУУДЫН ХАЙРЦАГ (БАТАЛГААТАЙ ШУУД ЗАСАХ & ИНЛАЙН НЭМЭХ) */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800">
                              {productRecipes.map((r: any) => {
                                const ing = ingredients.find(
                                  (i) => i.id === r.ingredient_id,
                                );
                                const draftVal = recipeDrafts[r.id];
                                const isDrafting =
                                  draftVal !== undefined &&
                                  draftVal !== r.amount.toString();

                                return (
                                  <div
                                    key={r.id}
                                    className={`bg-slate-900/90 border px-3 py-1.5 rounded-2xl text-sm flex items-center gap-2.5 transition shadow-sm ${
                                      isDrafting
                                        ? "border-amber-400 bg-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                                        : "border-slate-800 hover:border-slate-700"
                                    }`}
                                  >
                                    {/* Орцын нэр (Тод цагаан, 12px) */}
                                    <span className="text-slate-200 font-bold">
                                      {ing?.name || "Орц"}
                                    </span>

                                    {/* ✏️ ТООГ ЗАСАХ ХАЙРЦАГ (Тодорхой хүрээтэй, хулгана очиход цайрна) */}
                                    <div
                                      className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-purple-500/40 hover:border-purple-400 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/20 transition cursor-text group"
                                      title="Энд дарж граммыг шууд өөрчилнө үү"
                                    >
                                      <span className="text-sm text-purple-400/80 group-hover:text-purple-300 select-none">
                                        ✏️
                                      </span>
                                      <input
                                        type="number"
                                        value={
                                          draftVal !== undefined
                                            ? draftVal
                                            : r.amount
                                        }
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
                                              setRecipes((prev) =>
                                                prev.map((item) =>
                                                  item.id === r.id
                                                    ? { ...item, amount: val }
                                                    : item,
                                                ),
                                              );
                                              setRecipeDrafts((prev) => {
                                                const n = { ...prev };
                                                delete n[r.id];
                                                return n;
                                              });
                                              await supabase
                                                .from("recipes")
                                                .update({ amount: val })
                                                .eq("id", r.id);
                                              fetchDatabaseData(activeClient);
                                            }
                                          } else if (e.key === "Escape") {
                                            setRecipeDrafts((prev) => {
                                              const n = { ...prev };
                                              delete n[r.id];
                                              return n;
                                            });
                                          }
                                        }}
                                        className="w-14 bg-transparent text-center text-purple-200 font-mono font-black text-sm outline-none cursor-text p-0"
                                      />
                                      <span className="text-xs text-slate-400 font-semibold select-none">
                                        {ing?.unit || "гр"}
                                      </span>
                                    </div>

                                    {/* ⚡ ӨӨРЧИЛСӨН ҮЕД: ХАДГАЛАХ [✓] БА БОЛИУЛАХ [✕] ТОД ТОВЧНУУД */}
                                    {isDrafting && (
                                      <div className="flex items-center gap-1 animate-in fade-in duration-100">
                                        {/* ✓ БАТЛАХ */}
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const val = parseFloat(draftVal);
                                            if (!isNaN(val) && val > 0) {
                                              setRecipes((prev) =>
                                                prev.map((item) =>
                                                  item.id === r.id
                                                    ? { ...item, amount: val }
                                                    : item,
                                                ),
                                              );
                                              setRecipeDrafts((prev) => {
                                                const n = { ...prev };
                                                delete n[r.id];
                                                return n;
                                              });
                                              await supabase
                                                .from("recipes")
                                                .update({ amount: val })
                                                .eq("id", r.id);
                                              fetchDatabaseData(activeClient);
                                            }
                                          }}
                                          className="h-7 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-sm transition active:scale-95 shadow-md flex items-center justify-center cursor-pointer"
                                          title="Хадгалах (Enter)"
                                        >
                                          ✓
                                        </button>

                                        {/* ✕ БОЛИУЛАХ */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRecipeDrafts((prev) => {
                                              const n = { ...prev };
                                              delete n[r.id];
                                              return n;
                                            });
                                          }}
                                          className="h-7 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition active:scale-95 flex items-center justify-center cursor-pointer"
                                          title="Болих (Хуучин тоог үлдээх)"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    )}

                                    {/* 🗑️ ТОД ХҮРЭЭТЭЙ ХОГИЙН САВ ТОВЧЛУУР (Улаан hover эффекттэй) */}
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (
                                          !confirm(
                                            `"${pName}"-ийн жороос "${ing?.name}" орцыг хасах уу?`,
                                          )
                                        )
                                          return;
                                        setRecipes((prev) =>
                                          prev.filter(
                                            (item) => item.id !== r.id,
                                          ),
                                        );
                                        await supabase
                                          .from("recipes")
                                          .delete()
                                          .eq("id", r.id);
                                        fetchDatabaseData(activeClient);
                                      }}
                                      className="h-7 w-7 rounded-xl bg-slate-950/70 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 flex items-center justify-center text-sm transition active:scale-95 shrink-0 cursor-pointer shadow-sm"
                                      title="Энэ орцыг жороос хасах"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                );
                              })}

                              {/* ➕ ТОД ХҮРЭЭТЭЙ "+ ОРЦ" ТОВЧ */}
                              {inlineAddRecipeProduct === pName ? (
                                <div className="flex items-center gap-1.5 bg-purple-950/60 border-2 border-purple-500/60 p-1 rounded-2xl animate-in fade-in duration-150">
                                  <select
                                    value={inlineRecipeDraft.ingredient_id}
                                    onChange={(e) =>
                                      setInlineRecipeDraft({
                                        ...inlineRecipeDraft,
                                        ingredient_id: e.target.value,
                                      })
                                    }
                                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-sm text-white outline-none cursor-pointer"
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
                                    className="w-16 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-sm text-white outline-none font-mono"
                                  />
                                  <button
                                    type="button"
                                    disabled={
                                      !inlineRecipeDraft.ingredient_id ||
                                      !inlineRecipeDraft.amount
                                    }
                                    onClick={async () => {
                                      const { data } = await supabase
                                        .from("recipes")
                                        .insert([
                                          {
                                            client_id: activeClient,
                                            product_name: pName,
                                            ingredient_id:
                                              inlineRecipeDraft.ingredient_id,
                                            amount:
                                              parseFloat(
                                                inlineRecipeDraft.amount,
                                              ) || 0,
                                          },
                                        ])
                                        .select()
                                        .single();
                                      if (data)
                                        setRecipes((prev) => [...prev, data]);
                                      setInlineAddRecipeProduct(null);
                                      setInlineRecipeDraft({
                                        ingredient_id: "",
                                        amount: "",
                                      });
                                      fetchDatabaseData(activeClient);
                                    }}
                                    className="h-7 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm cursor-pointer"
                                    title="Нэмэх"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInlineAddRecipeProduct(null)
                                    }
                                    className="h-7 px-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-sm cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlineAddRecipeProduct(pName);
                                    setInlineRecipeDraft({
                                      ingredient_id: "",
                                      amount: "",
                                    });
                                  }}
                                  className="h-8 px-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-2 border-dashed border-purple-500/40 hover:border-purple-400 rounded-2xl text-sm font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
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
                                  setRecipes((prev) =>
                                    prev.filter(
                                      (r) => r.product_name !== pName,
                                    ),
                                  );
                                  await supabase
                                    .from("recipes")
                                    .delete()
                                    .eq("client_id", activeClient)
                                    .eq("product_name", pName);
                                  fetchDatabaseData(activeClient);
                                }}
                                className="text-rose-400 hover:text-rose-300 text-sm font-bold underline ml-auto py-1 cursor-pointer"
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 1. КАСС, БАНК БА ТАТВАРЫН ЭХНИЙ ТОХИРГОО */}
              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold mb-4 text-emerald-400 flex items-center gap-2">
                  🏦 1. Мөнгөн Данс & Татварын Горим
                </h3>
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
          </div>
        )}

        {/* 📸 FULL-SCREEN EVIDENCE IMAGE VIEWER MODAL */}
        {selectedImageModal && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedImageModal(null)}
          >
            <div
              className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-black text-white">
                    {selectedImageModal.title}
                  </h3>
                  {selectedImageModal.subtitle && (
                    <p className="text-sm text-slate-400 mt-0.5">
                      {selectedImageModal.subtitle}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedImageModal(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-sm font-bold transition"
                >
                  ✕ Хаах
                </button>
              </div>

              <div className="flex-1 min-h-0 py-4 flex items-center justify-center overflow-auto">
                <img
                  src={selectedImageModal.url}
                  alt="Evidence Preview"
                  className="max-h-[65vh] w-auto rounded-2xl object-contain shadow-md border border-slate-800"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <a
                  href={selectedImageModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition flex items-center gap-1.5"
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
              className="bg-[#0b1329] border border-slate-700 rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                    <Search className="h-6 w-6 text-blue-400" />
                    Алдагдлын Шинжилгээний Гарын Авлага
                  </h3>
                  <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                    Систем дээр үүссэн "Шалтгаангүй алдагдал" нь шууд хулгай
                    гэсэн үг биш юм. Та менежерийн хувиар дараах 4 нөхцөлийг
                    шалгаж эрсдэлийг удирдах боломжтой.
                  </p>
                </div>
                <button
                  onClick={() => setShowWasteGuideModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-sm font-bold transition"
                >
                  ✕ Хаах
                </button>
              </div>
              {/* 🤖 AI ЗӨВЛӨХТЭЙ ЯРИЛЦАХ ЗААВАР */}
              <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl mb-6">
                <h4 className="font-black text-blue-400 text-sm flex items-center gap-2 mb-2">
                  <Bot className="h-5 w-5" />
                  AI Зөвлөхөөс хэрхэн асуух вэ? (Хамгийн хурдан арга)
                </h4>
                <p className="text-sm text-slate-300 mb-3 leading-relaxed">
                  Та дээрх алдагдал хулгай мөн эсэхийг өөрөө таах шаардлагагүй.{" "}
                  <strong>"🤖 AI Зөвлөх"</strong> таб руу ороод доорх
                  асуултуудаас хуулж асуугаарай. AI өөрөө датаг шинжлээд хулгай
                  юу, эсвэл алдаа юу гэдгийг магадлалаар нь гаргаж өгнө.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                    <p className="text-xs text-slate-500 font-bold mb-1 uppercase">
                      Жишээ асуулт 1:
                    </p>
                    <p className="text-sm text-white font-mono">
                      "Өнөөдрийн 15,000₮-ийн сүүний алдагдал хулгай юу, эсвэл
                      орц хэтрүүлэлт үү? Шинжилж өг."
                    </p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                    <p className="text-xs text-slate-500 font-bold mb-1 uppercase">
                      Жишээ асуулт 2:
                    </p>
                    <p className="text-sm text-white font-mono">
                      "Сүү, Кофе хоёр зэрэгцээд дутсан байна. ПОС дээр бэлэн
                      мөнгөөр зараагүй нуусан хулгай байх магадлалтай юу?"
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* НӨХЦӨЛ 1 */}
                <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-emerald-500/10 p-2 rounded-xl">
                      <Coffee className="h-5 w-5 text-emerald-400" />
                    </div>
                    <h4 className="font-bold text-slate-200 text-sm">
                      1. Орц хэтрүүлэлт (Overpouring)
                    </h4>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">
                    <strong>Шинж тэмдэг:</strong> Аяга бүрээс 10-20мл гэх мэт
                    маш бага хэмжээгээр, тогтмол дутаад байх.
                  </p>
                  <div className="bg-emerald-500/5 border-l-2 border-emerald-500 p-2.5 text-sm text-emerald-300/90 rounded-r-lg">
                    <strong>Авах арга хэмжээ:</strong> Бариста нарт сүүний
                    хөөсрүүлэгч савны зураасаар сүүгээ тааруулж хийхийг
                    анхааруулах, кофены бутлагчийн (grinder) граммын тохиргоог
                    дахин жигнэж тааруулах.
                  </div>
                </div>

                {/* НӨХЦӨЛ 2 */}
                <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-blue-500/10 p-2 rounded-xl">
                      <Layers3 className="h-5 w-5 text-blue-400" />
                    </div>
                    <h4 className="font-bold text-slate-200 text-sm">
                      2. Бүртгэхээ мартсан (Forgot Log)
                    </h4>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">
                    <strong>Шинж тэмдэг:</strong> Ажилтан хоолондоо хэрэглэсэн,
                    эсвэл санамсаргүй асгасан ч Kiosk-д оруулж амжаагүй байх.
                  </p>
                  <div className="bg-blue-500/5 border-l-2 border-blue-500 p-2.5 text-sm text-blue-300/90 rounded-r-lg">
                    <strong>Авах арга хэмжээ:</strong> Ажилтнаас асуух. Хэрэв
                    асгасан байвал Kiosk руу ороод "1л сүү асгасан" гэж нөхөж
                    оруулахад л системийн энэ алдагдал автоматаар 0 болж
                    засагдана.
                  </div>
                </div>

                {/* НӨХЦӨЛ 3 */}
                <div className="bg-[#111827] p-5 rounded-2xl border border-rose-900/50 hover:border-rose-500/30 transition md:col-span-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-rose-500/10 p-2 rounded-xl">
                      <DollarSign className="h-5 w-5 text-rose-400" />
                    </div>
                    <h4 className="font-bold text-rose-400 text-sm">
                      3. Бэлэн мөнгөний хулгай (Un-rung Sales)
                    </h4>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">
                    <strong>Шинж тэмдэг:</strong> Системд ямар ч борлуулалт
                    (Орлого) ороогүй мөртлөө Сүү, Кофе үр, Аяга 3 зэрэг дутсан
                    байх.
                  </p>
                  <div className="bg-rose-500/5 border-l-2 border-rose-500 p-2.5 text-sm text-rose-300/90 rounded-r-lg flex flex-col gap-1.5">
                    <span>
                      <strong>Авах арга хэмжээ:</strong> Энэ бол бариста
                      үйлчлүүлэгчээс бэлэн мөнгө аваад ПОС-д шивэлгүй кофе хийж
                      өгсөн хамгийн ноцтой үйлдэл юм.
                    </span>
                    <span>
                      Агуулахын Тооллого цэсний "Үйл ажиллагааны Хяналтын Лог"
                      хэсгээс тооллого дутсан яг тэр цаг мөчийг шүүж, хяналтын
                      камертай (CCTV) тулгаж шалгана уу.
                    </span>
                  </div>
                </div>

                {/* НӨХЦӨЛ 4 */}
                <div className="bg-[#111827] p-5 rounded-2xl border border-amber-900/50 hover:border-amber-500/30 transition md:col-span-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-amber-500/10 p-2 rounded-xl">
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                    </div>
                    <h4 className="font-bold text-amber-400 text-sm">
                      4. Физик хулгай эсвэл Том асгаралт
                    </h4>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">
                    <strong>Шинж тэмдэг:</strong> Бүтэн 1 хайрцаг сүү (12л),
                    эсвэл 1 бүтэн уут кофе гэнэт алга болох.
                  </p>
                  <div className="bg-amber-500/5 border-l-2 border-amber-500 p-2.5 text-sm text-amber-300/90 rounded-r-lg">
                    <strong>Авах арга хэмжээ:</strong> Хэрэв Kiosk дээр зурагтай
                    "Хаягдал" бүртгэгдээгүй байвал тухайн ээлжийн ажилтнаас шууд
                    тайлбар нэхэж, хариуцлага тооцох шаардлагатай.
                  </div>
                </div>
              </div>
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
