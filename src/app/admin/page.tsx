"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, XCircle, Bell, RefreshCw, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MasterAdminPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // 1. Эрх шалгах: Зөвхөн админ хүнд л дэлгэцийг нээнэ
  const checkAdmin = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/master-login");
        return;
      }

      // Бэкэндээс зөвхөн таны имэйл мөн эсэхийг асууна
      const { data: isAdmin } = await supabase.rpc("is_master_admin");
      if (!isAdmin) {
        alert("🔒 Зөвхөн платформын эзэн хандах эрхтэй!");
        await supabase.auth.signOut();
        router.replace("/master-login");
        return;
      }

      setIsAuthorized(true);
    } catch (err) {
      router.replace("/master-login");
    }
  }, [router]);

  // 2. Хүсэлтүүдийг татах
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAdmin();
    fetchRequests();

    // 🔔 REALTIME СУВАГ: Шинэ төлбөр ирмэгц дуут дохио дуугарч, alert гарна
    const channel = supabase
      .channel("payment_alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "payment_requests" },
        (payload) => {
          // 🔊 Дуут дохио
          try {
            const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
            audio.play();
          } catch (e) {}

          setRequests((prev) => [payload.new, ...prev]);
          alert(`🔔 Шинэ хүсэлт ирлээ: ${payload.new.client_id}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkAdmin, fetchRequests]);

  // ✅ БАТЛАХ ҮЙЛДЭЛ (Approve)
  const handleApprove = async (req: any) => {
    if (!confirm(`"${req.client_id}"-ийн ${Number(req.amount).toLocaleString()}₮ төлбөрийг баталгаажуулах уу?`)) return;

    // 1. Одоо байгаа өдрүүдийг нь хадгалж сунгах (Алдагдалгүй сунгалт)
    const { data: tenant } = await supabase
      .from("tenants")
      .select("subscription_end_date")
      .eq("client_id", req.client_id)
      .maybeSingle();

    const monthsToAdd = req.billing_cycle === "yearly" ? 12 : 1;
    let baseDate = new Date();
    if (tenant?.subscription_end_date && new Date(tenant.subscription_end_date) > new Date()) {
      baseDate = new Date(tenant.subscription_end_date);
    }
    baseDate.setMonth(baseDate.getMonth() + monthsToAdd);

    // 2. Хэрэглэгчийн Tenant эрхийг нээх & сунгах
    const { error: tenantErr } = await supabase
      .from("tenants")
      .update({
        plan: req.plan,
        status: "active",
        subscription_end_date: baseDate.toISOString()
      })
      .eq("client_id", req.client_id);

    if (tenantErr) {
      alert("Алдаа гарлаа: " + tenantErr.message);
      return;
    }

    // 3. Хүсэлтийн статусыг Approved болгох
    await supabase
      .from("payment_requests")
      .update({
        status: "approved",
        approved_at: new Date().toISOString()
      })
      .eq("id", req.id);

    alert(`✅ Амжилттай баталлаа! ${req.client_id}-ийн эрх ${baseDate.toLocaleDateString("mn-MN")} хүртэл нээгдлээ.`);
    fetchRequests();
  };

  // ❌ ЦУЦЛАХ ҮЙЛДЭЛ (Reject)
  const handleReject = async (req: any) => {
    const reason = prompt("Цуцлах шалтгаанаа бичнэ үү (Жишээ нь: Мөнгө дансанд ороогүй):");
    if (reason === null) return;

    await supabase
      .from("payment_requests")
      .update({
        status: "rejected",
        notes: reason || "Мөнгө дансанд ороогүй"
      })
      .eq("id", req.id);

    alert(`❌ Хүсэлтийг цуцаллаа.`);
    fetchRequests();
  };

  // 🚪 ГАРАХ ҮЙЛДЭЛ (Logout)
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/master-login");
  };

  // 🛡️ Эрх шалгаж байх үед түр харагдах цэвэрхэн дэлгэц
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold tracking-wider uppercase">Админ эрхийг шалгаж байна...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ТОЛГОЙ ХЭСЭГ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              👑 Operlink Master Admin
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Бүх салбарын төлбөр, эрхийг удирдах төв
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-400 animate-pulse" />
              <span className="font-bold text-emerald-400">
                Хүлээгдэж буй: {requests.filter(r => r.status === 'pending').length}
              </span>
            </div>

            {/* Шинэчлэх товч (Дарсан үед эргэлдэж харагдана) */}
            <button 
              onClick={fetchRequests} 
              className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
              title="Шинэчлэх"
            >
              <RefreshCw className={`h-4 w-4 text-slate-300 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            </button>

            {/* Гарах товч */}
            <button 
              onClick={handleLogout} 
              className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition cursor-pointer"
              title="Админаас гарах"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ХҮСНЭГТ */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950 border-b border-slate-800">
                <tr className="text-xs uppercase font-black text-slate-400">
                  <th className="p-4">Огноо</th>
                  <th className="p-4">Байгууллага (Утас)</th>
                  <th className="p-4">Сонгосон Багц</th>
                  <th className="p-4 text-right">Дүн</th>
                  <th className="p-4 text-center">Төлөв</th>
                  <th className="p-4 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm">
                {loading ? (
                  <tr><td colSpan={6} className="text-center p-8 text-slate-500">Уншиж байна...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-8 text-slate-500">Одоогоор төлбөрийн хүсэлт байхгүй байна.</td></tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4 text-xs text-slate-400 font-mono">
                        {new Date(req.created_at).toLocaleString("mn-MN")}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white text-base">{req.client_id}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">📞 {req.phone_number}</div>
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-800 text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider">
                          {req.plan} ({req.billing_cycle === 'yearly' ? '1 Жил' : '1 Сар'})
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-white font-mono text-lg">
                        {Number(req.amount).toLocaleString()} ₮
                      </td>
                      <td className="p-4 text-center">
                        {req.status === 'pending' && <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded text-xs font-bold animate-pulse">Хүлээгдэж буй ⏳</span>}
                        {req.status === 'approved' && <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-xs font-bold">Батлагдсан ✅</span>}
                        {req.status === 'rejected' && <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded text-xs font-bold">Цуцлагдсан ❌</span>}
                      </td>
                      <td className="p-4 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleReject(req)}
                              className="bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="h-4 w-4" /> Цуцлах
                            </button>
                            <button 
                              onClick={() => handleApprove(req)}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-lg active:scale-95 cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4" /> БАТЛАХ
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-bold">{req.notes || 'Шийдэгдсэн'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}