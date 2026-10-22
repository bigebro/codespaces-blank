"use client";
import dynamic from "next/dynamic";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Coffee, ShieldAlert, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Updates the password securely using Supabase Auth [2]
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;
      setSuccessMsg("Нууц үг амжилттай солигдлоо! Та нэвтэрч орно уу.");
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Нууц үг солиход алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900/40 p-8 rounded-2xl border border-zinc-900 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-zinc-800/60 p-3.5 rounded-2xl border border-zinc-700/20 mb-3">
            <Coffee className="h-8 w-8 text-zinc-200" />
          </div>
          <h2 className="text-2xl font-black text-white">
            Шинэ Нууц Үг Тохируулах
          </h2>
          <p className="text-zinc-500 text-xs mt-1 uppercase tracking-wider font-bold">
            Secure Password Reset
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-6 flex items-start gap-2.5">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="bg-zinc-800/60 border border-zinc-700/20 text-zinc-200 p-4 rounded-xl mb-6 flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold leading-relaxed">
              {successMsg}
            </p>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-5">
          <div>
            <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
              Шинэ нууц үг
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Шинэ нууц үгээ бичнэ үү"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-700 text-sm font-semibold transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-black py-3.5 rounded-xl transition duration-150 text-sm shadow-lg mt-4"
          >
            {loading ? "Хадгалж байна..." : "Нууц Үг Шинэчлэх"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Page() {
  return <UpdatePasswordPage />;
}
