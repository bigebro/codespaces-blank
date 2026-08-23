"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'; // 👈 1. dynamic-ийг оруулж ирнэ
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Zap, 
  CheckCircle2, 
  Play, 
  ArrowRight, 
  Calculator, 
  ShieldAlert, 
  Coffee,
  ScanLine,
  Bot,
  BarChart3,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';

function PremiumLandingPage() {
  const router = useRouter();
  const [dailyRevenue, setDailyRevenue] = useState(1500000);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // Браузер дээр бүрэн сууж дуустал хүлээх
  useEffect(() => {
    setMounted(true);
  }, []);

  // Hormozi-style ROI Math
  const monthlyRevenue = dailyRevenue * 30;
  const estimatedWasteSaved = Math.round(monthlyRevenue * 0.05); // 5% minimum saved
  const monthlySoftwareFee = Math.round(monthlyRevenue * 0.012); // 1.2% Pro fee
  const pureProfit = estimatedWasteSaved - monthlySoftwareFee;

  const faqs = [
    {
      q: "ПОС систем байхад яагаад Smart BoH хэрэгтэй гэж?",
      a: "ПОС систем зөвхөн урд лангуун дээрх 'Орлого'-ыг хянадаг. Гал тогоонд хэдэн литр сүү асгарч, хэчнээн орц хулгайд алдагдаж, таны ашгийг идэж байгааг ПОС хэзээ ч хэлж чадахгүй. Бид таны 'Зардал' болон 'Алдагдал'-ыг хянана."
    },
    {
      q: "Ажилтнууд заавал өөрийн гар утсаа ашиглах шаардлагатай юу?",
      a: "Үгүй. Гал тогоонд нэг л дундын Таблет (Kiosk) байрлуулахад хангалттай. Ингэснээр ажилтнууд гар утсаа оролдох шаардлагагүй болж, эрүүл ахуйн шаардлага хангасан цэвэр орчинд ажилдаа бүрэн төвлөрөх боломжтой болно."
    },
    {
      q: "Нягтлан бодогчийн ажлыг яаж хөнгөвчлөх вэ?",
      a: "Бариста нарын дарсан E-Barimt болон барааны зургийг AI автоматаар уншиж, COGS болон OPEX-ээр ангилна. Сарын эцэст татварын албанд (MTA) өгөх Excel тайлан бэлэн гарч ирнэ."
    }
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-emerald-400 font-semibold animate-pulse">Ачаалж байна...</p>
      </div>
    );
  }

  return (
    // 👈 2. suppressHydrationWarning={true} нэмснээр Extension-ий нөлөөгөөр гарах алдаа бүрэн арилна
    <div 
      suppressHydrationWarning={true}
      className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30 overflow-hidden relative"
    >
      
      {/* BACKGROUND GLOW EFFECTS (Premium UI) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500 via-transparent to-transparent blur-3xl rounded-full mix-blend-screen"></div>
      </div>

      {/* 1. TRANSPARENT NAVBAR */}
      <nav className="relative z-50 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push('/')}>
          <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
            <Coffee className="h-6 w-6 text-emerald-400" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">
            SMART<span className="text-emerald-400">BoH</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/login')} className="text-sm font-bold text-slate-400 hover:text-white transition">
            Нэвтрэх
          </button>
          <button onClick={() => router.push('/login')} className="hidden sm:flex bg-white text-slate-950 hover:bg-slate-200 font-black text-sm px-6 py-2.5 rounded-xl transition items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            Үнэгүй турших <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </nav>

      {/* 2. THE HERO SECTION */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider mb-8 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
          Ресторан, Кофе Шопын Эздэд Зориулав
        </div>
        
        <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-[1.1] mb-8">
          ПОС систем орлогыг бүртгэдэг. <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Харин бид гал тогоог удирдана.</span>
        </h1>
        
        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
          Цаасаар бүртгэдэг хуучин аргыг халж, таблет болон AI ашиглан орц, хаягдал, ажилчдын өдөр тутмын даалгаврыг эмх цэгцтэй, шилэн болгох ухаалаг BOH систем.
        </p>

        {/* Video Placeholder */}
        <div className="relative max-w-4xl mx-auto mb-12 rounded-3xl overflow-hidden border border-white/10 bg-slate-900/50 aspect-video shadow-2xl backdrop-blur-sm group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-blue-500/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(255,255,255,0.3)] group-hover:scale-110 transition-transform duration-300">
              <Play className="h-8 w-8 text-slate-950 fill-current ml-1" />
            </div>
            <p className="text-sm font-bold text-white tracking-wide">3 минутын системийн танилцуулга үзэх</p>
          </div>
        </div>

        <button onClick={() => router.push('/login')} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base px-10 py-5 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 mx-auto">
          14 Хоног Үнэгүй Ашиглах <ArrowRight className="h-5 w-5" />
        </button>
      </section>

      {/* 3. HORMOZI LEAD MAGNET */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-gradient-to-r from-blue-900/40 to-emerald-900/40 p-1 rounded-3xl">
          <div className="bg-slate-950 rounded-[22px] p-8 sm:p-10 text-center border border-white/5">
            <ShieldCheck className="h-12 w-12 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">Хоосон систем өгөөд орхихгүй. Бид тохируулна.</h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              Та шинэ систем сурах, жор шивэх гэж цаг үрэх шаардлагагүй. Бид танай технологийн карт, орцын мэдээллийг системд <strong>100% бүрэн оруулж, бэлэн болгож өгнө.</strong> Үүний дараа таны <strong>14 хоногийн ҮНЭГҮЙ туршилт</strong> эхлэх бөгөөд, гал тогооны эмх цэгц бодитоор сайжирсан үед л нэвтрүүлэлтийн хураамж болон сарын төлбөр идэвхжинэ. Эрсдэл 100% бидний талд.
            </p>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Систем хэрхэн ажилладаг вэ?</h2>
          <p className="text-slate-400">Хүний оролцоог багасгаж, AI технологиор удирдах 3 алхам.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-emerald-500/30 transition-colors">
            <div className="h-14 w-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
              <ScanLine className="h-7 w-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">1. AI Баримт Уншигч</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ажилтнууд гараар тоо шивэхгүй. Орж ирсэн бараа эсвэл E-Barimt-ийн зургийг таблетаар дарахад AI автоматаар уншиж агуулахад бүртгэнэ.
            </p>
          </div>
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-emerald-500/30 transition-colors">
            <div className="h-14 w-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20">
              <Bot className="h-7 w-7 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">2. Ухаалаг Kiosk Таблет</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Гал тогоонд ганц л таблет байна. Ажилтан PIN кодоор нэвтэрч, өдрийн даалгавраа (Task) чеклээд, 5-хан бараа тоолоод ээлжээ хаана.
            </p>
          </div>
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-emerald-500/30 transition-colors">
            <div className="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
              <BarChart3 className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">3. Менежерийн Тайлан</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ээлж хаагдах бүрд менежерийн утсанд ажлын тайлан очно. Ажилчдын хийсэн даалгавар, зарлага, татан авалтын баримтууд нэгтгэгдэж, гал тогооны үйл ажиллагаа 100% шилэн болно.
            </p>
          </div>
        </div>
      </section>

      {/* 5. ROI CALCULATOR */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-slate-900/80 p-8 sm:p-12 rounded-[2rem] border border-slate-700 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>

          <div className="text-center mb-10 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 flex items-center justify-center gap-3">
              <Calculator className="text-emerald-400 h-8 w-8" /> Таны бодит хэмнэлт
            </h2>
            <p className="text-sm text-slate-400">Тоо хэзээ ч худлаа хэлдэггүй. Орлогоо оруулаад ашгаа хар.</p>
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
              <p className="text-xs text-slate-400 font-bold uppercase mb-2">Зогсоох алдагдал (5%)</p>
              <p className="text-2xl font-black text-white font-mono">+{estimatedWasteSaved.toLocaleString()} ₮</p>
            </div>
            <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5">
              <p className="text-xs text-slate-400 font-bold uppercase mb-2">Системийн зардал (1.2%)</p>
              <p className="text-2xl font-black text-rose-400 font-mono">-{monthlySoftwareFee.toLocaleString()} ₮</p>
            </div>
            <div className="bg-emerald-500/20 p-6 rounded-2xl border border-emerald-500/50 transform sm:scale-110 shadow-lg">
              <p className="text-xs text-emerald-400 font-black uppercase mb-2 tracking-wide">Танд үлдэх цэвэр ашиг</p>
              <p className="text-3xl font-black text-emerald-400 font-mono">+{pureProfit.toLocaleString()} ₮</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PRICING TIERS */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Шударга үнэ. Тогтмол шимтгэлгүй.</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">Танай борлуулалт өсвөл бид хамт өснө. Орлого муутай сард таны зардал багасна.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="bg-slate-900/30 p-8 rounded-3xl border border-slate-800">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Starter</p>
            <div className="mb-4">
              <span className="text-xs text-slate-400 font-bold block mb-1">НЭВТРҮҮЛЭХ ХУРААМЖ: 1.5x (Өдрийн дундаж орлого)</span>
              <span className="text-3xl font-black text-white font-mono">0.8%</span>
              <span className="text-xs text-slate-400 block mt-2">Сарын орлогоос (Мин: 100,000₮)</span>
            </div>
            <ul className="space-y-4 mb-8 text-sm text-slate-300">
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0"/> Telegram Bot бүртгэл</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0"/> E-Barimt AI уншигч</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0"/> COGS & OPEX тайлан</li>
            </ul>
          </div>

          <div className="bg-slate-900 p-10 rounded-[2rem] border-2 border-emerald-500 relative shadow-[0_0_50px_rgba(16,185,129,0.15)] transform md:scale-105 z-10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-black text-xs uppercase px-4 py-1.5 rounded-full">
              Хамгийн их сонгогддог
            </div>
            <p className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">Professional BOH</p>
            <div className="mb-6">
              <span className="text-xs text-emerald-400 font-bold block mb-1">НЭВТРҮҮЛЭХ ХУРААМЖ: 2.0x (Өдрийн дундаж орлого)</span>
              <span className="text-5xl font-black text-white font-mono">1.2%</span>
              <span className="text-xs text-slate-400 block mt-2">Сарын орлогоос (Мин: 250,000₮)</span>
            </div>
            <ul className="space-y-4 mb-8 text-sm text-slate-200 font-medium">
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0"/> Бүх Starter боломжууд</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0"/> Гал тогооны Таблет Kiosk</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0"/> Даалгаврын удирдлага (SOP)</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0"/> Ажилтан бүрийн Аудит Лог</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0"/> 09:00 Автомат захиалгын сануулга</li>
            </ul>
            <button onClick={() => router.push('/login')} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl text-sm transition shadow-lg">
              14 хоног үнэгүй эхлэх
            </button>
          </div>

          <div className="bg-slate-900/30 p-8 rounded-3xl border border-slate-800">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Enterprise CFO</p>
            <div className="mb-4">
              <span className="text-xs text-slate-400 font-bold block mb-1">НЭВТРҮҮЛЭХ ХУРААМЖ: 2.5x (Өдрийн дундаж орлого)</span>
              <span className="text-3xl font-black text-white font-mono">1.5%</span>
              <span className="text-xs text-slate-400 block mt-2">Сарын орлогоос (Мин: 500,000₮)</span>
            </div>
            <ul className="space-y-4 mb-8 text-sm text-slate-300">
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0"/> Бүх Pro боломжууд</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0"/> 24/7 AI Санхүүгийн Зөвлөх</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0"/> Банкны хуулга тулгагч AI</li>
              <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0"/> Татварын E-Tax экспорт</li>
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
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-slate-500" />
            <span className="font-bold text-slate-500 tracking-tight">SMART <span className="text-emerald-500/50">BoH</span></span>
          </div>
          <p className="text-xs text-slate-600 font-medium">© 2026 Smart BoH Cloud ERP. Улаанбаатар хот, Монгол Улс.</p>
        </div>
      </footer>

    </div>
  );
}

// 👈 3. SSR-ийг хааж dynamic экспорт хийнэ
const PremiumLandingPageExport = dynamic(() => Promise.resolve(PremiumLandingPage), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-950" suppressHydrationWarning={true}>
      <p className="text-emerald-400 font-semibold text-lg animate-pulse" suppressHydrationWarning={true}>Ачаалж байна...</p>
    </div>
  )
});

export default PremiumLandingPageExport;