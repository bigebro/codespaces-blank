"use client";
import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coffee, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';


function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
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
        password: password
      });

      if (error) throw error;
      setSuccessMsg("Нууц үг амжилттай солигдлоо! Та нэвтэрч орно уу.");
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Нууц үг солиход алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/40 p-8 rounded-2xl border border-slate-900 shadow-2xl backdrop-blur-md">
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20 mb-3">
            <Coffee className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white">Шинэ Нууц Үг Тохируулах</h2>
          <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider font-bold">Secure Password Reset</p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-6 flex items-start gap-2.5">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-6 flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold leading-relaxed">{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-5">
          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Шинэ нууц үг</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Шинэ нууц үгээ бичнэ үү"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold transition"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-xl transition duration-150 text-sm shadow-lg mt-4"
          >
            {loading ? "Хадгалж байна..." : "Нууц Үг Шинэчлэх"}
          </button>
        </form>

      </div>
    </div>
  );
}

const UpdatePasswordPageExport = dynamic(() => Promise.resolve(UpdatePasswordPage), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-950" suppressHydrationWarning={true}>
      <p className="text-emerald-400 font-semibold text-lg animate-pulse" suppressHydrationWarning={true}>Уншиж байна...</p>
    </div>
  )
});

export default UpdatePasswordPageExport;