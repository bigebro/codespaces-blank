"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Coffee, ShieldAlert, CheckCircle2 } from 'lucide-react';

const SUPABASE_URL = "https://fcpwvualdbuakrwmqgmg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjcHd2dWFsZGJ1YWtyd21xZ21nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE4MDQzOCwiZXhwIjoyMDk5NzU2NDM4fQ.iDX_3sL-Sk1Z5oK2zSvW32saZBoY5f5f4XBu_dTQA-U";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const [signupRole, setSignupRole] = useState<'owner' | 'barista'>('owner');
  const [mounted, setMounted] = useState(false);
  
  
  useEffect(() => {
    setMounted(true);
  }, []);

const handleForgotPassword = async () => {
  if (!email) {
    setErrorMsg("Нууц үг сэргээх имэйлээ оруулна уу.");
    return;
  }
  setLoading(true);
  setErrorMsg(null);
  setSuccessMsg(null);

  try {
    // Check if the email exists in our public profiles table [3]
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

    // If email exists, trigger Supabase password reset [2]
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
        // Registers user and passes branch metadata to the SQL trigger [2, 3]
      const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              client_id: companyName.trim() || 'SF Coffee', 
              role: signupRole // <--- Өөрчлөгдсөн хэсэг: Шилжүүлэгчийн утгыг датабэйс рүү илгээнэ
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
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
        router.push('/');
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Үйлдэл амжилтгүй боллоо.");
    } finally {
      setLoading(false);
    }
  };
if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <p className="text-emerald-400 font-semibold text-lg animate-pulse">Уншиж байна...</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/40 p-8 rounded-2xl border border-slate-900 shadow-2xl backdrop-blur-md">
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20 mb-3">
            <Coffee className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white">SF Coffee Portal</h2>
          <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider font-bold">SaaS Tenant Authentication</p>
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
{/* Dynamic Business Name Input for Signup  */}
{/* {isSignUp && (
  <div>
    <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Бизнесийн Нэр (Салбар)</label>
    <input 
      type="text"
      value={companyName}
      onChange={(e) => setCompanyName(e.target.value)}
      required={isSignUp}
      placeholder="Жишээ: Cafe B, SF Coffee"
      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold transition"
    />
  </div>
)} */}

{isSignUp && (
  <div className="space-y-4">
    {/* The Switch Buttons */}
    <div>
      <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Би хэн бэ?</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSignupRole('owner')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${signupRole === 'owner' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white'}`}
        >
          👑 Бизнес эрхлэгч
        </button>
        <button
          type="button"
          onClick={() => setSignupRole('barista')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${signupRole === 'barista' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white'}`}
        >
          ☕ Ажилтан
        </button>
      </div>
    </div>

    {/* Dynamic Company Input */}
    <div>
      <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
        {signupRole === 'owner' ? 'Бизнесийн Нэр (Шинээр үүсгэх)' : 'Кофе шопын нэр (Салбар)'}
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
  {/* Hides password input cleanly when Forgot Password state is active */}
  {!isForgotPassword && (
    <div>
      <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Нууц үг</label>
      <input 
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required={!isForgotPassword}
        placeholder="••••••••"
        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-semibold transition"
      />
      <div className="text-right mt-2">
        <button 
          type="button"
          onClick={() => {
            setIsForgotPassword(true);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="text-slate-500 hover:text-slate-400 text-xs font-medium transition"
        >
          Нууц үгээ мартсан уу?
        </button>
      </div>
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
    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-xl transition duration-150 text-sm shadow-lg mt-4"
  >
    {loading ? "Түр хүлээнэ үү..." : isForgotPassword ? "Сэргээх холбоос илгээх" : isSignUp ? "Шинэ Бүртгэл Үүсгэх" : "Нэвтэрч Орох"}
  </button>
</form>
<div className="mt-8 pt-6 border-t border-slate-900 text-center space-y-3 flex flex-col">
  {isForgotPassword ? (
    <button 
      type="button"
      onClick={() => {
        setIsForgotPassword(false);
        setErrorMsg(null);
        setSuccessMsg(null);
      }}
      className="text-emerald-400 hover:text-emerald-300 text-xs font-bold transition"
    >
      Буцах (Нэвтрэх хэсэг рүү)
    </button>
  ) : (
    <button 
      type="button"
      onClick={() => {
        setIsSignUp(!isSignUp);
        setErrorMsg(null);
        setSuccessMsg(null);
      }}
      className="text-emerald-400 hover:text-emerald-300 text-xs font-bold transition"
    >
      {isSignUp ? "Бүртгэлтэй юу? Нэвтэрч орох" : "Шинэ хэрэглэгч үү? Бүртгүүлэх"}
    </button>
  )}
</div>
        <div className="mt-8 pt-6 border-t border-slate-900 text-center">
          <button 
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="text-emerald-400 hover:text-emerald-300 text-xs font-bold transition"
          >
            {isSignUp ? "Бүртгэлтэй юу? Нэвтэрч орох" : "Шинэ хэрэглэгч үү? Бүртгүүлэх"}
          </button>
        </div>

      </div>
    </div>
  );
}

