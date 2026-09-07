"use client";

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Coffee, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // 🔑 НЭВТРЭХ ҮЙЛДЭЛ (Console болон Дэлгэц дээр алдааг шууд гаргана)
  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setErrorMsg("Имэйл болон нууц үгээ бүрэн бичнэ үү.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        setErrorMsg(`Нэвтрэх алдаа: ${error.message}`);
        setLoading(false);
        return;
      }

      if (data.session) {
        // Түгжээг арилгаад шууд Dashboard руу орно
        if (typeof window !== 'undefined') {
          try { sessionStorage.removeItem('kiosk_device_locked'); } catch (e) {}
        }
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Алдаа гарлаа.");
      setLoading(false);
    }
  };

  // 📩 НУУЦ ҮГ СЭРГЭЭХ
  const handleResetPassword = async () => {
    if (!email.trim()) {
      setErrorMsg("Имэйл хаягаа оруулна уу.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/update-password`,
      });
      if (error) throw error;
      setSuccessMsg("Нууц үг сэргээх холбоосыг имэйл рүү илгээлээ.");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d1527] p-8 rounded-3xl border border-slate-800 shadow-2xl">
        
        <div className="flex flex-col items-center mb-6">
          <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20 mb-3">
            <Coffee className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white">Smart BoH Portal</h2>
          <p className="text-slate-400 text-xs mt-1 uppercase font-bold">Нэвтрэх хэсэг</p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-4 flex items-start gap-2.5 text-xs font-bold">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-4 flex items-start gap-2.5 text-xs font-bold">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>{successMsg}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Имэйл хаяг</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none text-sm font-semibold"
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Нууц үг</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none text-sm font-semibold"
              />
              <div className="text-right mt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setErrorMsg(null);
                  }}
                  className="text-slate-400 hover:text-emerald-400 text-xs font-medium py-1 cursor-pointer"
                >
                  Нууц үгээ мартсан уу?
                </button>
              </div>
            </div>
          )}

          {/* 🔘 ТОВЧЛУУР ДАРАГДАХАД БҮХ ЗҮЙЛИЙГ ШУУД ХАРУУЛНА */}
          <button 
            type="button"
            onClick={isForgotPassword ? handleResetPassword : handleSignIn}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black py-3.5 rounded-xl transition text-sm shadow-lg mt-2 cursor-pointer"
          >
            {loading ? "Шалгаж байна..." : isForgotPassword ? "Сэргээх холбоос илгээх" : "Нэвтэрч Орох"}
          </button>

          {isForgotPassword && (
            <button 
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setErrorMsg(null);
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-2 cursor-pointer"
            >
              ← Буцах (Нэвтрэх хэсэг рүү)
            </button>
          )}
        </div>

      </div>
    </div>
  );
}