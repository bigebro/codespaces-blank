"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Lock, ArrowRight } from "lucide-react";
import { supabaseMaster } from "@/lib/supabaseMaster";

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
      const { data, error: authError } =
        await supabaseMaster.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

      if (authError || !data.user) {
        throw new Error("Имэйл эсвэл нууц үг буруу байна!");
      }

      // Админ мөн эсэхийг шалгах
      const { data: isAdmin } = await supabaseMaster.rpc("is_master_admin");

      if (!isAdmin) {
        await supabaseMaster.auth.signOut();
        throw new Error(
          "⛔ Хандалт хориотой: Зөвхөн платформ эзэмшигч нэвтрэх эрхтэй!",
        );
      }

      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Нэвтрэхэд алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900/60 p-8 rounded-3xl border border-zinc-800 shadow-2xl text-center space-y-6">
        <div className="bg-zinc-800/60 p-4 rounded-2xl border border-zinc-700/20 w-fit mx-auto ">
          <ShieldCheck className="h-8 w-8 text-zinc-200" />
        </div>

        <div>
          <h2 className="text-xl font-black text-white">Master Admin Portal</h2>
          <p className="text-xs text-zinc-400 mt-1">
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
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Админ Имэйл
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bigeservice@gmail.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-zinc-700 font-medium"
              />
              <Mail className="h-4 w-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Нууц үг
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-zinc-700 font-medium"
              />
              <Lock className="h-4 w-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-black py-3 rounded-xl text-xs transition shadow-lg cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            {loading ? "Шалгаж байна..." : "НЭВТРЭХ"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-xs text-zinc-500 hover:text-zinc-300 font-bold"
          >
            ← Нүүр хуудас руу буцах
          </button>
        </div>
      </div>
    </div>
  );
}
