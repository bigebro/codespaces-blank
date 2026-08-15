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
      
   // 1. Тоолох барааны товч дарах үед (Shows actual system stock in the prompt)
      if (callbackData.startsWith("cnt_")) {
        const itemName = callbackData.replace("cnt_", "");
        
        // Fetch the active shift checklist to get the frozen live_stock value
        const { data: activeShift } = await supabase.from('shifts').select('closing_checklist').eq('telegram_chat_id', currentChatId).eq('is_active', true).maybeSingle();
        let systemStock = 0;
        let unitStr = "ш";
        
        if (activeShift && activeShift.closing_checklist) {
          const checklist = typeof activeShift.closing_checklist === 'string' ? JSON.parse(activeShift.closing_checklist) : activeShift.closing_checklist;
          const item = checklist.find((i: any) => i.name.trim().toLowerCase() === itemName.trim().toLowerCase());
          if (item) {
            systemStock = parseFloat(item.live_stock) || 0;
            unitStr = item.unit || "ш";
          }
        }

        const promptText = `✅ [ ${itemName} ] үлдэгдэл хэдэн ${unitStr} байна вэ?\n(Систем дээрх үлдэгдэл: ${Math.round(systemStock * 10)/10} ${unitStr})\n\nЗөвхөн тоогоор бичнэ үү:`;
        await sendTelegramMessageWithForceReply(currentChatId, promptText);
        return NextResponse.json({ status: 'ok' });
      }

      // 2. Тоологдсон ногоон товч дарах үед (Ignore)
      if (callbackData === "ignore") {
        await answerTelegramCallback(callbackQueryId, "✅ Энэ бараа аль хэдийн тоологдсон байна.");
        return NextResponse.json({ status: 'ok' });
      }
      
      // 3. Дутуу үед хаах товч дарвал (Locked)
      if (callbackData === "close_shift_locked") {
        await answerTelegramCallback(callbackQueryId, "⚠️ Уучлаарай, 📝 тэмдэгтэй үлдсэн бараануудыг тоолж дуусгана уу!");
        return NextResponse.json({ status: 'ok' });
      }

      // 2. Тоолож дуусаад 'Ээлж хаах' ногоон товч дарах үед (Calculates Scorecard)
      if (callbackData === "close_shift_final") {
        const { data: activeShift } = await supabase.from('shifts').select('*').eq('telegram_chat_id', currentChatId).eq('is_active', true).maybeSingle();
        await answerTelegramCallback(callbackQueryId, "Ээлж хаагдлаа");
        await editTelegramMessage(currentChatId, messageId, "✅ Чек-лист тооллого амжилттай хийгдэж дууслаа.");
        
        if (activeShift) {
          await generateShiftScorecard(activeShift, currentChatId);
        } else {
          await sendTelegramMessageWithMenu(currentChatId, "🌙 Таны ээлж хаагдсан. Сайхан амраарай!");
        }
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

   // B. БАРИСТА ЗӨВХӨН ТОО БИЧИЖ ХАРИУЛАХ ҮЕД (Шууд агуулахад хадгалж, цэсийг шинэчлэх)
    if (message.reply_to_message && message.reply_to_message.text && message.reply_to_message.text.includes("үлдэгдэл")) {
      const match = message.reply_to_message.text.match(/\[(.*?)\]/);
      if (match && match[1]) {
        const itemName = match[1].trim(); 
        const qty = parseFloat(incomingText);

        if (isNaN(qty)) {
          await sendTelegramMessage(currentChatId, "❌ Алдаа: Зөвхөн тоо бичнэ үү!");
          return NextResponse.json({ status: 'ok' });
        }

        const { data: userProfile } = await supabase.from('profiles').select('client_id').eq('telegram_chat_id', currentChatId).single();
        const tenantClientId = userProfile?.client_id || 'SF Coffee';

        // Fetch ingredients for this client and match them
        const { data: allIngs } = await supabase.from('ingredients').select('id, unit, name').eq('client_id', tenantClientId);
        const ingredient = allIngs?.find((i: any) => i.name.trim().toLowerCase() === itemName.toLowerCase());
        
        if (!ingredient) {
          await sendTelegramMessage(currentChatId, `❌ Системийн алдаа: [${itemName}] нэртэй бараа олдсонгүй.`);
          return NextResponse.json({ status: 'ok' });
        }

        // 1. Log the count (Your DB trigger will automatically update current_stock)
        const { error: logErr } = await supabase.from('inventory_logs').insert([{
          client_id: tenantClientId,
          ingredient_id: ingredient.id,
          quantity: qty,
          type: 'count',
          notes: 'Ээлж хаалтын тооллого',
          date: new Date().toISOString()
        }]);

        if (logErr) {
          await sendTelegramMessage(currentChatId, `❌ Хадгалахад алдаа: ${logErr.message}`);
          return NextResponse.json({ status: 'ok' });
        }

        // 2. Set the last counted timestamp for tracking
        await supabase.from('ingredients')
          .update({ last_counted_at: new Date().toISOString() })
          .eq('id', ingredient.id);

        // 3. Update active shift checklist state
        const { data: activeShift } = await supabase.from('shifts').select('*').eq('telegram_chat_id', currentChatId).eq('is_active', true).maybeSingle();
        
        if (activeShift && activeShift.closing_checklist) {
          let checklist = typeof activeShift.closing_checklist === 'string' ? JSON.parse(activeShift.closing_checklist) : activeShift.closing_checklist;
          
          let itemInList = checklist.find((i: any) => i.name.trim().toLowerCase() === itemName.toLowerCase());
          if (itemInList) itemInList.done = true;

          await supabase.from('shifts').update({ closing_checklist: checklist }).eq('id', activeShift.id);

          const allDone = checklist.every((i: any) => i.done === true);
          
         if (allDone) {
            await sendTelegramMessage(currentChatId, `👍 [${itemName}] барааг ${qty} ${ingredient.unit} гэж бүртгэлээ.\nЧек-лист 100% биеллээ! 🎉`);
            await generateShiftScorecard(activeShift, currentChatId);
          } else {
            let buttons = checklist.map((item: any) => {
              if (item.done) {
                return [{ text: `✅ ${item.name} (Тоолов)`, callback_data: `ignore` }];
              } else {
                return [{ text: `📝 ${item.name} (Системд: ${Math.round((item.live_stock || 0) * 10)/10} ${item.unit})`, callback_data: `cnt_${item.name}` }];
              }
            });
            buttons.push([{ text: "🔒 Ээлж хаах (Дуусаагүй байна)", callback_data: "close_shift_locked" }]);
            
            await sendTelegramMessageWithInlineKeyboard(currentChatId, `👍 [${itemName}] барааг ${qty} ${ingredient.unit} гэж бүртгэлээ.\n\nҮлдсэн даалгавруудаа гүйцэтгэнэ үү:`, buttons);
          }
        } else {
           await sendTelegramMessageWithMenu(currentChatId, `👍 [${itemName}] бүртгэгдлээ. Гэхдээ ээлжийн даалгавар олдсонгүй. Дахин "🌙 Ээлж хаах" дарна уу.`);
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

      // Ажилтны нэрийг Telegram-аас автоматаар авах
       const workerName = message.from?.first_name || "Ажилтан";

      // Шинэ идэвхтэй ээлж нээх (Нэртэй нь хамт хадгалах)
      await supabase
        .from('shifts')
        .insert([{
          client_id: tenantClientId,
          telegram_chat_id: currentChatId,
          is_active: true,
          character_role: workerName
        }]);

        const startConfirmText = "✅ Таны өнөөдрийн ээлж амжилттай эхэллээ. Ажлын бүтээмж өндөр, сайхан өдрийг хүсэн ерөөе!";
      await sendTelegramMessageWithMenu(currentChatId, startConfirmText);
      return NextResponse.json({ status: 'ok' });
    }

// Ээлж хаах логик (The Intelligent Shift Closer with Gamification)
    if (incomingText === "/shift_end" || lowercaseMsg === "ээлж хаах" || lowercaseMsg === "ээлж буулаа" || lowercaseMsg === "🌙 ээлж хаах") {
      const { data: activeShift } = await supabase
        .from('shifts')
        .select('*')
        .eq('telegram_chat_id', currentChatId)
        .eq('is_active', true)
        .maybeSingle();

      if (!activeShift) {
        await sendTelegramMessageWithMenu(currentChatId, "Алдаа: Идэвхтэй ээлж олдсонгүй. '☀️ Ээлж эхлэх' товчоор эхлүүлнэ үү.");
        return NextResponse.json({ status: 'ok' });
      }

      let checklist = activeShift.closing_checklist || [];
      if (typeof checklist === 'string') checklist = JSON.parse(checklist);

      // Үүсгэсэн чек-лист байхгүй бол ШИНЭЭР үүсгэнэ (Freeze state)
      if (checklist.length === 0) {
        const reqUrl = new URL(request.url);
        const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
        const response = await fetch(`${baseUrl}/api/analytics?clientId=${encodeURIComponent(tenantClientId)}`, { cache: 'no-store' });
        const analyticsData = await response.json();

        // 12 цагийн дотор тоолсон бол дахиж шаардахгүй (Game Logic)
        const twelveHoursAgo = new Date(Date.now() - (12 * 60 * 60 * 1000)).toISOString();

       // Critical items will always appear on the checklist unless counted in the last 12 hours
        const criticalItems = analyticsData.all_inventory_data?.filter((i: any) => 
          i.is_critical === true && 
          (!i.last_counted_at || i.last_counted_at < twelveHoursAgo)
        ) || [];

        const nonCriticalItems = analyticsData.all_inventory_data?.filter((i: any) => i.is_critical !== true) || [];
        const sortedCycleItems = nonCriticalItems.sort((a: any, b: any) => {
          const dateA = new Date(a.last_counted_at || '2000-01-01').getTime();
          const dateB = new Date(b.last_counted_at || '2000-01-01').getTime();
          return dateA - dateB;
        });
        
       const finalItemsToCount = [...criticalItems, ...sortedCycleItems].slice(0, 5);

        checklist = finalItemsToCount.map((i: any) => ({
          name: i.name,
          unit: i.unit,
          live_stock: i.live_stock,
          done: false
        }));

        // Хадгалах (Freeze the checklist so it doesn't shuffle)
        await supabase.from('shifts').update({ closing_checklist: checklist }).eq('id', activeShift.id);
      }

    if (checklist.length > 0) {
        // FIX: Хэрэв бүгд тоологдсон бол шууд хүчээр хаана (Loop-д орохгүй)
        const allDone = checklist.every((i: any) => i.done === true);
        if (allDone) {
          await supabase.from('shifts').update({ is_active: false, end_time: new Date().toISOString() }).eq('id', activeShift.id);
          await sendTelegramMessageWithMenu(currentChatId, "🌙 Бүх тооллого дууссан байна. Ээлж амжилттай хаагдлаа. Сайхан амраарай!");
          return NextResponse.json({ status: 'ok' });
        }

        // ТЕЛЕГРАМ ТОВЧЛУУРУУД ҮҮСГЭХ
        let buttons = checklist.map((item: any) => {
          if (item.done) {
            return [{ text: `✅ ${item.name} (Тоолов)`, callback_data: `ignore` }];
          } else {
            return [{ text: `📝 ${item.name} (Системд: ${Math.round((item.live_stock || 0) * 10)/10} ${item.unit})`, callback_data: `cnt_${item.name}` }];
          }
        });
        
        buttons.push([{ text: "🔒 Ээлж хаах (Дуусаагүй байна)", callback_data: "close_shift_locked" }]);

        await sendTelegramMessageWithInlineKeyboard(currentChatId, "🛑 Ээлж хаахад дараах барааг тоолох шаардлагатай:", buttons);
      } else {
        await supabase.from('shifts').update({ is_active: false, end_time: new Date().toISOString() }).eq('id', activeShift.id);
        await sendTelegramMessageWithMenu(currentChatId, "🌙 Тоолох шаардлагатай бараа алга байна. Ээлж амжилттай хаагдлаа. Сайхан амраарай!");
      }
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

async function sendTelegramMessageWithForceReply(chatId: number | null, text: string) {
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


async function generateShiftScorecard(activeShift: any, chatId: number | null) {
  if (!chatId) return; // Safe early return

  const tenantClientId = activeShift.client_id;
  const startTime = activeShift.start_time;
  const endTime = new Date().toISOString();
  const role = activeShift.character_role || "Бариста ☕";

  // 1. Fetch inventory logs logged during this shift's timeframe
  const { data: logs } = await supabase
    .from('inventory_logs')
    .select('quantity, type, ingredient_id, total_cost')
    .eq('client_id', tenantClientId)
    .gte('date', startTime)
    .lte('date', endTime);

  // 2. Fetch all ingredients to map prices
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, unit_price, unit')
    .eq('client_id', tenantClientId);

  let totalWasteCost = 0;
  let itemsCounted = 0;

  if (logs && ingredients) {
    logs.forEach((log: any) => {
      if (log.type === 'count') {
        itemsCounted++;
      } else if (['spoilage', 'testing', 'staff_meal', 'other'].includes(log.type)) {
        const ing = ingredients.find((i: any) => i.id === log.ingredient_id);
        if (ing) {
          const price = parseFloat(ing.unit_price) || 0;
          totalWasteCost += Math.abs(log.quantity) * price;
        }
      }
    });
  }

  // 3. Calculate Gamified XP Score
  let xpEarned = 10; // 10 XP base for completing shift
  xpEarned += itemsCounted * 5; // +5 XP per counted item
  if (totalWasteCost === 0) {
    xpEarned += 30; // +30 XP "Zero Waste" perfect shift bonus!
  }

  // 4. Update the Shift record in database
  await supabase
    .from('shifts')
    .update({
      is_active: false,
      end_time: endTime,
      // earned_xp: (activeShift.earned_xp || 0) + xpEarned
    })
    .eq('id', activeShift.id);

  // 5. Calculate shift duration
  // const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
  // const hours = Math.floor(durationMs / (1000 * 60 * 60));
  // const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  // // 6. Send Scorecard Telegram Message
  // const scorecardText = `🏆 **ЭЭЛЖИЙН ХЯНАЛТЫН ТАЙЛАН (Scorecard)**\n\n` +
  //   `👤 **Дүр:** ${role}\n` +
  //   `⏱ **Хугацаа:** ${hours} цаг ${minutes} минут\n` +
  //   `📋 **Тоолсон бараа:** ${itemsCounted} ш\n` +
  //   `🗑 **Хаягдал зардлын хэмжээ:** ${Math.round(totalWasteCost).toLocaleString()} ₮\n\n` +
  //   `🌟 **Ээлжинд цуглуулсан оноо:**\n` +
  //   `• Үндсэн XP: +10 XP\n` +
  //   `• Тооллогын XP: +${itemsCounted * 5} XP\n` +
  //   (totalWasteCost === 0 ? `• "Zero Waste" урамшуулал: +30 XP 💎\n` : '') +
  //   `\n🥇 **Нийт авсан оноо:** +${xpEarned} XP`;

  // Send a simple, clean completion message
  await sendTelegramMessageWithMenu(
    chatId, 
    `✅ **Ээлж амжилттай хаагдлаа!**\n\nӨнөөдрийн тооллого болон өдрийн хаалтын процессууд системд хадгалагдлаа. Сайн ажиллалаа, сайхан амраарай!`
  );
}
