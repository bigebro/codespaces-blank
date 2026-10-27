"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabaseMaster } from "@/lib/supabaseMaster";
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
      const {
        data: { session },
      } = await supabaseMaster.auth.getSession();
      if (!session) {
        router.replace("/master-login");
        return;
      }

      const { data: isAdmin } = await supabaseMaster.rpc("is_master_admin");
      if (!isAdmin) {
        alert("Зөвхөн платформын эзэн хандах эрхтэй!");
        await supabaseMaster.auth.signOut();
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
    const { data, error } = await supabaseMaster
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

    // 🔔 REALTIME СУВАГ: Шинэ төлбөр ирмэгц шууд дэлгэцэнд орж ирнэ
    const channel = supabaseMaster
      .channel("payment_alerts_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "payment_requests" },
        (payload) => {
          try {
            const audio = new Audio(
              "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
            );
            audio.play();
          } catch (e) {}

          setRequests((prev) => [payload.new, ...prev]);
          alert(`🔔 Шинэ хүсэлт ирлээ: ${payload.new.client_id}`);
        },
      )
      .subscribe();

    return () => {
      supabaseMaster.removeChannel(channel);
    };
  }, [checkAdmin, fetchRequests]);

  //  БАТЛАХ ҮЙЛДЭЛ (Approve - БҮРЭН ШАЛГАЛТТАЙ)
  const handleApprove = async (req: any) => {
    if (
      !confirm(
        `"${req.client_id}"-ийн ${Number(req.amount).toLocaleString()}₮ төлбөрийг баталгаажуулах уу?`,
      )
    )
      return;

    setLoading(true);

    // 1. Тухайн дэлгүүрийн одоогийн эрхийг татах
    const { data: tenant } = await supabaseMaster
      .from("tenants")
      .select("subscription_end_date, plan, status, feature_flags")
      .ilike("client_id", req.client_id.trim())
      .maybeSingle();

  const monthsToAdd = req.billing_cycle === "yearly" ? 12 : 1;
let baseDate = new Date(); // 👈 Defaults to TODAY

// ⚡ Only stack time if they are ALREADY a paid active customer extending their subscription.
// If they were on a trial, the trial is replaced immediately and paid time starts TODAY.
if (
  tenant?.status === "active" && 
  tenant?.subscription_end_date && 
  new Date(tenant.subscription_end_date) > new Date()
) {
  baseDate = new Date(tenant.subscription_end_date);
}

baseDate.setMonth(baseDate.getMonth() + monthsToAdd);

    // ⚡ ШИНЭ: Одоо байгаа тохиргоонуудыг устгалгүйгээр модал харуулах тушаалыг нэмэх
    const currentFlags = tenant?.feature_flags || {};
    const newFlags = { ...currentFlags, show_success_modal: true };

    // 2. Tenants хүснэгтийн эрхийг шинэчлэх
    const { error: tenantErr } = await supabaseMaster
      .from("tenants")
      .update({
        plan: req.plan,
        status: "active",
        subscription_end_date: baseDate.toISOString(),
        feature_flags: newFlags,
      })
      .ilike("client_id", req.client_id.trim());

    if (tenantErr) {
      alert("Байгууллагын эрх сунгахад алдаа гарлаа: " + tenantErr.message);
      setLoading(false);
      return;
    }

    // 3. Payment_requests хүснэгтийн төлөвийг APPROVED болгох (Алдааг заавал шалгана!)
    const { error: reqErr } = await supabaseMaster
      .from("payment_requests")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", req.id);

    if (reqErr) {
      alert("Төлбөрийн хүсэлтийн төлөв өөрчлөхөд алдаа: " + reqErr.message);
      setLoading(false);
      return;
    }

    alert(
      `Амжилттай баталлаа! "${req.client_id}"-ийн эрх ${baseDate.toLocaleDateString("mn-MN")} хүртэл сунгагдлаа.`,
    );
    await fetchRequests();
    // Dashboard руу шууд дохио буудах (Broadcast)
    const channelName = `shop-updates-${req.client_id.trim().replace(/\s+/g, "_")}`;
    const broadcastChannel = supabaseMaster.channel(channelName);

    broadcastChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await broadcastChannel.send({
          type: "broadcast",
          event: "payment_approved",
          payload: { message: "approved" },
        });
        // Дохиог илгээгээд сувгийг хаана
        setTimeout(() => supabaseMaster.removeChannel(broadcastChannel), 500);
      }
    });
  };

  // ЦУЦЛАХ ҮЙЛДЭЛ (Reject)
  const handleReject = async (req: any) => {
    const reason = prompt(
      "Цуцлах шалтгаанаа бичнэ үү (Жишээ нь: Дансанд мөнгө ороогүй):",
    );
    if (reason === null) return;

    setLoading(true);
    const { error: reqErr } = await supabaseMaster
      .from("payment_requests")
      .update({
        status: "rejected",
        notes: reason || "Мөнгө дансанд ороогүй",
      })
      .eq("id", req.id);

    if (reqErr) {
      alert("Цуцлахад алдаа гарлаа: " + reqErr.message);
    } else {
      alert("Хүсэлтийг цуцаллаа.");
    }
    await fetchRequests();
  };

  // 🚪 ГАРАХ ҮЙЛДЭЛ
  const handleLogout = async () => {
    await supabaseMaster.auth.signOut();
    router.replace("/master-login");
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <div className="h-8 w-8 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold tracking-wider uppercase">
          Админ эрхийг шалгаж байна...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ТОЛГОЙ ХЭСЭГ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              👑 Operlink Master Admin
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Бүх салбарын төлбөр, эрхийг удирдах төв
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-zinc-800/60 border border-zinc-700/20 px-4 py-2 rounded-xl flex items-center gap-2">
              <Bell className="h-5 w-5 text-zinc-200 " />
              <span className="font-bold text-zinc-200">
                Хүлээгдэж буй:{" "}
                {requests.filter((r) => r.status === "pending").length}
              </span>
            </div>

            <button
              onClick={fetchRequests}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition cursor-pointer"
              title="Шинэчлэх"
            >
              <RefreshCw
                className={`h-4 w-4 text-zinc-300 ${loading ? "animate-spin text-zinc-200" : ""}`}
              />
            </button>

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
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 border-b border-zinc-800">
                <tr className="text-xs uppercase font-black text-zinc-400">
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
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-zinc-500">
                      Уншиж байна...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-zinc-500">
                      Одоогоор төлбөрийн хүсэлт байхгүй байна.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-zinc-800/30 transition"
                    >
                      <td className="p-4 text-xs text-zinc-400 font-mono">
                        {new Date(req.created_at).toLocaleString("mn-MN")}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white text-base">
                          {req.client_id}
                        </div>
                        <div className="text-xs text-zinc-400 font-mono mt-0.5">
                          📞 {req.phone_number}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="bg-zinc-800 text-zinc-200 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider">
                          {req.plan} (
                          {req.billing_cycle === "yearly"
                            ? "1 Жил"
                            : req.billing_cycle === "upgrade"
                              ? "Ахиулах"
                              : "1 Сар"}
                          )
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-white font-mono text-lg">
                        {Number(req.amount).toLocaleString()} ₮
                      </td>
                      <td className="p-4 text-center">
                        {req.status === "pending" && (
                          <span className="text-zinc-300 bg-zinc-800/60 border border-amber-500/20 px-2 py-1 rounded text-xs font-bold ">
                            Хүлээгдэж буй ⏳
                          </span>
                        )}
                        {req.status === "approved" && (
                          <span className="text-zinc-200 bg-zinc-800/60 border border-zinc-700/20 px-2 py-1 rounded text-xs font-bold">
                            Батлагдсан
                          </span>
                        )}
                        {req.status === "rejected" && (
                          <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded text-xs font-bold">
                            Цуцлагдсан ❌
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {req.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReject(req)}
                              className="bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="h-4 w-4" /> Цуцлах
                            </button>
                            <button
                              onClick={() => handleApprove(req)}
                              className="bg-white hover:bg-zinc-200 text-zinc-950 px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-lg active:scale-95 cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4" /> БАТЛАХ
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500 font-bold">
                            {req.notes || "Шийдэгдсэн"}
                          </span>
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
