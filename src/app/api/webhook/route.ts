import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { parseOperationalText, parseReceiptImage } from '../../../lib/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const OWNER_CFO_PROMPT = `
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

  [ОГНОО БА ДААЛГАВАР (Tasks & Shifts) ШҮҮХ ДҮРЭМ]
  - Хэрэв эзэн ажилчдын даалгавар, ээлжийн гүйцэтгэл (task, shift) асуувал өгөгдөл дэх "recent_shifts" хэсгээс хэн хэзээ ажиллаж, ямар даалгавруудыг (daily_tasks_checklist) хийсэн эсвэл хийгээгүйг шалгаж тайлагнана.
  - Хэрэв эзэн тодорхой нэг өдрийг зааж асуувал "all_timeline_logs"-оос шүүж хариулна. Бараа тус бүр дээр зураг авсан эсэхийг (notes хэсэгт "Scan/зураг" байгаа эсэхээр) заавал дурдана.

  💡 ДҮГНЭЛТ:
  [Товч дүгнэлт бичээд асуулт асууж болохыг сануул. Ажилчдын хоол, түүхий эдийн өөрчлөлтийг системд бүртгэж хэвшсэн нь маш сайн ахиц болохыг онцлон дүгнээрэй [3].]

  [ХУЛГАЙ БОЛОН АЛДАГДЛЫГ ИЛРҮҮЛЭХ ДҮРЭМ]
  - Хэрэв эзэн "Алдаа хаана гарав?", "Хулгай байна уу?" гэж асуувал өгөгдөл дэх "total_unexplained_waste" болон "gap" утгыг шалгаж хариулна.
  - Бараа тус бүр дээр ажилтан зураг авч баталгаажуулсан эсэхийг (notes хэсэгт "Scan" эсвэл "E-Barimt" байгаа эсэхээр) заавал дурдаж хариулна уу.

  "Хаягдалтай (wasted_only) барааны тоо хэмжээг харуулахдаа зөвхөн тайлагнагдаагүй цэвэр алдагдал болох gap хувьсагчийн утгыг ашиглана. Харин Дутуу хийгдсэн (underpoured_only) барааны хувьд raw_physical_gap хувьсагчийн утгыг ашиглана."
`;

const WORKER_BOT_PROMPT = `
  Та гал тогооны ажилтнуудад зориулагдсан "Kiosk AI Бүртгэлийн туслах" юм.
  [ХАТУУ МӨРДӨХ ДҮРЭМ]:
  1. Таны цорын ганц үүрэг: Ажилтны бичсэн зарлага, хаягдал, татан авалтыг ойлгох.
  2. Ажилтан санхүүгийн ашиг, орлого, тайлан асуувал ШУУД ингэж татгалзан хариулна: 
     "🔒 Уучлаарай, би зөвхөн орлого, зарлага, хаягдал бүртгэх үүрэгтэй туслах байна. Санхүүгийн тайланг зөвхөн Эзний эрхээр харах боломжтой."
`;

export async function POST(request: Request) {
  let currentChatId: number | null = null;
  const reqUrl = new URL(request.url);
  const hostUrl = `${reqUrl.protocol}//${reqUrl.host}`;
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

     // Role Selection Callback (Saves role permanently to Profile)
      if (callbackData.startsWith("role_")) {
        const selectedRole = callbackData === "role_barista" ? "Бариста ☕" : "Тогооч 🍳";
        const firstName = callback_query.from?.first_name || "Ажилтан";
        const fullNameRole = `${selectedRole} (${firstName})`;

        const { data: userProfile } = await supabase.from('profiles').select('client_id').eq('telegram_chat_id', currentChatId).single();
        const tenantClientId = userProfile?.client_id || 'SF Coffee';

        // 1. SAVE THE ROLE PERMANENTLY TO THEIR PROFILE SO THEY NEVER HAVE TO CHOOSE AGAIN
        await supabase.from('profiles').update({ role: selectedRole }).eq('telegram_chat_id', currentChatId);

        // 2. Load tasks specifically assigned to this role on the Web Dashboard
        const { data: roleTasks } = await supabase.from('tasks').select('*').eq('client_id', tenantClientId).eq('role', selectedRole).eq('is_active', true);
        const taskChecklist = roleTasks?.map(t => ({ id: t.id, name: t.task_name, weight: t.weight, done: false })) || [];

        // 3. Update the active shift with their chosen role and tasks
        const { error: updateError } = await supabase.from('shifts').update({
          character_role: fullNameRole,
          daily_tasks_checklist: taskChecklist
        }).eq('telegram_chat_id', currentChatId).eq('is_active', true);

        if (updateError) {
          await sendTelegramMessage(currentChatId, `❌ Алдаа (Үүрэг хадгалахад): ${updateError.message}`);
          return NextResponse.json({ status: 'ok' });
        }

        await answerTelegramCallback(callbackQueryId, `${selectedRole} сонгогдлоо!`);
        
        let taskText = taskChecklist.length > 0 
          ? `\n\n📌 **Өнөөдрийн даалгаврууд:**\n` + taskChecklist.map((t, i) => `${i+1}. ${t.name}`).join('\n')
          : "\n\n📌 Өнөөдөр хийх нэмэлт даалгавар алга байна.";

        await editTelegramMessage(currentChatId, messageId, `✅ **Үүрэг сонгогдлоо!**\n\nТаны дүр: **${fullNameRole}**${taskText}\n\nАжилдаа амжилт хүсье!`);
        return NextResponse.json({ status: 'ok' });
      }

      // Task Toggle Click (Trello Style Checkbox)
      if (callbackData.startsWith("tsk_")) {
        const index = parseInt(callbackData.replace("tsk_", ""));
        const { data: activeShift } = await supabase.from('shifts').select('*').eq('telegram_chat_id', currentChatId).eq('is_active', true).single();
        if (!activeShift) return NextResponse.json({ status: 'ok' });

        let tasks = typeof activeShift.daily_tasks_checklist === 'string' ? JSON.parse(activeShift.daily_tasks_checklist) : activeShift.daily_tasks_checklist;
        tasks[index].done = !tasks[index].done;
        
        await supabase.from('shifts').update({ daily_tasks_checklist: tasks }).eq('id', activeShift.id);

        let buttons = tasks.map((t: any, i: number) => {
            return [{ text: `${t.done ? '✅' : '◻️'} ${t.name}`, callback_data: `tsk_${i}` }];
        });
        buttons.push([{ text: "➔ Дараагийн алхам: Тооллого хийх", callback_data: "go_to_inventory" }]);

        await editTelegramMessage(currentChatId, messageId, "📋 **Ажлын Даалгавар:** Хийсэн ажлуудаа тэмдэглэнэ үү:", buttons);
        return NextResponse.json({ status: 'ok' });
      }

      // Proceed to Inventory Click
      if (callbackData === "go_to_inventory") {
        await answerTelegramCallback(callbackQueryId, "Тооллого руу шилжиж байна...");
        await generateInventoryChecklist(currentChatId, messageId, hostUrl);
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
          const workerName = message.from?.first_name || "Ажилтан"; // Гараар нэр авах

          if (ing) {
            logsToInsert.push({ client_id: tenantClientId, ingredient_id: ing.id, quantity: Math.abs(item.quantity), type: 'purchase', total_cost: item.total_cost || 0, notes: item.notes || "E-Barimt", date: new Date().toISOString(), worker_name: workerName });
            successMessage += `• ${ing.name}: ${item.quantity} ${ing.unit}\n`;
          } else {
            logsToInsert.push({ client_id: tenantClientId, non_food_item: item.item_name, quantity: Math.abs(item.quantity), type: 'purchase', total_cost: item.total_cost || 0, notes: "E-Barimt (OPEX)", date: new Date().toISOString(), worker_name: workerName });
            successMessage += `• ${item.item_name} (Бусад): ${item.quantity}\n`;
          }
          if (ing) {
            logsToInsert.push({
              client_id: tenantClientId,
              ingredient_id: ing.id,
              quantity: Math.abs(item.quantity),
              type: 'purchase',
              total_cost: item.total_cost || 0,
              notes: item.image_type === 'Product Photo' ? '📸 Барааны зураг (Баримтгүй)' : '🧾 E-Barimt Scan',
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
        const workerName = message.from?.first_name || "Ажилтан";
        // 1. Log the count (Your DB trigger will automatically update current_stock)
        const { error: logErr } = await supabase.from('inventory_logs').insert([{
    
          client_id: tenantClientId,
          ingredient_id: ingredient.id,
          quantity: qty,
          type: 'count',
          notes: 'Ээлж хаалтын тооллого',
          date: new Date().toISOString(),
          worker_name: workerName
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
      .select('client_id, role')
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
        // FIX: Датабэйсээс яг бүртгэлтэй бодит client_id-г нь татаж харуулах
        const { data: dbProfile } = await supabase.from('profiles').select('client_id').eq('id', authData.user.id).single();
        const actualBranch = dbProfile?.client_id || authData.user.user_metadata?.client_id || 'SF Coffee';
        
        await sendTelegramMessage(currentChatId, `✅ Амжилттай холбогдлоо!\n\nТаны бүртгэл: ${emailInput}\nСалбар: ${actualBranch}`);
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
      // SECURITY LOCK: Only Owners can request reports
      if (userProfile?.role !== 'owner') {
        await sendTelegramMessage(currentChatId, "🔒 Уучлаарай, санхүүгийн тайланг зөвхөн Эзний эрхээр харах боломжтой.");
        return NextResponse.json({ status: 'ok' });
      }

      await sendTelegramMessage(currentChatId, "⏳ Санхүүгийн үзүүлэлтүүдийг бодож байна, түр хүлээнэ үү...");

      const reqUrl = new URL(request.url);
      const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
      
      const response = await fetch(`${baseUrl}/api/analytics?clientId=${encodeURIComponent(tenantClientId)}`, { cache: 'no-store' });
      const analyticsData = await response.json();

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const promptPayload = `NEW_DATA: ${JSON.stringify(analyticsData)}`;

      const aiResponse = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: `System: ${OWNER_CFO_PROMPT}\n\nInput Data: ${promptPayload}` }] }
        ]
      });

      const reportText = aiResponse.response.text().replace(/\*|\*\*/g, "").trim(); 
      await sendTelegramMessage(currentChatId, reportText);
      return NextResponse.json({ status: 'ok' });
    }
    const lowercaseMsg = incomingText.toLowerCase();

   
 // 1. ЭЭЛЖ ЭХЛЭХ ЛОГИК (Profile-Based Role Memory with Optional Override)
  if (incomingText === "/shift_start" || lowercaseMsg === "ээлж эхлэх" || lowercaseMsg === "☀️ ээлж эхлэх") {
    const { data: activeShift } = await supabase.from('shifts').select('id').eq('telegram_chat_id', currentChatId).eq('is_active', true).maybeSingle();
    if (activeShift) {
      await sendTelegramMessageWithMenu(currentChatId, "Сануулга: Таны ээлж хэдийнэ эхэлсэн байна. Орой ажил дуусах үед доорх цэсний '🌙 Ээлж хаах' товчийг ашиглан ээлжэ хаана уу.");
      return NextResponse.json({ status: 'ok' });
    }

    // Fetch user profile and see if they ALREADY have a saved role (e.g., 'Бариста ☕' or 'Тогооч 🍳')
    const { data: userProfile } = await supabase.from('profiles').select('client_id, role').eq('telegram_chat_id', currentChatId).maybeSingle();
    const tenantClientId = userProfile?.client_id || 'SF Coffee';
    const profileRole = userProfile?.role;

    const firstName = message.from?.first_name || "Ажилтан";
    const fullNameRole = `${profileRole} (${firstName})`;

    // IF THEY ALREADY HAVE A SAVED ROLE: Start shift instantly but show an "Override/Switch" button!
    if (profileRole === "Бариста ☕" || profileRole === "Тогооч 🍳") {
      // Load tasks specifically assigned to this role
      const { data: roleTasks } = await supabase.from('tasks').select('*').eq('client_id', tenantClientId).eq('role', profileRole).eq('is_active', true);
      const taskChecklist = roleTasks?.map(t => ({ id: t.id, name: t.task_name, weight: t.weight, done: false })) || [];

      // Directly start the shift with their default role & tasks
      await supabase.from('shifts').insert([{
        client_id: tenantClientId,
        telegram_chat_id: currentChatId,
        is_active: true,
        character_role: fullNameRole,
        daily_tasks_checklist: taskChecklist
      }]);

      let taskText = taskChecklist.length > 0 
        ? `\n\n📌 **Өнөөдрийн даалгаврууд:**\n` + taskChecklist.map((t, i) => `${i+1}. ${t.name}`).join('\n')
        : "\n\n📌 Өнөөдөр хийх нэмэлт даалгавар алга байна.";

      // Determine the opposite role for the override button
      const oppositeRoleName = profileRole === "Бариста ☕" ? "Тогооч 🍳" : "Бариста ☕";
      const oppositeCallbackData = profileRole === "Бариста ☕" ? "role_chef" : "role_barista";

      // Send start message containing a dynamic button to optionally switch roles
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: currentChatId,
          text: `✅ **Ээлж амжилттай эхэллээ!**\n\nҮүрэг: **${fullNameRole}**${taskText}\n\n*Хэрэв өнөөдөр өөр үүрэгтэй (солигдож) ажиллах бол доорх товчийг дарж үүргээ солино уу:*`,
          reply_markup: {
            inline_keyboard: [
              [{ text: `🔄 ${oppositeRoleName} болж солих`, callback_data: oppositeCallbackData }]
            ]
          }
        })
      });
      return NextResponse.json({ status: 'ok' });
    }

    // FALLBACK: If they are an 'owner' or have no role yet, create the shift and ask them to select
    await supabase.from('shifts').insert([{
      client_id: tenantClientId,
      telegram_chat_id: currentChatId,
      is_active: true
    }]);

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: currentChatId,
        text: "🎮 **Шинэ ээлж эхэллээ!**\n\nТа өнөөдөр ямар үүрэгтэй (Role) ажиллах вэ?",
        reply_markup: {
          inline_keyboard: [
            [{ text: "☕ Бариста", callback_data: `role_barista` }, { text: "🍳 Тогооч", callback_data: `role_chef` }]
          ]
        }
      })
    });

    return NextResponse.json({ status: 'ok' });
  }
// Ээлж хаах логик (Checks Tasks first, then moves to Inventory counts)
    if (incomingText === "/shift_end" || lowercaseMsg === "ээлж хаах" || lowercaseMsg === "ээлж буулаа" || lowercaseMsg === "🌙 ээлж хаах") {
      const { data: activeShift } = await supabase.from('shifts').select('*').eq('telegram_chat_id', currentChatId).eq('is_active', true).maybeSingle();
      if (!activeShift) {
        await sendTelegramMessageWithMenu(currentChatId, "Алдаа: Идэвхтэй ээлж олдсонгүй. '☀️ Ээлж эхлэх' товчоор эхлүүлнэ үү.");
        return NextResponse.json({ status: 'ok' });
      }

      let tasks = activeShift.daily_tasks_checklist || [];
      if (typeof tasks === 'string') tasks = JSON.parse(tasks);

      // If there are tasks assigned to this role, show them FIRST
      if (tasks.length > 0) {
        let buttons = tasks.map((t: any, i: number) => {
            return [{ text: `${t.done ? '✅' : '◻️'} ${t.name}`, callback_data: `tsk_${i}` }];
        });
        buttons.push([{ text: "➔ Дараагийн алхам: Тооллого хийх", callback_data: "go_to_inventory" }]);
        await sendTelegramMessageWithInlineKeyboard(currentChatId, "📋 **Ажлын Даалгавар:** Хийсэн ажлуудаа тэмдэглэнэ үү:", buttons);
      } else {
        // If no tasks exist, proceed straight to the inventory count
        await generateInventoryChecklist(currentChatId, null, hostUrl);
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
      const workerName = message.from?.first_name || "Ажилтан";
      // Save operational log to Supabase
      if (ingredient) {
  const { data: log, error: logError } = await supabase
        .from('inventory_logs')
        .insert([{
          ingredient_id: ingredient.id,
          quantity: aiAnalysis.quantity,
          type: aiAnalysis.type,
          notes: aiAnalysis.notes,
          date: '2026-06-15T12:00:00.000Z', // Forced testing date
          worker_name: workerName
        }])
        .select()
        .single();
            await sendTelegramMessageWithUndo(currentChatId, `📝 Бүртгэгдлээ:\n• Бараа: ${aiAnalysis.item_name}\n• Хэмжээ: ${Math.abs(aiAnalysis.quantity)} ${ingredient.unit}`, log.id);
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
    

    

   
    }

    

  // 4. Default Fallback Handler (Case B - Chatting / Advisory)
    const reqUrl = new URL(request.url);
    const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
    
    // Fetch analytics data securely [2]
    const response = await fetch(`${baseUrl}/api/analytics?clientId=${encodeURIComponent(tenantClientId)}`, { cache: 'no-store' });
    const analyticsData = await response.json();

    // SECURITY LOCK: Decide which brain to use based on their database role!
    const isOwner = userProfile?.role === 'owner';
    const ACTIVE_PROMPT = isOwner ? OWNER_CFO_PROMPT : WORKER_BOT_PROMPT;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const promptPayload = `CONTEXT_DATA: ${JSON.stringify(analyticsData)}\n\nUser Question: ${incomingText}`;

    const aiResponse = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `System: ${ACTIVE_PROMPT}\n\nInput Data: ${promptPayload}` }] }]
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

async function editTelegramMessage(chatId: number | null, messageId: number, text: string, inline_keyboard: any[] = []) {
  if (!chatId) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      chat_id: chatId, 
      message_id: messageId, 
      text: text,
      reply_markup: { inline_keyboard }
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

async function generateInventoryChecklist(chatId: number | null, messageIdToEdit: number | null, hostUrl: string) {
  if (!chatId) return;
  const { data: activeShift } = await supabase.from('shifts').select('*').eq('telegram_chat_id', chatId).eq('is_active', true).maybeSingle();
  if (!activeShift) return;

  const tenantClientId = activeShift.client_id;
  let checklist = activeShift.closing_checklist || [];
  if (typeof checklist === 'string') checklist = JSON.parse(checklist);

  if (checklist.length === 0) {
  //  const reqUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const res = await fetch(`${hostUrl}/api/analytics?clientId=${encodeURIComponent(tenantClientId)}`, { cache: 'no-store' });
    const analyticsData = await res.json();
    const twelveHoursAgo = new Date(Date.now() - (12 * 60 * 60 * 1000)).toISOString();

    const criticalItems = analyticsData.all_inventory_data?.filter((i: any) => i.is_critical === true && (!i.last_counted_at || i.last_counted_at < twelveHoursAgo)) || [];
    const nonCriticalItems = analyticsData.all_inventory_data?.filter((i: any) => i.is_critical !== true) || [];
    const sortedCycleItems = nonCriticalItems.sort((a: any, b: any) => new Date(a.last_counted_at || '2000-01-01').getTime() - new Date(b.last_counted_at || '2000-01-01').getTime());
    
    checklist = [...criticalItems, ...sortedCycleItems].slice(0, 5).map((i: any) => ({ name: i.name, unit: i.unit, live_stock: i.live_stock, done: false }));
    await supabase.from('shifts').update({ closing_checklist: checklist }).eq('id', activeShift.id);
  }

  if (checklist.length > 0) {
    const allDone = checklist.every((i: any) => i.done === true);
    
    // Auto-Close when everything is checked!
    if (allDone) {
      if (messageIdToEdit) await editTelegramMessage(chatId, messageIdToEdit, "✅ Бүх тооллого дууссан байна. Ээлжийг хаалаа.");
      await generateShiftScorecard(activeShift, chatId);
      return;
    }

    let buttons = checklist.map((item: any) => {
      if (item.done) return [{ text: `✅ ${item.name} (Тоолов)`, callback_data: `ignore` }];
      return [{ text: `📝 ${item.name} (Системд: ${Math.round((item.live_stock || 0) * 10)/10} ${item.unit})`, callback_data: `cnt_${item.name}` }];
    });
    
    buttons.push([{ text: "🔒 Ээлж хаах (Дуусаагүй байна)", callback_data: "close_shift_locked" }]);

    if (messageIdToEdit) {
      await editTelegramMessage(chatId, messageIdToEdit, "🛑 Ээлж хаахад дараах барааг тоолох шаардлагатай:", buttons);
    } else {
      await sendTelegramMessageWithInlineKeyboard(chatId, "🛑 Ээлж хаахад дараах барааг тоолох шаардлагатай:", buttons);
    }
  } else {
    await supabase.from('shifts').update({ is_active: false, end_time: new Date().toISOString() }).eq('id', activeShift.id);
    await sendTelegramMessageWithMenu(chatId, "🌙 Тоолох бараа алга. Ээлж амжилттай хаагдлаа!");
  }
}


async function generateShiftScorecard(activeShift: any, chatId: number | null) {
  if (!chatId) return; // Safe early return

  const tenantClientId = activeShift.client_id;
  const startTime = activeShift.start_time;
  const endTime = new Date().toISOString();
  const role = activeShift.character_role || "Бариста ☕";

  // 1. Fetch inventory logs logged during this shift's timeframe
  const { data: logs, error: logsErr } = await supabase
    .from('inventory_logs')
    .select('quantity, type, ingredient_id, total_cost, notes')
    .eq('client_id', tenantClientId)
    .gte('date', startTime)
    .lte('date', endTime);

  if (logsErr) {
    await sendTelegramMessage(chatId, `⚠️ Анхаар: Хаягдлын лог уншихад алдаа гарлаа: ${logsErr.message}`);
  }

  // 2. Fetch all ingredients to map prices
  const { data: ingredients, error: ingErr } = await supabase
    .from('ingredients')
    .select('id, name, unit_price, unit')
    .eq('client_id', tenantClientId);

  if (ingErr) {
    await sendTelegramMessage(chatId, `⚠️ Анхаар: Түүхий эд, үнийн мэдээлэл уншихад алдаа гарлаа: ${ingErr.message}`);
  }

  let totalWasteCost = 0;
  let itemsCounted = 0;
  let totalPurchases = 0;
  let photoVerifiedPurchases = 0;
  let manualPurchases = 0;
  let loggedWasteEvents = 0;

  if (logs && ingredients) {
    logs.forEach((log: any) => {
      if (log.type === 'count') {
        itemsCounted++;
      } else if (log.type === 'purchase') {
        totalPurchases++;
        const noteText = (log.notes || "").toLowerCase();
        // Checks if the purchase has a scanned photo proof
        if (noteText.includes("scan") || noteText.includes("e-barimt")) {
          photoVerifiedPurchases++;
        } else {
          manualPurchases++;
        }
      } else if (['spoilage', 'testing', 'staff_meal', 'other'].includes(log.type)) {
        loggedWasteEvents++;
        const ing = ingredients.find((i: any) => i.id === log.ingredient_id);
        if (ing) {
          const price = parseFloat(ing.unit_price) || 0;
          totalWasteCost += Math.abs(log.quantity) * price;
        }
      }
    });
  }

  // 3. Update the Shift record in database (Marks shift closed)
  const { error: updateError } = await supabase
    .from('shifts')
    .update({
      is_active: false,
      end_time: endTime
    })
    .eq('id', activeShift.id);

  if (updateError) {
     await sendTelegramMessage(chatId, `❌ ДАТАБЕЙС АЛДАА: Ээлжийг хааж чадсангүй.\nШалтгаан: ${updateError.message}`);
     return;
  }

  // 4. Send a clean completion message to the WORKER
  await sendTelegramMessageWithMenu(
    chatId, 
    `✅ **Ээлж амжилттай хаагдлаа!**\n\nӨнөөдрийн тооллого болон өдрийн хаалтын процессууд системд хадгалагдлаа. Сайн ажиллалаа, сайхан амраарай!`
  );

  // 5. Send an HONESTY AUDIT REPORT privately to the OWNER
  const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  // Build dynamic security and honesty alerts based on their behavior
  const auditAlerts: string[] = [];
  if (manualPurchases > 0) {
    auditAlerts.push(`⚠️ **${manualPurchases} татан авалт зураггүй гараар шивэгдсэн байна.** Орж ирсэн барааны баримтыг заавал шалгана уу!`);
  } else if (totalPurchases > 0 && manualPurchases === 0) {
    auditAlerts.push(`✅ Бүх татан авалтууд зураг болон E-Barimt-аар амжилттай баталгаажсан.`);
  }

  if (loggedWasteEvents === 0) {
    auditAlerts.push(`⚠️ Ээлжийн турш ямар ч хаягдал, ажилчдын хоол бүртгэгдсэнгүй. (Сүү асгарсан эсэхийг тооллогоор хянах шаардлагатай).`);
  } else {
    auditAlerts.push(`✅ ${loggedWasteEvents} удаагийн хаягдал/ажилтны хэрэглээг тухай бүрт нь үнэн зөв бүртгэсэн.`);
  }

  const ownerScorecardText = `👑 **ЭЗЭНД ЗОРИУЛСАН ЭЭЛЖИЙН ХЯНАЛТЫН ТАЙЛАН**\n\n` +
    `🏢 **Салбар:** ${tenantClientId}\n` +
    `👤 **Ажилтан:** ${role}\n` +
    `⏱ **Ажилласан:** ${hours} цаг ${minutes} минут\n` +
    `📋 **Тоолсон бараа:** ${itemsCounted} ш\n` +
    `🗑 **Бүртгэсэн хаягдал:** ${Math.round(totalWasteCost).toLocaleString()} ₮\n\n` +
    `🛡 **АЮУЛГҮЙ БАЙДЛЫН ҮНЭЛГЭЭ:**\n` +
    auditAlerts.map(alert => `• ${alert}`).join('\n');

  // Find owners of this cafe and send them the private scorecard
  const { data: owners } = await supabase.from('profiles').select('telegram_chat_id').eq('client_id', tenantClientId).eq('role', 'owner');
  if (owners) {
    for (const owner of owners) {
      if (owner.telegram_chat_id && owner.telegram_chat_id !== chatId) {
        await sendTelegramMessage(owner.telegram_chat_id, ownerScorecardText);
      }
    }
  }
}