"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'; // next/dynamic to bypass 100% of extension hydration conflicts
import {supabase} from '../../lib/supabase';
import { 
  TrendingUp, Trash2, Cpu, Layers, DollarSign, Percent, Activity, 
  AlertTriangle, Database, Coffee, PlusCircle, History, CheckCircle, 
  Undo2, Layers3, Building, Save, Check, FileSpreadsheet, UploadCloud, 
  Eye, EyeOff, Bot // <--- Add Bot here!
} from 'lucide-react';

import { useRouter } from 'next/navigation';







function Home() {
    //  add session checking state
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userClient, setUserClient] = useState<string>('SF Coffee');
  // Navigation State
const [activeTab, setActiveTab] = useState<'dashboard' | 'barista' | 'sales' | 'inventory' | 'import' | 'tasks'| 'ai_cfo'>('dashboard');
const [userRole, setUserRole] = useState<'owner' | 'barista'>('owner');
const [shifts, setShifts] = useState<any[]>([]);
const [activeClient, setActiveClient] = useState<string | 'Cafe B'>(userClient);
const [tasks, setTasks] = useState<any[]>([]);
const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; }); // Defaults to 1st of the month
const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]); // Defaults to today
const [workerSearchQuery, setWorkerSearchQuery] = useState('');
const [newTaskName, setNewTaskName] = useState('');
const [newTaskRole, setNewTaskRole] = useState('Бариста ☕');
const [newTaskWeight, setNewTaskWeight] = useState('');
  // Database States
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);
  const [salesLogs, setSalesLogs] = useState<any[]>([]);
  const [liveAnalytics, setLiveAnalytics] = useState<any>(null); 
  const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);
  const [isLive, setIsLive] = useState(false); 
  const [loading, setLoading] = useState(true);

  // Bulk Edit State (The "Google Sheets" Feel)
  const [bulkStock, setBulkStock] = useState<Record<string, string>>({});
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Bulk Paste / Clipboard Parser States
  const [salesPasteText, setSalesPasteText] = useState('');
  const [purchasePasteText, setPurchasePasteText] = useState('');
  const [inventoryPasteText, setInventoryPasteText] = useState(''); 
  const [salesImportSuccess, setSalesImportSuccess] = useState(false);
  const [purchaseImportSuccess, setPurchaseImportSuccess] = useState(false);
  const [inventoryImportSuccess, setInventoryImportSuccess] = useState(false); 

  // Form States
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [logType, setLogType] = useState('spoilage');
  const [logQty, setLogQty] = useState('');
  const [logNote, setLogNote] = useState('');
  const [isNonFood, setIsNonFood] = useState(false); // FIXED: Tracks if it is a non-food OPEX purchase
  const [nonFoodName, setNonFoodName] = useState(''); // FIXED: Stores non-food item name
  const [lastLogId, setLastLogId] = useState<string | null>(null);
  const [lastLogDetails, setLastLogDetails] = useState<string | null>(null);
  const [logSuccess, setLogSuccess] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [salesQty, setSalesQty] = useState('');
  const [salesSuccess, setSalesSuccess] = useState(false);
  const [kitchenPasteText, setKitchenPasteText] = useState(''); // NEW
  const [kitchenImportSuccess, setKitchenImportSuccess] = useState(false); // NEW
  const [logCost, setLogCost] = useState(''); // NEW: Holds the total purchase cost
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [companyRoles, setCompanyRoles] = useState<any[]>([]);
  const [newRoleInput, setNewRoleInput] = useState('');
  const [cfoChatInput, setCfoChatInput] = useState('');
  const [cfoChatHistory, setCfoChatHistory] = useState<{sender: 'owner'|'ai', text: string}[]>([]);
  const [isCfoLoading, setIsCfoLoading] = useState(false);
    const [ingredientsPasteText, setIngredientsPasteText] = useState('');
  const [ingredientsImportSuccess, setIngredientsImportSuccess] = useState(false);
  const [recipesPasteText, setRecipesPasteText] = useState('');
  const [recipesImportSuccess, setRecipesImportSuccess] = useState(false);
  const [productsPasteText, setProductsPasteText] = useState('');
const [productsImportSuccess, setProductsImportSuccess] = useState(false);



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
      efficiency: "82.86%"
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
      efficiency: "95.17%"
    }
  };

  const demoWasters: Record<string, any[]> = {
    "SF Coffee": [
      { name: "Mango fruit fr.s.", unit: "ml", impact: 14924, notes: "Бүртгэлгүй алдагдал" },
      { name: "Calpis Water", unit: "ш", impact: 14000, notes: "Зөрүү 4ш илүүдэл" },
      { name: "Eggs (Өндөг)", unit: "ш", impact: 10660, notes: "Муудаж хаягдсан, оройн хоолонд" }
    ],
    "Cafe B": [
      { name: "Milk (Сүү)", unit: "мл", impact: 35000, notes: "Сар бүрийн хэвийн хаягдал" },
      { name: "Beans (Кофе)", unit: "гр", impact: 20000, notes: "Тохиргоо алдагдсан" },
      { name: "Sugar (Элсэн чихэр)", unit: "гр", impact: 15000, notes: "Уут цоорсон" }
    ]
  };

  const demoProducts: Record<string, any[]> = {
    "SF Coffee": [
      { name: "Tiramisu", sold: 62, profit: 369489, cost: 5940.5, price: 11900 },
      { name: "Caffe Latte", sold: 34, profit: 237320, cost: 2520, price: 9500 },
      { name: "Americano", sold: 23, profit: 1360, price: 8000 }
    ],
    "Cafe B": [
      { name: "Caffe Latte", sold: 120, profit: 840000, cost: 2520, price: 9500 },
      { name: "Americano", sold: 95, profit: 630800, cost: 1360, price: 8000 },
      { name: "Mango Smoothie", sold: 45, profit: 335205, cost: 5051, price: 12500 }
    ]
  };

  const handleSignOut = async () => {
  setLoading(true);
  try {
    await supabase.auth.signOut();
    router.push('/login');
  } catch (err) {
    console.error("Sign out failed:", err);
  } finally {
    setLoading(false);
  }
};

const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
    } else {
      setUser(session.user);
      
      // 1. Fetch real branch and role from database
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, client_id')
        .eq('id', session.user.id)
        .single();

      const realBranch = profile?.client_id || session.user.user_metadata?.client_id || '';
      
      if (realBranch) {
        setUserClient(realBranch);
        setActiveClient(realBranch);
        
        if (profile?.role) {
          setUserRole(profile.role);
          if (profile.role === 'barista') {
            setActiveTab('barista');
          }
        }
        // 2. Fetch ONLY this branch's data after resolving real identity [2, 3]
        fetchDatabaseData(realBranch);
      }
    }
  };



useEffect(() => {
  checkUserSession();
}, []);




  
// 💡 Огноо болон Салбарын дагуу санхүүгийн бодит тооцооллыг татах
  const fetchDatabaseData = async (clientId?: string, start?: string, end?: string) => {
    const targetClient = clientId || activeClient || userClient;
    const targetStart = start || startDate;
    const targetEnd = end || endDate;
    if (!targetClient) return;

    try {
      // 1. Датабэйсээс татах
      const { data: ingData } = await supabase.from('ingredients').select('*').eq('client_id', targetClient).order('name', { ascending: true });
      const { data: recData } = await supabase.from('recipes').select('*').eq('client_id', targetClient);
      const { data: logData } = await supabase.from('inventory_logs').select('*').eq('client_id', targetClient);
      const { data: saleData } = await supabase.from('sales_logs').select('*').eq('client_id', targetClient);
      const { data: taskData } = await supabase.from('tasks').select('*').eq('client_id', targetClient);
      const { data: shiftData } = await supabase.from('shifts').select('*').eq('client_id', targetClient).order('start_time', { ascending: false });

      if (ingData) setIngredients(ingData);
      if (logData) setInventoryLogs(logData);
      if (saleData) setSalesLogs(saleData);
      if (recData) {
        setRecipes(recData);
        setUniqueProducts(Array.from(new Set(recData.map((r: any) => r.product_name))));
      }
      if (taskData) setTasks(taskData);
      if (shiftData) setShifts(shiftData);

      // 💡 2. Сонгосон огнооны дагуу Live Analytics API-г дуудах (6-р сарын хаягдал, ашгийг яг таг бодно)
      const res = await fetch(
        `/api/analytics?clientId=${encodeURIComponent(targetClient)}&startDate=${encodeURIComponent(targetStart)}T00:00:00.000Z&endDate=${encodeURIComponent(targetEnd)}T23:59:59.999Z`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const analData = await res.json();
        setLiveAnalytics(analData);
        if (saleData && saleData.length > 0) {
          const latestSale = saleData
            .filter((s: any) => s.date)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

          if (latestSale && latestSale.date) {
            const ym = latestSale.date.substring(0, 7);

            if (!startDate.startsWith(ym)) {
              const [year, month] = ym.split('-').map(Number);
              const lastDayNum = new Date(year, month, 0).getDate();
              const firstDay = `${ym}-01`;
              const lastDay = `${ym}-${String(lastDayNum).padStart(2, '0')}`;

              setStartDate(firstDay);
              setEndDate(lastDay);
            }
          }
        }
      
      }
    } catch (err) {
      console.error("Error fetching database:", err);
    } finally {
      setLoading(false);
    }

    
  };
// 

  const lowStockItems = ingredients.filter((i: any) => parseFloat(i.current_stock) <= 50);

  const cleanNameForMatch = (str: string) => {
   return str.replace(/[\r\n\u00a0"'\.]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  };

  // NEW: Огнооны алдааг шалгаж, аюулгүй болгогч функц
  const parseSafeDate = (rawDate: string | undefined): string => {
    if (!rawDate) return new Date().toISOString();
    const cleaned = rawDate.replace(/[\r\n\u00a0"']/g, "").trim();
    if (!cleaned || cleaned.toLowerCase() === 'date' || cleaned.toLowerCase() === 'огноо') {
      return new Date().toISOString();
    }
    const parsed = new Date(cleaned);
    if (isNaN(parsed.getTime())) {
      return new Date().toISOString(); // Хэрэв хүчингүй огноо байвал өнөөдрийн огноог авна
    }
    return parsed.toISOString();
  };

// 1. БАРИСТА ГАРААР ЗАРЛАГА БҮРТГЭХ (Зассан)
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNonFood && !selectedIngredientId) return;
    if (isNonFood && !nonFoodName) return;
    if (!logQty) return;

    setLoading(true);
    const parsedQty = parseFloat(logQty);
    const finalQty = isNonFood ? Math.abs(parsedQty) : (logType === 'purchase' || logType === 'count') ? Math.abs(parsedQty) : -Math.abs(parsedQty);
    const costValue = logType === 'purchase' ? parseFloat(logCost) || 0 : 0;
    const finalType = isNonFood ? 'purchase' : logType;
    const currentDate = new Date().toISOString();

    try {
      const { data: logData, error } = await supabase
        .from('inventory_logs')
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
            worker_name: 'Менежер'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      if (logData) {
        setLastLogId(logData.id);
        setLastLogDetails(isNonFood ? `${nonFoodName}: ${Math.abs(finalQty)} ш (OPEX)` : `${ingredients.find(i=>i.id===selectedIngredientId)?.name}: ${Math.abs(finalQty)} (${finalType})`);
        setLogSuccess(true);
        setSelectedIngredientId('');
        setNonFoodName('');
        setIsNonFood(false);
        setLogQty('');
        setLogNote('');
        setLogCost('');
        await fetchDatabaseData(activeClient);
        setTimeout(() => setLogSuccess(false), 4000);
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
        const originalIng = ingredients.find(i => i.id === id);
        
        if (originalIng && parseFloat(originalIng.current_stock) !== stockVal) {
          logsToInsert.push({
            client_id: activeClient, // ✅
            ingredient_id: id,
            quantity: stockVal,
            type: 'count',
            notes: `Гараар Тоолсон Үлдэгдэл (Менежер Grid)`,
            date: currentDate,
            worker_name: 'Менежер'
          });
        }
      });

      if (logsToInsert.length > 0) {
        const { error: logError } = await supabase.from('inventory_logs').insert(logsToInsert);
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

  // 3. БОРЛУУЛАЛТ ТООЦОХ (Зассан)
  const handleSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !salesQty) return;

    setLoading(true);
    const qtySold = parseInt(salesQty);
    const productRecipes = recipes.filter((r: any) => r.product_name === selectedProduct);
    const currentDate = new Date().toISOString();

    try {
      const mockPrices: Record<string, number> = {
        "Tiramisu": 11900,
        "Caffe Latte": 9500,
        "Americano": 8000
      };

      const unitPrice = mockPrices[selectedProduct] || 8000;
      const totalRevenue = unitPrice * qtySold;

      // 1. Борлуулалт оруулах
      const { error: saleError } = await supabase
        .from('sales_logs')
        .insert([{ 
          client_id: activeClient, // ✅
          product_name: selectedProduct, 
          quantity_sold: qtySold, 
          total_revenue: totalRevenue,
          date: currentDate // ✅
        }]);

      if (saleError) throw saleError;

      // 2. Жороор агуулахаас хасах
      const logsToInsert = productRecipes.map(recipe => ({
        client_id: activeClient, // ✅
        ingredient_id: recipe.ingredient_id,
        quantity: -(recipe.amount * qtySold),
        type: 'sale',
        notes: `Борлуулалт: ${qtySold}ш ${selectedProduct}`,
        date: currentDate,
        worker_name: 'Систем (Борлуулалт)'
      }));

      if (logsToInsert.length > 0) {
        const { error: logError } = await supabase.from('inventory_logs').insert(logsToInsert);
        if (logError) throw logError;
      }

      setSalesSuccess(true);
      setSelectedProduct('');
      setSalesQty('');
      await fetchDatabaseData(activeClient);
      setTimeout(() => setSalesSuccess(false), 4000);
    } catch (err: any) {
      alert(`Борлуулалт оруулахад алдаа гарлаа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

// =========================================================================
  // 1. БОРЛУУЛАЛТ БӨӨНӨӨР ИМПОРТЛОХ (Sales Paste) - Зассан
  // =========================================================================
 // 🚀 БОРЛУУЛАЛТ БӨӨНӨӨР ИМПОРТЛОХ (Огноотой болон Огноогүй аль алиныг нь төгс уншина)
  const handleBulkSalesPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salesPasteText.trim()) return;

    setLoading(true);
    try {
      const rows = salesPasteText.replace(/\r/g, '').trim().split('\n');
      const salesToInsert: any[] = [];
      // 💡 Хэрэв огноогүй хуулбал Dashboard дээр сонгосон сарын огноог авна
      const fallbackDate = endDate ? `${endDate}T12:00:00.000Z` : new Date().toISOString();

      rows.forEach(row => {
        if (!row.trim()) return;
        const cols = row.split('\t');
        let pName = "";
        let qty = 0;
        let revenue = 0;
        let dateVal = fallbackDate;

        // 4 Баганатай үед: Огноо | Бүтээгдэхүүн | Тоо | Орлого
        if (cols.length >= 4) {
          dateVal = parseSafeDate(cols[0]);
          pName = cols[1]?.trim() || "";
          qty = parseInt(cols[2]?.replace(/,/g, "")) || 0;
          revenue = parseFloat(cols[3]?.replace(/[^0-9.\-]/g, "")) || 0;
        } 
        // 3 Баганатай үед: Бүтээгдэхүүн | Тоо | Орлого
        else if (cols.length >= 2) {
          pName = cols[0]?.trim() || "";
          qty = parseInt(cols[1]?.replace(/,/g, "")) || 0;
          revenue = cols[2] ? parseFloat(cols[2]?.replace(/[^0-9.\-]/g, "")) || 0 : 0;
        }

        // Хэрэв толгой мөр (Product, Quantity гэсэн үг) биш бол хадгална
        if (qty > 0 && pName && !pName.toLowerCase().includes('product')) {
          salesToInsert.push({ 
            client_id: activeClient,
            product_name: pName, 
            quantity_sold: qty, 
            total_revenue: revenue,
            date: dateVal 
          });
        }
      });

      if (salesToInsert.length > 0) {
        const { error: salesErr } = await supabase.from('sales_logs').insert(salesToInsert);
        if (salesErr) throw salesErr;
      }

      setSalesImportSuccess(true);
      setSalesPasteText('');
      await fetchDatabaseData(activeClient);
      alert(`Амжилттай! Нийт ${salesToInsert.length} борлуулалт хадгалагдлаа.`);
      setTimeout(() => setSalesImportSuccess(false), 4000);
    } catch (err: any) {
      alert(`Борлуулалт оруулахад алдаа гарлаа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 2. ТАТАН АВАЛТ БӨӨНӨӨР ИМПОРТЛОХ (Purchases Paste) - Зассан
  // =========================================================================
  const handleBulkPurchasePaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchasePasteText.trim()) return;

    setLoading(true);
    try {
      const rows = purchasePasteText.replace(/\r/g, '').trim().split('\n');
      const purchasesToInsert: any[] = [];
      const currentDate = new Date().toISOString();

      // Зөвхөн идэвхтэй салбарын түүхий эдүүдийг Map-д авах (Хурдан O(1) хайлт)
      const ingMap = new Map();
      ingredients.filter(i => i.client_id === activeClient).forEach(i => {
        ingMap.set(cleanNameForMatch(i.name), i);
      });

      rows.forEach(row => {
        if (!row.trim()) return;
        const cols = row.split('\t');
        let ingName = "";
        let qty = 0;
        let totalCost = 0;
        let dateVal = currentDate;

        if (cols.length >= 4) {
          dateVal = parseSafeDate(cols[0]);
          ingName = cols[1]?.trim() || "";
          qty = parseFloat(cols[2]?.replace(/,/g, "")) || 0;
          totalCost = parseFloat(cols[3]?.replace(/[^0-9.\-]/g, "")) || 0;
        } else if (cols.length >= 2) {
          ingName = cols[0]?.trim() || "";
          qty = parseFloat(cols[1]?.replace(/,/g, "")) || 0;
          totalCost = cols[2] ? parseFloat(cols[2]?.replace(/[^0-9.\-]/g, "")) || 0 : 0;
        }

        const matchedIng = ingMap.get(cleanNameForMatch(ingName));

        if (matchedIng && qty > 0) {
          purchasesToInsert.push({
            client_id: activeClient, // ✅ Салбар тодорхой
            ingredient_id: matchedIng.id,
            quantity: qty,
            type: 'purchase',
            total_cost: totalCost,
            date: dateVal,
            notes: `Бөөнөөр Татан Авалт (Cost: ${totalCost}₮)`
          });
        } else if (qty > 0 && ingName) {
          // Хүнсний бус татан авалт (OPEX)
          purchasesToInsert.push({
            client_id: activeClient, // ✅ Салбар тодорхой
            ingredient_id: null,
            non_food_item: ingName,
            quantity: qty,
            type: 'purchase',
            total_cost: totalCost,
            date: dateVal,
            notes: `Хүнсний бус татан авалт (OPEX)`
          });
        }
      });

      if (purchasesToInsert.length > 0) {
        const { error } = await supabase.from('inventory_logs').insert(purchasesToInsert);
        if (error) throw error;
      }

      setPurchaseImportSuccess(true);
      setPurchasePasteText('');
      await fetchDatabaseData(activeClient);
      setTimeout(() => setPurchaseImportSuccess(false), 4000);
    } catch (err: any) {
      alert(`Татан авалт оруулахад алдаа гарлаа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 3. ТҮҮХИЙ ЭД & ҮНЭ БӨӨНӨӨР ОРУУЛАХ (Ingredients & Prices) - Зассан
  // =========================================================================
// 🚀 ТҮҮХИЙ ЭД & ҮНЭ БӨӨНӨӨР ОРУУЛАХ (3 эсвэл 4 баганын алийг нь ч алдаагүй уншина)
  const handleBulkIngredientsPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientsPasteText.trim()) return;

    setLoading(true);
    try {
      const rows = ingredientsPasteText.replace(/\r/g, '').trim().split('\n');
      const itemsToUpsert: any[] = [];

      rows.forEach(row => {
        if (!row.trim()) return;
        const cols = row.split('\t');
        if (cols.length >= 3) {
          const rawName = cols[0]?.trim() || "";
          const rawUnit = cols[1]?.trim() || 'ш';
          
          // Тоог аюулгүй салгах
          const rawPrice = cols[2]?.replace(/[^0-9.-]/g, '');
          const rawPar = cols[3]?.replace(/[^0-9.-]/g, '');

          const price = rawPrice && !isNaN(parseFloat(rawPrice)) ? parseFloat(rawPrice) : 0;
          // 💡 Par level байхгүй бол шууд 0 онооно (Алдаа заахгүй)
          const par = rawPar && !isNaN(parseFloat(rawPar)) ? parseFloat(rawPar) : 0;

          // Толгой мөр (Item, Price гэх мэт) биш бол хадгална
          if (rawName && !rawName.toLowerCase().includes('item') && !rawName.toLowerCase().includes('нэр')) {
            itemsToUpsert.push({
              client_id: activeClient,
              name: rawName,
              unit: rawUnit,
              unit_price: price,
              par_level: par
            });
          }
        }
      });

      if (itemsToUpsert.length > 0) {
        const { error } = await supabase
          .from('ingredients')
          .upsert(itemsToUpsert, { onConflict: 'client_id,name' });
        if (error) throw error;
      }

      setIngredientsImportSuccess(true);
      setIngredientsPasteText('');
      await fetchDatabaseData(activeClient);
      alert(`Амжилттай! Нийт ${itemsToUpsert.length} түүхий эдийн үнэ хадгалагдлаа.`);
      setTimeout(() => setIngredientsImportSuccess(false), 4000);
    } catch (err: any) {
      alert(`Түүхий эд оруулахад алдаа гарлаа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 4. ТЕХНОЛОГИЙН КАРТ (ЖОР) БӨӨНӨӨР ОРУУЛАХ (Recipes Paste) - Зассан
  // =========================================================================
  const handleBulkRecipesPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipesPasteText.trim()) return;

    setLoading(true);
    try {
      const rows = recipesPasteText.replace(/\r/g, '').trim().split('\n');
      
      // Зөвхөн тухайн салбарын түүхий эдүүдийн Map
      const { data: currentIngs } = await supabase
        .from('ingredients')
        .select('id, name')
        .eq('client_id', activeClient);

      const ingMap = new Map();
      currentIngs?.forEach(i => ingMap.set(cleanNameForMatch(i.name), i.id));

      const recipesToUpsert: any[] = [];

      rows.forEach(row => {
        if (!row.trim()) return;
        const cols = row.split('\t');
        if (cols.length >= 3) {
          const productName = cols[0]?.trim() || "";
          const ingredientName = cleanNameForMatch(cols[1] || "");
          const amount = parseFloat(cols[2]?.replace(/[^0-9.-]/g, '')) || 0;

          const ingredientId = ingMap.get(ingredientName);

          if (productName && ingredientId && amount > 0) {
            recipesToUpsert.push({
              client_id: activeClient, // ✅ Салбар тодорхой
              product_name: productName,
              ingredient_id: ingredientId,
              amount: amount
            });
          }
        }
      });

      if (recipesToUpsert.length > 0) {
        const { error } = await supabase
          .from('recipes')
          .upsert(recipesToUpsert, { onConflict: 'client_id,product_name,ingredient_id' });
        if (error) throw error;
      }

      setRecipesImportSuccess(true);
      setRecipesPasteText('');
      await fetchDatabaseData(activeClient);
      setTimeout(() => setRecipesImportSuccess(false), 4000);
    } catch (err: any) {
      alert(`Жор оруулахад алдаа гарлаа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 5. МЕНЮ / ЦЭС БӨӨНӨӨР ОРУУЛАХ (Products & Selling Prices) - Зассан
  // =========================================================================
  const handleBulkProductsPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productsPasteText.trim()) return;

    setLoading(true);
    try {
      const rows = productsPasteText.replace(/\r/g, '').trim().split('\n');
      const productsToUpsert: any[] = [];

      rows.forEach(row => {
        if (!row.trim()) return;
        const cols = row.split('\t');
        if (cols.length >= 3) {
          // Формат 1: Category | Item | Selling Price
          const category = cols[0]?.trim() || 'General';
          const name = cols[1]?.trim() || "";
          const price = parseFloat(cols[2]?.replace(/[^0-9.-]/g, '')) || 0;

          if (name && price > 0) {
            productsToUpsert.push({
              client_id: activeClient, // ✅ Салбар тодорхой
              category: category,
              name: name,
              selling_price: price
            });
          }
        } else if (cols.length === 2) {
          // Формат 2: Item | Selling Price
          const name = cols[0]?.trim() || "";
          const price = parseFloat(cols[1]?.replace(/[^0-9.-]/g, '')) || 0;

          if (name && price > 0) {
            productsToUpsert.push({
              client_id: activeClient,
              category: 'General',
              name: name,
              selling_price: price
            });
          }
        }
      });

      if (productsToUpsert.length > 0) {
        const { error } = await supabase
          .from('products')
          .upsert(productsToUpsert, { onConflict: 'client_id,name' });
        if (error) throw error;
      }

      setProductsImportSuccess(true);
      setProductsPasteText('');
      await fetchDatabaseData(activeClient);
      setTimeout(() => setProductsImportSuccess(false), 4000);
    } catch (err: any) {
      alert(`Меню оруулахад алдаа гарлаа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };



// 🚀 ХЭВТЭЭ ТООЛЛОГО ИМПОРТЛОГЧ (0.2 СЕКУНДЭД АЖИЛЛАНА)
const handleBulkInventoryPaste = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!inventoryPasteText.trim()) return;

  setLoading(true);
  try {
    const rows = inventoryPasteText.trim().split('\n');
    if (rows.length < 2) {
      alert("Алдаа: Толгой мөр (Headers) болон Тооллогын дата мөрийг хамт хуулна уу.");
      setLoading(false);
      return;
    }

    // 1. In-memory Map ашиглаж хайлтын хурдыг 1 миллисекунд болгох
    const ingMap = new Map();
    ingredients.forEach(i => {
      ingMap.set(cleanNameForMatch(i.name), i);
    });

    const headers = rows[0].split('\t').map(h => cleanNameForMatch(h));
    const countsToInsert: any[] = [];

    // 2. Бүх мөр, баганыг компьютер санах ойд (RAM) шууд боловсруулна
    for (let r = 1; r < rows.length; r++) {
      const values = rows[r].split('\t');
      if (values.length < 2) continue;

      const dateVal = parseSafeDate(values[0]);
      const typeVal = values[1]?.trim().toLowerCase() || 'count';

      for (let i = 2; i < headers.length; i++) {
        const ingName = headers[i];
        if (!ingName) continue;

        const ing = ingMap.get(ingName);
        if (ing) {
          const rawQty = values[i]?.replace(/[, ]/g, "");
          // Хэрэв тоо бичигдсэн байвал логт нэмнэ
          if (rawQty !== undefined && rawQty !== "" && rawQty !== "-") {
            const qty = parseFloat(rawQty) || 0;
            countsToInsert.push({
              client_id: activeClient,
              ingredient_id: ing.id,
              quantity: qty,
              type: 'count',
              notes: `Бөөнөөр Тоолсон Үлдэгдэл (${typeVal})`,
              date: new Date(dateVal).toISOString()
            });
          }
        }
      }
    }

    // 3. БҮХ 100+ БАРААГ ГАНЦХАН ХҮСЭЛТЭЭР (BATCH INSERT) 0.2 СЕКУНДЭД ХАДГАЛНА!
    // Supabase trigger өөрөө current_stock болон last_counted_at-ийг шууд шинэчилнэ.
    if (countsToInsert.length > 0) {
      const { error } = await supabase.from('inventory_logs').insert(countsToInsert);
      if (error) throw error;
    }

    setInventoryImportSuccess(true);
    setInventoryPasteText('');
    await fetchDatabaseData(activeClient);
    setTimeout(() => setInventoryImportSuccess(false), 4000);

  } catch (err: any) {
    alert(`Алдаа: ${err.message || 'Тооллого оруулахад алдаа гарлаа.'}`);
  } finally {
    setLoading(false);
  }
};


  const handleIngredientUpdate = async (id: string, column: string, value: string| boolean) => {
  const finalVal = typeof value === 'boolean' ? value : (parseFloat(value) || 0);
    

 
    // UI-ийг шууд өөрчлөх
    setIngredients(prev => prev.map(ing => 
      ing.id === id ? { ...ing, [column]: finalVal } : ing
    ));
    // Update Supabase securely in the background [3]
    await supabase
      .from('ingredients')
      .update({ [column]: finalVal })
      .eq('id', id);
  };


  const handleUndoLog = async () => {
    if (!lastLogId) return;
    setLoading(true);
    try {
      await supabase.from('inventory_logs').delete().eq('id', lastLogId);
      setLastLogId(null);
      setLastLogDetails(null);
      await fetchDatabaseData();
      alert("Цуцлагдлаа!");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  // NEW: Гал тогооны зардлыг (spoilage, testing, staff_meal) уншиж импортлогч функц
 // 🚀 ГАЛ ТОГООНЫ ХАЯГДАЛ БӨӨНӨӨР ИМПОРТЛОХ (Зассан)
  const handleBulkKitchenLogsPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitchenPasteText.trim()) return;

    setLoading(true);
    try {
      const rows = kitchenPasteText.replace(/\r/g, '').trim().split('\n');
      const logsToInsert: any[] = [];
      const currentDate = new Date().toISOString();

      // Салбарын түүхий эдүүдийг Map-д авах (Хурдан O(1) хайлт)
      const ingMap = new Map();
      ingredients.filter(i => i.client_id === activeClient).forEach(i => {
        ingMap.set(cleanNameForMatch(i.name), i);
      });

      rows.forEach(row => {
        if (!row.trim()) return;
        const cols = row.split('\t');
        if (cols.length >= 3) {
          const rawDate = cols[0];
          const dateVal = parseSafeDate(rawDate);
          
          const rawType = cols[1]?.trim().toLowerCase() || 'spoilage';
          const ingName = cols[2]?.trim() || "";
          const qty = parseFloat(cols[3]?.replace(/,/g, "")) || 0;
          const note = cols[4]?.trim() || "";

          // Төрлүүдийг автоматаар ялгах
          let dbType = 'spoilage';
          if (rawType.includes('staff') || rawType.includes('хоол')) dbType = 'staff_meal';
          else if (rawType.includes('test') || rawType.includes('турш')) dbType = 'testing';
          else if (rawType.includes('other') || rawType.includes('бусад')) dbType = 'other';

          const matchedIng = ingMap.get(cleanNameForMatch(ingName));

          if (matchedIng && qty > 0) {
            logsToInsert.push({
              client_id: activeClient, // ✅ Салбарын ID тодорхой
              ingredient_id: matchedIng.id,
              quantity: -Math.abs(qty), // Хаягдал тул үргэлж сөрөг (-) хасагдана
              type: dbType,
              notes: note || `${dbType} logged in bulk`,
              date: dateVal || currentDate,
              worker_name: 'Менежер (Бөөнөөр)'
            });
          }
        }
      });

      if (logsToInsert.length > 0) {
        const { error } = await supabase.from('inventory_logs').insert(logsToInsert);
        if (error) throw error;
      }

      setKitchenImportSuccess(true);
      setKitchenPasteText('');
      await fetchDatabaseData(activeClient);
      setTimeout(() => setKitchenImportSuccess(false), 4000);
    } catch (err: any) {
      alert(`Гал тогооны хаягдал оруулахад алдаа гарлаа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 💡 Тухайн сонгогдсон салбарын дататай БҮХ саруудыг автоматаар илрүүлж жагсаах

  const availableMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();

    // 1. Зөвхөн борлуулалт орсон саруудыг л авна
    salesLogs
      .filter(s => s.client_id === activeClient && s.date)
      .forEach(s => monthsSet.add(s.date.substring(0, 7)));

    // Хэрэв огт борлуулалт ороогүй шинэ салбар бол одоогийн сарыг харуулна
    if (monthsSet.size === 0) {
      monthsSet.add(new Date().toISOString().substring(0, 7));
    }

    return Array.from(monthsSet).sort().reverse();
  }, [salesLogs, activeClient]);

  // Сар сонгох үед тухайн сарын эхний ба эцсийн огноог автоматаар бодож датаг дуудах
  const handleMonthChange = (selectedYearMonth: string) => {
    const [year, month] = selectedYearMonth.split('-').map(Number);
    
    // Тухайн сарын эхний өдөр: YYYY-MM-01
    const firstDay = `${selectedYearMonth}-01`;
    
    // Тухайн сарын хамгийн сүүлийн өдрийг автоматаар бодно (28, 30 эсвэл 31)
    const lastDayNum = new Date(year, month, 0).getDate();
    const lastDay = `${selectedYearMonth}-${String(lastDayNum).padStart(2, '0')}`;

    setStartDate(firstDay);
    setEndDate(lastDay);
    fetchDatabaseData(activeClient, firstDay, lastDay);
  };
    
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500/20">
       
      <div className="max-w-7xl mx-auto p-4 md:p-8">
         
        {/* Header Control Panel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-900">
           
          <div>
            <div className="flex items-center gap-3">
              <Building className="h-7 w-7 text-emerald-400" />
                          
                      <select 
              value={activeClient} 
              onChange={(e) => {
                const selected = e.target.value;
                setActiveClient(selected);
                fetchDatabaseData(selected); // ✅ Шууд тухайн салбарын датаг татаж шинэчилнэ
              }}
            >
                <option value={userClient} className="bg-slate-950 text-white font-bold text-base">{userClient}</option>
                <option value="Cafe B" className="bg-slate-950 text-white font-bold text-base">Cafe B (Ulaanbaatar)</option>
              </select>
            </div>
            {/* Displays logged-in user profile details to resolve TS warnings */}
       
            <p className="text-slate-400 mt-1 text-xs">SaaS Multi-Tenant Database: Active System</p>
          </div>
     <div className="flex flex-wrap items-center gap-3">
          

            <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <button onClick={() => setIsLive(false)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!isLive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>Demo</button>
              <button onClick={() => setIsLive(true)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${isLive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
                <Database className="h-3 w-3" /> Live DB
              </button>
            </div>
          </div>
          {user && (
  <div className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-900">
    <div className="text-right">
      <p className="text-emerald-400 font-bold text-xs uppercase tracking-wider">Нэвтэрсэн хэрэглэгч</p>
      <p className="text-slate-400 text-xs mt-0.5">{user.email}</p>
    </div>
    <button 
      onClick={handleSignOut}
      disabled={loading}
      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition"
    >
      {loading ? "Түр хүлээнэ үү..." : "Гарах (Log Out)"}
    </button>
  </div>
)}
     
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-900 pb-4 overflow-x-auto">
          {userRole === 'owner' && (
            <><button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${activeTab === 'dashboard' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}
            >
              📊 Санхүүгийн Хяналт
            </button>
            <button 
                onClick={() => setActiveTab('ai_cfo')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${activeTab === 'ai_cfo' ? 'bg-blue-500 text-slate-950' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}
              >
                🤖 AI Зөвлөх (CFO Chat)
              </button>
            </>
          )}
          <button 
            onClick={() => setActiveTab('barista')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${activeTab === 'barista' || (userRole === 'barista' && activeTab === 'dashboard') ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}
          >
            ☕ Бариста Портал (Inputs)
          </button>
          
            <>
              <button 
                onClick={() => setActiveTab('sales')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${activeTab === 'sales' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}
              >
                📈 Борлуулалт Оруулах
              </button>
              <button 
                onClick={() => setActiveTab('inventory')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${activeTab === 'inventory' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}
              >
                🗂️ Агуулахын Тооллого (Google Sheet Grid)
              </button>
              <button 
                onClick={() => setActiveTab('import')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${activeTab === 'import' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}
              >
                📥 Бөөнөөр Импортлох (Excel Paste)
              </button>
              {userRole === 'owner' && (
              <button 
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${activeTab === 'tasks' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}
              >
                📋 Ажлын Даалгавар (Tasks)
              </button>
               )}
            </>
         
        </div>

        {/* 1. FINANCIAL DASHBOARD TAB */}
        {activeTab === 'dashboard' && userRole === 'owner' && (
          <div>
            {/* 💡 САЛБАР БҮРИЙН ДАТАТАЙ САРУУДЫГ ХАРУУЛАХ ДИНАМИК СОНГОГЧ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                  <Activity className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Тайлант Хугацааны Сонголт</h3>
                  <p className="text-xs text-slate-400">Сонгосон сарын бодит ашиг, алдагдал, хаягдлыг тооцоолж байна</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* ДАТАТАЙ САРУУДЫН DROPDOWN */}
                <select
                  value={startDate.substring(0, 7)}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-emerald-400 font-black text-sm rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 cursor-pointer shadow-inner"
                >
                  {availableMonths.map(ym => {
                    const [year, month] = ym.split('-');
                    return (
                      <option key={ym} value={ym} className="bg-slate-950 text-white font-bold">
                        📅 {year} оны {month}-р сар
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
                <p className="text-slate-400 text-sm font-medium">Нийт Орлого (Revenue)</p>
                <p className="text-2xl md:text-3xl font-extrabold text-white">
                   {isLive && liveAnalytics ? `${Math.round(liveAnalytics.financial_ladder.revenue).toLocaleString()}₮` : `${demoStats[activeClient].revenue.toLocaleString()}₮`}
                </p>
              </div>

              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
                <p className="text-slate-400 text-sm font-medium">Бодит өртөг (COGS)</p>
                <p className="text-2xl md:text-3xl font-extrabold text-white">
                  {isLive && liveAnalytics ? `${Math.round(liveAnalytics.financial_ladder.actual_cogs).toLocaleString()}₮` : `${demoStats[activeClient].actualCogs.toLocaleString()}₮`}
                </p>
                <span className="text-xs text-slate-500 mt-2 block">
                  Онолын өртөг: {isLive && liveAnalytics ? `${Math.round(liveAnalytics.financial_ladder.theo_cogs).toLocaleString()}₮` : `${demoStats[activeClient].theoCogs.toLocaleString()}₮`}
                </span>
              </div>

              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
                <p className="text-slate-400 text-sm font-medium">Бохир ашиг</p>
                <p className="text-2xl md:text-3xl font-extrabold text-emerald-400">
                  {isLive && liveAnalytics ? `${liveAnalytics.financial_ladder.gross_margin}` : `${demoStats[activeClient].grossMargin}`}
                </p>
              </div>

              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
                <p className="text-slate-400 text-sm font-medium">Ажлын Бүтээмж</p>
                <p className="text-2xl md:text-3xl font-extrabold text-blue-400">
                  {isLive && liveAnalytics ? liveAnalytics.efficiency : demoStats[activeClient].efficiency}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-900 lg:col-span-2">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  Бизнес Моделийн дүн шинжилгээ
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-slate-900 pb-3.5">
                    <span className="text-slate-400">Сар бүрийн OPEX (Түрээс, Цалин, Тог)</span>
                    <span className="font-semibold text-white">{isLive && liveAnalytics ? `${Math.round(liveAnalytics.financial_ladder.opex).toLocaleString()}₮` : `${demoStats[activeClient].opex.toLocaleString()}₮`}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-3.5">
                    <span className="text-slate-400">Татварын өмнөх ашиг (EBIT)</span>
                    <span className={`font-semibold ${isLive && liveAnalytics && liveAnalytics.financial_ladder.ebit < 0 ? 'text-rose-400' : 'text-white'}`}>
      {/* FIXED: Pulls dynamic EBIT from the API */}
      {isLive && liveAnalytics ? `${Math.round(liveAnalytics.financial_ladder.ebit).toLocaleString()}₮` : `${demoStats[activeClient].ebit.toLocaleString()}₮`}
    </span>
  </div>
  <div className="flex justify-between pt-2">
    <span className="text-slate-300 font-extrabold text-base">ЦЭВЭР АШИГ (Net Profit)</span>
    <div className="text-right">
      <span className={`text-xl font-black ${isLive && liveAnalytics && liveAnalytics.financial_ladder.net_profit < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
        {/* FIXED: Pulls dynamic Net Profit from the API */}
        {isLive && liveAnalytics ? `${Math.round(liveAnalytics.financial_ladder.net_profit).toLocaleString()}₮` : `${demoStats[activeClient].netProfit.toLocaleString()}₮`}
      </span>
      <span className="text-xs text-slate-500 block mt-1">
        {/* FIXED: Pulls dynamic Net Margin from the API */}
        Маржин: {isLive && liveAnalytics ? liveAnalytics.financial_ladder.net_margin : demoStats[activeClient].netMargin}
      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-900">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-rose-400">
                  <Trash2 className="h-5 w-5" /> Top Waste
                </h3>
                <div className="space-y-5">
                  {isLive && liveAnalytics ? (
                    liveAnalytics.top_wasters.length > 0 ? (
                      liveAnalytics.top_wasters.map((w: any, idx: number) => (
                        <div key={idx} className="border-b border-slate-900 pb-4 last:border-0 last:pb-0">
                          <div className="flex justify-between font-semibold">
                            <span className="text-slate-200 text-sm">{w.name}</span>
                            <span className="text-rose-400 text-sm">-{w.impact.toLocaleString()}₮</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Шалтгаангүй алдагдал: {w.gap.toLocaleString()} {w.unit}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 italic text-center py-8">Хаягдал бүртгэгдээгүй байна.</p>
                    )
                  ) : (
                    demoWasters[activeClient].map((w, idx) => (
                      <div key={idx} className="border-b border-slate-900 pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-200 text-sm">{w.name}</span>
                          <span className="text-rose-400 text-sm">-{w.impact.toLocaleString()}₮</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{w.notes}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. BARISTA STAFF PORTAL (INPUTS) */}
        {activeTab === 'barista' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900 lg:col-span-2">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-emerald-400">
                <PlusCircle className="h-5 w-5" />
                Өдөр тутмын бүртгэл хийх (Бараа/Зарлага)
              </h3>

              {logSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-6 flex items-center gap-2.5">
                  <CheckCircle className="h-5 w-5" />
                  <p className="text-sm font-semibold">Амжилттай бүртгэгдлээ: {lastLogDetails}</p>
                </div>
              )}

              <form onSubmit={handleLogSubmit} className="space-y-6">
                
                {/* Toggle between food ingredients and non-food OPEX */}
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-4 rounded-xl mb-4">
                  <input 
                    type="checkbox" 
                    id="non-food-toggle"
                    checked={isNonFood}
                    onChange={(e) => {
                      setIsNonFood(e.target.checked);
                      if (e.target.checked) setLogType('purchase'); // Non-food are always purchases/expenses
                    }}
                    className="h-4 w-4 text-emerald-500 bg-slate-900 border-slate-800 rounded focus:ring-0"
                  />
                  <label htmlFor="non-food-toggle" className="text-slate-300 text-xs font-bold cursor-pointer">
                    Хүнсний бус зарлага (Household/OPEX - Сальфетка, аяга, таг гэх мэт)
                  </label>
                </div>
                    
                {!isNonFood ? (
                  <div>
                    <label className="block text-slate-400 text-sm font-bold mb-2">1. Түүхий эд сонгох</label>
                    <select 
                      value={selectedIngredientId}
                      onChange={(e) => setSelectedIngredientId(e.target.value)}
                      required={!isNonFood}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                    >
                      <option value="">-- Сонгох --</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                      ))}
                    </select>
                 
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-400 text-sm font-bold mb-2">1. Зарлагын нэр (Гараар бичнэ)</label>
                    <input 
                      type="text" 
                      value={nonFoodName}
                      onChange={(e) => setNonFoodName(e.target.value)}
                      required={isNonFood}
                      placeholder="Жишээ: Сальфетка, Хогны уут, Аяганы таг гэх мэт"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
            <label className="block text-slate-400 text-sm font-bold mb-2">2. Төрөл</label>
            <select 
              value={logType}
              disabled={isNonFood} 
              onChange={(e) => setLogType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold disabled:opacity-50"
            >
              <option value="spoilage">Муудаж хаягдсан (Spoilage)</option>
              <option value="purchase">Шинэ худалдан авалт (Purchase)</option>
              <option value="testing">Түүхий эдийн туршилт (Testing)</option>
              <option value="staff_meal">Ажилтны хоол (Staff Meal)</option>
              <option value="other">Бусад зарлага (Other)</option> {/* FIXED: Added this option */}
            </select>
          </div>
{/* FIXED: The note explanation text box is now ALWAYS visible and active */}
           
                  <div>
                    <label className="block text-slate-400 text-sm font-bold mb-2">3. Тоо Хэмжээ</label>
                    <input 
                      type="number" 
                      step="any"
                      value={logQty}
                      onChange={(e) => setLogQty(e.target.value)}
                      required
                      placeholder="Тооны хэмжээг оруулна уу"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                    />
                  </div>
                </div>

            
              {/* FIXED: Conditionally renders input based on transaction type */}
                {logType === 'purchase' ? (
                  <div>
                    <label className="block text-slate-400 text-sm font-bold mb-2">
                      4. Худалдан авалтын нийт үнэ (₮)
                    </label>
                    <input 
                      type="number" 
                      value={logCost}
                      onChange={(e) => setLogCost(e.target.value)}
                      required={logType === 'purchase'}
                      placeholder="Нийт төлсөн зардлын дүнгээ бичнэ үү (Жишээ: 12000)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-400 text-sm font-bold mb-2">
                      4. Тайлбар / Тэмдэглэл
                    </label>
                    <input 
                      type="text" 
                      value={logNote}
                      onChange={(e) => setLogNote(e.target.value)}
                      placeholder="Жишээ нь: Асгарч муудсан, оройн хоолонд хэрэглэсэн гэх мэт"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                )}
              

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition duration-150 text-sm"
                >
                  {loading ? "Бүртгэж байна..." : "Базарт бүртгэх"}
                </button>
              </form>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-400" />
                  Сүүлийн гүйлгээ засах
                </h3>
                {lastLogDetails ? (
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-900">
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Бүртгэгдсэн дата:</p>
                    <p className="text-sm font-extrabold text-white mt-1.5">{lastLogDetails}</p>
                    
                    <button 
                      onClick={handleUndoLog}
                      disabled={loading}
                      className="mt-6 w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-xs"
                    >
                      <Undo2 className="h-4 w-4" />
                      Бүртгэл цуцлах (Undo)
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic text-center py-12">Та одоогоор гүйлгээ хийгээгүй байна.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. SALES SIMULATOR TAB */}
        {activeTab === 'sales' && (
          <div className="max-w-xl mx-auto bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-emerald-400">
              <PlusCircle className="h-5 w-5" />
              Борлуулалтын симуляци хийх (Жор хасах)
            </h3>

            {salesSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-6 flex items-center gap-2.5">
                <CheckCircle className="h-5 w-5" />
                <p className="text-sm font-semibold">Борлуулалт амжилттай тооцогдож, агуулахаас хасагдлаа!</p>
              </div>
            )}

            <form onSubmit={handleSalesSubmit} className="space-y-6">
              <div>
                <label className="block text-slate-400 text-sm font-bold mb-2">1. Зарагдсан бүтээгдэхүүн</label>
                <select 
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                >
                  <option value="">-- Сонгох --</option>
                  {uniqueProducts.map((p, idx) => (
                    <option key={idx} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-sm font-bold mb-2">2. Зарагдсан тоо ширхэг</label>
                <input 
                  type="number" 
                  value={salesQty}
                  onChange={(e) => setSalesQty(e.target.value)}
                  required
                  placeholder="Зарагдсан хэмжээг оруулна уу"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition duration-150 text-sm"
              >
                {loading ? "Агуулахаас хасаж байна..." : "Борлуулалт тооцох"}
              </button>
            </form>
          </div>
        )}

        {/* 4. SPREADSHEET BULK STOCK TAKE TAB */}
        {activeTab === 'inventory' && (
          <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-900">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-900">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-400" />
                  Агуулахын Тооллого (Google Sheet Grid)
                </h3>
                <p className="text-xs text-slate-400 mt-1">Одоо байгаа агуулахын үлдэгдлийг Excel шиг шууд гараар тоолж хадгална</p>
              </div>
              <button 
                onClick={handleBulkSave}
                disabled={isSavingBulk}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition duration-150 text-xs flex items-center gap-2"
              >
                {isSavingBulk ? "Хадгалж байна..." : "Өөрчлөлтийг хадгалах (Save)"}
                <Save className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <p className="text-center text-slate-500 py-8 text-sm animate-pulse">Уншиж байна...</p>
            ) : (
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-400 text-xs font-bold uppercase tracking-wider sticky top-0 bg-slate-950 z-10">
                      <th className="py-3 px-4">Барааны Нэр</th>
                      <th className="py-3 px-4">Нэгж</th>
                       <th className="py-3 px-4 text-center">Өдөр бүр тоолох (A-Class)</th> 
                      <th className="py-3 px-4 text-right">Стандарт Өртөг</th>
                        <th className="py-3 px-4 text-right">Хэвийн Нөөц (Par)</th>
                        <th className="py-3 px-4 text-right">Нийлүүлэх (Lead Days)</th>
                        <th className="py-3 px-4 text-right">Захиалга (Suggestion)</th>
                      <th className="py-3 px-4 text-right">Бодит тоолсон үлдэгдэл</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-sm">
                    {ingredients.map((ing) => (
                      <tr key={ing.id} className="hover:bg-slate-900/20 transition-all duration-150">
                        <td className="py-3 px-4 font-bold text-slate-200">{ing.name}</td>
                        <td className="py-3 px-4 text-slate-400">{ing.unit}</td>
                        {/* ЭНЭ ШИНЭ CHECKBOX-ИЙГ НЭМНЭ */}
                        <td className="py-2 px-4 text-center">
                          <input 
                            type="checkbox"
                            checked={ing.is_critical || false}
                            onChange={(e) => handleIngredientUpdate(ing.id, 'is_critical', e.target.checked)}
                            className="w-5 h-5 accent-emerald-500 bg-slate-900 border-slate-700 rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {parseFloat(ing.unit_price).toLocaleString()}
                        </td>{/* 1. EDITABLE PAR LEVEL INPUT [2] */}
                      <td className="py-2 px-4 text-right">
                        <input 
                          type="number"
                          step="any"
                          value={ing.par_level !== undefined ? ing.par_level : 0}
                          onChange={(e) => handleIngredientUpdate(ing.id, 'par_level', e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-right text-white focus:outline-none focus:border-emerald-500 font-bold text-xs w-24"
                        />
                      </td>

                      {/* 2. EDITABLE LEAD TIME INPUT [2] */}
                      <td className="py-2 px-4 text-right">
                        <input 
                          type="number"
                          value={ing.lead_time_days !== undefined ? ing.lead_time_days : 1}
                          onChange={(e) => handleIngredientUpdate(ing.id, 'lead_time_days', e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-right text-white focus:outline-none focus:border-emerald-500 font-bold text-xs w-16"
                        />
                      </td>

                      {/* 3. CALCULATED ORDER SUGGESTION (Pulls from your live API payload) [2, 3] */}
                      <td className="py-3.5 px-4 text-right font-black text-blue-400">
                        {liveAnalytics?.all_inventory_data?.find((i: any) => i.name === ing.name)?.suggested_order || 0} {ing.unit}
                      </td>
                        <td className="py-2 px-4 text-right">
                          <input 
                            type="number" 
                            step="any"
                            value={bulkStock[ing.id] !== undefined ? bulkStock[ing.id] : ""}
                            onChange={(e) => {
                              setBulkStock({
                                ...bulkStock,
                                [ing.id]: e.target.value
                              });
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-right text-white focus:outline-none focus:border-emerald-500 font-bold text-sm w-32"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. BULK CLIPBOARD PASTE TAB */}
        {activeTab === 'import' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
              <div className="flex items-center gap-2 mb-4">
                <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
                <h3 className="text-lg font-bold">Борлуулалт Бөөнөөр Импортлох (Sales Paste)</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Google Sheets-ээс <strong>Бүтээгдэхүүн, Тоо ширхэг, Орлого</strong> гэсэн 3 баганыг хуулаад доор шууд хуулж тавина уу.
              </p>

              {salesImportSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-4 flex items-center gap-2.5">
                  <Check className="h-5 w-5" />
                  <p className="text-sm font-semibold">Амжилттай импортлогдлоо!</p>
                </div>
              )}

              <form onSubmit={handleBulkSalesPaste} className="space-y-4">
                <textarea 
                  rows={8}
                  value={salesPasteText}
                  onChange={(e) => setSalesPasteText(e.target.value)}
                  placeholder="Жишээ:&#10;Caffe Latte&#9;34&#10;Tiramisu&#9;62"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500 leading-normal"
                />
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition text-xs flex items-center justify-center gap-2"
                >
                  <UploadCloud className="h-4 w-4" />
                  Орлого Бөөнөөр Хасах (Import)
                </button>
              </form>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
              <div className="flex items-center gap-2 mb-4">
                <FileSpreadsheet className="h-6 w-6 text-blue-400" />
                <h3 className="text-lg font-bold">Татан авалт Бөөнөөр Импортлох (Purchases Paste)</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Google Sheets-ээс <strong>Барааны нэр, Авсан тоо, Нийт өртөг</strong> гэсэн 3 баганыг хуулаад доор шууд хуулж тавина уу.
              </p>

              {purchaseImportSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-4 flex items-center gap-2.5">
                  <Check className="h-5 w-5" />
                  <p className="text-sm font-semibold">Амжилттай импортлогдлоо!</p>
                </div>
              )}

              <form onSubmit={handleBulkPurchasePaste} className="space-y-4">
                <textarea 
                  rows={8}
                  value={purchasePasteText}
                  onChange={(e) => setPurchasePasteText(e.target.value)}
                  placeholder="Жишээ:&#10;Milk&#9;10000&#9;58000&#10;Beans&#9;1000&#9;85000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 font-mono focus:outline-none focus:border-blue-500 leading-normal"
                />
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold py-3 rounded-xl transition text-xs flex items-center justify-center gap-2"
                >
                  <UploadCloud className="h-4 w-4" />
                  Татан авалт Бөөнөөр Нэмэх (Import)
                </button>
              </form>

            </div>
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
              <h3 className="text-lg font-bold">1. Түүхий эд, Үнэ бөөнөөр оруулах</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Excel-ээс <strong>Барааны нэр, Нэгж (мл/гр/ш), Нэгжийн үнэ, Хэвийн нөөц (Par)</strong> гэсэн 4 баганыг хуулаад доор хуулж тавина уу.
            </p>

            {ingredientsImportSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl mb-4 text-xs font-bold">
                ✅ Түүхий эд, үнийн мэдээлэл амжилттай хадгалагдлаа!
              </div>
            )}

            <form onSubmit={handleBulkIngredientsPaste} className="space-y-4">
              <textarea
                rows={6}
                value={ingredientsPasteText}
                onChange={(e) => setIngredientsPasteText(e.target.value)}
                placeholder="Жишээ:&#10;Milk&#9;ml&#9;5.8&#9;20000&#10;Beans&#9;gram&#9;85&#9;5000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition text-xs flex items-center justify-center gap-2"
              >
                <UploadCloud className="h-4 w-4" />
                Түүхий эдүүд хадгалах (Import Catalog)
              </button>
            </form>
            </div>

            {/* 2. RECIPE / ТЕХНОЛОГИЙН КАРТ SETUP BOX */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-6 w-6 text-purple-400" />
                <h3 className="text-lg font-bold">2. Технологийн карт (Жор) бөөнөөр оруулах</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Excel-ээс <strong>Бүтээгдэхүүн, Орцын нэр, Орцын хэмжээ (гр/мл)</strong> гэсэн 3 баганыг хуулаад доор хуулж тавина уу.
              </p>

              {recipesImportSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl mb-4 text-xs font-bold">
                  ✅ Бүх бүтээгдэхүүний жор амжилттай бүртгэгдлээ!
                </div>
              )}

              <form onSubmit={handleBulkRecipesPaste} className="space-y-4">
                <textarea
                  rows={6}
                  value={recipesPasteText}
                  onChange={(e) => setRecipesPasteText(e.target.value)}
                  placeholder="Жишээ:&#10;Caffe Latte&#9;Milk&#9;200&#10;Caffe Latte&#9;Beans&#9;16&#10;Chicken Sandwich&#9;Cheese slice&#9;1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 font-mono focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold py-3 rounded-xl transition text-xs flex items-center justify-center gap-2"
                >
                  <UploadCloud className="h-4 w-4" />
                  Жор бөөнөөр хадгалах (Import Recipes)
                </button>
              </form>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900 mb-8">
  <div className="flex items-center gap-2 mb-2">
    <Coffee className="h-6 w-6 text-emerald-400" />
    <h3 className="text-lg font-bold">Меню / Цэс бөөнөөр оруулах (Products & Selling Prices)</h3>
  </div>
  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
    Google Sheets-ээс <strong>Category (Ангилал), Item (Нэр), Selling Price (Зарах үнэ)</strong> гэсэн 3 баганыг хуулаад доор paste хийнэ үү.
  </p>

  {productsImportSuccess && (
    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl mb-4 text-xs font-bold">
      ✅ Бүх цэсний зарах үнэ амжилттай хадгалагдлаа!
    </div>
  )}

  <form onSubmit={handleBulkProductsPaste} className="space-y-4">
    <textarea
      rows={5}
      value={productsPasteText}
      onChange={(e) => setProductsPasteText(e.target.value)}
      placeholder="Жишээ:&#10;SANDWICH&#9;Chicken Sandwich&#9;8900&#10;COLD COFFEE&#9;Americano /мөстэй/&#9;8500&#10;COLD COFFEE&#9;Caffe latte /мөстэй/&#9;9500"
      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
    />
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition text-xs flex items-center justify-center gap-2"
    >
      <UploadCloud className="h-4 w-4" />
      Цэсний үнийг хадгалах (Import Menu)
    </button>
  </form>
</div>
          </div>
          
        )}
        {/* 7. AI CFO CHAT TAB (OWNER ONLY) */}
        {activeTab === 'ai_cfo' && userRole === 'owner' && (
          <div className="max-w-3xl mx-auto bg-slate-900/40 rounded-3xl border border-slate-800 flex flex-col h-[70vh] shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center gap-3 bg-slate-900 rounded-t-3xl">
              <div className="bg-blue-500/20 p-2 rounded-xl border border-blue-500/30">
                <Bot className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h2 className="font-bold text-white">Smart BoH - AI Санхүүгийн Зөвлөх</h2>
                <p className="text-xs text-slate-400">Орлого, хаягдал, зурагт баримтуудын талаар юу ч асууж болно.</p>
              </div>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {cfoChatHistory.length === 0 && (
                <div className="text-center text-slate-500 text-sm mt-10">
                  <p className="mb-4">Жишээ асуултууд:</p>
                  <ul className="space-y-2 inline-block text-left">
                    <li>👉 "Өнөөдөр ямар бараанууд зураггүй гараар шивэгдсэн бэ?"</li>
                    <li>👉 "Энэ сарын нийт хаягдал хэдэн төгрөг болсон бэ?"</li>
                    <li>👉 "Сүүлийн 7 хоногт хэн хамгийн их алдаа гаргав?"</li>
                  </ul>
                </div>
              )}
              {cfoChatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'owner' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 text-sm leading-relaxed ${
                    msg.sender === 'owner' 
                      ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none shadow-lg' 
                      : 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-none border border-slate-700 whitespace-pre-wrap'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isCfoLoading && <div className="text-blue-400 text-xs animate-pulse font-bold">AI бодож байна...</div>}
            </div>

            <div className="p-4 bg-slate-900 rounded-b-3xl border-t border-slate-800">
            <form onSubmit={async (e) => {
          e.preventDefault();
          if (!cfoChatInput.trim()) return;
          
          const text = cfoChatInput;
          setCfoChatHistory(prev => [...prev, { sender: 'owner', text }]);
          setCfoChatInput('');
          setIsCfoLoading(true);

  try {
    const res = await fetch('/api/kiosk-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantClientId: activeClient,
        workerName: 'Owner',
        text: text,
        userRole: 'owner'
      })
    });

    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json();
      setCfoChatHistory(prev => [...prev, { sender: 'ai', text: data.message }]);
    } else if (res.body) {
      // Append initial empty AI message
      setCfoChatHistory(prev => [...prev, { sender: 'ai', text: '' }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        streamedText += chunk;

        setCfoChatHistory(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = { sender: 'ai', text: streamedText };
          }
                    return updated;
                  });
                }
              }
            } catch (err) {
              setCfoChatHistory(prev => [...prev, { sender: 'ai', text: '❌ Алдаа гарлаа.' }]);
            } finally {
              setIsCfoLoading(false);
            }
          }} className="flex gap-3">
                <input 
                  type="text" 
                  value={cfoChatInput} 
                  onChange={e => setCfoChatInput(e.target.value)} 
                  placeholder="Асуултаа энд бичнэ үү..." 
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm" 
                />
                <button 
                  type="submit" 
                  disabled={isCfoLoading || !cfoChatInput.trim()} 
                  className="bg-blue-500 text-white px-5 py-3 rounded-xl disabled:opacity-50 transition shadow-lg hover:bg-blue-400"
                >
                  Илгээх
                </button>
              </form>
            </div>
          </div>
        )}
      {/* TASK & ROLE MANAGEMENT TAB */}
        {activeTab === 'tasks' && userRole === 'owner' && (
          <div className="space-y-8">
            
            {/* SECTION 1: CREATE ROLES & ASSIGN ROLES TO WORKERS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Role Creator */}
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
                <h3 className="text-base font-bold mb-4 text-emerald-400">1. Албан тушаал / Үүрэг үүсгэх</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newRoleInput.trim()) return;
                  setLoading(true);
                  const { error } = await supabase.from('company_roles').insert([{ client_id: activeClient, role_name: newRoleInput.trim() }]);
                  if (error) alert(`Алдаа: ${error.message}`);
                  setNewRoleInput('');
                  await fetchDatabaseData(activeClient);
                }} className="space-y-3">
                  <input 
                    type="text" 
                    required 
                    value={newRoleInput} 
                    onChange={e => setNewRoleInput(e.target.value)} 
                    placeholder="Жнь: Бармен, Талхчин, Зөөгч" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold"
                  />
                  <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs">
                    + Үүрэг Нэмэх
                  </button>
                </form>
              </div>

              {/* Assign Roles to Registered Workers */}
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900 md:col-span-2">
                <h3 className="text-base font-bold mb-4 text-blue-400">2. Ажилтнуудад үүрэг оноох</h3>
                <div className="overflow-x-auto max-h-[220px]">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs border-b border-slate-800">
                        <th className="pb-2">Ажилтны Нэр</th>
                        <th className="pb-2">Имэйл</th>
                        <th className="pb-2">Одоогийн Үүрэг</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {workersList.length === 0 ? (
                        <tr><td colSpan={3} className="py-4 text-center text-slate-500 italic">Бүртгэлтэй ажилтан алга байна.</td></tr>
                      ) : (
                        workersList.map(w => (
                          <tr key={w.id}>
                            <td className="py-2.5 font-bold text-slate-200">{w.full_name || 'Нэргүй'}</td>
                            <td className="py-2.5 text-slate-400 text-xs">{w.email}</td>
                            <td className="py-2.5">
                              <select 
                                value={w.role} 
                                onChange={async (e) => {
                                  const updatedRole = e.target.value;
                                  await supabase.from('profiles').update({ role: updatedRole }).eq('id', w.id);
                                  await fetchDatabaseData(activeClient);
                                }}
                                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-bold"
                              >
                                <option value="Ажилтан">Сонгоогүй (Ажилтан)</option>
                                {companyRoles.map(r => (
                                  <option key={r.id} value={r.role_name}>{r.role_name}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* SECTION 2: CREATE & VIEW TASKS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Task Form */}
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900 md:col-span-1 h-fit">
                <h3 className="text-base font-bold mb-4 text-emerald-400">3. Шинэ даалгавар үүсгэх</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault(); 
                  setLoading(true);
                  const { error } = await supabase.from('tasks').insert([{ 
                    client_id: activeClient, 
                    role: newTaskRole, 
                    task_name: newTaskName, 
                    weight: parseInt(newTaskWeight) || 10 
                  }]);
                  
                  if (error) alert(`Алдаа: ${error.message}`);
                  else {
                    setNewTaskName(''); 
                    setNewTaskWeight('');
                    await fetchDatabaseData(activeClient);
                  }
                  setLoading(false);
                }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">Хэнд оноох вэ?</label>
                    <select 
                      value={newTaskRole} 
                      onChange={e => setNewTaskRole(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold"
                    >
                      <option value="Бүх ажилтан">Бүх ажилтан (Бүгд хийх)</option>
                      
                      {/* Dynamic Roles created by owner */}
                      <optgroup label="Үүргээр оноох (By Role)">
                        {companyRoles.map(r => (
                          <option key={r.id} value={r.role_name}>🏷️ {r.role_name} (Энэ үүрэгтэй бүх хүн)</option>
                        ))}
                      </optgroup>
                      
                      {/* Specific workers with their assigned roles */}
                      <optgroup label="Нэр зааж оноох (Specific Worker)">
                        {workersList.map(w => {
                          const displayName = w.full_name || w.email.split('@')[0];
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
                    <label className="block text-xs font-bold text-slate-400 mb-2">Даалгаврын нэр</label>
                    <input 
                      type="text" 
                      required 
                      value={newTaskName} 
                      onChange={e => setNewTaskName(e.target.value)} 
                      placeholder="Жнь: Кофены машин угаах" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">Ачааллын жин (Оноо 1-100)</label>
                    <input 
                      type="number" 
                      required 
                      value={newTaskWeight} 
                      onChange={e => setNewTaskWeight(e.target.value)} 
                      placeholder="Жнь: 15" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold"
                    />
                  </div>

                  <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition text-sm">
                    Даалгавар Нэмэх
                  </button>
                </form>
              </div>

              {/* Tasks List */}
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900 md:col-span-2">
                <h3 className="text-base font-bold mb-4">Бүртгэлтэй Даалгаврууд</h3>
               <div className="overflow-x-auto max-h-[350px]">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs border-b border-slate-800 uppercase">
                        <th className="pb-3 px-2">Оноосон Хаяг</th>
                        <th className="pb-3 px-2">Даалгаврын нэр</th>
                        <th className="pb-3 px-2">Ачаалал</th>
                        <th className="pb-3 px-2">Үүсгэсэн Огноо (Цаг, Минут)</th>
                        <th className="pb-3 px-2 text-right">Үйлдэл</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {tasks.filter(t => t.client_id === activeClient).length === 0 ? (
                        <tr><td colSpan={5} className="py-6 text-center text-slate-500 italic">Даалгавар байхгүй байна.</td></tr>
                      ) : (
                        tasks.filter(t => t.client_id === activeClient).map(t => (
                          <tr key={t.id} className="hover:bg-slate-900/30">
                            <td className="py-3 px-2 text-emerald-400 font-bold">{t.role}</td>
                            <td className="py-3 px-2 font-semibold text-slate-200">{t.task_name}</td>
                            <td className="py-3 px-2 text-blue-400 font-bold">{t.weight} pts</td>
                            
                            {/* EXACT TIMESTAMPS: Year, Month, Day, Hour, Minute, Second */}
                            <td className="py-3 px-2 text-slate-400 text-xs font-mono">
                              {t.created_at ? new Date(t.created_at).toLocaleString('mn-MN', { 
                                year: 'numeric', 
                                month: '2-digit', 
                                day: '2-digit', 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                second: '2-digit' 
                              }) : "-"}
                            </td>

                            <td className="py-3 px-2 text-right">
                              <button onClick={async () => { await supabase.from('tasks').delete().eq('id', t.id); fetchDatabaseData(activeClient); }} className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg text-xs font-bold transition">Устгах</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

{/* Closed Shifts Report Table */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900 md:col-span-3 mt-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-400">
                <Activity className="h-5 w-5" /> Хаагдсан ээлжүүдийн түүх (Shift History)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-slate-800 uppercase tracking-wider font-bold">
                      <th className="py-3 px-2">Ажилтан (Үүрэг)</th>
                      <th className="py-3 px-2">Эхэлсэн огноо</th>
                      <th className="py-3 px-2">Хаагдсан огноо</th>
                      <th className="py-3 px-2">Даалгаврын гүйцэтгэл</th>
                      <th className="py-3 px-2 text-right">Ээлжийн Статус</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-800/50">
                    {shifts.filter(s => s.client_id === activeClient && !s.is_active).length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-500 italic">Хаагдсан ээлж одоогоор байхгүй байна.</td></tr>
                    ) : (
                      shifts.filter(s => s.client_id === activeClient && !s.is_active).map(s => {
                        // Calculate task completion percentage
                        let tasksList = s.daily_tasks_checklist || [];
                        if (typeof tasksList === 'string') tasksList = JSON.parse(tasksList);
                        let completed = tasksList.filter((t: any) => t.done).length;
                        let total = tasksList.length;
                        let percentage = total > 0 ? Math.round((completed / total) * 100) : 100;

                        return (
                          <tr key={s.id} className="hover:bg-slate-900/30">
                            <td className="py-3 px-2 font-bold text-slate-200">{s.character_role || "Ерөнхий ажилтан"}</td>
                            <td className="py-3 px-2 text-slate-400">{new Date(s.start_time).toLocaleString('mn-MN')}</td>
                            <td className="py-3 px-2 text-slate-400">{s.end_time ? new Date(s.end_time).toLocaleString('mn-MN') : "-"}</td>
                            <td className="py-3 px-2 font-semibold">
                              {total > 0 ? (
                                <span className={percentage >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                                  {percentage}% ({completed}/{total})
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">Даалгавар байхгүй</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className="bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg text-xs font-bold uppercase">Closed</span>
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
        {/* NEW: HORIZONTAL SPREADSHEET AUDIT PASTE CONTAINER */}
        {activeTab === 'import' && (
          <div className="mt-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-900 col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="h-6 w-6 text-teal-400" />
              <h3 className="text-lg font-bold">Агуулахын Тооллого Хэвтээ Импортлох (Horizontal Inventory Audit Paste)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Google Sheets-ээс <strong>Толгой мөр (Ингредиентүүдийн нэрс) болон доорх Тооллогын мөрийг (Date, Type, болон утгууд)</strong> хамт чирж хуулаад доор шууд хуулж тавина уу.
            </p>

            {inventoryImportSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-4 flex items-center gap-2.5">
                <Check className="h-5 w-5" />
                <p className="text-sm font-semibold">Тооллого амжилттай импортлогдож, бодит үлдэгдлүүд сэргэлээ!</p>
              </div>
            )}

            <form onSubmit={handleBulkInventoryPaste} className="space-y-4">
              <textarea 
                rows={5}
                value={inventoryPasteText}
                onChange={(e) => setInventoryPasteText(e.target.value)}
                placeholder="Жишээ:&#10;Date&#9;Type&#9;Apple syrup&#9;Bun&#9;Butter&#10;2026-05-30&#9;start&#9;751&#9;3&#9;0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 font-mono focus:outline-none focus:border-teal-500 leading-normal"
              />
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3 rounded-xl transition text-xs flex items-center justify-center gap-2"
              >
                <UploadCloud className="h-4 w-4" />
                Тооллого Бөөнөөр Шивэх (Import Audit)
              </button>
            </form>
          </div>
        )}

        {/* DYNAMIC DAILY OPERATIONAL AUDIT TIMELINE */}
        {userRole === 'owner' && activeTab !== 'inventory' && activeTab !== 'import' && activeTab !== 'tasks' && (
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-400" />
                  Өдөр тутмын үйл ажиллагааны Хяналтын Лог
                </h3>
                <p className="text-xs text-slate-400 mt-1">Ажилтан тус бүрийн хийсэн бүх гүйлгээ, зураг болон баримтын хяналт</p>
              </div>
              
              {/* Date & Worker Range Filter Inputs */}
      <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Ажилтан Хайх:</span>
                  <input 
                    type="text" 
                    value={workerSearchQuery} 
                    onChange={(e) => setWorkerSearchQuery(e.target.value)}
                    placeholder="Нэр бичих..." 
                    className="bg-transparent text-sm text-white font-bold outline-none border-0 p-0 focus:ring-0 w-36 placeholder:text-slate-600"
                  />
                </div>   
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Эхлэх:</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm text-white font-bold outline-none cursor-pointer border-0 p-0" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Дуусах:</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm text-white font-bold outline-none cursor-pointer border-0 p-0" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-900/90 backdrop-blur">
                  <tr className="text-slate-400 text-xs font-bold uppercase border-b border-slate-800">
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
                  {inventoryLogs.filter(log => {
                    const logDate = log.date ? log.date.split('T')[0] : '';
                    const dateMatch = logDate >= startDate && logDate <= endDate;
                    
                    // Live, case-insensitive partial match search logic
                    const workerMatch = !workerSearchQuery.trim() || 
                      (log.worker_name || 'Үл мэдэгдэх').toLowerCase().includes(workerSearchQuery.toLowerCase().trim());
                    
                    return dateMatch && workerMatch && log.client_id === activeClient;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                        Энэ хугацаанд агуулахын ямар нэгэн хөдөлгөөн бүртгэгдээгүй байна.
                      </td>
                    </tr>
                  ) : (
                    inventoryLogs.filter(log => {
                      const logDate = log.date ? log.date.split('T')[0] : '';
                      const dateMatch = logDate >= startDate && logDate <= endDate;
                      
                      // Same dynamic search matching applied to the mapping loop
                      const workerMatch = !workerSearchQuery.trim() || 
                        (log.worker_name || 'Үл мэдэгдэх').toLowerCase().includes(workerSearchQuery.toLowerCase().trim());
                      
                      return dateMatch && workerMatch && log.client_id === activeClient;
                    }).map((log) => {
                      const ing = ingredients.find(i => i.id === log.ingredient_id);
                      const name = ing ? ing.name : (log.non_food_item || "Unknown");
                      const unit = ing ? ing.unit : "ш";
                      const noteText = (log.notes || "").toLowerCase();
                      const isPhotoVerified = noteText.includes("scan") || noteText.includes("e-barimt") || noteText.includes("proof") || noteText.includes("зураг");

                      return (
                        <tr key={log.id} className="hover:bg-slate-900/30">
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-lg text-xs font-black uppercase ${
                              log.type === 'purchase' ? 'bg-blue-500/10 text-blue-400' :
                              log.type === 'count' ? 'bg-purple-500/10 text-purple-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {log.type}
                            </span>
                          </td>
                          {/* АЖИЛТАН БАГАНА */}
                          <td className="py-3 px-2 text-slate-300 font-medium">
                            {log.worker_name || 'Үл мэдэгдэх'}
                          </td>
                          <td className="py-3 px-2 font-bold text-slate-200">{name}</td>
                          <td className="py-3 px-2 text-right font-semibold">{Math.abs(log.quantity).toLocaleString()} {unit}</td>
                          <td className="py-3 px-2 text-right text-slate-400">
                            {log.total_cost ? `${parseFloat(log.total_cost).toLocaleString()}₮` : "-"}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {isPhotoVerified ? (
                              <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg text-xs font-bold border border-emerald-500/20">
                                📸 Баримтын зурагтай
                              </span>
                            ) : log.type === 'purchase' ? (
                              <span className="bg-rose-500/10 text-rose-400 px-2 py-1 rounded-lg text-xs font-bold border border-rose-500/20">
                                ⚠️ Гараар шивсэн (Зураггүй)
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs italic">Дотоод хөдөлгөөн</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-slate-400 max-w-[200px] truncate">{log.notes || "-"}</td>
                          <td className="py-3 px-2 text-slate-400 text-xs font-mono">
                            {new Date(log.date).toLocaleString('mn-MN', { 
                              year: 'numeric', month: '2-digit', day: '2-digit', 
                              hour: '2-digit', minute: '2-digit', second: '2-digit' 
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
        {/* NEW: Гал тогооны хаягдал (Kitchen Logs) бөөнөөр хуулах хайрцаг */}
        {activeTab === 'import' && (
          <div className="mt-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-900 col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="h-6 w-6 text-rose-400" />
              <h3 className="text-lg font-bold">Гал тогооны хаягдал бөөнөөр импортлох (Kitchen Logs Paste)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Google Sheets-ээс <strong>Огноо, Төрөл, Бараа, Хэмжээ, Тайлбар</strong> гэсэн 5 баганыг чирж хуулаад доор шууд хуулж тавина уу.
            </p>

            {kitchenImportSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-4 flex items-center gap-2.5">
                <Check className="h-5 w-5" />
                <p className="text-sm font-semibold">Гал тогооны хаягдлууд амжилттай импортлогдож, үлдэгдлүүд хасагдлаа!</p>
              </div>
            )}

            <form onSubmit={handleBulkKitchenLogsPaste} className="space-y-4">
              <textarea 
                rows={6}
                value={kitchenPasteText}
                onChange={(e) => setKitchenPasteText(e.target.value)}
                placeholder="Жишээ:&#10;2026-06-04&#9;Spoilage&#9;Whipped cream&#9;500&#9;Асгарч муудсан"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 font-mono focus:outline-none focus:border-rose-500 leading-normal"
              />
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 py-3 rounded-xl transition text-xs flex items-center justify-center gap-2"
              >
                <UploadCloud className="h-4 w-4" />
                Хаягдал Бөөнөөр Шивэх (Import Kitchen Logs)
              </button>
            </form>
          </div>
        )}

        {/* Live Database Inventory Table (Visible across all tabs except inventory bulk editor & bulk paste tabs) */}
        {activeTab !== 'inventory' && activeTab !== 'import' && (
          <div className="mt-8 bg-slate-900/30 p-6 rounded-2xl border border-slate-900">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-900">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-400" />
                  Агуулахын бодит үлдэгдэл (Live Inventory)
                </h3>
                <p className="text-xs text-slate-400 mt-1">Supabase PostgreSQL-ээс уншиж буй бодит дата</p>
              </div>
              {lowStockItems.length > 0 && (
                <span className="bg-rose-500/10 text-rose-400 px-3 py-1 rounded-xl text-xs font-semibold border border-rose-500/20 flex items-center gap-1.5 animate-bounce">
                  <AlertTriangle className="h-4 w-4" />
                  {lowStockItems.length} Барааны нөөц дуусаж байна!
                </span>
              )}
            </div>

            {loading ? (
              <p className="text-center text-slate-500 py-8 text-sm animate-pulse">Агуулахын мэдээллийг татаж байна...</p>
            ) : ingredients.length === 0 ? (
              <p className="text-center text-slate-500 py-8 text-sm">Бараа материал бүртгэгдээгүй байна.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Барааны Нэр</th>
                      <th className="py-3 px-4">Нэгж</th>
                      <th className="py-3 px-4 text-right">Стандарт Өртөг</th>
              
                      <th className="py-3 px-4 text-right">Бодит Үлдэгдэл</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-sm">
                    {ingredients.map((ing) => (
                      <tr key={ing.id} className="hover:bg-slate-900/20 transition-all duration-150">
                        <td className="py-3.5 px-4 font-bold text-slate-200">{ing.name}</td>
                        <td className="py-3.5 px-4 text-slate-400">{ing.unit}</td>
                        <td className="py-3.5 px-4 text-right text-slate-300">
                          {parseFloat(ing.unit_price).toLocaleString()}₮
                        </td>
                        
                        <td className={`py-3.5 px-4 text-right font-black ${
                          parseFloat(ing.current_stock) <= 50 ? 'text-rose-400 bg-rose-500/5' : 'text-slate-100'
                        }`}>
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

      </div>
    </div>
  );
}


// FIXED: Exporting the component dynamically with SSR disabled AND suppressHydrationWarning on the loader container [3]
const HomeExport = dynamic(() => Promise.resolve(Home), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-950" suppressHydrationWarning={true}>
      <p className="text-emerald-400 font-semibold text-lg animate-pulse" suppressHydrationWarning={true}>Ачаалж байна...</p>
    </div>
  )
});

export default HomeExport;