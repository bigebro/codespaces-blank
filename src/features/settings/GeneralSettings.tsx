// src/features/settings/GeneralSettings.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Coffee,
  CupSoda,
  Utensils,
  Croissant,
  Package,
  Archive,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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

const DEFAULT_GLOBAL_MARGINS: Record<string, number> = {
  HOT_BEVERAGE: 82,
  COLD_BEVERAGE: 78,
  FOOD_PREP: 68,
  BAKERY_DESSERT: 75,
  RETAIL_FMCG: 50,
  GENERAL: 70,
};

export default function GeneralSettings({
  activeClient,
}: {
  activeClient: string;
}) {
  const [initialCash, setInitialCash] = useState("0");
  const [initialBank, setInitialBank] = useState("0");
  const [taxMode, setTaxMode] = useState("auto");
  const [kioskLogoUrl, setKioskLogoUrl] = useState<string | null>(null);
  const [categoryMargins, setCategoryMargins] = useState<
    Record<string, number>
  >(DEFAULT_GLOBAL_MARGINS);
  const [fixedAssets, setFixedAssets] = useState<any[]>([]);
  const [fixedOpexList, setFixedOpexList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // OPEX-ын төлөвүүд
  const [newOpexName, setNewOpexName] = useState("");
  const [newOpexCost, setNewOpexCost] = useState("");
  const newOpexCategory = "Байр, ашиглалт";
  // Үндсэн хөрөнгийн форм-ын төлөвүүд
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetCost, setNewAssetCost] = useState("");
  const [newAssetMonths, setNewAssetMonths] = useState("60");
  const newAssetDate = new Date().toISOString().split("T")[0];
  // 1. Дата татах
  const fetchData = useCallback(async () => {
    if (!activeClient) return;
    setLoading(true);

    const [{ data: faData }, { data: opData }, { data: settData }] =
      await Promise.all([
        supabase
          .from("fixed_assets")
          .select("*")
          .ilike("client_id", activeClient),
        supabase
          .from("fixed_opex")
          .select("*")
          .ilike("client_id", activeClient)
          .eq("is_active", true),
        supabase
          .from("client_settings")
          .select("*")
          .ilike("client_id", activeClient)
          .maybeSingle(),
      ]);

    if (faData) setFixedAssets(faData);
    if (opData) setFixedOpexList(opData);
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
    setLoading(false);
  }, [activeClient]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  //  Маржингийн бодлого хадгалах
  const handleSaveCategoryMargins = async () => {
    setLoading(true);
    const { error } = await supabase.from("client_settings").upsert(
      {
        client_id: activeClient,
        category_margins: categoryMargins,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" },
    );
    setLoading(false);
    if (error) alert("Алдаа: " + error.message);
    else
      alert(
        "Ангилал тус бүрийн ашгийн маржингийн бодлого амжилттай хадгалагдлаа!",
      );
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. КАСС, БАНК БА ТАТВАРЫН ЭХНИЙ ТОХИРГОО */}
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
          <h3 className="text-base font-bold mb-4 text-zinc-200 flex items-center gap-2">
              Мөнгөн Данс & Татварын Горим
          </h3>

          {/* 🖼️ KIOSK ТӨХӨӨРӨМЖИЙН ЛОГО (Авсаархан, дизайн эвдэхгүй) */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Kiosk таблетын лого
            </label>
            <div className="flex items-center gap-3 bg-zinc-950 p-2 rounded-xl border border-zinc-800 mb-1.5">
              {kioskLogoUrl ? (
                <img
                  src={kioskLogoUrl}
                  alt="Kiosk Logo"
                  className="h-10 w-10 rounded-xl object-cover border border-zinc-700 shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 shrink-0">
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
                    const fileExt = file.name.split(".").pop();
                    const fileName = `logos/${activeClient}_${Date.now()}.${fileExt}`;

                    // 1. Storage руу зургийг хуулах
                    const { error: upErr } = await supabase.storage
                      .from("receipts_evidence")
                      .upload(fileName, file, { upsert: true });

                    if (upErr) {
                      alert("Зураг оруулахад алдаа: " + upErr.message);
                      return;
                    }

                    // 2. Storage-аас нийтэд харагдах URL (Public URL) авах
                    const { data: publicUrlData } = supabase.storage
                      .from("receipts_evidence")
                      .getPublicUrl(fileName);

                    const newLogoUrl = publicUrlData.publicUrl;

                    // 3. ⚡ ШУУД БААЗАД ХАДГАЛАХ (Үлдэгдэл товч дарахыг хүлээхгүй!)
                    const { error: dbErr } = await supabase
                      .from("client_settings")
                      .update({
                        logo_url: newLogoUrl,
                        updated_at: new Date().toISOString(),
                      })
                      .eq("client_id", activeClient);

                    if (dbErr) {
                      alert("Баазад хадгалахад алдаа гарлаа: " + dbErr.message);
                    } else {
                      setKioskLogoUrl(newLogoUrl); // Дэлгэц дээрх зургийг тэр дор нь солих
                      alert(
                        "Лого амжилттай солигдлоо! Kiosk дээр шууд харагдана.",
                      );
                      fetchData();
                    }
                  }}
                />
                <label
                  htmlFor="kiosk-logo-upload"
                  className="inline-block bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold py-1 px-2.5 rounded-lg cursor-pointer transition border border-zinc-700"
                >
                  Зураг солих
                </label>
                <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                  Зөвхөн Kiosk таблет дээр харагдана
                </p>
              </div>
            </div>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              const { error } = await supabase.from("client_settings").upsert({
                client_id: activeClient,
                initial_cash: parseFloat(initialCash) || 0,
                initial_bank: parseFloat(initialBank) || 0,
                tax_mode: taxMode,
                logo_url: kioskLogoUrl,
                updated_at: new Date().toISOString(),
              });
              if (error) alert(`Алдаа: ${error.message}`);
              else alert("Салбарын эхний үлдэгдэл амжилттай хадгалагдлаа!");
              await fetchData();
              setLoading(false);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-1">
                Кассын эхний бэлэн мөнгө (₮)
              </label>
              <input
                type="number"
                value={initialCash}
                onChange={(e) => setInitialCash(e.target.value)}
                placeholder="Жнь: 200000"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-1">
                Банкны дансны эхний үлдэгдэл (₮)
              </label>
              <input
                type="number"
                value={initialBank}
                onChange={(e) => setInitialBank(e.target.value)}
                placeholder="Жнь: 5000000"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-1">
                Татварын тооцоолох горим
              </label>
              <select
                value={taxMode}
                onChange={(e) => setTaxMode(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 text-sm font-bold"
              >
                <option value="auto">
                  Автомат (300 сая хүртэл 1%, давбал 10%)
                </option>
                <option value="simplified_1pct">
                  Зөвхөн Хялбаршуулсан 1% (Орлогоос)
                </option>
                <option value="standard_10pct">
                  Энгийн 10% (Цэвэр ашгаас + НӨАТ)
                </option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold py-3 rounded-xl transition text-sm"
            >
              Үлдэгдэл Хадгалах
            </button>
          </form>
        </div>

        {/* 2. ТОГТМОЛ ЗАРДАЛ (OPEX) НЭМЭХ/УСТГАХ */}
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 lg:col-span-2">
          <h3 className="text-base font-bold mb-4 text-zinc-300 flex items-center gap-2">
             Сар бүрийн Тогтмол Зардал (Түрээс, Тог, Агааржуулалт, Хий)
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
              await fetchData();
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
              className="sm:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white font-bold"
            />
            <input
              type="number"
              required
              value={newOpexCost}
              onChange={(e) => setNewOpexCost(e.target.value)}
              placeholder="Сарын дүн (₮)"
              className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white font-bold"
            />
            <button
              type="submit"
              className="bg-zinc-200 hover:bg-blue-400 text-zinc-950 font-bold py-2 rounded-xl text-sm"
            >
              + Зардал Нэмэх
            </button>
          </form>

          <div className="overflow-x-auto max-h-[220px]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-zinc-400 border-b border-zinc-800">
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
                      className="py-4 text-center text-zinc-500 italic"
                    >
                      Тогтмол зардал оруулаагүй байна (Түрээс, тог г.м нэмнэ
                      үү).
                    </td>
                  </tr>
                ) : (
                  fixedOpexList.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 font-bold text-zinc-200">
                        {item.name}
                      </td>
                      <td className="py-2.5 text-right font-black text-zinc-100">
                        {parseFloat(item.monthly_cost).toLocaleString()} ₮
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={async () => {
                            await supabase
                              .from("fixed_opex")
                              .delete()
                              .eq("id", item.id);
                            fetchData();
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
      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
        <h3 className="text-base font-bold mb-4 text-zinc-300 flex items-center gap-2">
          Үндсэн Хөрөнгө & Тоног Төхөөрөмжийн Бүртгэл (Элэгдэл тооцоо)
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
            fetchData();
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
            className="sm:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white font-bold"
          />
          <input
            type="number"
            required
            value={newAssetCost}
            onChange={(e) => setNewAssetCost(e.target.value)}
            placeholder="Анхны өртөг (₮)"
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white font-bold"
          />
          <input
            type="number"
            value={newAssetMonths}
            onChange={(e) => setNewAssetMonths(e.target.value)}
            placeholder="Ашиглах сар (Жнь: 60)"
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white font-bold"
          />
          <button
            type="submit"
            className="bg-white hover:bg-zinc-200 text-zinc-950 font-bold py-2 rounded-xl text-sm"
          >
            + Хөрөнгө Нэмэх
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
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
                    className="py-6 text-center text-zinc-500 italic"
                  >
                    Бүртгэлтэй үндсэн хөрөнгө байхгүй байна.
                  </td>
                </tr>
              ) : (
                fixedAssets.map((fa) => {
                  const cost = parseFloat(fa.initial_cost) || 0;
                  const months = parseInt(fa.useful_months) || 60;
                  const monthly = months > 0 ? Math.round(cost / months) : 0;
                  return (
                    <tr key={fa.id}>
                      <td className="py-2.5 font-bold text-zinc-200">
                        {fa.name}
                      </td>
                      <td className="py-2.5 text-right text-zinc-300">
                        {cost.toLocaleString()} ₮
                      </td>
                      <td className="py-2.5 text-center text-zinc-400">
                        {months} сар ({(months / 12).toFixed(1)} жил)
                      </td>
                      <td className="py-2.5 text-right font-black text-zinc-300">
                        {monthly.toLocaleString()} ₮/сар
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={async () => {
                            await supabase
                              .from("fixed_assets")
                              .delete()
                              .eq("id", fa.id);
                            fetchData();
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

      {/* 4. АНГИЛЛЫН АШГИЙН МАРЖИНГИЙН БОДЛОГО (TARGET MARGINS) */}
      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-black text-zinc-300 flex items-center gap-2">
              <span>
                 Ангиллын Ашгийн Маржингийн Бодлого (Target Margins)
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Ангилал тус бүрийн хүрэх ёстой зорилтот бохир ашгийн % (Gross
              Margin). Түүхий эд өсөхөд систем энэ хувиар автоматаар зөвлөх
              зарах үнийг бодно.
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSaveCategoryMargins}
            className="bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-black px-4 py-2.5 rounded-xl text-xs transition active:scale-95 shadow cursor-pointer shrink-0"
          >
            💾 Маржингийн Бодлого Хадгалах
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {UNIVERSAL_CATEGORIES.map((cat) => {
            const currentVal =
              categoryMargins[cat.id] ?? DEFAULT_GLOBAL_MARGINS[cat.id] ?? 70;
            const isCustomized =
              categoryMargins[cat.id] !== undefined &&
              categoryMargins[cat.id] !== DEFAULT_GLOBAL_MARGINS[cat.id];

            return (
              <div
                key={cat.id}
                className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{cat.icon}</span>
                    <span>{cat.name.replace(/^[^\s]+\s/, "")}</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
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
                        setCategoryMargins((prev) => ({
                          ...prev,
                          [cat.id]: val,
                        }));
                      }}
                      className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-400 rounded-xl px-3 py-2 text-sm text-white font-mono font-black outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-300 font-mono">
                      %
                    </span>
                  </div>

                  {isCustomized && (
                    <button
                      type="button"
                      onClick={() =>
                        setCategoryMargins((prev) => ({
                          ...prev,
                          [cat.id]: DEFAULT_GLOBAL_MARGINS[cat.id],
                        }))
                      }
                      className="text-[10px] text-zinc-400 hover:text-white bg-zinc-800 px-2 py-2 rounded-xl border border-zinc-700"
                      title="Стандарт руу буцаах"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-zinc-500 font-mono">
                  Зорилтот өртөг (Food Cost):{" "}
                  <strong>{(100 - currentVal).toFixed(0)}%</strong>
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
