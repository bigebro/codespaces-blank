"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { ShieldAlert, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
// 🚀 THE QUANTUM FORCE & MATTER OPERALINK LOGO
export function OperlinkLogo({
  className = "h-10 w-auto text-white",
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 520 100" className={className} aria-label="OPERLINK">
      <defs>
        {/* Slices the logo perfectly in half horizontally */}
        <clipPath id="top-slice">
          <rect x="0" y="0" width="520" height="48" />
        </clipPath>
        <clipPath id="bottom-slice">
          <rect x="0" y="52" width="520" height="48" />
        </clipPath>
      </defs>

      {/* TOP HALF - Shifted left for the shear effect */}
      <g clipPath="url(#top-slice)" transform="translate(-2, 0)">
        <LogoGeometry />
      </g>

      {/* BOTTOM HALF - Shifted right for the shear effect */}
      <g clipPath="url(#bottom-slice)" transform="translate(2, 0)">
        <LogoGeometry />
      </g>
    </svg>
  );
}

// Reusable geometry so we can slice it in half above
function LogoGeometry() {
  return (
    <>
      {/* The 'O' - Embedded perfectly as your Reticle Logo */}
      <g transform="translate(10, 20)">
        <circle cx="30" cy="30" r="26" stroke="currentColor" strokeWidth="3" fill="none" />
        <path d="M 33 41 A 12 12 0 0 1 19 27" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M 27 19 A 12 12 0 0 1 41 33" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
        <line x1="9" y1="51" x2="51" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="30" cy="30" r="2.5" fill="currentColor" />
      </g>

      {/* The 'PERLINK' - Custom Engineered Forward-Leaning Geometric Path */}
      <g transform="translate(90, 0) skewX(-12)" fill="currentColor">
        {/* P */}
        <path fillRule="evenodd" clipRule="evenodd" d="M0 25h30a15 15 0 0 1 15 15 15 15 0 0 1-15 15H12v20H0V25zm12 12h18a3 3 0 0 1 3 3 3 3 0 0 1-3 3H12V37z" />
        {/* E */}
        <path d="M 60 25 h 40 v 11 h -28 v 8 h 22 v 11 h -22 v 9 h 28 v 11 h -40 z" />
        {/* R */}
        <path fillRule="evenodd" clipRule="evenodd" d="M115 25h30a15 15 0 0 1 15 15 15 15 0 0 1-15 15h-0l15 20h-14.5l-14.5-20h-4v20h-12V25zm12 12h18a3 3 0 0 1 3 3 3 3 0 0 1-3 3H127V37z" />
        {/* L */}
        <path d="M 175 25 v 50 h 35 v -11 h -23 v -39 z" />
        {/* I */}
        <path d="M 225 25 v 50 h 12 v -50 z" />
        {/* N */}
        <path d="M252 25 H264 L285 55 V25 H297 V75 H285 L264 45 V75 H252 Z" />
        {/* K */}
        <path d="M312 25 V75 H324 V55 L340 75 H357 L334 50 L357 25 H340 L324 45 V25 Z" />
      </g>
    </>
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

        // ⚡ 1. БИЗНЕСИЙН НЭР ДАВХАРДСАН ЭСЭХИЙГ ШУУД ШАЛГАХ:
        if (signupRole === "owner") {
          const { data: existingShop } = await supabase
            .from("tenants")
            .select("client_id")
            .ilike("client_id", cleanBranch)
            .maybeSingle();

          if (existingShop) {
            setErrorMsg(
              `⚠️ "${cleanBranch}" нэртэй бизнес аль хэдийнэ бүртгэлтэй байна. Та өөр нэр сонгоно уу.`,
            );
            setLoading(false);
            return;
          }
        }

        const { data, error } = await supabase.auth.signUp({
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

        // 2. signInWithPassword эсвэл нэвтрэх хэсэгт redirect хийх:
        if (actionIntent === "pay") {
          router.push(
            `/dashboard?checkout=open&plan=${chosenPlan}&cycle=${chosenCycle}&phone=${phoneNumber}`,
          );
        } else {
          router.push("/dashboard");
        }
        if (error) throw error;

        if (data.user && data.user.identities?.length === 0) {
          setErrorMsg("Бүртгэлтэй имэйл хаяг байна. Нэвтэрч орно уу.");
        } else {
          setSuccessMsg("Амжилттай бүртгэгдлээ! Та нэвтэрч орно уу.");
          setIsSignUp(false);
          setPassword("");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: any) {
      const rawMsg = String(err?.message || "").trim();

      // 🚨 Хэрэв Supabase-ээс "{}" эсвэл Database error ирвэл нэр давхардсаныг шууд танина:
      if (
        rawMsg === "{}" ||
        rawMsg.includes("Database error") ||
        rawMsg.includes("unexpected_failure") ||
        rawMsg.includes("registered")
      ) {
        setErrorMsg(
          "⚠️ Энэ бизнесийн нэр аль хэдийнэ бүртгэгдсэн байна! Та өөр нэр сонгоно уу.",
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
          <div className="bg-black p-3 rounded-2xl border border-zinc-700/20 mb-4 flex items-center justify-center ">
            <OperlinkLogo className="h-12 w-12" />
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            {isForgotPassword
              ? "Нууц үг сэргээх"
              : isSignUp
                ? "Шинэ Бүртгэл Үүсгэх"
                : "Operlink"}
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
              placeholder="name@example.com"
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
                    👑 Бизнес эрхлэгч
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupRole("staff")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${signupRole === "staff" ? "bg-white text-zinc-950 shadow-md" : "bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-white"}`}
                  >
                    👷 Ажилтан
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
                    placeholder="Жишээ: Бат, Нараа, Билгүүн"
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
                    placeholder="Жишээ: 99112233"
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
                      ? "Жишээ: SF Coffee"
                      : "Эзнийхээ бүртгүүлсэн нэрийг бичнэ үү"
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
