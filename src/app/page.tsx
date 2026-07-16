"use client";

import React, { useState, useEffect } from 'react';
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
  Undo2
} from 'lucide-react';

// ==========================================
// PASTE YOUR SUPABASE CREDENTIALS HERE
// ==========================================
const SUPABASE_URL = "https://fcpwvualdbuakrwmqgmg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjcHd2dWFsZGJ1YWtyd21xZ21nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE4MDQzOCwiZXhwIjoyMDk5NzU2NDM4fQ.iDX_3sL-Sk1Z5oK2zSvW32saZBoY5f5f4XBu_dTQA-U";

// FIXED: Defined outside the component to prevent multiple instances warning
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Home() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'barista' | 'sales'>('dashboard');

  // Database States
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);
  const [isLive, setIsLive] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Barista Input Form States
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [logType, setLogType] = useState('spoilage');
  const [logQty, setLogQty] = useState('');
  const [logNote, setLogNote] = useState('');
  const [lastLogId, setLastLogId] = useState<string | null>(null);
  const [lastLogDetails, setLastLogDetails] = useState<string | null>(null);
  const [logSuccess, setLogSuccess] = useState(false);

  // Sales Simulation Form States
  const [selectedProduct, setSelectedProduct] = useState('');
  const [salesQty, setSalesQty] = useState('');
  const [salesSuccess, setSalesSuccess] = useState(false);

  // June 2026 Demo Data
  const demoStats = {
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
  };

  const demoWasters = [
    { name: "Mango fruit fr.s.", unit: "ml", impact: 14924, notes: "Бүртгэлгүй алдагдал" },
    { name: "Calpis Water", unit: "ш", impact: 14000, notes: "Зөрүү 4ш илүүдэл" },
    { name: "Eggs (Өндөг)", unit: "ш", impact: 10660, notes: "Муудаж хаягдсан, оройн хоолонд" }
  ];

  const demoProducts = [
    { name: "Tiramisu", sold: 62, profit: 369489, cost: 5940.5, price: 11900 },
    { name: "Caffe Latte", sold: 34, profit: 237320, cost: 2520, price: 9500 },
    { name: "Americano", sold: 23, profit: 152720, cost: 1360, price: 8000 }
  ];

  // Fetch Database Data on Mount
  const fetchDatabaseData = async () => {
    try {
      const { data: ingData } = await supabase.from('ingredients').select('*').order('name', { ascending: true });
      const { data: recData } = await supabase.from('recipes').select('*');
      
      if (ingData) setIngredients(ingData);
      if (recData) {
        setRecipes(recData);
        // Extract unique product names from the recipe table
        const products = Array.from(new Set(recData.map((r: any) => r.product_name)));
        setUniqueProducts(products as string[]);
      }
    } catch (err) {
      console.error("Error fetching database:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDatabaseData();
  }, []);

  // Handle Barista Spoilage/Purchase Log Submission
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredientId || !logQty) return;

    setLoading(true);
    const ingredient = ingredients.find(i => i.id === selectedIngredientId);
    const parsedQty = parseFloat(logQty);
    
    // Force negative quantity for waste categories, positive for purchases
    const finalQty = (logType === 'purchase' || logType === 'count') ? Math.abs(parsedQty) : -Math.abs(parsedQty);

    try {
      const { data: logData, error } = await supabase
        .from('inventory_logs')
        .insert([
          { 
            ingredient_id: selectedIngredientId, 
            quantity: finalQty, 
            type: logType, 
            notes: logNote || `${logType} logged manually via system` 
          }
        ])
        .select()
        .single();

      if (error) throw error;

      if (logData) {
        setLastLogId(logData.id);
        setLastLogDetails(`${ingredient.name}: ${Math.abs(finalQty)} ${ingredient.unit} (${logType})`);
        setLogSuccess(true);
        setSelectedIngredientId('');
        setLogQty('');
        setLogNote('');
        
        // Refresh local stock view
        await fetchDatabaseData();
        
        // Hide success message after 4 seconds
        setTimeout(() => setLogSuccess(false), 4000);
      }
    } catch (err) {
      console.error("Error logging transaction:", err);
      alert("Бүртгэл хийхэд алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Undo Last Log Entry
  const handleUndoLog = async () => {
    if (!lastLogId) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('inventory_logs')
        .delete()
        .eq('id', lastLogId);

      if (error) throw error;

      setLastLogId(null);
      setLastLogDetails(null);
      await fetchDatabaseData();
      alert("Бүртгэл амжилттай цуцлагдлаа (Үлдэгдэл сэргэсэн)!");
    } catch (err) {
      console.error("Error undoing log:", err);
      alert("Цуцлахад алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Sales Simulation (Deducts all recipe ingredients)
  const handleSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !salesQty) return;

    setLoading(true);
    const qtySold = parseInt(salesQty);
    const productRecipes = recipes.filter(r => r.product_name === selectedProduct);

    if (productRecipes.length === 0) {
      alert("Энэ бүтээгдэхүүний жор олдсонгүй!");
      setLoading(false);
      return;
    }

    try {
      const logsToInsert = productRecipes.map(recipe => {
        const totalDeduction = -(recipe.amount * qtySold); // Negative to deduct stock
        return {
          ingredient_id: recipe.ingredient_id,
          quantity: totalDeduction,
          type: 'sale',
          notes: `Борлуулалт: ${qtySold}ш ${selectedProduct}`
        };
      });

      const { error } = await supabase
        .from('inventory_logs')
        .insert(logsToInsert);

      if (error) throw error;

      setSalesSuccess(true);
      setSelectedProduct('');
      setSalesQty('');
      await fetchDatabaseData();
      
      setTimeout(() => setSalesSuccess(false), 4000);
    } catch (err) {
      console.error("Error processing sales:", err);
      alert("Борлуулалт тооцоход алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate Low Stock Alerts
  const lowStockItems = ingredients.filter(i => parseFloat(i.current_stock) <= 50);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <p className="text-emerald-400 font-semibold text-lg animate-pulse">Ачаалж байна...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500/20" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <Coffee className="h-8 w-8 text-emerald-400" />
              <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                SF COFFEE OPERATING SYSTEM
              </h1>
            </div>
            <p className="text-slate-400 mt-1.5 text-sm md:text-base">Ухаалаг хиймэл оюун ухаанд суурилсан ресторан хяналтын самбар</p>
          </div>

          {/* Database Mode Toggles */}
          <div className="flex items-center gap-3 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
            <button 
              onClick={() => setIsLive(false)}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 ${!isLive ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Demo Mode
            </button>
            <button 
              onClick={() => setIsLive(true)}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 ${isLive ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <Database className="h-4 w-4" />
              Live Database
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-900 pb-4 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}
          >
            📊 Санхүүгийн Хяналт
          </button>
          <button 
            onClick={() => setActiveTab('barista')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 whitespace-nowrap ${activeTab === 'barista' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}
          >
            ☕ Бариста Портал (Inputs)
          </button>
          <button 
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 whitespace-nowrap ${activeTab === 'sales' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}
          >
            📈 Борлуулалт Оруулах
          </button>
        </div>

        {/* 1. FINANCIAL DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
                <div className="flex justify-between items-center text-slate-400 mb-4">
                  <span className="text-sm font-medium">Нийт Орлого (Revenue)</span>
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="text-2xl md:text-3xl font-extrabold text-white">
                  {isLive ? "0₮" : `${demoStats.revenue.toLocaleString()}₮`}
                </p>
              </div>

              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
                <div className="flex justify-between items-center text-slate-400 mb-4">
                  <span className="text-sm font-medium">Бодит өртөг (COGS)</span>
                  <Layers className="h-5 w-5 text-blue-400" />
                </div>
                <p className="text-2xl md:text-3xl font-extrabold text-white">
                  {isLive ? "0₮" : `${demoStats.actualCogs.toLocaleString()}₮`}
                </p>
              </div>

              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
                <div className="flex justify-between items-center text-slate-400 mb-4">
                  <span className="text-sm font-medium">Бохир ашиг</span>
                  <Percent className="h-5 w-5 text-teal-400" />
                </div>
                <p className="text-2xl md:text-3xl font-extrabold text-emerald-400">
                  {isLive ? "0%" : demoStats.grossMargin}
                </p>
              </div>

              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-900">
                <div className="flex justify-between items-center text-slate-400 mb-4">
                  <span className="text-sm font-medium">Ажлын Бүтээмж</span>
                  <Activity className="h-5 w-5 text-indigo-400" />
                </div>
                <p className="text-2xl md:text-3xl font-extrabold text-blue-400">
                  {isLive ? "100%" : demoStats.efficiency}
                </p>
              </div>
            </div>

            {/* Bottom Analysis Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-900 lg:col-span-2">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  Бизнес Моделийн дүн шинжилгээ
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-slate-900 pb-3.5">
                    <span className="text-slate-400">Сар бүрийн OPEX (Түрээс, Цалин, Тог)</span>
                    <span className="font-semibold text-white">{isLive ? "0₮" : `${demoStats.opex.toLocaleString()}₮`}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-3.5">
                    <span className="text-slate-400">Татварын өмнөх ашиг (EBIT)</span>
                    <span className="font-semibold text-rose-400">{isLive ? "0₮" : `${demoStats.ebit.toLocaleString()}₮`}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-slate-300 font-extrabold text-base">ЦЭВЭР АШИГ (Net Profit)</span>
                    <div className="text-right">
                      <span className="text-xl font-black text-rose-400">{isLive ? "0₮" : `${demoStats.netProfit.toLocaleString()}₮`}</span>
                      <span className="text-xs text-slate-500 block mt-1">Маржин: {isLive ? "0%" : demoStats.netMargin}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-900">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-rose-400">
                  <Trash2 className="h-5 w-5" />
                  Топ Хаягдал (Тайлагнаагүй)
                </h3>
                <div className="space-y-5">
                  {isLive ? (
                    <p className="text-sm text-slate-500 italic text-center py-8">Хаягдал бүртгэгдээгүй байна.</p>
                  ) : (
                    demoWasters.map((w, idx) => (
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
                <div>
                  <label className="block text-slate-400 text-sm font-bold mb-2">1. Түүхий эд сонгох</label>
                  <select 
                    value={selectedIngredientId}
                    onChange={(e) => setSelectedIngredientId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                  >
                    <option value="">-- Сонгох --</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-400 text-sm font-bold mb-2">2. Төрөл</label>
                    <select 
                      value={logType}
                      onChange={(e) => setLogType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                    >
                      <option value="spoilage">Муудаж хаягдсан (Spoilage)</option>
                      <option value="purchase">Шинэ худалдан авалт (Purchase)</option>
                      <option value="testing">Түүхий эдийн туршилт (Testing)</option>
                      <option value="staff_meal">Ажилтны хоол (Staff Meal)</option>
                    </select>
                  </div>

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

                <div>
                  <label className="block text-slate-400 text-sm font-bold mb-2">4. Тэмдэглэл / Тайлбар</label>
                  <input 
                    type="text" 
                    value={logNote}
                    onChange={(e) => setLogNote(e.target.value)}
                    placeholder="Жишээ нь: Асгарч муудсан, оройн хоолны өндөг гэх мэт"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition duration-150 text-sm"
                >
                  {loading ? "Бүртгэж байна..." : "Базарт бүртгэх"}
                </button>
              </form>
            </div>

            {/* Quick Actions / Recent Logs */}
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

        {/* Live Database Inventory Table (Visible across all tabs) */}
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

      </div>
    </div>
  );
}