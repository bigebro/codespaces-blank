import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { parseOperationalText, parseReceiptImage } from '../../../lib/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const AI_SYSTEM_PROMPT = `
  Та ШУТИС-ийн (MUST) дэргэдэх "SF Coffee" кофе шопын санхүүгийн ахлах зөвлөх болон стратегийн хамтрагч юм. 

  [АЖИЛЛАХ ГОРЫМ - ХАТУУ МӨРДӨХ]

  ТОХИОЛДОЛ А (Оролт "NEW_DATA:" гэж эхэлбэл - Тайлан гаргах):
  - Доорх загварын дагуу маш товч, цэгцтэй "САНХҮҮГИЙН ТАЙЛАН"-г гаргана.
  - [ХЯЗГААРЛАЛТ]: Тайлангийн нийт урт 1800 тэмдэгтээс хэтэрч болохгүй. Илүү үггүй, маш товч бичнэ.

  ТОХИОЛДОЛ Б (Хэрэглэгч асуулт асуух үед - Чатлах / Зөвлөх):
  - ТАЙЛАНГИЙН ЗАГВАРЫГ ДАХИН БИТГИЙ БИЧ, ХООСОН ЗАГВАР БҮҮ ҮЗҮҮЛ.
  - [ЧАТНЫ САНАХ ОЙН ДҮРЭМ]: Өмнөх чатны түүхэнд "өгөгдөл дутуу байна" гэж хэлсэн байсан ч түүгээр ХАТУУ ҮГҮЙСГЭЖ, зөвхөн одоо ирсэн хамгийн сүүлийн CONTEXT_DATA-г уншиж шинээр бодож хариул.
  - Ирсэн өгөгдөл дэх all_recipes (бүх 73 ундаа хоолны бүтэн жор), menu_performance (бодит борлуулалт, ашиг), болон all_inventory_data (нийт 72+ барааны бодит зөрүү, үнэ, нэгж) датаг бүрэн ашиглаж асуултад шууд хариул [2, 3].
  - Ирсэн өгөгдөл дэх "underpoured_only" (зөвхөн дутуу хийгдсэн/илүүдэлтэй бараанууд) болон "wasted_only" (зөвхөн хаягдал/алдагдалтай бараанууд) массивыг ашиглаж асуултад шууд хариулна. "all_inventory_data" массивыг ашиглаж өөрөө шүүх гэж оролдож болохгүй.
  - Хэрэглэгч үйл ажиллагааны зардлын (OPEX) задаргааг асуувал, opex_details доторх бүх гүйлгээнүүдийг нэг бүрчлэн нэрлэж, маш тодорхой хариулна уу [1, 3].

  ---
  📊 САНХҮҮГИЙН ТАЙЛАН (Тохиолдол А):
  • Нийт орлого: [revenue]₮
  • Бодит COGS (Жор + Хаягдал): [actual_cogs]₮ (Онолын өртөг: [theo_cogs]₮)
  • Gross Margin: [gross_margin]
  • Үйл ажиллагааны зардал (OPEX + Ажилтны Хоол + Туршилт + Бусад): [opex]₮
  • Татварын өмнөх ашиг (EBIT): [ebit]₮
  • ЦЭВЭР АШИГ: [net_profit]₮ ([net_margin])

  💎 ҮНЭТЭЙ ТҮҮХИЙ ЭД (Tracking):
  [Энд top_expensive доторх 3 барааны нэр, төлөв, зөрүүг бич. Жишээ: Beef patty: Over, зөрүү: 19 pc (₮66,500)]

  [НЭМЭЛТ САНХҮҮГИЙН ДҮРЭМ (CFO Rules for Price Recommendations)]:
  1. Ундаа, кофе, шүүсний (Beverages) хувьд боломжит эрүүл Бохир Ашиг (Gross Margin) нь 75% - 85% байна (Өртөг нь 15% - 25% байх ёстой). Хэрэв ундааны өртөг 25%-иас дээш гарвал үнийг нэмэх санал гаргана.
  2. Хоол, сэндвич, десертийн (Food) хувьд боломжит эрүүл Бохир Ашиг нь 60% - 70% байна (Өртөг нь 30% - 40% байх ёстой). Хэрэв хоолны өртөг 40%-иас дээш гарвал үнийг нэмэх санал гаргана.
  3. Үнийг нэмэх санал гаргахдаа үнийг шууд огцом биш, хэрэглэгчдийг үргээхгүйгээр хамгийн багадаа 500₮ - 1000₮-ийн хооронд үе шаттайгаар нэмэхийг зөвлөнө.
  
  ⚠️ ХАЯГДАЛ БА ЧАНАР (Зөвхөн тайлагдсан хасалт хийгдсэн бодит зөрүүг харуулна):
  • Бодит нийт алдагдал (Waste): [total_waste_loss]₮
    - Баристагийн үл мэдэгдэх хаягдал (Шалтгаангүй алдагдал): [total_unexplained_waste]₮
    - Муудаж асгарсан (Logged Spoilage): [total_logged_spoilage]₮
    - Туршилт, Сэмпл (Logged Testing): [total_logged_testing]₮
    - Ажилтны хэрэглээ (Staff Meals): [total_logged_staff_meal]₮
    - Үйл ажиллагааны зохицуулалт (Other): [total_logged_other]₮
  • Чанарын эрсдэл (Under-poured): [total_surplus_savings]₮
    (Топ 3: [top_underpoured_list])
  • Efficiency: [efficiency]

  💡 ДҮГНЭЛТ:
  [Товч дүгнэлт бичээд асуулт асууж болохыг сануул. Ажилчдын хоол, түүхий эдийн өөрчлөлтийг системд бүртгэж хэвшсэн нь маш сайн ахиц болохыг онцлон дүгнээрэй [3].]

  [ХУЛГАЙ БОЛОН АЛДАГДЛЫГ ИЛРҮҮЛЭХ ДҮРЭМ]
  - Хэрэв эзэн "Алдаа хаана гарав?", "Хулгай байна уу?" гэж асуувал өгөгдөл дэх "total_unexplained_waste" болон "gap" утгыг шалгаж хариулна.
  - Бараа тус бүр дээр ажилтан зураг авч баталгаажуулсан эсэхийг (notes хэсэгт "Scan" эсвэл "E-Barimt" байгаа эсэхээр) заавал дурдаж хариулна уу.

  "Хаягдалтай (wasted_only) барааны тоо хэмжээг харуулахдаа зөвхөн тайлагнагдаагүй цэвэр алдагдал болох gap хувьсагчийн утгыг ашиглана. Харин Дутуу хийгдсэн (underpoured_only) барааны хувьд raw_physical_gap хувьсагчийн утгыг ашиглана."
`;

export async function POST(request: Request) {
  try {
    const { tenantClientId, workerName, text, imageBase64, action, logId } = await request.json();

    // ==========================================
    // ACTION: UNDO PREVIOUS LOG
    // ==========================================
    if (action === 'undo' && logId) {
      const { error } = await supabase.from('inventory_logs').delete().eq('id', logId);
      if (error) return NextResponse.json({ success: false, message: `❌ Алдаа: ${error.message}` });
      return NextResponse.json({ success: true, message: "❌ Бүртгэл цуцлагдлаа (Үлдэгдэл буцаж сэргэсэн)." });
    }

    const { data: ingredients } = await supabase.from('ingredients').select('id, name, unit').eq('client_id', tenantClientId);
    const allowedNames = ingredients ? ingredients.map(i => i.name) : [];

    // ==========================================
    // SCENARIO A: PHOTO SCANNED (E-BARIMT)
    // ==========================================
    if (imageBase64) {
      const aiAnalysis = await parseReceiptImage(imageBase64, allowedNames);
      if (!aiAnalysis || !aiAnalysis.success) return NextResponse.json({ success: false, message: "❌ Зургийг уншиж чадсангүй." });

      const logsToInsert: any[] = [];
      let successMsg = "✅ **Татан авалт бүртгэгдлээ:**\n";

      for (const item of aiAnalysis.purchases) {
        const ing = ingredients?.find((i: any) => i.name === item.item_name);
        if (ing) {
          logsToInsert.push({ client_id: tenantClientId, ingredient_id: ing.id, quantity: Math.abs(item.quantity), type: 'purchase', total_cost: item.total_cost || 0, notes: item.notes || "E-Barimt (Kiosk)", worker_name: workerName, date: new Date().toISOString() });
          successMsg += `• ${ing.name}: ${item.quantity} ${ing.unit}\n`;
        }
      }
      if (logsToInsert.length > 0) await supabase.from('inventory_logs').insert(logsToInsert);
      return NextResponse.json({ success: true, message: successMsg });
    }

    // ==========================================
    // SCENARIO B: TEXT PARSING OR AI CHAT
    // ==========================================
    if (text) {
      const lowercaseMsg = text.toLowerCase();
      
      // 1. Try to parse it as an operation (waste, meal, etc.)
      const aiAnalysis = await parseOperationalText(text, allowedNames);
      if (aiAnalysis && aiAnalysis.is_transaction && aiAnalysis.success) {
        const ingredient = ingredients?.find(i => i.name === aiAnalysis.item_name);
        if (ingredient) {
          const { data: log } = await supabase.from('inventory_logs').insert([{
            client_id: tenantClientId, ingredient_id: ingredient.id, quantity: aiAnalysis.quantity, type: aiAnalysis.type, notes: aiAnalysis.notes || 'Kiosk AI Log', worker_name: workerName, date: new Date().toISOString()
          }]).select().single();

          return NextResponse.json({ success: true, is_log: true, log_id: log.id, message: `📝 Бүртгэгдлээ:\n• Бараа: ${aiAnalysis.item_name}\n• Хэмжээ: ${Math.abs(aiAnalysis.quantity)} ${ingredient.unit}` });
        }
      }

      // 2. If it's NOT an operation, treat it as AI Chat or /report
      const reqUrl = new URL(request.url);
      const hostUrl = `${reqUrl.protocol}//${reqUrl.host}`;
      const res = await fetch(`${hostUrl}/api/analytics?clientId=${encodeURIComponent(tenantClientId)}`, { cache: 'no-store' });
      const analyticsData = await res.json();

      const promptPayload = (text === "/report" || lowercaseMsg === "тайлан харах")
        ? `NEW_DATA: ${JSON.stringify(analyticsData)}`
        : `CONTEXT_DATA: ${JSON.stringify(analyticsData)}\n\nUser Question: ${text}`;

      const aiResponse = await genAI.getGenerativeModel({ model: 'gemini-3.6-flash' }).generateContent({
        contents: [{ role: 'user', parts: [{ text: `System: ${AI_SYSTEM_PROMPT}\n\nInput Data: ${promptPayload}` }] }]
      });

      return NextResponse.json({ success: true, is_log: false, message: aiResponse.response.text().replace(/\*|\*\*/g, "").trim() });
    }
    return NextResponse.json({ success: false, message: "No input provided." });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: `Системийн алдаа: ${error.message}` });
  }
}