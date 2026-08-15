"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'; // next/dynamic to bypass 100% of extension hydration conflicts
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, 
  Trash2, 
  Cpu, 
  Layers, 
  DollarSign, 
  Percent, 
  Activity, 
  AlertTriangle, 
  Database,
  Coffee,
  PlusCircle,
  History,
  CheckCircle,
  Undo2,
  Layers3,
  Building,
  Save,
  Check,
  FileSpreadsheet,
  UploadCloud
} from 'lucide-react';
// 1. Add these imports at the top of your page.tsx
import { useRouter } from 'next/navigation';






const SUPABASE_URL = "https://fcpwvualdbuakrwmqgmg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjcHd2dWFsZGJ1YWtyd21xZ21nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE4MDQzOCwiZXhwIjoyMDk5NzU2NDM4fQ.iDX_3sL-Sk1Z5oK2zSvW32saZBoY5f5f4XBu_dTQA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function Home() {
    //  add session checking state
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userClient, setUserClient] = useState<string>('SF Coffee');
  // Navigation State
const [activeTab, setActiveTab] = useState<'dashboard' | 'barista' | 'sales' | 'inventory' | 'import' | 'tasks'>('dashboard');
  const [userRole, setUserRole] = useState<'owner' | 'barista'>('owner');
const [activeClient, setActiveClient] = useState<string | 'Cafe B'>(userClient);
const [tasks, setTasks] = useState<any[]>([]);
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
    // Redirect unauthenticated browsers to your new login page [2]
    router.push('/login');
  } else {
    setUser(session.user);
    // Read the client_id assigned to this user from their profiles/metadata [2, 3]
    const assignedClient = session.user.user_metadata?.client_id || 'SF Coffee';
    setUserClient(assignedClient);
    
    // Fetch only this branch's data securely
    fetchDatabaseData(assignedClient);
  }
};

useEffect(() => {
  checkUserSession();
}, []);




  
const fetchDatabaseData = async (clientId: string = 'SF Coffee') => {
    try {
      const { data: ingData } = await supabase.from('ingredients').select('*').order('name', { ascending: true });
      const { data: recData } = await supabase.from('recipes').select('*');
      const { data: logData } = await supabase.from('inventory_logs').select('*');
      const { data: saleData } = await supabase.from('sales_logs').select('*');
      const { data: taskData } = await supabase.from('tasks').select('*');
      if (taskData) setTasks(taskData);
      
      if (ingData) {
        setIngredients(ingData);
        const stockMap: Record<string, string> = {};
        ingData.forEach((ing: any) => {
          stockMap[ing.id] = parseFloat(ing.current_stock).toString();
        });
        setBulkStock(stockMap);
      }
      if (logData) setInventoryLogs(logData);
      if (saleData) setSalesLogs(saleData);
      if (recData) {
        setRecipes(recData);
        const products = Array.from(new Set(recData.map((r: any) => r.product_name)));
        setUniqueProducts(products as string[]);
      }

      // Fetch live calculated analytics and pass the user's specific branch name securely [2]
      const res = await fetch(`/api/analytics?clientId=${encodeURIComponent(clientId)}`, { cache: 'no-store' });
      if (res.ok) {
        const analData = await res.json();
        setLiveAnalytics(analData);
      }
    } catch (err) {
      console.error("Error fetching database:", err);
    } finally {
      setLoading(false);
    }
  };
  console.log(liveAnalytics,"live analytics");
  
  console.log(liveAnalytics?.total_waste_loss,"total waste");
  console.log(liveAnalytics?.total_surplus_savings,"total surplus");
  console.log(liveAnalytics?.total_logged_spoilage,"total spoilage");
  console.log(liveAnalytics?.total_logged_testing,"total testing");
  console.log(liveAnalytics?.total_logged_staff_meal,"total staff meal");
  console.log(liveAnalytics?.total_logged_other,"total other");

  useEffect(() => {
    fetchDatabaseData();
  }, []);


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

 // FIXED: Forces June date for testing, preserves custom notes, and routes non-food correctly to OPEX!
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNonFood && !selectedIngredientId) return;
    if (isNonFood && !nonFoodName) return;
    if (!logQty) return;

    setLoading(true);
    const parsedQty = parseFloat(logQty);
    
    // Non-food purchases are always positive additions
    const finalQty = isNonFood ? Math.abs(parsedQty) : (logType === 'purchase' || logType === 'count') ? Math.abs(parsedQty) : -Math.abs(parsedQty);
    const costValue = logType === 'purchase' ? parseFloat(logCost) : 0;
    const finalType = isNonFood ? 'purchase' : logType;

    try {
      // 1. Insert into database
      const { data: logData, error } = await supabase
        .from('inventory_logs')
        .insert([
          { 
            ingredient_id: isNonFood ? null : selectedIngredientId, 
            non_food_item: isNonFood ? nonFoodName : null,
            quantity: finalQty, 
            type: finalType, 
            total_cost: finalType === 'purchase' ? costValue : 0,
            notes: logNote || `${finalType} logged manually`, // FIXED: Preserves the typed note!
            date: '2026-06-15T12:00:00.000Z' // FIXED: Forces June date for immediate test visibility!
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // 2. If food purchase, update unit price automatically (FIXED: Forces June date)
      if (!isNonFood && finalType === 'purchase' && costValue > 0) {
        const newUnitPrice = costValue / Math.abs(finalQty);
        await supabase
          .from('ingredients')
          .update({ unit_price: newUnitPrice })
          .eq('id', selectedIngredientId);
      }

      if (logData) {
        setLastLogId(logData.id);
        setLastLogDetails(isNonFood ? `${nonFoodName}: ${Math.abs(finalQty)} ш (OPEX)` : `${ingredients.find(i=>i.id===selectedIngredientId).name}: ${Math.abs(finalQty)} (${finalType})`);
        setLogSuccess(true);
        setSelectedIngredientId('');
        setNonFoodName('');
        setIsNonFood(false);
        setLogQty('');
        setLogNote('');
        setLogCost('');
        await fetchDatabaseData();
        setTimeout(() => setLogSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
      alert("Бүртгэл хийхэд алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };
const handleBulkSave = async () => {
    setIsSavingBulk(true);
    try {
      const logsToInsert: any[] = [];
      
      const updatePromises = Object.keys(bulkStock).map(async (id) => {
        const stockVal = parseFloat(bulkStock[id]) || 0;
        
        // Find the original item to see if the stock level actually changed
        const originalIng = ingredients.find(i => i.id === id);
        
        if (originalIng && parseFloat(originalIng.current_stock) !== stockVal) {
          // Push a physical count log to the transaction ledger
          logsToInsert.push({
            ingredient_id: id,
            quantity: stockVal,
            type: 'count',
            notes: `Гараар Тоолсон Үлдэгдэл (Менежер Grid)`,
            date: new Date().toISOString()
          });
        }

        return supabase
          .from('ingredients')
          .update({ current_stock: stockVal })
          .eq('id', id);
      });

      // 1. Update master stock values
      await Promise.all(updatePromises);

      // 2. Insert transaction count logs so the financial engine calculates actual usage
      if (logsToInsert.length > 0) {
        const { error: logError } = await supabase
          .from('inventory_logs')
          .insert(logsToInsert);
          
        if (logError) throw logError;
      }

      alert("Бүх үлдэгдлүүд амжилттай хадгалагдлаа!");
      await fetchDatabaseData();
    } catch (e) {
      console.error(e);
      alert("Алдаа гарлаа.");
    } finally {
      setIsSavingBulk(false);
    }
  };

// FIXED: Automatically handles both 4-column (with Date) and 3-column sales pastes!
const handleBulkSalesPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salesPasteText.trim()) return;

    setLoading(true);
    try {
      const rows = salesPasteText.trim().split('\n');
      const salesToInsert: any[] = [];

      rows.forEach(row => {
        const cols = row.split('\t');
        let pName = "";
        let qty = 0;
        let revenue = 0;
        
        // FIXED: Default date to June 30th if no date column is provided, preventing crashes
        let dateVal = '2026-06-30T12:00:00.000Z';

        if (cols.length >= 4) {
          dateVal = parseSafeDate(cols[0]);
          pName = cols[1].trim();
          qty = parseInt(cols[2].replace(/,/g, "")) || 0;
          revenue = parseFloat(cols[3].replace(/[^0-9.\-]/g, "")) || 0;
        } else if (cols.length === 3) {
          pName = cols[0].trim();
          qty = parseInt(cols[1].replace(/,/g, "")) || 0;
          revenue = parseFloat(cols[2].replace(/[^0-9.\-]/g, "")) || 0;
        }

        if (qty > 0 && pName) {
          salesToInsert.push({ 
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
      await fetchDatabaseData();
      setTimeout(() => setSalesImportSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert("Борлуулалтыг бөөнөөр оруулахад алдаа гарлаа. Багануудыг шалгана уу.");
    } finally {
      setLoading(false);
    }
  };
  // FIXED: Handles both 4-column (Google Sheets style with Date) and 3-column pastes dynamically!
// FIXED: Strips '₮' and commas cleanly to prevent NaN database errors!
  const handleBulkPurchasePaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchasePasteText.trim()) return;

    setLoading(true);
    try {
      const rows = purchasePasteText.trim().split('\n');
      const purchasesToInsert: any[] = [];

      rows.forEach(row => {
        const cols = row.split('\t');
        let ingName = "";
        let qty = 0;
        let totalCost = 0;
        let dateVal = new Date().toISOString();

        if (cols.length >= 4) {
           dateVal = parseSafeDate(cols[0]);
          ingName = cols[1].trim();
          qty = parseFloat(cols[2].replace(/,/g, "")) || 0;
          totalCost = parseFloat(cols[3].replace(/[^0-9.\-]/g, "")) || 0;
        } else if (cols.length === 3) {
          ingName = cols[0].trim();
          qty = parseFloat(cols[1].replace(/,/g, "")) || 0;
          // FIXED: Strips '₮' and all non-numeric characters cleanly!
          totalCost = parseFloat(cols[2].replace(/[^0-9.\-]/g, "")) || 0;
        }

        const ing = ingredients.find(i => cleanNameForMatch(i.name) === cleanNameForMatch(ingName));

        if (ing && qty > 0) {
          purchasesToInsert.push({
            ingredient_id: ing.id,
            quantity: qty,
            type: 'purchase',
            total_cost: totalCost,
            date: dateVal,
            notes: `Бөөнөөр Татан Авалт (Cost: ${totalCost}₮)`
          });
        } else if (qty > 0) {
          purchasesToInsert.push({
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
      await fetchDatabaseData();
      setTimeout(() => setPurchaseImportSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert("Татан авалтыг бөөнөөр оруулахад алдаа гарлаа. Багануудыг шалгана уу.");
    } finally {
      setLoading(false);
    }
  };

// FIXED: Loops through all data rows (start, end, etc.) simultaneously!
  const handleBulkInventoryPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryPasteText.trim()) return;

    setLoading(true);
    try {
      const rows = inventoryPasteText.trim().split('\n');
      if (rows.length < 2) {
        alert("Алдаа: Та Толгой мөр (Headers) болон Дараах дата мөрийг хамт хуулж оруулна уу.");
        setLoading(false);
        return;
      }

      const headers = rows[0].split('\t').map(h => cleanNameForMatch(h));
      const countsToInsert: any[] = [];

      // Loop through all data rows (Row 1 is start, Row 2 is End, etc.)
      for (let r = 1; r < rows.length; r++) {
        const values = rows[r].split('\t');
        if (values.length < 2) continue;

        // FIXED: Огноог аюулгүй хөрвүүлнэ
        const dateVal = parseSafeDate(values[0]);
        const typeVal = values[1]?.trim().toLowerCase() || 'count';

        for (let i = 2; i < headers.length; i++) {
          const ingName = headers[i];
          if (!ingName) continue;

          // Strip commas and spaces
          const qty = parseFloat(values[i]?.replace(/[, ]/g, "")) || 0;
          const ing = ingredients.find(ingItem => cleanNameForMatch(ingItem.name) === ingName);

          if (ing) {
            countsToInsert.push({
              ingredient_id: ing.id,
              quantity: qty,
              type: 'count',
              notes: `Бөөнөөр Тоолсон Үлдэгдэл - Огноо: ${dateVal}, Төрөл: ${typeVal}`,
              date: new Date(dateVal).toISOString()
            });

            // Update current_stock in ingredients table directly for the latest count
            if (r === rows.length - 1) { // Only set master stock to the latest row's values
              await supabase
                .from('ingredients')
                .update({ current_stock: qty })
                .eq('id', ing.id);
            }
          }
        }
      }

      if (countsToInsert.length > 0) {
        const { error } = await supabase.from('inventory_logs').insert(countsToInsert);
        if (error) throw error;
      }

      setInventoryImportSuccess(true);
      setInventoryPasteText('');
      await fetchDatabaseData();
      setTimeout(() => setInventoryImportSuccess(false), 4000);

    } catch (err) {
      console.error(err);
      alert("Тооллогыг бөөнөөр оруулахад алдаа гарлаа. Багануудыг шалгана уу.");
    } finally {
      setLoading(false);
    }
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

// FIXED: Complete, unbroken sales submit handler with productRecipes correctly defined
  const handleSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !salesQty) return;

    setLoading(true);
    const qtySold = parseInt(salesQty);
    
    // DEFINED: This line must be present before the try block!
    const productRecipes = recipes.filter((r: any) => r.product_name === selectedProduct);

    try {
      const mockPrices: Record<string, number> = {
        "Tiramisu": 11900,
        "Caffe Latte": 9500,
        "Americano": 8000,
        "Sea ​​buckthorn cupcake": 5000,
        "Трюфель/Медовик": 4000,
        "Strawberry Smoothie": 12500,
        "Mango Smoothie": 12500,
        "Flavored Caffe Latte": 10500,
        "Blueberry Smoothie": 12500,
        "Laaztai cola": 5000
      };

      const unitPrice = mockPrices[selectedProduct] || 5000;
      const totalRevenue = unitPrice * qtySold;

      // 1. Log the Sales Revenue (FIXED: Forces June date)
      const { error: saleError } = await supabase
        .from('sales_logs')
        .insert([{ 
          product_name: selectedProduct, 
          quantity_sold: qtySold, 
          total_revenue: totalRevenue,
          date: '2026-06-15T12:00:00.000Z' // Forces June date
        }]);

      if (saleError) throw saleError;

      // 2. Log the recipe ingredient deductions (FIXED: Forces June date)
      const logsToInsert = productRecipes.map(recipe => ({
        ingredient_id: recipe.ingredient_id,
        quantity: -(recipe.amount * qtySold),
        type: 'sale',
        notes: `Борлуулалт: ${qtySold}ш ${selectedProduct}`,
        date: '2026-06-15T12:00:00.000Z' // Forces June date
      }));

      if (logsToInsert.length > 0) {
        const { error: logError } = await supabase.from('inventory_logs').insert(logsToInsert);
        if (logError) throw logError;
      }

      setSalesSuccess(true);
      setSelectedProduct('');
      setSalesQty('');
      await fetchDatabaseData();
      setTimeout(() => setSalesSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert("Борлуулалт оруулахад алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };
  // NEW: Гал тогооны зардлыг (spoilage, testing, staff_meal) уншиж импортлогч функц
  const handleBulkKitchenLogsPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitchenPasteText.trim()) return;

    setLoading(true);
    try {
      const rows = kitchenPasteText.trim().split('\n');
      const logsToInsert: any[] = [];

      rows.forEach(row => {
        const cols = row.split('\t');
        if (cols.length >= 4) {
        const rawDate = cols[0];
        const dateVal = parseSafeDate(rawDate);
          
          const rawType = cols[1]?.trim().toLowerCase() || 'spoilage';
          const ingName = cols[2]?.trim();
          const qty = parseFloat(cols[3]?.replace(/,/g, "")) || 0;
          const note = cols[4]?.trim() || "";

          // Гүйлгээний төрлүүдийг өгөгдлийн санд тохируулах
          let dbType = 'spoilage';
          if (rawType.includes('staff') || rawType.includes('хоол')) dbType = 'staff_meal';
          else if (rawType.includes('test') || rawType.includes('турш')) dbType = 'testing';
          else if (rawType.includes('other') || rawType.includes('бусад')) dbType = 'other';

          const ing = ingredients.find(i => cleanNameForMatch(i.name) === cleanNameForMatch(ingName));

          if (ing && qty > 0) {
            logsToInsert.push({
              ingredient_id: ing.id,
              quantity: -Math.abs(qty), // Хаягдал тул үргэлж сөрөг утгаар хасна
              type: dbType,
              notes: note || `${dbType} logged in bulk`,
              date: dateVal
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
      await fetchDatabaseData();
      setTimeout(() => setKitchenImportSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert("Гал тогооны хаягдлыг оруулахад алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
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
                onChange={(e) => setActiveClient(e.target.value as any)}
                className="bg-transparent border-0 text-2xl font-black text-white focus:outline-none focus:ring-0 cursor-pointer p-0"
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
              <button 
                onClick={() => setUserRole('owner')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${userRole === 'owner' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Owner View
              </button>
              <button 
                onClick={() => setUserRole('barista')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${userRole === 'barista' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Barista View
              </button>
            </div>

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
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${activeTab === 'dashboard' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}
            >
              📊 Санхүүгийн Хяналт
            </button>
          )}
          <button 
            onClick={() => setActiveTab('barista')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${activeTab === 'barista' || (userRole === 'barista' && activeTab === 'dashboard') ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}
          >
            ☕ Бариста Портал (Inputs)
          </button>
          {userRole === 'owner' && (
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
              <button 
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 ${activeTab === 'tasks' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}
              >
                📋 Ажлын Даалгавар (Tasks)
              </button>
            </>
          )}
        </div>

        {/* 1. FINANCIAL DASHBOARD TAB */}
        {activeTab === 'dashboard' && userRole === 'owner' && (
          <div>
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
        {activeTab === 'sales' && userRole === 'owner' && (
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
        {activeTab === 'inventory' && userRole === 'owner' && (
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
        {activeTab === 'import' && userRole === 'owner' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
              <div className="flex items-center gap-2 mb-4">
                <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
                <h3 className="text-lg font-bold">Борлуулалт Бөөнөөр Импортлох (Sales Paste)</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Google Sheets-ээс <strong>Бүтээгдэхүүн, Тоо ширхэг, Орлого</strong> гэсэн 3 баганыг хуулаад доор шууд पेस्टэлнэ үү.
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
                Google Sheets-ээс <strong>Барааны нэр, Авсан тоо, Нийт өртөг</strong> гэсэн 3 баганыг хуулаад доор шууд पेस्टэлнэ үү.
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
          </div>
        )}
        {/* TASK MANAGEMENT TAB */}
        {activeTab === 'tasks' && userRole === 'owner' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900 md:col-span-1 h-fit">
              <h3 className="text-lg font-bold mb-4 text-emerald-400">Шинэ даалгавар үүсгэх</h3>
              <form onSubmit={async (e) => {
                e.preventDefault(); setLoading(true);
                await supabase.from('tasks').insert([{ client_id: activeClient, role: newTaskRole, task_name: newTaskName, weight: parseInt(newTaskWeight) || 10 }]);
                setNewTaskName(''); setNewTaskWeight('');
                await fetchDatabaseData(activeClient);
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">Үүрэг (Role)</label>
                  <select value={newTaskRole} onChange={e => setNewTaskRole(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold">
                    <option value="Бариста ☕">Бариста ☕</option>
                    <option value="Тогооч 🍳">Тогооч 🍳</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">Даалгаврын нэр</label>
                  <input type="text" required value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="Жнь: Кофены машин угаах" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">Ачааллын жин (Оноо 1-100)</label>
                  <input type="number" required value={newTaskWeight} onChange={e => setNewTaskWeight(e.target.value)} placeholder="Жнь: 15" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm"/>
                </div>
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl">Даалгавар Нэмэх</button>
              </form>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900 md:col-span-2">
              <h3 className="text-lg font-bold mb-4">Бүртгэлтэй Даалгаврууд</h3>
              <table className="w-full text-left">
                <thead className="text-slate-400 text-xs border-b border-slate-800">
                  <tr><th className="pb-3">Үүрэг</th><th className="pb-3">Нэр</th><th className="pb-3">Ачаалал</th><th className="pb-3 text-right">Үйлдэл</th></tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-800/50">
                  {tasks.filter(t => t.client_id === activeClient).map(t => (
                    <tr key={t.id}>
                      <td className="py-3 text-slate-300">{t.role}</td>
                      <td className="py-3 font-semibold">{t.task_name}</td>
                      <td className="py-3 text-blue-400 font-bold">{t.weight} pts</td>
                      <td className="py-3 text-right">
                        <button onClick={async () => { await supabase.from('tasks').delete().eq('id', t.id); fetchDatabaseData(activeClient); }} className="text-rose-400 text-xs">Устгах</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* NEW: HORIZONTAL SPREADSHEET AUDIT PASTE CONTAINER */}
        {activeTab === 'import' && userRole === 'owner' && (
          <div className="mt-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-900 col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="h-6 w-6 text-teal-400" />
              <h3 className="text-lg font-bold">Агуулахын Тооллого Хэвтээ Импортлох (Horizontal Inventory Audit Paste)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Google Sheets-ээс <strong>Толгой мөр (Ингредиентүүдийн нэрс) болон доорх Тооллогын мөрийг (Date, Type, болон утгууд)</strong> хамт чирж хуулаад доор шууд पेस्टэлнэ үү [3].
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

        {/* NEW: Гал тогооны хаягдал (Kitchen Logs) бөөнөөр хуулах хайрцаг */}
        {activeTab === 'import' && userRole === 'owner' && (
          <div className="mt-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-900 col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="h-6 w-6 text-rose-400" />
              <h3 className="text-lg font-bold">Гал тогооны хаягдал бөөнөөр импортлох (Kitchen Logs Paste)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Google Sheets-ээс <strong>Огноо, Төрөл, Бараа, Хэмжээ, Тайлбар</strong> гэсэн 5 баганыг чирж хуулаад доор шууд पेस्टэлнэ үү [3].
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