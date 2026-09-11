"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  CheckCircle2
} from 'lucide-react';

// 🚀 THE QUANTUM FORCE & PHYSICAL MATTER OPERLINK LOGO COMPONENT
function OperlinkLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <defs>
        {/* Хүчний шугамын градиент (Force Vector) */}
        <linearGradient id="vectorGrad" x1="56" y1="456" x2="456" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f59b" stopOpacity="0" />
          <stop offset="30%" stopColor="#00f59b" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="70%" stopColor="#00c8ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#00c8ff" stopOpacity="0" />
        </linearGradient>

        {/* Эрчим хүчний тойрог замын градиент (Link Orbit) */}
        <linearGradient id="energyGrad" x1="56" y1="456" x2="456" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f59b" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#00c8ff" />
        </linearGradient>

        {/* Физик материйн хүрээний градиент (Matter Stators) */}
        <linearGradient id="statorGrad" x1="120" y1="120" x2="392" y2="392" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f59b" />
          <stop offset="30%" stopColor="#005577" />
          <stop offset="70%" stopColor="#005577" />
          <stop offset="100%" stopColor="#00c8ff" />
        </linearGradient>

        {/* Төвийн квант цөмийн гэрэлтэлтийн градиент (Quantum Core Halo) */}
        <radialGradient id="coreHalo" cx="256" cy="256" r="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="25%" stopColor="#00f59b" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00f59b" stopOpacity="0" />
        </radialGradient>

        {/* Неон гэрэлтэлтийн шүүлтүүрүүд (Glow Filters) */}
        <filter id="neonCyan" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#00c8ff" floodOpacity="0.8" />
        </filter>
        <filter id="neonEmerald" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#00f59b" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* 1. OUTER HUD RING (SpaceX сансрын нарийвчлалтай хүрээ) */}
      <circle 
        cx="256" 
        cy="256" 
        r="220" 
        stroke="#00c8ff" 
        strokeOpacity="0.2" 
        strokeWidth="2" 
        strokeDasharray="4 12" 
      />
      {/* HUD-ийн 4 холбоос цэг */}
      <circle cx="411.5" cy="411.5" r="4" fill="#00f59b" />
      <circle cx="100.5" cy="411.5" r="4" fill="#00f59b" />
      <circle cx="100.5" cy="100.5" r="4" fill="#00f59b" />
      <circle cx="411.5" cy="100.5" r="4" fill="#00f59b" />

      {/* 2. THE FORCE VECTOR (Шууд чиглэсэн хүчний вектор шугам) */}
      <line 
        x1="56" 
        y1="456" 
        x2="456" 
        y2="56" 
        stroke="url(#vectorGrad)" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />

      {/* 3. BACK ORBIT (Орбитын арын хагас - Материйн цаагуур эргэх) */}
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

      {/* 4. MATTER STATORS (Физик материйн хуваагдсан 'O' цагираг) */}
      <g filter="url(#neonEmerald)">
        {/* Доод талын масс (Bottom Arc: 0.4*PI -> 1.1*PI) */}
        <path 
          d="M 286.9 351.1 A 100 100 0 0 1 160.9 225.1" 
          stroke="url(#statorGrad)" 
          strokeWidth="28" 
          strokeLinecap="round" 
          fill="none" 
        />
        {/* Дээд талын масс (Top Arc: 1.4*PI -> 2.1*PI) */}
        <path 
          d="M 225.1 160.9 A 100 100 0 0 1 351.1 286.9" 
          stroke="url(#statorGrad)" 
          strokeWidth="28" 
          strokeLinecap="round" 
          fill="none" 
        />
      </g>

      {/* Материйн дотоод ховил (Tech Detail Groove) */}
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

      {/* 5. FRONT ORBIT (Орбитын урд хагас - Материйн урдуур гарч ирэх) */}
      <g transform="rotate(-45 256 256)" filter="url(#neonCyan)">
        <path 
          d="M 456 256 A 200 60 0 0 1 56 256" 
          stroke="url(#energyGrad)" 
          strokeWidth="14" 
          strokeLinecap="round" 
          fill="none" 
        />
      </g>

      {/* 6. QUANTUM CORE (Төв дэх цөм - Singularity) */}
      <circle cx="256" cy="256" r="45" fill="url(#coreHalo)" />
      <circle cx="256" cy="256" r="8" fill="#ffffff" filter="url(#neonCyan)" />
    </svg>
  );
}

export default function PremiumLandingPage() {
  const router = useRouter();
  const [dailyRevenue, setDailyRevenue] = useState(2500000); 
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Бодит цэвэр ашгийн тооцоо
  const monthlyRevenue = dailyRevenue * 30;
  const pureProfitGainMonthly = Math.round(monthlyRevenue * 0.05); 
  const yearlyProfitGain = pureProfitGainMonthly * 12;
  const hoursSavedMonthly = 40; 

  const faqs = [
    {
      q: "Operlink миний бизнест ямар үр дүн өгөх вэ?",
      a: "Танай өдөр тутмын үйл ажиллагаанаас үл анзаарагдам алдагдаж байдаг мөнгийг хамгаалж, цэвэр ашгийг тань бодитоор өсгөнө. Мөн та бизнесээсээ гадуур байсан ч бизнес тань цаг шиг нарийн өөрөө ажиллаж, сард 40 гаруй цагийн хувийн эрх чөлөөгөө буцаан авна."
    },
    {
      q: "Би өөрөө ямар нэг тохиргоо хийх, цаг үрэх хэрэгтэй юу?",
      a: "Үгүй, огт үгүй. Бүх үйл ажиллагаа, бүтцийг бид өөрсдөө 100% хийж бэлэн болгоно. Та ямар ч цаг үрэхгүй, юунд ч гар хүрэхгүй. Та зөвхөн ашгаа хүлээн авна."
    },
    {
      q: "Манай байгууллага өөрийн гэсэн онцлогтой бол яах вэ?",
      a: "Бид танай бизнесийн онцлогт тохируулан хүссэн тайлан, захиалгат шийдлүүдийг тусгайлан зориулж (Custom Development) тохируулж өгөх бүрэн боломжтой."
    },
    {
      q: "14 хоногийн туршилт ямар эрсдэлтэй вэ?",
      a: "Ямар ч эрсдэлгүй. Бид танай бизнесийг ашигтай болгож өгнө. Хэрэв үр дүн гарахгүй бол та 1 ч төгрөг төлөхгүй. Эрсдэл 100% бидний талд."
    }
  ];

  return (
    <div 
      suppressHydrationWarning={true}
      className="min-h-screen bg-[#050a12] text-slate-50 font-sans selection:bg-emerald-500/30 overflow-hidden relative"
    >
      
      {/* BACKGROUND GLOW EFFECTS */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500 via-transparent to-transparent blur-3xl rounded-full mix-blend-screen"></div>
      </div>

      {/* 1. NAVBAR WITH THE NEW POWERFUL LOGO */}
      <nav className="relative z-50 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-white/5 bg-[#050a12]/50 backdrop-blur-xl">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
          <div className="bg-[#07131d] p-1.5 rounded-2xl border border-emerald-500/30 shadow-[0_0_20px_rgba(0,245,155,0.25)]">
            <OperlinkLogo className="h-7 w-7" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white uppercase">
            OPER<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">LINK</span>
          </span>
        </div>
        <div className="flex items-center gap-6 z-50">
          <Link 
            href="/login" 
            className="text-sm font-bold text-slate-400 hover:text-white transition py-2 px-3 cursor-pointer"
          >
            Нэвтрэх
          </Link>

          <Link 
            href="/login" 
            className="hidden sm:flex bg-white text-slate-950 hover:bg-slate-200 font-black text-sm px-6 py-2.5 rounded-xl transition items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer"
          >
            14 хоног үнэгүй турших <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* 2. THE HERO SECTION */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        
        {/* SCARCITY TRIGGER */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider mb-8 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <Clock className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
          Энэ сард биечлэн нэвтрүүлэх 5-хан байгууллагын суудал үлдлээ
        </div>
        
        <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-[1.1] mb-8">
          Operlink танай бизнесийг авч явна. <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Таны бизнесийн ашгийн хөшүүрэг.
          </span>
        </h1>
        
        <p className="text-slate-400 text-lg sm:text-xl max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
          Бизнесийнхээ боол биш, жинхэнэ эзэн нь болж амьдар. <strong>Бүх үйл ажиллагааг бид хариуцна.</strong> Та зөвхөн сар бүр өсөх цэвэр ашиг, 40 цагийн эрх чөлөөгөө буцаан ав.
        </p>

        {/* Video Placeholder */}
        <div className="relative max-w-4xl mx-auto mb-12 rounded-3xl overflow-hidden border border-white/10 bg-slate-900/50 aspect-video shadow-2xl backdrop-blur-sm group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-cyan-500/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(255,255,255,0.3)] group-hover:scale-110 transition-transform duration-300">
              <Play className="h-8 w-8 text-slate-950 fill-current ml-1" />
            </div>
            <p className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" /> Систем хэрхэн ажилладгийг 3 минутад үзэх
            </p>
          </div>
        </div>

        <Link 
          href="/login" 
          className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base px-10 py-5 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.35)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 mx-auto cursor-pointer max-w-sm"
        >
          14 Хоног Үнэгүй Турших <ArrowRight className="h-5 w-5" />
        </Link>
        <p className="text-xs text-slate-500 mt-3 font-bold uppercase tracking-widest">Кредит карт шаардлагагүй. Эрсдэл 100% бидний талд.</p>
      </section>

      {/* 3. HORMOZI GRAND SLAM OFFER */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-gradient-to-r from-blue-900/40 via-emerald-900/40 to-cyan-900/40 p-1 rounded-3xl">
          <div className="bg-[#07131d] rounded-[22px] p-8 sm:p-10 text-center border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl"></div>
            <ShieldCheck className="h-12 w-12 text-emerald-400 mx-auto mb-6 relative z-10" />
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 relative z-10">
              Та юу ч хийх шаардлагагүй. Бид танай бизнесийг ашигтай болгоно.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto relative z-10">
              Бүх үйл ажиллагаа, бүтцийг бид өөрсдөө 100% бүрэн бэлдэж, бизнесийг тань цаг шиг жигдрүүлж өгнө. <strong>14 хоног үнэгүй ашигла.</strong> Хэрэв таны цэвэр ашиг бодитоор өсөхгүй бол 1 ч төгрөг төлөхгүй.
            </p>
          </div>
        </div>
      </section>

      {/* 4. THE 3 RESULTS */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Танд Ирэх 3 Бодит Үр Дүн</h2>
          <p className="text-slate-400">Эзний амьдрал маш энгийн болно: Зөвшөөрөх, Ажиглах, Цэвэр ашгаа авах.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Result 1 */}
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                <DollarSign className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">1. Бодит Цэвэр Ашгийн Өсөлт</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Үл анзаарагдам алдагдлуудыг зогсоож, тэр мөнгийг сар бүр банкны дансанд тань цэвэр ашиг болгон хуримтлуулна. Орлого өсөх бүрд ашиг дагаад өснө.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>Бодит цэвэр ашиг</span>
            </div>
          </div>

          {/* Result 2 */}
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="h-14 w-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/20 group-hover:scale-105 transition-transform">
                <Zap className="h-7 w-7 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">2. Таны Бизнесийн Ашгийн Хөшүүрэг</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Та өдөр бүр стресстэж ажиллах биш, ухаалаг системээр дамжуулан бага хүчээр бизнесийнхээ бодит үр ашиг, өгөөжийг дээд цэгт нь хүргэнэ.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <span>Өндөр бүтээмж • Ухаалаг өсөлт</span>
            </div>
          </div>

          {/* Result 3 */}
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="h-14 w-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 group-hover:scale-105 transition-transform">
                <Compass className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">3. Сард +40 цагийн Эрх Чөлөө</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Шөнө дөл хүртэл тооцоо шивэх, тайлан ухахаа боль. Бүх зүйл өөрөө автоматаар хийгдэх тул та бизнесээсээ гадуур эрх чөлөөтэй амьдарна.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs font-bold text-blue-400 flex items-center gap-1.5">
              <span>Хувийн эрх чөлөө • 100% Done-For-You</span>
            </div>
          </div>

        </div>
      </section>

      {/* 5. PROFIT SIMULATOR */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-[#07131d] p-8 sm:p-12 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>

          <div className="text-center mb-10 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 flex items-center justify-center gap-3">
              <Calculator className="text-emerald-400 h-8 w-8" /> Таны бодит цэвэр ашиг & эрх чөлөө
            </h2>
            <p className="text-sm text-slate-400">Өдөр тутмын орлогоо оруулаад, таны халаасанд үлдэх бодит үр дүнг хар.</p>
          </div>

          <div className="mb-12 max-w-2xl mx-auto relative z-10">
            <div className="flex justify-between items-end mb-4">
              <span className="text-sm font-bold text-slate-300 uppercase tracking-wide">Өдрийн дундаж орлого:</span>
              <span className="text-3xl font-black text-white font-mono">{dailyRevenue.toLocaleString()} ₮</span>
            </div>
            <input 
              type="range" 
              min={300000} 
              max={15000000} 
              step={100000} 
              value={dailyRevenue} 
              onChange={(e) => setDailyRevenue(Number(e.target.value))}
              className="w-full h-3 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center relative z-10">
            <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5">
              <p className="text-xs text-slate-400 font-bold uppercase mb-2">Сар бүр нэмэгдэх цэвэр ашиг</p>
              <p className="text-2xl font-black text-emerald-400 font-mono">+{pureProfitGainMonthly.toLocaleString()} ₮</p>
              <p className="text-[10px] text-slate-500 mt-1">Дансанд тань цэвэр хуримтлагдана</p>
            </div>
            <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5">
              <p className="text-xs text-slate-400 font-bold uppercase mb-2">Танд эргэж ирэх хувийн цаг</p>
              <p className="text-2xl font-black text-blue-400 font-mono">+{hoursSavedMonthly} цаг / сард</p>
              <p className="text-[10px] text-slate-500 mt-1">Гэр бүл, өөртөө зориулах эрх чөлөө</p>
            </div>
            <div className="bg-emerald-500/20 p-6 rounded-2xl border border-emerald-500/50 transform sm:scale-110 shadow-lg flex flex-col justify-center">
              <p className="text-xs text-emerald-400 font-black uppercase mb-2 tracking-wide">Жилд халаасанд тань үлдэх дүн</p>
              <p className="text-3xl font-black text-emerald-400 font-mono">+{yearlyProfitGain.toLocaleString()} ₮</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PRICING TIERS */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Шударга үнэ. Орлогоос хувь авахгүй.</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">Танай борлуулалт хэдэн зуун сая хүрсэн ч бид хувь авахгүй. Зөвхөн сарын тогтмол төлбөр.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          
          {/* Starter */}
          <div className="bg-slate-900/30 p-8 rounded-3xl border border-slate-800">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Starter (Жижиг цэг)</p>
            <div className="mb-4">
              <span className="text-xs text-slate-400 font-bold block mb-1">НЭВТРҮҮЛЭХ ХУРААМЖ: 500,000₮ (Нэг удаа)</span>
              <span className="text-3xl font-black text-white font-mono">149,000₮</span>
              <span className="text-xs text-slate-400 block mt-2">Сар бүр</span>
            </div>
            <ul className="space-y-4 mb-8 text-sm text-slate-300">
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0"/> Бүх төхөөрөмж дээр ажиллана</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0"/> 100% бэлдэж тохируулж өгнө</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0"/> Бодит ашгийн өдөр тутмын хяналт</li>
            </ul>
          </div>

          {/* Professional (Highlighted) */}
          <div className="bg-[#07131d] p-10 rounded-[2rem] border-2 border-emerald-500 relative shadow-[0_0_50px_rgba(16,185,129,0.15)] transform md:scale-105 z-10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-black text-xs uppercase px-4 py-1.5 rounded-full whitespace-nowrap">
              Хамгийн их сонгогддог
            </div>
            <p className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">Professional (Стандарт)</p>
            <div className="mb-6">
              <span className="text-xs text-emerald-400 font-bold block mb-1">НЭВТРҮҮЛЭХ ХУРААМЖ: 1.5x (Өдрийн дундаж орлого)</span>
              <span className="text-5xl font-black text-white font-mono">299,000₮</span>
              <span className="text-xs text-slate-400 block mt-2">Сар бүр (Жилээр төлвөл 17% хөнгөлөлттэй)</span>
            </div>
            <ul className="space-y-4 mb-8 text-sm text-slate-200 font-medium">
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0"/> 3 хүртэлх төхөөрөмж холболт</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0"/> Үйл ажиллагааны бүрэн удирдлага</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0"/> Ашгийн хөшүүрэг & Ухаалаг шийдэл</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0"/> Бүрэн санхүүгийн бэлэн тайлан</li>
            </ul>
            <Link 
              href="/login" 
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
            >
              14 хоног үнэгүй эхлэх <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Enterprise */}
          <div className="bg-slate-900/30 p-8 rounded-3xl border border-slate-800">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Enterprise (Сүлжээ & Корпорац)</p>
            <div className="mb-4">
              <span className="text-xs text-slate-400 font-bold block mb-1">НЭВТРҮҮЛЭХ ХУРААМЖ: Гэрээгээр тохиролцоно</span>
              <span className="text-3xl font-black text-white font-mono">599,000₮</span>
              <span className="text-xs text-slate-400 block mt-2">Сар бүр</span>
            </div>
            <ul className="space-y-4 mb-8 text-sm text-slate-300">
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0"/> Бүх Pro боломжууд</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0"/> Олон салбарын нэгдсэн удирдлага</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0"/> <strong>Custom Development (Хүссэн тусгай функц хөгжүүлэлт)</strong></li>
            </ul>
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="text-2xl font-black text-white text-center mb-10">Түгээмэл Асуултууд</h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-slate-900/30 rounded-2xl border border-slate-800/50 overflow-hidden hover:border-slate-700 transition-colors">
              <button 
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-6 text-left font-bold text-sm text-slate-200 flex justify-between items-center"
              >
                {faq.q}
                <ChevronDown className={`h-5 w-5 text-emerald-400 transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              <div className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === idx ? 'max-h-40 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
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
            <span className="font-bold text-slate-500 tracking-tight uppercase">OPERA<span className="text-emerald-500/50">LINK</span></span>
          </div>
          <p className="text-xs text-slate-600 font-medium">© 2026 Operlink Technologies. Улаанбаатар хот, Монгол Улс.</p>
        </div>
      </footer>

    </div>
  );
}