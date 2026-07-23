import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { parseOperationalText } from '../../../lib/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!;
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
  - Ирсэн өгөгдөл дэх all_recipes (бүх 73 ундаа хоолны бүтэн жор), menu_performance (бодит борлуулалт, ашиг), болон all_inventory_data (нийт 72+ барааны бодит зөрүү, үнэ, нэгж) датаг бүрэн ашиглаж асуултад шууд хариул.
  - Ирсэн өгөгдөл дэх "underpoured_only" (зөвхөн дутуу хийгдсэн/илүүдэлтэй бараанууд) болон "wasted_only" (зөвхөн хаягдал/алдагдалтай бараанууд) массивыг ашиглаж асуултад шууд хариулна. "all_inventory_data" массивыг ашиглаж өөрөө шүүх гэж оролдож болохгүй.
  - Хэрэглэгч үйл ажиллагааны зардлын (OPEX) задаргааг асуувал, opex_details доторх бүх гүйлгээнүүдийг нэг бүрчлэн нэрлэж, маш тодорхой хариулна уу.

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
    - Баристагийн үл мэдэгдэх хаягдал (Шалтгаангүй алдагдал): [unexplained_waste]₮
    - Муудаж асгарсан (Logged Spoilage): [logged_spoilage]₮
    - Туршилт, Сэмпл (Logged Testing): [logged_testing]₮
    - Ажилтны хэрэглээ (Staff Meals): [logged_staff_meal]₮
    - Үйл ажиллагааны зохицуулалт (Other): [logged_other]₮
  • Чанарын эрсдэл (Under-poured): [total_surplus_savings]₮
    (Топ 3: [top_underpoured_list])
  • Efficiency: [efficiency]

  💡 ДҮГНЭЛТ:
  [Товч дүгнэлт бичээд асуулт асууж болохыг сануул. Ажилчдын хоол, түүхий эдийн өөрчлөлтийг системд бүртгэж хэвшсэн нь маш сайн ахиц болохыг онцлон дүгнээрэй.]

  "Хаягдалтай (wasted_only) барааны тоо хэмжээг харуулахдаа зөвхөн тайлагнагдаагүй цэвэр алдагдал болох gap хувьсагчийн утгыг ашиглана. Харин Дутуу хийгдсэн (underpoured_only) барааны хувьд raw_physical_gap хувьсагчийн утгыг ашиглана."

  [ЧАТЛАХ ФОРМАТНЫ ЗААВАР (Тохиолдол Б)] одон тэмдэг (**, *) эсвэл HTML формат ашиглаж болохгүй.
`;

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { message, callback_query } = payload;

    // A. Handle Telegram "Undo" callbacks
    if (callback_query) {
      const callbackData = callback_query.data;
      const chatId = callback_query.message.chat.id;
      const messageId = callback_query.message.message_id;

      if (callbackData.startsWith("undo_")) {
        const logId = callbackData.replace("undo_", "");
        await supabase.from('inventory_logs').delete().eq('id', logId);
        await editTelegramMessage(chatId, messageId, "❌ Бүртгэл амжилттай цуцлагдлаа (Үлдэгдэл буцаж сэргэсэн).");
      }
      return NextResponse.json({ status: 'ok' });
    }

    if (!message || !message.text) return NextResponse.json({ status: 'ok' });

    const chatId = message.chat.id;
    const incomingText = message.text.trim();

    // B. Handle "/report" or "Тайлан харах" commands (Runs your full analytics logic live!)
    
    if (incomingText === "/report" || incomingText.toLowerCase() === "тайлан харах") {
      await sendTelegramMessage(chatId, "⏳ Санхүүгийн үзүүлэлтүүдийг бодож байна, түр хүлээнэ үү...");

      // FIXED: Construct the base URL dynamically using request.url to bypass null origin errors
      const reqUrl = new URL(request.url);
      const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
      
      const response = await fetch(`${baseUrl}/api/analytics`);
      const analyticsData = await response.json();
      // 2. Format the payload exactly as your system prompt expects (NEW_DATA: prefix)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const promptPayload = `NEW_DATA: ${JSON.stringify(analyticsData)}`;

      const aiResponse = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: `System: ${AI_SYSTEM_PROMPT}\n\nInput Data: ${promptPayload}` }] }
        ]
      });

      const reportText = aiResponse.response.text().replace(/\*|\*\*/g, "").trim(); // Strip markdown stars
      await sendTelegramMessage(chatId, reportText);
      return NextResponse.json({ status: 'ok' });
    }

    // C. Handle Spoilage / Waste logs (Conversational AI parsing)
    if (incomingText.toLowerCase().includes("хаягдал") || incomingText.toLowerCase().includes("орлоо") || incomingText.toLowerCase().includes("авав")) {
      const { data: ingredients } = await supabase.from('ingredients').select('name');
      const allowedNames = ingredients ? ingredients.map((i: any) => i.name) : [];

      const aiLog = await parseOperationalText(incomingText, allowedNames);

      if (!aiLog || !aiLog.item_name) {
        await sendTelegramMessage(chatId, "❌ Алдаа: Бичсэн өгөгдлийг систем ойлгосонгүй. Жишээ: 'Хаягдал: Сүү 500'");
        return NextResponse.json({ status: 'ok' });
      }

      const { data: ingredient } = await supabase
        .from('ingredients')
        .select('id, unit, unit_price')
        .eq('name', aiLog.item_name)
        .single();

      if (!ingredient) {
        await sendTelegramMessage(chatId, `❌ Алдаа: '${aiLog.item_name}' олдсонгүй.`);
        return NextResponse.json({ status: 'ok' });
      }

      const { data: log, error: logError } = await supabase
        .from('inventory_logs')
        .insert([{
          ingredient_id: ingredient.id,
          quantity: aiLog.quantity,
          type: aiLog.type,
          notes: aiLog.notes
        }])
        .select().single();

      if (logError || !log) {
        await sendTelegramMessage(chatId, "❌ Алдаа: Хадгалж чадсангүй.");
        return NextResponse.json({ status: 'ok' });
      }

      const confirmText = `📝 Бүртгэгдлээ:\n• Төрөл: ${aiLog.type}\n• Бараа: ${aiLog.item_name}\n• Хэмжээ: ${Math.abs(aiLog.quantity)} ${ingredient.unit}\n• Тайлбар: ${aiLog.notes}`;
      await sendTelegramMessageWithUndo(chatId, confirmText, log.id);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function sendTelegramMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text })
  });
}

async function sendTelegramMessageWithUndo(chatId: number, text: string, logId: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: {
        inline_keyboard: [[
          { text: "Буцаах ↩️ (Undo)", callback_data: `undo_${logId}` }
        ]]
      }
    })
  });
}

async function editTelegramMessage(chatId: number, messageId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: text })
  });
}