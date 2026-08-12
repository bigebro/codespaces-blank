import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { parseOperationalText, parseReceiptImage } from '../../../lib/gemini';
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
  - [ЧАТНЫ САНАХ ОЙН ДҮРЭМ]: Өмнөх чатны түүхэнд "өгөгдөл дутуу байна" гэж хэлсэн байсан ч түүгээр ХАТУУ ҮГҮЙСГЭЖ, зөвхөн одоо исэн хамгийн сүүлийн CONTEXT_DATA-г уншиж шинээр бодож хариул.
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
  1. Ундаа, кофе, шүүсний (Beverages) хувьд боломжит эрүүл Бохир Ашиг (Gross Margin) нь 75% - 85% baйна (Өртөг нь 15% - 25% байх ёстой). Хэрэв ундааны өртөг 25%-иас дээш гарвал үнийг нэмэх санал гаргана.
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

  "Хаягдалтай (wasted_only) барааны тоо хэмжээг харуулахдаа зөвхөн тайлагнагдаагүй цэвэр алдагдал болох gap хувьсагчийн утгыг ашиглана. Харин Дутуу хийгдсэн (underpoured_only) барааны хувьд raw_physical_gap хувьсагчийн утгыг ашиглана."

  [ЧАТЛАХ ФОРМАТНЫ ЗААВАР (Тохиолдол Б)] одон тэмдэг (**, *) эсвэл HTML формат ашиглаж болохгүй.
`;

export async function POST(request: Request) {
  let currentChatId: number | null = null;

  try {
    const payload = await request.json();
    const { message, callback_query } = payload;

  // A. Handle Telegram "Undo" & "Count" callbacks
    if (callback_query) {
      const chatId = callback_query.message?.chat?.id || callback_query.from?.id;
      currentChatId = chatId;
      
      await sendTelegramMessage(chatId, "🔍 [DEBUG 1] callback_query хүлээн авлаа.");

      const callbackData = callback_query.data;
      const messageId = callback_query.message?.message_id;
      const callbackQueryId = callback_query.id;

      // 1. Тоолох барааны товч дарах үед (NEW)
      if (callbackData.startsWith("cnt_")) {
        const itemName = callbackData.replace("cnt_", "");
        const promptText = `✅ [ ${itemName} ] үлдэгдэл хэд байна вэ?\n(Зөвхөн тоогоор бичнэ үү)`;
        await sendTelegramMessageWithForceReply(currentChatId!, promptText);
        return NextResponse.json({ status: 'ok' });
      }

      // 2. Тоолж дуусаад 'Ээлж хаах' ногоон товч дарах үед (NEW)
      if (callbackData === "close_shift_final") {
        await supabase.from('shifts')
          .update({ is_active: false, end_time: new Date().toISOString() })
          .eq('telegram_chat_id', currentChatId)
          .eq('is_active', true);
        
        await answerTelegramCallback(callbackQueryId, "Ээлж хаагдлаа");
        await editTelegramMessage(currentChatId!, messageId, "✅ Ээлжийн тооллого хийгдэж, ээлж амжилттай хаагдлаа.");
        await sendTelegramMessageWithMenu(currentChatId!, "🌙 Таны ээлж хаагдсан. Сайхан амраарай!");
        return NextResponse.json({ status: 'ok' });
      }

      // 3. Undo (Буцаах) товч дарах үед (Таны код хэвээрээ)
      if (callbackData.startsWith("undo_")) {
        const logId = callbackData.replace("undo_", "");
        await sendTelegramMessage(chatId, `🔍 [DEBUG 2] Цуцлах лог ID: ${logId}`);
        
        if (!logId || logId === "undefined" || logId === "null") {
          await sendTelegramMessage(chatId, "❌ [DEBUG 3] Алдаа: Цуцлах гүйлгээний ID олдсонгүй (undefined). Supabase-д бичих үед SELECT эрх хаалттай байж магадгүй.");
          return NextResponse.json({ status: 'ok' });
        }

        const { error: deleteError } = await supabase.from('inventory_logs').delete().eq('id', logId);

        if (deleteError) {
          await sendTelegramMessage(chatId, `❌ [DEBUG 4] Supabase Устгах алдаа: ${deleteError.message}`);
          return NextResponse.json({ status: 'ok' });
        }
        
        await sendTelegramMessage(chatId, "✅ [DEBUG 5] Supabase-ээс амжилттай устгагдлаа. Текст шинэчилж байна...");
        await answerTelegramCallback(callbackQueryId, "Бүртгэлийг цуцаллаа.");
        
        const deletedText = "❌ Бүртгэл цуцлагдлаа (Үлдэгдэл буцаж сэргэсэн).";
        await editTelegramMessage(currentChatId!, messageId, deletedText);

        const promptText = "Та гүйлгээгээ доор зөвөөр дахин бичнэ үү:";
        await sendTelegramMessageWithForceReply(currentChatId!, promptText);
      }
      return NextResponse.json({ status: 'ok' });
    }

   if (!message || (!message.text && !message.photo)) return NextResponse.json({ status: 'ok' });

    currentChatId = message.chat.id;

    
   // ШИНЭ: ЗУРАГ ЯВУУЛСАН ЭСЭХИЙГ ШАЛГАХ (E-BARIMT СКАЙНЕР)
    if (message.photo && message.photo.length > 0) {
      await sendTelegramMessage(currentChatId, "📸 Баримтын зургийг хүлээн авлаа. AI уншиж байна, түр хүлээнэ үү...");
      
      try {
        // 1. Get the highest quality photo from Telegram
        const photo = message.photo[message.photo.length - 1];
        const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${photo.file_id}`);
        const fileData = await fileRes.json();
        const filePath = fileData.result.file_path;
        
        // 2. Download the image and convert to Base64 for Gemini
        const imageRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`);
        const arrayBuffer = await imageRes.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');

        // 3. Get tenant info
        const { data: userProfile } = await supabase.from('profiles').select('client_id').eq('telegram_chat_id', currentChatId).single();
        const tenantClientId = userProfile?.client_id || 'SF Coffee';

        const { data: ingredients } = await supabase.from('ingredients').select('id, name, unit').eq('client_id', tenantClientId);
        const allowedNames = ingredients ? ingredients.map((i: any) => i.name) : [];

        // 4. Send to Gemini Vision
        const aiAnalysis = await parseReceiptImage(base64Image, allowedNames);

        if (!aiAnalysis || aiAnalysis.success === false) {
          await sendTelegramMessage(currentChatId, aiAnalysis?.error_message || "❌ Зургийг таньж чадсангүй.");
          return NextResponse.json({ status: 'ok' });
        }

        // 5. Insert all parsed items into the database
        let successMessage = "✅ **Татан авалт амжилттай бүртгэгдлээ:**\n\n";
        const logsToInsert: any[] = [];

        for (const item of aiAnalysis.purchases) {
          const ing = ingredients?.find((i: any) => i.name === item.item_name);
          if (ing) {
            logsToInsert.push({
              client_id: tenantClientId,
              ingredient_id: ing.id,
              quantity: Math.abs(item.quantity),
              type: 'purchase',
              total_cost: item.total_cost || 0,
              notes: item.notes || "E-Barimt Scan",
              // date: new Date().toISOString()
              date:'2026-06-15T12:00:00.000Z'
            });
            successMessage += `• ${ing.name}: ${item.quantity} ${ing.unit} (${item.total_cost}₮)\n`;
          } else {
             // Non-food / Unmatched item (OPEX)
             logsToInsert.push({
              client_id: tenantClientId,
              non_food_item: item.item_name,
              quantity: Math.abs(item.quantity),
              type: 'purchase',
              total_cost: item.total_cost || 0,
              notes: "E-Barimt Scan (OPEX)",
              // date: new Date().toISOString()
               date: '2026-06-15T12:00:00.000Z' 
            });
            successMessage += `• ${item.item_name} (Бусад): ${item.quantity} ширхэг (${item.total_cost}₮)\n`;
          }
        }

        if (logsToInsert.length > 0) {
          await supabase.from('inventory_logs').insert(logsToInsert);
        }

        await sendTelegramMessage(currentChatId, successMessage);
        return NextResponse.json({ status: 'ok' });

      } catch (err) {
        console.error("Photo Error:", err);
        await sendTelegramMessage(currentChatId, "❌ Зураг унших үед системийн алдаа гарлаа.");
        return NextResponse.json({ status: 'ok' });
      }
    }



        const incomingText = message.text ? message.text.trim() : (message.caption ? message.caption.trim() : "");
            // B. БАРИСТА ЗӨВХӨН ТОО БИЧИЖ ХАРИУЛАХ ҮЕД (Шууд агуулахад хадгална)
         if (message.reply_to_message && message.reply_to_message.text && message.reply_to_message.text.includes("үлдэгдэл хэд байна вэ?")) {
      const match = message.reply_to_message.text.match(/\[ (.*?) \]/); // Хаалтан дотроос нэрийг ялгаж авна
      if (match && match[1]) {
        const itemName = match[1];
        const qty = parseFloat(incomingText);

        if (isNaN(qty)) {
          await sendTelegramMessage(currentChatId, "❌ Алдаа: Зөвхөн тоо бичнэ үү!");
          return NextResponse.json({ status: 'ok' });
        }

        const { data: userProfile } = await supabase.from('profiles').select('client_id').eq('telegram_chat_id', currentChatId).single();
        const tenantClientId = userProfile?.client_id || 'SF Coffee';

        const { data: ingredient } = await supabase.from('ingredients').select('id, unit').eq('name', itemName).eq('client_id', tenantClientId).single();
        
        if (ingredient) {
          // Тооллогыг өгөгдлийн санд шууд 'count' төрлөөр хадгалах
          await supabase.from('inventory_logs').insert([{
            client_id: tenantClientId,
            ingredient_id: ingredient.id,
            quantity: qty,
            type: 'count',
            notes: 'Ээлж хаалтын тооллого',
            date: new Date().toISOString()
          }]);
          await sendTelegramMessage(currentChatId, `👍 ${itemName}: ${qty} ${ingredient.unit} бүртгэгдлээ. Дээд талын цэснээс дараагийн бараагаа сонгоно уу.`);
        }
      }
      return NextResponse.json({ status: 'ok' });
    }

     // 1. TENANT LOOKUP: Check which cafe branch this Telegram user belongs to [3]
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('telegram_chat_id', currentChatId)
      .single();

    // 2. If the Telegram user is not linked to any cafe tenant
    if (!userProfile && incomingText !== "/start" && !incomingText.startsWith("/link")) {
      const linkPrompt = `❌ Төхөөрөмж холбогдоогүй байна.\n\nТа системд холбогдохын тулд дараах тушаалаар бүртгүүлнэ үү:\n\n/link [Таны бүртгэлтэй имэйл] [нууц үг]\n\nЖишээ: /link bigeeonline@gmail.com 123456`;
      await sendTelegramMessage(currentChatId, linkPrompt);
      return NextResponse.json({ status: 'ok' });
    }

    const tenantClientId = userProfile?.client_id || 'SF Coffee'; // Fallback to default

    // 3. Handle "/link" command for easy onboarding
    if (incomingText.startsWith("/link")) {
      const parts = incomingText.split(" ");
      if (parts.length < 3) {
        await sendTelegramMessage(currentChatId, "❌ Алдаа: Формат буруу байна. Жишээ: /link email@example.com password123");
        return NextResponse.json({ status: 'ok' });
      }

      const emailInput = parts[1].trim();
      const passwordInput = parts[2].trim();

      await sendTelegramMessage(currentChatId, "⏳ Бүртгэлийг баталгаажуулж байна...");

      // Authenticate their email/password with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput
      });

      if (authError || !authData.user) {
        await sendTelegramMessage(currentChatId, "❌ Алдаа: Имэйл эсвэл нууц үг буруу байна.");
        return NextResponse.json({ status: 'ok' });
      }

        await supabase
        .from('profiles')
        .update({ telegram_chat_id: null })
        .eq('telegram_chat_id', currentChatId);

      // Map their Telegram Chat ID to their Profile [3]
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ telegram_chat_id: currentChatId })
        .eq('id', authData.user.id);

      if (updateError) {
        await sendTelegramMessage(currentChatId, "❌ Холбоход алдаа гарлаа. Профайлыг шинэчилж чадсангүй.");
      } else {
        await sendTelegramMessage(currentChatId, `✅ Амжилттай холбогдлоо!\n\nТаны бүртгэл: ${emailInput}\nСалбар: ${authData.user.user_metadata?.client_id || 'SF Coffee'}`);
      }
      return NextResponse.json({ status: 'ok' });
    }
    

    // 1. Handle "/start" command
    if (incomingText === "/start") {
      const welcomeText = "Сайн байна уу? 'SF Coffee' ухаалаг туслах ботод тавтай морилно уу! ☕✨\n\nЭнэхүү ботоор дамжуулан өдөр тутмын үйл ажиллагааг удирдах, асуулт асууж зөвлөгөө авах боломжтой.\n\nЗаавар:\n• Үлдэгдэл зарлага бүртгэх: 'Хаягдал: Сүү 500'\n• Ажилтны хоол бүртгэх: 'Оройн хоолонд 2 өндөг орлоо'\n• Тайлан харах: /report\n• Асуулт асуух: Шууд чатлах хэлбэрээр асууна уу.";
      await sendTelegramMessage(currentChatId, welcomeText);
      return NextResponse.json({ status: 'ok' });
    }

    // 2. Handle "/report" or "Тайлан харах" commands (Case A)
    if (incomingText === "/report" || incomingText.toLowerCase() === "тайлан харах") {
      await sendTelegramMessage(currentChatId, "⏳ Санхүүгийн үзүүлэлтүүдийг бодож байна, түр хүлээнэ үү...");

      const reqUrl = new URL(request.url);
      const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
      
     const response = await fetch(`${baseUrl}/api/analytics`, { cache: 'no-store' });
      const analyticsData = await response.json();

      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
      const promptPayload = `NEW_DATA: ${JSON.stringify(analyticsData)}`;

      const aiResponse = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: `System: ${AI_SYSTEM_PROMPT}\n\nInput Data: ${promptPayload}` }] }
        ]
      });

      const reportText = aiResponse.response.text().replace(/\*|\*\*/g, "").trim(); 
      await sendTelegramMessage(currentChatId, reportText);
      return NextResponse.json({ status: 'ok' });
    }

    const lowercaseMsg = incomingText.toLowerCase();

    // 1. ЭЭЛЖ ЭХЛЭХ ЛОГИК (☀️ Ээлж эхлэх товчийг мэдэрнэ)
    if (incomingText === "/shift_start" || lowercaseMsg === "ээлж эхлэх" || lowercaseMsg === "☀️ ээлж эхлэх") {
      // Идэвхтэй ээлж байгаа эсэхийг шалгах
      const { data: activeShift } = await supabase
        .from('shifts')
        .select('id')
        .eq('telegram_chat_id', currentChatId)
        .eq('is_active', true)
        .maybeSingle();

      if (activeShift) {
        const errorText = "Сануулга: Таны ээлж хэдийнэ эхэлсэн байна. Орой ажил дуусах үед доорх цэсний '🌙 Ээлж хаах' товчийг ашиглан ээлжээ хаана уу.";
        await sendTelegramMessageWithMenu(currentChatId, errorText);
        return NextResponse.json({ status: 'ok' });
      }

      // Шинэ идэвхтэй ээлж нээх
      await supabase
        .from('shifts')
        .insert([{
          client_id: tenantClientId,
          telegram_chat_id: currentChatId,
          is_active: true
        }]);

      const startConfirmText = "Сайн байна уу? Таны өнөөдрийн ээлж амжилттай эхэллээ. Ажлын бүтээмж өндөр, сайхан өдрийг хүсэн ерөөе! Ажил дуусах үед ээлжээ цэснээс заавал хааж хэвшээрэй.";
      await sendTelegramMessageWithMenu(currentChatId, startConfirmText);
      return NextResponse.json({ status: 'ok' });
    }

  // Ээлж хаах логик (The Intelligent Shift Closer with Buttons)
    if (incomingText === "/shift_end" || lowercaseMsg === "ээлж хаах" || lowercaseMsg === "ээлж буулаа" || lowercaseMsg === "🌙 ээлж хаах") {
      const { data: activeShift } = await supabase
        .from('shifts')
        .select('id')
        .eq('telegram_chat_id', currentChatId)
        .eq('is_active', true)
        .maybeSingle();

      if (!activeShift) {
        const noShiftText = "Алдаа: Идэвхтэй ээлж олдсонгүй. Та эхлээд доорх цэсний '☀️ Ээлж эхлэх' товчоор ээлжээ эхлүүлнэ үү.";
        await sendTelegramMessageWithMenu(currentChatId, noShiftText);
        return NextResponse.json({ status: 'ok' });
      }

      const reqUrl = new URL(request.url);
      const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
      const response = await fetch(`${baseUrl}/api/analytics?clientId=${encodeURIComponent(tenantClientId)}`, { cache: 'no-store' });
      const analyticsData = await response.json();

      const criticalItems = analyticsData.all_inventory_data?.filter((i: any) => 
        i.is_critical === true && i.live_stock <= (i.par_level * 1.5)
      ) || [];

      const nonCriticalItems = analyticsData.all_inventory_data?.filter((i: any) => i.is_critical !== true) || [];
      const sortedCycleItems = nonCriticalItems.sort((a: any, b: any) => {
        const dateA = new Date(a.last_counted_at || '2000-01-01').getTime();
        const dateB = new Date(b.last_counted_at || '2000-01-01').getTime();
        return dateA - dateB;
      });
      const cycleItems = sortedCycleItems.slice(0, 5);

      const finalItemsToCount = [...criticalItems, ...cycleItems];

      if (finalItemsToCount.length > 0) {
        // ТЕЛЕГРАМ ТОВЧЛУУРУУД (INLINE BUTTONS) ҮҮСГЭХ
        let buttons = finalItemsToCount.map((item: any) => ([{
          text: `📝 ${item.name} তোলো (Системд: ${Math.round(((item.live_stock ?? 0) as number) * 10) / 10} ${item.unit})`,
          callback_data: `cnt_${item.name}`
        }]));
        
        // Хамгийн доор ээлж хаах ногоон товч нэмэх
        buttons.push([{ text: "🏁 Тоолж дууссан, Ээлж хаах", callback_data: "close_shift_final" }]);

        const text = "🛑 Ээлж хаагдахад бэлэн боллоо.\n\nАгуулахын зөрүү үүсэхээс сэргийлж доорх товчнууд дээр дарж бодит үлдэгдлийг тоогоор оруулна уу:";
        
        // Товчлууртай мессеж явуулах (Энэ функц таны файлын хамгийн доор байх ёстой)
        await sendTelegramMessageWithInlineKeyboard(currentChatId, text, buttons);
      } else {
        // Тоолох зүйл байхгүй бол шууд хаана
        await supabase
          .from('shifts')
          .update({ is_active: false, end_time: new Date().toISOString() })
          .eq('id', activeShift.id);
          
        const closeConfirmText = "🌙 Ээлж амжилттай хаагдлаа. Агуулахын бүх барааны нөөц хэвийн байна. Сайхан амраарай!";
        await sendTelegramMessageWithMenu(currentChatId, closeConfirmText);
      }
      
      return NextResponse.json({ status: 'ok' });
    }
    // 3. Process with AI Router
    const { data: ingredients } = await supabase.from('ingredients').select('name');
    const allowedNames = ingredients ? ingredients.map((i: any) => i.name) : [];

    const aiAnalysis = await parseOperationalText(incomingText, allowedNames);

    if (aiAnalysis && aiAnalysis.is_transaction === true) {
      if (aiAnalysis.success === false) {
        const fallbackErrorMsg = "❌ Уучлаарай, бичсэн өгөгдлийг систем ойлгосонгүй.\n\nЗөвхөн Монгол хэлээр бүртгэнэ үү. Жишээ:\n• 'Хаягдал: Сүү 500'\n• 'Татан авалт: Сүү 10, Нийт 58000'\n• 'Хоолонд 2 өндөг орлоо'";
        await sendTelegramMessage(currentChatId, aiAnalysis.error_message || fallbackErrorMsg);
        return NextResponse.json({ status: 'ok' });
      }

      // Fetch ingredient ID from the DB
      const { data: ingredient } = await supabase
        .from('ingredients')
        .select('id, unit, unit_price')
        .eq('name', aiAnalysis.item_name)
        .single();

      if (!ingredient) {
        await sendTelegramMessage(currentChatId, `❌ Алдаа: '${aiAnalysis.item_name}' нэртэй түүхий эд олдсонгүй.`);
        return NextResponse.json({ status: 'ok' });
      }

      // Save operational log to Supabase
      const { data: log, error: logError } = await supabase
        .from('inventory_logs')
        .insert([{
          ingredient_id: ingredient.id,
          quantity: aiAnalysis.quantity,
          type: aiAnalysis.type,
          notes: aiAnalysis.notes,
          date: '2026-06-15T12:00:00.000Z' // Forced testing date
        }])
        .select()
        .single();

      if (logError) {
        await sendTelegramMessage(currentChatId, `❌ Supabase хадгалах алдаа: ${logError.message}`);
        return NextResponse.json({ status: 'ok' });
      }

      if (!log || !log.id) {
        await sendTelegramMessage(currentChatId, "⚠️ Анхаар: Өгөгдлийг хадгалсан боловч буцааж уншиж чадсангүй (Supabase RLS-ийн SELECT эрхийг шалгана уу). Буцаах (Undo) товч ажиллахгүй.");
        return NextResponse.json({ status: 'ok' });
      }

      // Send confirmation with Undo action
      const confirmText = `📝 Бүртгэгдлээ:\n• Төрөл: ${aiAnalysis.type}\n• Бараа: ${aiAnalysis.item_name}\n• Хэмжээ: ${Math.abs(aiAnalysis.quantity)} ${ingredient.unit}\n• Тайлбар: ${aiAnalysis.notes || 'Тэмдэглэл байхгүй'}`;
      
      await sendTelegramMessageWithUndo(currentChatId!, confirmText, log.id);
      return NextResponse.json({ status: 'ok' });
    }

    

   // 4. Default Fallback Handler (Case B - Chatting / Advisory)
    const reqUrl = new URL(request.url);
    const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
    
    // FIX A: Pass the active tenant ID and bypass the database cache securely [2]
    const response = await fetch(`${baseUrl}/api/analytics?clientId=${encodeURIComponent(tenantClientId)}`, { cache: 'no-store' });
    const analyticsData = await response.json();

    // FIX B: Use the ultra-fast 1.5-flash model to prevent Vercel timeouts [1]
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const promptPayload = `CONTEXT_DATA: ${JSON.stringify(analyticsData)}\n\nUser Question: ${incomingText}`;

    const aiResponse = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `System: ${AI_SYSTEM_PROMPT}\n\nInput Data: ${promptPayload}` }] }]
    });

    const replyText = aiResponse.response.text().replace(/\*|\*\*/g, "").trim(); 
    await sendTelegramMessage(currentChatId, replyText);

    return NextResponse.json({ status: 'ok' });

  } catch (error: any) {
    console.error("Webhook processing failed:", error);
    if (currentChatId) {
      await sendTelegramMessage(currentChatId, `⚠️ Уучлаарай, системд алдаа гарлаа: ${error.message}`);
    }
    return NextResponse.json({ status: 'ok' });
  }
}

async function sendTelegramMessage(chatId: number | null, text: string) {
  if (!chatId) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" })
  });
}

// Баристагийн утасны доод хэсэгт ээлж эхлэх, хаах товчийг байнга харуулдаг ухаалаг цэс
async function sendTelegramMessageWithMenu(chatId: number | null, text: string) {
  if (!chatId) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: {
        keyboard: [
          [
            { text: "☀️ Ээлж эхлэх" },
            { text: "🌙 Ээлж хаах" }
          ],
          [
            { text: "📊 Тайлан харах" }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    })
  });
}
async function sendTelegramMessageWithUndo(chatId: number | null, text: string, logId: string) {
  if (!chatId) return;
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

async function editTelegramMessage(chatId: number | null, messageId: number, text: string) {
  if (!chatId) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      chat_id: chatId, 
      message_id: messageId, 
      text: text,
      reply_markup: { inline_keyboard: [] }
    })
  });
}

async function sendTelegramMessageWithForceReply(chatId: number, text: string) {
  if (!chatId) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      chat_id: chatId, 
      text: text,
      reply_markup: {
        force_reply: true,
        selective: true
      }
    })
  });
}

async function answerTelegramCallback(callbackQueryId: string, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text })
  });
}

// Товчлууртай жагсаалт илгээх туслах функц
async function sendTelegramMessageWithInlineKeyboard(chatId: number | null, text: string, inline_keyboard: any[]) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, reply_markup: { inline_keyboard } })
  });
}

