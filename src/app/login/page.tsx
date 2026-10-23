"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { ShieldAlert, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
// 🚀 THE QUANTUM FORCE & MATTER OPERALINK LOGO

export function OperlinkLogo({
  className = "h-8 w-8",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* 1. Brilliant White: Adds a microscopic sheen so the solid shapes look premium, not flat */}
        <linearGradient id="pureWhite" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#f4f4f5" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>

        {/* 2. Optical Fade for the Diagonal Line: Brightest in the center, tapering off perfectly to the tips like a laser beam */}
        <linearGradient
          id="laserLine"
          x1="78"
          y1="434"
          x2="434"
          y2="78"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="30%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>

        {/* 3. Optical Ring: Gives the outer circle a dynamic, glass-like reflection instead of a flat dull gray */}
        <linearGradient
          id="glassRing"
          x1="0"
          y1="0"
          x2="512"
          y2="512"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* --- EXACT ORIGINAL SHAPES --- */}

      {/* Outer Circle */}
      <circle
        cx="256"
        cy="256"
        r="214"
        stroke="url(#glassRing)"
        strokeWidth="2"
      />

      {/* Thick Arcs */}
      <path
        d="M 286.9 351.1 A 100 100 0 0 1 160.9 225.1"
        stroke="url(#pureWhite)"
        strokeWidth="28"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 225.1 160.9 A 100 100 0 0 1 351.1 286.9"
        stroke="url(#pureWhite)"
        strokeWidth="28"
        strokeLinecap="round"
        fill="none"
      />

      {/* Diagonal Line */}
      <line
        x1="78"
        y1="434"
        x2="434"
        y2="78"
        stroke="url(#laserLine)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Center Dot */}
      <circle cx="256" cy="256" r="7" fill="#ffffff" />
    </svg>
  );
}
export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [signupRole, setSignupRole] = useState<"owner" | "staff">("owner");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fromKiosk, setFromKiosk] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [chosenPlan, setChosenPlan] = useState("professional");
  const [chosenCycle, setChosenCycle] = useState("monthly");
  const [actionIntent, setActionIntent] = useState<"pay" | "trial">("trial");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const planParam = params.get("plan");
      const cycleParam = params.get("cycle");
      const actionParam = params.get("action");

      if (planParam) setChosenPlan(planParam);
      if (cycleParam) setChosenCycle(cycleParam);
      if (actionParam === "pay") {
        setActionIntent("pay");
        setIsSignUp(true); // Хэрэв нүүрнээс "Төлөх" гэж ирсэн бол шууд бүртгэлийг онгойлгоно
      }

      if (params.get("from") === "kiosk") {
        setFromKiosk(true); // 👈 Зөвхөн Kiosk-оос дарж ирсэн үед л идэвхжинэ
      }
    }
  }, []);

  // URL-ээс ирсэн урилгын салбарыг автоматаар унших
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);

      // Kiosk-оос ирсэн эсэхийг унших:
      if (params.get("from") === "kiosk") {
        setFromKiosk(true);
      }

      const branchFromUrl = params.get("branch");
      const roleFromUrl = params.get("role");
      if (branchFromUrl) {
        setCompanyName(branchFromUrl);
        setIsSignUp(true);
        if (roleFromUrl === "staff") setSignupRole("staff");
      }
    }
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
      const { data: profileExists, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.trim())
        .maybeSingle();

      if (checkError) throw checkError;

      if (!profileExists) {
        setErrorMsg(
          "Уучлаарай, энэ имэйл хаяг бүртгэлгүй байна. Та зөв имэйл хаягаа оруулна уу.",
        );
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/update-password`,
        },
      );
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

        // 1. Шинэ бизнес давхардсан эсэхийг шалгах
        if (signupRole === "owner") {
          const { data: existingShop } = await supabase
            .from("tenants")
            .select("client_id")
            .ilike("client_id", cleanBranch)
            .maybeSingle();

          if (existingShop) {
            setErrorMsg(
              `"${cleanBranch}" нэртэй бизнес аль хэдийнэ бүртгэгдсэн байна. Та өөр нэр сонгоно уу.`,
            );
            setLoading(false);
            return;
          }
        }

        // 2. Хэрэглэгчийг бүртгэх
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              client_id: cleanBranch,
              role: signupRole === "owner" ? "owner" : "Ажилтан",
              full_name: fullName.trim(),
              phone: phoneNumber.trim(),
            },
          },
        });

        if (signUpError) throw signUpError;

        if (data.user && data.user.identities?.length === 0) {
          setErrorMsg("Бүртгэлтэй имэйл хаяг байна. Нэвтэрч орно уу.");
          setLoading(false);
          return;
        }

        // ⚡ 3. УХААЛАГ AUTO-LOGIN (Хэрэв Supabase автоматаар сесси өгөөгүй бол л нэвтэрнэ)
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          
          if (signInError) {
             if (signInError.message.includes("Email not confirmed")) {
                 throw new Error(" Supabase 'Confirm email' тохиргоо асаалттай байна! Унтраана уу.");
             }
             throw signInError;
          }
        }

        // ⚡ 4. DASHBOARD РУУ ШУУД ҮСЭРГЭХ (Modal өөрөө нээгдэнэ):
        if (actionIntent === "pay") {
          router.push(
            `/dashboard?checkout=open&plan=${chosenPlan}&cycle=${chosenCycle}&phone=${phoneNumber}`,
          );
        } else {
          router.push("/dashboard");
        }
      } else {
        // Энгийн нэвтрэх үйлдэл
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: any) {
      const rawMsg = String(err?.message || "").trim();

      if (
        rawMsg === "{}" ||
        rawMsg.includes("Database error") ||
        rawMsg.includes("unexpected_failure") ||
        rawMsg.includes("registered")
      ) {
        setErrorMsg(
          "Энэ бизнесийн нэр аль хэдийнэ бүртгэгдсэн байна! Та өөр нэр сонгоно уу.",
        );
      } else {
        setErrorMsg(err.message || "Үйлдэл амжилтгүй боллоо.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900/40 p-8 rounded-2xl border border-zinc-900 shadow-2xl backdrop-blur-md">
        {/* ТОМОРСОН ЛОГО БА ЦЭВЭРХЭН ГАРЧИГ (Дэд тайлбаргүй) */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-black p-3 rounded-2xl border border border-zinc-700/20 mb-4 flex items-center justify-center ">
            <OperlinkLogo className="h-12 w-12" />
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            {isForgotPassword
              ? "Нууц үг сэргээх"
              : isSignUp
                ? "Шинэ Бүртгэл Үүсгэх"
                : ""}
          </h2>
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
              Имэйл хаяг
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder=""
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-700 text-sm font-semibold transition"
            />
          </div>

          {isSignUp && (
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Би хэн бэ?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSignupRole("owner")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${signupRole === "owner" ? "bg-white text-zinc-950 shadow-md" : "bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-white"}`}
                  >
                    Бизнес эрхлэгч
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupRole("staff")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${signupRole === "staff" ? "bg-white text-zinc-950 shadow-md" : "bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-white"}`}
                  >
                    Ажилтан
                  </button>
                </div>
              </div>

              {signupRole === "staff" && (
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
                    Таны нэр
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={isSignUp && signupRole === "staff"}
                    placeholder=""
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-700 text-sm font-semibold transition"
                  />
                </div>
              )}
              {isSignUp && signupRole === "owner" && (
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
                    Утасны дугаар (Төлбөр баталгаажуулахад хэрэгтэй)
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) =>
                      setPhoneNumber(e.target.value.replace(/\D/g, ""))
                    }
                    required
                    maxLength={8}
                    placeholder=""
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-700 text-sm font-semibold transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
                  {signupRole === "owner"
                    ? "Бизнесийн Нэр (Шинээр үүсгэх)"
                    : "Бизнесийн нэр (Салбар)"}
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required={isSignUp}
                  readOnly={Boolean(companyName && signupRole === "staff")}
                  placeholder={
                    signupRole === "owner"
                      ? ""
                      : "Байгуллагын нэрийг бичнэ үү"
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-700 text-sm font-semibold transition"
                />
              </div>
            </div>
          )}

          {!isForgotPassword && (
            <div>
              <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
                Нууц үг
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!isForgotPassword}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none focus:border-zinc-700 text-sm font-semibold transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
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
                    className="text-zinc-500 hover:text-zinc-400 text-xs font-medium transition cursor-pointer"
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
            className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-black py-3.5 rounded-xl transition duration-150 text-sm shadow-lg mt-4 cursor-pointer disabled:opacity-50"
          >
            {loading
              ? "Түр хүлээнэ үү..."
              : isForgotPassword
                ? "Сэргээх холбоос илгээх"
                : isSignUp
                  ? "Бүртгүүлэх"
                  : "Нэвтрэх"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-900 text-center">
          {isForgotPassword ? (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-zinc-200 hover:text-zinc-300 text-xs font-bold transition cursor-pointer"
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
              className="text-zinc-200 hover:text-zinc-300 text-xs font-bold transition cursor-pointer"
            >
              {isSignUp
                ? "Бүртгэлтэй юу? Нэвтрэх"
                : "Шинэ хэрэглэгч үү? Бүртгүүлэх"}
            </button>
          )}
        </div>
        {fromKiosk && (
          <div className="mt-4 pt-4 border-t border-zinc-900 text-center">
            <Link
              href="/kiosk"
              className="text-xs text-zinc-500 hover:text-zinc-200 font-bold transition inline-flex items-center gap-1"
            >
              ← Kiosk руу буцах
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
