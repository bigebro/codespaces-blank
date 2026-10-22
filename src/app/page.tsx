"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  ShieldCheck,
  Play,
  ChevronDown,
  Clock,
  Sparkles,
  DollarSign,
  Zap,
  Compass,
  CheckCircle2,
} from "lucide-react";

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
        <linearGradient id="laserLine" x1="78" y1="434" x2="434" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="30%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>

        {/* 3. Optical Ring: Gives the outer circle a dynamic, glass-like reflection instead of a flat dull gray */}
        <linearGradient id="glassRing" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
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

export default function PremiumLandingPage() {
  const router = useRouter();
  const [dailyRevenue, setDailyRevenue] = useState(2500000);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isYearly, setIsYearly] = useState(false);

  // Бодит цэвэр ашгийн тооцоо
  const monthlyRevenue = dailyRevenue * 30;
  const pureProfitGainMonthly = Math.round(monthlyRevenue * 0.05);
  const yearlyProfitGain = pureProfitGainMonthly * 12;
  const hoursSavedMonthly = 40;

  const faqs = [
    {
      q: "Миний бизнест ямар үр дүн өгөх вэ?",
      a: "Танай өдөр тутмын үйл ажиллагаанаас үл анзаарагдам алдагдаж байдаг мөнгийг хамгаалж, цэвэр ашгийг тань бодитоор өсгөнө. Мөн та бизнесээсээ гадуур байсан ч бизнес тань цаг шиг нарийн өөрөө ажиллаж, сард 40 гаруй цагийн хувийн эрх чөлөөгөө буцаан авна.",
    },
    {
      q: "Би өөрөө ямар нэг тохиргоо хийх, цаг үрэх хэрэгтэй юу?",
      a: "Үгүй, огт үгүй. Бүх үйл ажиллагаа, бүтцийг бид өөрсдөө 100% хийж бэлэн болгоно. Та ямар ч цаг үрэхгүй, юунд ч гар хүрэхгүй. Та зөвхөн ашгаа хүлээн авна.",
    },
    {
      q: "Манай байгууллага өөрийн гэсэн онцлогтой бол яах вэ?",
      a: "Бид танай бизнесийн онцлогт тохируулан хүссэн тайлан, захиалгат шийдлүүдийг тусгайлан зориулж (Custom Development) тохируулж өгөх бүрэн боломжтой.",
    },
    {
      q: "14 хоногийн туршилт ямар эрсдэлтэй вэ?",
      a: "Ямар ч эрсдэлгүй. Бид танай бизнесийг ашигтай болгож өгнө. Хэрэв үр дүн гарахгүй бол та 1 ч төгрөг төлөхгүй. Эрсдэл 100% бидний талд.",
    },
  ];

  return (
    <div
      suppressHydrationWarning={true}
      className="min-h-screen bg-zinc-950 text-slate-50 font-sans selection:bg-white/30 overflow-hidden relative"
    >
      {/* BACKGROUND GLOW EFFECTS */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 blur-3xl rounded-full mix-blend-screen"></div>
      </div>

      {/* 1. NAVBAR WITH THE NEW POWERFUL LOGO */}
      <nav className="relative z-50 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => router.push("/")}
        >
          <div className="bg-black p-1.5 rounded-2xl border border-zinc-700/20 ">
            <OperlinkLogo className="h-7 w-7" />
          </div>
        
        </div>
        <div className="flex items-center gap-6 z-50">
          <Link
            href="/login"
            className="text-sm font-bold text-zinc-400 hover:text-white transition py-2 px-3 cursor-pointer"
          >
            Нэвтрэх
          </Link>

          <Link
            href="/login"
            className="hidden sm:flex bg-white text-zinc-950 hover:bg-zinc-200 font-black text-sm px-6 py-2.5 rounded-xl transition items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer"
          >
            14 хоног үнэгүй турших <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* 2. THE HERO SECTION */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        {/* SCARCITY TRIGGER */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-800/60 border border-zinc-800 text-zinc-200 text-xs font-black uppercase tracking-wider mb-8 ">
          <Clock className="h-3.5 w-3.5  text-zinc-200" />
          Энэ сард биечлэн нэвтрүүлэх 5-хан байгууллагын суудал үлдлээ
        </div>

        <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-[1.1] mb-8">
          Operlink танай бизнесийг авч явна. <br className="hidden sm:block" />
          <span className="text-white">Таны бизнесийн ашгийн хөшүүрэг.</span>
        </h1>

        <p className="text-zinc-400 text-lg sm:text-xl max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
          Бизнесийнхээ боол биш, жинхэнэ эзэн нь болж амьдар.{" "}
          <strong>Бүх үйл ажиллагааг бид хариуцна.</strong> Та зөвхөн сар бүр
          өсөх цэвэр ашиг, 40 цагийн эрх чөлөөгөө буцаан ав.
        </p>

        {/* Video Placeholder */}
        <div className="relative max-w-4xl mx-auto mb-12 rounded-3xl overflow-hidden border border-white/10 bg-zinc-900/50 aspect-video shadow-2xl backdrop-blur-sm group cursor-pointer">
          <div className="absolute inset-0 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mb-4  group-hover:scale-110 transition-transform duration-300">
              <Play className="h-8 w-8 text-zinc-950 fill-current ml-1" />
            </div>
            <p className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-zinc-200" /> Систем хэрхэн
              ажилладгийг 3 минутад үзэх
            </p>
          </div>
        </div>

        <Link
          href="/login"
          className="w-full sm:w-auto bg-white hover:bg-zinc-200 text-zinc-950 font-black text-base px-10 py-5 rounded-2xl  hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 mx-auto cursor-pointer max-w-sm"
        >
          Үнэгүй Турших 
        </Link>
  
      </section>

      {/* 3. HORMOZI GRAND SLAM OFFER */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-gradient-to-r from-blue-900/40 via-emerald-900/40 to-cyan-900/40 p-1 rounded-3xl">
          <div className="bg-zinc-900 rounded-[22px] p-8 sm:p-10 text-center border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-800/60 blur-3xl"></div>
          
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 relative z-10">
              Та юу ч хийх шаардлагагүй. Бид танай бизнесийг ашигтай болгоно.
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto relative z-10">
              Бүх үйл ажиллагаа, бүтцийг бид өөрсдөө 100% бүрэн бэлдэж,
              бизнесийг тань цаг шиг жигдрүүлж өгнө.{" "}
              <strong>14 хоног үнэгүй ашигла.</strong> Хэрэв таны цэвэр ашиг
              бодитоор өсөхгүй бол 1 ч төгрөг төлөхгүй.
            </p>
          </div>
        </div>
      </section>

      {/* 4. THE 3 RESULTS */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Танд Ирэх 3 Бодит Үр Дүн
          </h2>
          <p className="text-zinc-400">
            Эзний амьдрал маш энгийн болно: Зөвшөөрөх, Ажиглах, Цэвэр ашгаа
            авах.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Result 1 */}
          <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 hover:border-zinc-700/40 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="h-14 w-14 bg-zinc-800/60 rounded-2xl flex items-center justify-center mb-6 border border-zinc-700/20 group-hover:scale-105 transition-transform">
                <DollarSign className="h-7 w-7 text-zinc-200" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Бодит Цэвэр Ашгийн Өсөлт
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Үл анзаарагдам алдагдлуудыг зогсоож, тэр мөнгийг сар бүр банкны
                дансанд тань цэвэр ашиг болгон хуримтлуулна. Орлого өсөх бүрд
                ашиг дагаад өснө.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <span>Бодит цэвэр ашиг</span>
            </div>
          </div>

          {/* Result 2 */}
          <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 hover:border-zinc-700/40 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="h-14 w-14 bg-zinc-800/60 rounded-2xl flex items-center justify-center mb-6 border border-zinc-700/20 group-hover:scale-105 transition-transform">
                <Zap className="h-7 w-7 text-zinc-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Таны Бизнесийн Ашгийн Хөшүүрэг
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Та өдөр бүр стресстэж ажиллах биш, ухаалаг системээр дамжуулан
                бага хүчээр бизнесийнхээ бодит үр ашиг, өгөөжийг дээд цэгт нь
                хүргэнэ.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <span>Өндөр бүтээмж • Ухаалаг өсөлт</span>
            </div>
          </div>

          {/* Result 3 */}
          <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 hover:border-zinc-700/40 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="h-14 w-14 bg-zinc-800/60 rounded-2xl flex items-center justify-center mb-6 border border-zinc-700/20 group-hover:scale-105 transition-transform">
                <Compass className="h-7 w-7 text-zinc-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Сард +40 цагийн Эрх Чөлөө
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Шөнө дөл хүртэл тооцоо шивэх, тайлан ухахаа боль. Бүх зүйл өөрөө
                автоматаар хийгдэх тул та бизнесээсээ гадуур эрх чөлөөтэй
                амьдарна.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <span>Хувийн эрх чөлөө • 100% Done-For-You</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PROFIT SIMULATOR */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-zinc-900 p-8 sm:p-12 rounded-[2rem] border border-zinc-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800/60 blur-3xl rounded-full pointer-events-none"></div>

          <div className="text-center mb-10 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 flex items-center justify-center gap-3">
              <Calculator className="text-zinc-200 h-8 w-8" /> Таны бодит цэвэр
              ашиг & эрх чөлөө
            </h2>
            <p className="text-sm text-zinc-400">
              Өдөр тутмын орлогоо оруулаад, таны халаасанд үлдэх бодит үр дүнг
              хар.
            </p>
          </div>

          <div className="mb-12 max-w-2xl mx-auto relative z-10">
            <div className="flex justify-between items-end mb-4">
              <span className="text-sm font-bold text-zinc-300 uppercase tracking-wide">
                Өдрийн дундаж орлого:
              </span>
              <span className="text-3xl font-black text-white font-mono">
                {dailyRevenue.toLocaleString()} ₮
              </span>
            </div>
            <input
              type="range"
              min={300000}
              max={15000000}
              step={100000}
              value={dailyRevenue}
              onChange={(e) => setDailyRevenue(Number(e.target.value))}
              className="w-full h-3 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center relative z-10">
            <div className="bg-zinc-950/50 p-6 rounded-2xl border border-white/5">
              <p className="text-xs text-zinc-400 font-bold uppercase mb-2">
                Сар бүр нэмэгдэх цэвэр ашиг
              </p>
              <p className="text-2xl font-black text-zinc-200 font-mono">
                +{pureProfitGainMonthly.toLocaleString()} ₮
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                Дансанд тань цэвэр хуримтлагдана
              </p>
            </div>
            <div className="bg-zinc-950/50 p-6 rounded-2xl border border-white/5">
              <p className="text-xs text-zinc-400 font-bold uppercase mb-2">
                Танд эргэж ирэх хувийн цаг
              </p>
              <p className="text-2xl font-black text-zinc-300 font-mono">
                +{hoursSavedMonthly} цаг / сард
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                Гэр бүл, өөртөө зориулах эрх чөлөө
              </p>
            </div>
            <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700/50 transform sm:scale-110 shadow-lg flex flex-col justify-center">
              <p className="text-xs text-zinc-200 font-black uppercase mb-2 tracking-wide">
                Жилд халаасанд тань үлдэх дүн
              </p>
              <p className="text-3xl font-black text-zinc-200 font-mono">
                +{yearlyProfitGain.toLocaleString()} ₮
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PRICING TIERS */}
      <section className="max-w-6xl mx-auto px-6 py-24" id="pricing">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Шударга үнэ. Орлогоос хувь авахгүй.
          </h2>
          <p className="text-zinc-400 text-sm max-w-xl mx-auto mb-8">
            Танай борлуулалт хэдэн зуун сая хүрсэн ч бид хувь авахгүй. Зөвхөн
            тогтмол төлбөр.
          </p>

          {/* 🔘 САР БҮР / ЖИЛЭЭР (2 САР ҮНЭГҮЙ) СОНГОГЧ */}
          <div className="inline-flex items-center bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 shadow-xl">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !isYearly
                  ? "bg-white text-zinc-950 font-black shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Сар бүр төлөх
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isYearly
                  ? "bg-white text-zinc-950 font-black shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Жилээр төлөх</span>
              <span className="text-xs bg-zinc-200/20 text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-700/30 font-black">
                2 САР ҮНЭГҮЙ
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* 1. Starter */}
          <div className="bg-zinc-900/30 p-8 rounded-3xl border border-zinc-800 flex flex-col justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Starter (Жижиг цэг)
              </p>
              <div className="mb-4">
                <span className="text-xs text-zinc-400 font-bold block mb-1">
                  ⚙️ Нэвтрүүлэлт: Бэлэн жортой бол 0₮
                </span>
                <span className="text-4xl font-black text-white font-mono">
                  {isYearly ? "124,000₮" : "149,000₮"}
                </span>
                <span className="text-xs text-zinc-400 block mt-1.5">
                  {isYearly ? "Сарын дүйцэх үнэ (Жилд 1,490,000₮)" : "Сар бүр"}
                </span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-zinc-300">
                <li className="flex gap-3">
             
                  Бүх төхөөрөмж дээр ажиллана
                </li>
                <li className="flex gap-3">
               
                  Агуулахын тооллого & Хаягдал
                </li>
                <li className="flex gap-3">
            
                  Бодит ашгийн өдөр тутмын хяналт
                </li>
              </ul>
            </div>

            <div className="space-y-2 pt-4 border-t border-zinc-800">
              <Link
                href={`/login?plan=starter&cycle=${isYearly ? "yearly" : "monthly"}&action=pay`}
                className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-black py-3 rounded-xl text-xs transition flex justify-center items-center gap-1.5 shadow"
              >
                Сонгож Төлөх <ArrowRight className="h-3.5 w-3.5" />
              </Link>
          
            </div>
          </div>

          {/* 2. Professional (Highlighted) */}
          <div className="bg-zinc-900 p-8 sm:p-10 rounded-[2rem] border-2 border-zinc-700 relative  flex flex-col justify-between transform md:scale-105 z-10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-zinc-950 font-black text-xs uppercase px-4 py-1.5 rounded-full whitespace-nowrap">
              Хамгийн их сонгогддог
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-2">
                Professional (Стандарт)
              </p>
              <div className="mb-6">
                <span className="text-xs text-zinc-200 font-bold block mb-1">
                   Нэвтрүүлэлт: Бэлэн жортой бол 0₮ / Жор гаргах: Тохиролцоно
                </span>
                <span className="text-5xl font-black text-white font-mono">
                  {isYearly ? "249,000₮" : "299,000₮"}
                </span>
                <span className="text-xs text-zinc-400 block mt-1.5">
                  {isYearly ? "Сарын дүйцэх үнэ (Жилд 2,990,000₮)" : "Сар бүр"}
                </span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-zinc-200 font-medium">
                <li className="flex gap-3">
                  3
                  хүртэлх төхөөрөмж холболт
                </li>
                <li className="flex gap-3">
              
                  Санхүүгийн гүнзгийрүүлсэн шинжилгээ
                </li>
                <li className="flex gap-3">
                
                  E-Tax СТ-2 тайлан экспорт
                </li>
                <li className="flex gap-3">
                
                  Өртөг, ашгийн автомат хяналт
                </li>
              </ul>
            </div>

            <div className="space-y-2 pt-4 border-t border-zinc-800">
              <Link
                href={`/login?plan=professional&cycle=${isYearly ? "yearly" : "monthly"}&action=pay`}
                className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-black py-3.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2"
              >
                Сонгож Төлөх <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/login?plan=professional&cycle=${isYearly ? "yearly" : "monthly"}&action=trial`}
                className="w-full text-zinc-400 hover:text-white text-xs font-bold py-2 rounded-xl text-center block"
              >
                14 хоног үнэгүй эхлэх
              </Link>
            </div>
          </div>

          {/* 3. Enterprise */}
          <div className="bg-zinc-900/30 p-8 rounded-3xl border border-zinc-800 flex flex-col justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Enterprise (Сүлжээ)
              </p>

              <div className="mb-4">
                <span className="text-xs text-zinc-400 font-bold block mb-1">
                  Нэвтрүүлэлт: Гэрээгээр
                </span>
                <span className="text-4xl font-black text-white font-mono">
                  Тохиролцоно
                </span>
                <span className="text-xs text-zinc-400 block mt-1.5">
                  Байгууллагын хэрэгцээнд тулгуурлана
                </span>
              </div>

              <ul className="space-y-4 mb-8 text-sm text-zinc-300">
                <li className="flex gap-3">
                
                  Бүх Pro боломжууд
                </li>
                <li className="flex gap-3">
              
                  Олон салбарын нэгдсэн удирдлага
                </li>
                <li className="flex gap-3">
                  
                  Захиалгалт хөгжүүлэлт
                </li>
              </ul>
            </div>

            <div className="space-y-2 pt-4 border-t border-zinc-800">
              <Link
                href="tel:99112233" // 👈 Өөрийн утасны дугаараа бичээрэй
                className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-black py-3 rounded-xl text-xs flex justify-center items-center gap-1.5 shadow"
              >
                Уулзалт товлох (Холбогдох) ➔
              </Link>

            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="text-2xl font-black text-white text-center mb-10">
          Түгээмэл Асуултууд
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-zinc-900/30 rounded-2xl border border-zinc-800/50 overflow-hidden hover:border-zinc-700 transition-colors"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-6 text-left font-bold text-sm text-zinc-200 flex justify-between items-center"
              >
                {faq.q}
                <ChevronDown
                  className={`h-5 w-5 text-zinc-200 transition-transform duration-300 ${openFaq === idx ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === idx ? "max-h-40 pb-6 opacity-100" : "max-h-0 opacity-0"}`}
              >
                <p className="text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="border-t border-white/5 py-10 mt-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <OperlinkLogo className="h-5 w-5" />
         
          </div>
          <p className="text-xs text-zinc-600 font-medium">
            © 2026 Operlink Technologies. Улаанбаатар хот, Монгол Улс.
          </p>
        </div>
      </footer>
    </div>
  );
}
