"use client";

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Coffee, ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [companyName, setCompanyName] = useState('SF Coffee'); 
  const [signupRole, setSignupRole] = useState<'owner' | 'staff'>('owner');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleAuthAction = async () => {
    if (!email || !password) {
      setErrorMsg("Имэйл болон нууц үгээ оруулна уу.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        // Шинэ бүртгэл
        const cleanBranch = companyName.trim() || 'SF Coffee';
        const cleanName = fullName.trim() || (signupRole === 'owner' ? 'Эзэн' : 'Ажилтан');

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              client_id: cleanBranch, 
              role: signupRole === 'owner' ? 'owner' : 'Ажилтан',
              full_name: cleanName 
            }
          }
        });

        if (error) throw error;

        // Kiosk түгжээг арилгах
        if (typeof window !== 'undefined') {
          try { sessionStorage.removeItem('kiosk_device_locked'); } catch (e) {}
        }

        window.location.href = '/dashboard';

      } else {
        // 🔑 НЭВТРЭХ (SIGN IN)
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });

        if (error) {
          setErrorMsg(`Алдаа: ${error.message}`);
          setLoading(false);
          return;
        }

        if (data.session) {
          // 💡 ХАМГИЙН ЧУХАЛ: Өмнө нь үлдсэн Kiosk-ийн түгжээг хүчээр устгана!
          if (typeof window !== 'undefined') {
            try { 
              sessionStorage.removeItem('kiosk_device_locked'); 
            } catch (e) {}
          }

          // 🚀 useRouter биш, цэвэр шилжилт хийнэ (Safari болон бүх хөтөч дээр шууд орно)
          window.location.href = '/dashboard';
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Нэвтрэхэд алдаа гарлаа.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMsg("Нууц үг сэргээх имэйлээ оруулна уу.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/update-password`,
      });
      if (error) throw error;
      setSuccessMsg("Нууц үг сэргээх линкийг имэйл рүү тань илгээлээ.");
    } catch (err: any) {
      setErrorMsg(err.message || "Имэйл илгээж чадсангүй.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/60 p-8 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-md">
        
        <div className="flex flex-col items-center mb-6">
          <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20 mb-3">
            <Coffee className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white">Smart BoH Portal</h2>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider font-bold">Нэвтрэх хэсэг</p>
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

        {/* 💡 Form биш шууд div байлгаснаар URL хэзээ ч /login? болж дахин ачааллахгүй */}
        <div className="space-y-4">
          
          {isSignUp && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Үүрэг</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSignupRole('owner')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${signupRole === 'owner' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-950 border border-slate-800 text-slate-400'}`}
                  >
                    👑 Эзэн
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupRole('staff')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${signupRole === 'staff' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-950 border border-slate-800 text-slate-400'}`}
                  >
                    👷 Ажилтан
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Нэр</label>
                <input 
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Жишээ: Бат"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Имэйл хаяг</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold"
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Нууц үг</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {!isSignUp && (
                <div className="text-right mt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-slate-500 hover:text-slate-400 text-xs font-medium"
                  >
                    Нууц үгээ мартсан уу?
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 💡 type="button" болгосноор хуудас хэзээ ч дахин ачааллахгүй */}
          <button 
            type="button"
            onClick={isForgotPassword ? handleForgotPassword : handleAuthAction}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-xl transition text-sm shadow-lg mt-2 cursor-pointer"
          >
            {loading ? "Шалгаж байна..." : isForgotPassword ? "Сэргээх холбоос илгээх" : isSignUp ? "Бүртгүүлэх" : "Нэвтэрч Орох"}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
          {isForgotPassword ? (
            <button 
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-emerald-400 hover:text-emerald-300 text-xs font-bold"
            >
              ← Буцах (Нэвтрэх хэсэг рүү)
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-emerald-400 hover:text-emerald-300 text-xs font-bold"
            >
              {isSignUp ? "Бүртгэлтэй юу? Нэвтэрч орох" : "Шинэ хэрэглэгч үү? Бүртгүүлэх"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}