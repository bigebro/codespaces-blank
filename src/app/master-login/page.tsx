"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function MasterLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Supabase-ийн жинхэнэ нууцлалтайгаар нэвтрэнэ (Нууц үг хэзээ ч ил харагдахгүй)
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: email.trim(),
          password: password,
        },
      );

      if (authError || !data.user) {
        throw new Error("Имэйл эсвэл нууц үг буруу байна!");
      }

      // 2. Бэкэнд функцээс "Энэ хүн платформ эзэмшигч мөн үү?" гэж асууна
      const { data: isAdmin } = await supabase.rpc("is_master_admin");

      if (!isAdmin) {
        // Хэрэв таны имэйл биш бол шууд системээс хөөнө
        await supabase.auth.signOut();
        throw new Error("⛔ Хандалт хориотой: Та платформын админ биш байна!");
      }

      // 3. Зөв бол Админ самбар руу оруулна
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Нэвтрэхэд алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900/60 p-8 rounded-3xl border border-slate-800 shadow-2xl text-center space-y-6">
        <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 w-fit mx-auto shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <ShieldCheck className="h-8 w-8 text-emerald-400" />
        </div>

        <div>
          <h2 className="text-xl font-black text-white">Master Admin Portal</h2>
          <p className="text-xs text-slate-400 mt-1">
            Зөвхөн платформын үүсгэн байгуулагчид зориулсан
          </p>
        </div>

        {error && (
          <div className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Hэвтрэх имэйл
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Имэйл"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500 font-medium"
              />
              <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Нууц үг
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500 font-medium"
              />
              <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black py-3 rounded-xl text-xs transition shadow-lg cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            {loading ? "Шалгаж байна..." : "НЭВТРЭХ"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-xs text-slate-500 hover:text-slate-300 font-bold"
          >
            ← Нүүр хуудас руу буцах
          </button>
        </div>
      </div>
    </div>
  );
}
