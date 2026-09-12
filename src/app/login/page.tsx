"use client";

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react';

// 🚀 THE QUANTUM FORCE & MATTER OPERALINK LOGO
function OperlinkLogo({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <defs>
        <linearGradient id="vectorGrad" x1="56" y1="456" x2="456" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f59b" stopOpacity="0" />
          <stop offset="30%" stopColor="#00f59b" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#00c8ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#00c8ff" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="energyGrad" x1="56" y1="456" x2="456" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f59b" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#00c8ff" />
        </linearGradient>

        <linearGradient id="statorGrad" x1="120" y1="120" x2="392" y2="392" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f59b" />
          <stop offset="30%" stopColor="#005577" />
          <stop offset="70%" stopColor="#005577" />
          <stop offset="100%" stopColor="#00c8ff" />
        </linearGradient>

        <radialGradient id="coreHalo" cx="256" cy="256" r="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="25%" stopColor="#00f59b" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00f59b" stopOpacity="0" />
        </radialGradient>

        <filter id="neonCyan" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#00c8ff" floodOpacity="0.8" />
        </filter>
        <filter id="neonEmerald" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#00f59b" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* 1. OUTER HUD RING */}
      <circle 
        cx="256" 
        cy="256" 
        r="220" 
        stroke="#00c8ff" 
        strokeOpacity="0.2" 
        strokeWidth="2" 
        strokeDasharray="4 12" 
      />
      <circle cx="411.5" cy="411.5" r="4" fill="#00f59b" />
      <circle cx="100.5" cy="411.5" r="4" fill="#00f59b" />
      <circle cx="100.5" cy="100.5" r="4" fill="#00f59b" />
      <circle cx="411.5" cy="100.5" r="4" fill="#00f59b" />

      {/* 2. THE FORCE VECTOR */}
      <line 
        x1="56" 
        y1="456" 
        x2="456" 
        y2="56" 
        stroke="url(#vectorGrad)" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />

      {/* 3. BACK ORBIT */}
      <g transform="rotate(-45 256 256)">
        <path 
          d="M 56 256 A 200 60 0 0 1 456 256" 
          stroke="url(#energyGrad)" 
          strokeWidth="10" 
          strokeOpacity="0.4" 
          strokeLinecap="round" 
          fill="none" 
        />
      </g>

      {/* 4. MATTER STATORS */}
      <g filter="url(#neonEmerald)">
        <path 
          d="M 286.9 351.1 A 100 100 0 0 1 160.9 225.1" 
          stroke="url(#statorGrad)" 
          strokeWidth="28" 
          strokeLinecap="round" 
          fill="none" 
        />
        <path 
          d="M 225.1 160.9 A 100 100 0 0 1 351.1 286.9" 
          stroke="url(#statorGrad)" 
          strokeWidth="28" 
          strokeLinecap="round" 
          fill="none" 
        />
      </g>

      <path 
        d="M 280.9 349.5 A 100 100 0 0 1 162.7 231.3" 
        stroke="#050a12" 
        strokeWidth="4" 
        strokeLinecap="round" 
        fill="none" 
      />
      <path 
        d="M 231.1 162.5 A 100 100 0 0 1 349.3 280.7" 
        stroke="#050a12" 
        strokeWidth="4" 
        strokeLinecap="round" 
        fill="none" 
      />

      {/* 5. FRONT ORBIT */}
      <g transform="rotate(-45 256 256)" filter="url(#neonCyan)">
        <path 
          d="M 456 256 A 200 60 0 0 1 56 256" 
          stroke="url(#energyGrad)" 
          strokeWidth="14" 
          strokeLinecap="round" 
          fill="none" 
        />
      </g>

      {/* 6. QUANTUM CORE */}
      <circle cx="256" cy="256" r="45" fill="url(#coreHalo)" />
      <circle cx="256" cy="256" r="8" fill="#ffffff" filter="url(#neonCyan)" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [companyName, setCompanyName] = useState(''); 
  const [signupRole, setSignupRole] = useState<'owner' | 'staff'>('owner');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMsg("Нууц үг сэргээх имэйлээ оруулна уу.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data: profileExists, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim())
        .maybeSingle();

      if (checkError) throw checkError;

      if (!profileExists) {
        setErrorMsg("Уучлаарай, энэ имэйл хаяг бүртгэлгүй байна. Та зөв имэйл хаягаа оруулна уу.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      setSuccessMsg("Нууц үг сэргээх линкийг имэйл рүү тань илгээлээ.");
    } catch (err: any) {
      setErrorMsg(err.message || "Имэйл илгээж чадсангүй.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const cleanBranch = companyName.trim();

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              client_id: cleanBranch, 
              role: signupRole === 'owner' ? 'owner' : 'Ажилтан',
              full_name: fullName.trim() 
            }
          }
        });
        if (error) throw error;
        
        if (data.user && data.user.identities?.length === 0) {
          setErrorMsg("Бүртгэлтэй имэйл хаяг байна. Нэвтэрч орно уу.");
        } else {
          setSuccessMsg("Амжилттай бүртгэгдлээ! Та нэвтэрч орно уу.");
          setIsSignUp(false);
          setPassword('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Үйлдэл амжилтгүй боллоо.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/40 p-8 rounded-2xl border border-slate-900 shadow-2xl backdrop-blur-md">
        
        {/* ТОМОРСОН ЛОГО БА ЦЭВЭРХЭН ГАРЧИГ (Дэд тайлбаргүй) */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 mb-4 flex items-center justify-center shadow-[0_0_25px_rgba(0,245,155,0.2)]">
            <OperlinkLogo className="h-12 w-12" />
          </div>
          
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isForgotPassword 
              ? "Нууц үг сэргээх" 
              : isSignUp 
              ? "Шинэ Бүртгэл Үүсгэх" 
              : "Operlink Workspace"}
          </h2>
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Имэйл хаяг</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold transition"
            />
          </div>

          {isSignUp && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Би хэн бэ?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSignupRole('owner')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${signupRole === 'owner' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    👑 Бизнес эрхлэгч
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupRole('staff')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${signupRole === 'staff' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    👷 Ажилтан
                  </button>
                </div>
              </div>

              {signupRole === 'staff' && (
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Таны нэр</label>
                  <input 
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={isSignUp && signupRole === 'staff'}
                    placeholder="Жишээ: Бат, Нараа, Билгүүн"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  {signupRole === 'owner' ? 'Бизнесийн Нэр (Шинээр үүсгэх)' : 'Бизнесийн нэр (Салбар)'}
                </label>
                <input 
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required={isSignUp}
                  placeholder={signupRole === 'owner' ? "Жишээ: SF Coffee" : "Эзнийхээ бүртгүүлсэн нэрийг бичнэ үү"}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold transition"
                />
              </div>
            </div>
          )}

          {!isForgotPassword && (
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Нууц үг</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!isForgotPassword}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer"
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
                    className="text-slate-500 hover:text-slate-400 text-xs font-medium transition cursor-pointer"
                  >
                    Нууц үгээ мартсан уу?
                  </button>
                </div>
              )}
            </div>
          )}

          <button 
            type="submit"
            onClick={(e) => {
              if (isForgotPassword) {
                e.preventDefault();
                handleForgotPassword();
              }
            }}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-xl transition duration-150 text-sm shadow-lg mt-4 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Түр хүлээнэ үү..." : isForgotPassword ? "Сэргээх холбоос илгээх" : isSignUp ? "Бүртгүүлэх" : "Нэвтрэх"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-900 text-center">
          {isForgotPassword ? (
            <button 
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-emerald-400 hover:text-emerald-300 text-xs font-bold transition cursor-pointer"
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
              className="text-emerald-400 hover:text-emerald-300 text-xs font-bold transition cursor-pointer"
            >
              {isSignUp ? "Бүртгэлтэй юу? Нэвтрэх" : "Шинэ хэрэглэгч үү? Бүртгүүлэх"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}