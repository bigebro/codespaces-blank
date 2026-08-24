import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { parseOperationalText, parseReceiptImage } from '../../../lib/gemini';
import { getAnalyticsData } from '../../../lib/analytics';
import { GoogleGenerativeAI } from '@google/generative-ai';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const OWNER_CFO_PROMPT = `
  Та ШУТИС-ийн (MUST) дэргэдэх "SF Coffee" кофе шопын санхүүгийн ахлах зөвлөх (CFO) болон стратегийн хамтрагч юм. 
  
  [АЖИЛЛАХ ГОРЫМ]:
  - Ирсэн CONTEXT_DATA дахь бүх өгөгдлийг (бүх 73 жор, 125 түүхий эд, хаягдлын жагсаалт, цэсний ашиг) бүрэн ашиглаж хэрэглэгчийн асуултад шууд товч, цэгцтэй, үнэн зөв хариулна.
  - Ундааны эрүүл бохир ашиг (Gross margin) нь 75%-85%, хоолных 60%-70% байна.
  - Асуултад маш тодорхой, эелдэг, Монгол хэлээр хариулна.
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

    // =========================================================================
    // A. TELEGRAM ТОЛОХ, ДҮР СОНГОХ, ЦУЦЛАХ (CALLBACK QUERIES)
    // =========================================================================
    if (callback_query) {
      const chatId = callback_query.message?.chat?.id || callback_query.from?.id;
      currentChatId = chatId;
      const callbackData = callback_query.data;
      const messageId = callback_query.message?.message_id;
      const callbackQueryId = callback_query.id;
      
      // 1. Бараа тоолох товч дарах үед
      if (callbackData.startsWith("cnt_")) {
        const itemName = callbackData.replace("cnt_", "");
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

      // 2. Дүр сонгох (Role Selection)
      if (callbackData.startsWith("role_")) {
        const selectedRole = callbackData === "role_barista" ? "Бариста ☕" : "Тогооч 🍳";
        const firstName = callback_query.from?.first_name || "Ажилтан";
        const fullNameRole = `${selectedRole} (${firstName})`;

        const { data: userProfile } = await supabase.from('profiles').select('client_id').eq('telegram_chat_id', currentChatId).single();
        const tenantClientId = userProfile?.client_id || 'SF Coffee';

        await supabase.from('profiles').update({ role: selectedRole }).eq('telegram_chat_id', currentChatId);

        const { data: roleTasks } = await supabase.from('tasks').select('*').eq('client_id', tenantClientId).eq('role', selectedRole).eq('is_active', true);
        const taskChecklist = roleTasks?.map(t => ({ id: t.id, name: t.task_name, weight: t.weight, done: false })) || [];

        await supabase.from('shifts').update({
          character_role: fullNameRole,
          daily_tasks_checklist: taskChecklist
        }).eq('telegram_chat_id', currentChatId).eq('is_active', true);

        await answerTelegramCallback(callbackQueryId, `${selectedRole} сонгогдлоо!`);
        
        let taskText = taskChecklist.length > 0 
          ? `\n\n📌 **Өнөөдрийн даалгаврууд:**\n` + taskChecklist.map((t, i) => `${i+1}. ${t.name}`).join('\n')
          : "\n\n📌 Өнөөдөр хийх нэмэлт даалгавар алга байна.";

        await editTelegramMessage(currentChatId, messageId, `✅ **Үүрэг сонгогдлоо!**\n\nТаны дүр: **${fullNameRole}**${taskText}\n\nАжилдаа амжилт хүсье!`);
        return NextResponse.json({ status: 'ok' });
      }

      // 3. Даалгавар чеклэх (Task Toggle)
      if (callbackData.startsWith("tsk_")) {
        const index = parseInt(callbackData.replace("tsk_", ""));
        const { data: activeShift } = await supabase.from('shifts').select('*').eq('telegram_chat_id', currentChatId).eq('is_active', true).single();
        if (!activeShift) return NextResponse.json({ status: 'ok' });

        let tasks = typeof activeShift.daily_tasks_checklist === 'string' ? JSON.parse(activeShift.daily_tasks_checklist) : activeShift.daily_tasks_checklist;
        tasks[index].done = !tasks[index].done;
        
        await supabase.from('shifts').update({ daily_tasks_checklist: tasks }).eq('id', activeShift.id);

        let buttons = tasks.map((t: any, i: number) => [{ text: `${t.done ? '✅' : '◻️'} ${t.name}`, callback_data: `tsk_${i}` }]);
        buttons.push([{ text: "➔ Дараагийн алхам: Тооллого хийх", callback_data: "go_to_inventory" }]);

        await editTelegramMessage(currentChatId, messageId, "📋 **Ажлын Даалгавар:** Хийсэн ажлуудаа тэмдэглэнэ үү:", buttons);
        return NextResponse.json({ status: 'ok' });
      }

      // 4. Тооллого руу шилжих
      if (callbackData === "go_to_inventory") {
        await answerTelegramCallback(callbackQueryId, "Тооллого руу шилжиж байна...");
        await generateInventoryChecklist(currentChatId, messageId, hostUrl);
        return NextResponse.json({ status: 'ok' });
      }

      if (callbackData === "ignore") {
        await answerTelegramCallback(callbackQueryId, "✅ Энэ бараа тоологдсон байна.");
        return NextResponse.json({ status: 'ok' });
      }
      
      if (callbackData === "close_shift_locked") {
        await answerTelegramCallback(callbackQueryId, "⚠️ Үлдсэн бараануудыг тоолж дуусгана уу!");
        return NextResponse.json({ status: 'ok' });
      }

      // 5. Ээлж хаах
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

      // 6. Бүртгэл буцаах (Undo)
      if (callbackData.startsWith("undo_")) {
        const logId = callbackData.replace("undo_", "");
        if (logId && logId !== "undefined") {
          await supabase.from('inventory_logs').delete().eq('id', logId);
          await answerTelegramCallback(callbackQueryId, "Бүртгэлийг цуцаллаа.");
          await editTelegramMessage(currentChatId!, messageId, "❌ Бүртгэл цуцлагдлаа (Үлдэгдэл буцаж сэргэсэн).");
          await sendTelegramMessageWithForceReply(currentChatId!, "Та гүйлгээгээ доор зөвөөр дахин бичнэ үү:");
        }
        return NextResponse.json({ status: 'ok' });
      }
      return NextResponse.json({ status: 'ok' });
    }

    if (!message || (!message.text && !message.photo)) return NextResponse.json({ status: 'ok' });

    currentChatId = message.chat.id;

    // =========================================================================
    // B. ЗУРАГ БҮРТГЭХ (E-BARIMT СКАЙНЕР)
    // =========================================================================
    if (message.photo && message.photo.length > 0) {
      await sendTelegramMessage(currentChatId, "📸 Баримтын зургийг хүлээн авлаа. AI уншиж байна, түр хүлээнэ үү...");
      
      try {
        const photo = message.photo[message.photo.length - 1];
        const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${photo.file_id}`);
        const fileData = await fileRes.json();
        const filePath = fileData.result.file_path;
        
        const imageRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`);
        const arrayBuffer = await imageRes.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');

        const { data: userProfile } = await supabase.from('profiles').select('client_id').eq('telegram_chat_id', currentChatId).single();
        const tenantClientId = userProfile?.client_id || 'SF Coffee';

        const { data: ingredients } = await supabase.from('ingredients').select('id, name, unit').eq('client_id', tenantClientId);
        const allowedNames = ingredients ? ingredients.map((i: any) => i.name) : [];

        const aiAnalysis = await parseReceiptImage(base64Image, allowedNames);

        if (!aiAnalysis || aiAnalysis.success === false) {
          await sendTelegramMessage(currentChatId, aiAnalysis?.error_message || "❌ Зургийг таньж чадсангүй.");
          return NextResponse.json({ status: 'ok' });
        }

        let successMessage = "✅ **Татан авалт амжилттай бүртгэгдлээ:**\n\n";
        const logsToInsert: any[] = [];
        const workerName = message.from?.first_name || "Ажилтан";
        const currentDate = new Date().toISOString();

        for (const item of aiAnalysis.purchases) {
          const ing = ingredients?.find((i: any) => i.name === item.item_name);
          const isProductPhoto = item.image_type === 'Product Photo';
          const noteText = isProductPhoto ? '📸 Барааны зураг (Баримтгүй)' : '🧾 E-Barimt Scan';

          if (ing) {
            logsToInsert.push({
              client_id: tenantClientId,
              ingredient_id: ing.id,
              quantity: Math.abs(item.quantity),
              type: 'purchase',
              total_cost: item.total_cost || 0,
              notes: noteText,
              date: currentDate,
              worker_name: workerName
            });
            successMessage += `• ${ing.name}: ${item.quantity} ${ing.unit} (${(item.total_cost || 0).toLocaleString()}₮)\n`;
          } else {
            logsToInsert.push({
              client_id: tenantClientId,
              ingredient_id: null,
              non_food_item: item.item_name,
              quantity: Math.abs(item.quantity),
              type: 'purchase',
              total_cost: item.total_cost || 0,
              notes: `${noteText} (OPEX)`,
              date: currentDate,
              worker_name: workerName
            });
            successMessage += `• ${item.item_name} (Бусад): ${item.quantity} ш (${(item.total_cost || 0).toLocaleString()}₮)\n`;
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

    // =========================================================================
    // C. ТОЛОХ БАРААНЫ ТОО БИЧИХ ҮЕД
    // =========================================================================
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

        const { data: allIngs } = await supabase.from('ingredients').select('id, unit, name').eq('client_id', tenantClientId);
        const ingredient = allIngs?.find((i: any) => i.name.trim().toLowerCase() === itemName.toLowerCase());
        
        if (!ingredient) {
          await sendTelegramMessage(currentChatId, `❌ Системийн алдаа: [${itemName}] нэртэй бараа олдсонгүй.`);
          return NextResponse.json({ status: 'ok' });
        }
        const workerName = message.from?.first_name || "Ажилтан";

        await supabase.from('inventory_logs').insert([{
          client_id: tenantClientId,
          ingredient_id: ingredient.id,
          quantity: qty,
          type: 'count',
          notes: 'Ээлж хаалтын тооллого',
          date: new Date().toISOString(),
          worker_name: workerName
        }]);

        await supabase.from('ingredients').update({ last_counted_at: new Date().toISOString() }).eq('id', ingredient.id);

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
              if (item.done) return [{ text: `✅ ${item.name} (Тоолов)`, callback_data: `ignore` }];
              return [{ text: `📝 ${item.name} (Системд: ${Math.round((item.live_stock || 0) * 10)/10} ${item.unit})`, callback_data: `cnt_${item.name}` }];
            });
            buttons.push([{ text: "🔒 Ээлж хаах (Дуусаагүй байна)", callback_data: "close_shift_locked" }]);
            await sendTelegramMessageWithInlineKeyboard(currentChatId, `👍 [${itemName}] барааг ${qty} ${ingredient.unit} гэж бүртгэлээ.\n\nҮлдсэн даалгавруудаа гүйцэтгэнэ үү:`, buttons);
          }
        }
      }
      return NextResponse.json({ status: 'ok' });
    }

    // =========================================================================
    // D. ТӨХӨӨРӨМЖ ХОЛБОХ БА ЭРХ ШАЛГАХ
    // =========================================================================
    const { data: userProfile } = await supabase.from('profiles').select('client_id, role').eq('telegram_chat_id', currentChatId).maybeSingle();

    if (!userProfile && incomingText !== "/start" && !incomingText.startsWith("/link")) {
      const linkPrompt = `❌ Төхөөрөмж холбогдоогүй байна.\n\nТа системд холбогдохын тулд дараах тушаалаар бүртгүүлнэ үү:\n\n/link [Таны бүртгэлтэй имэйл] [нууц үг]\n\nЖишээ: /link name@example.com 123456`;
      await sendTelegramMessage(currentChatId, linkPrompt);
      return NextResponse.json({ status: 'ok' });
    }

    const tenantClientId = userProfile?.client_id || 'SF Coffee';

    if (incomingText.startsWith("/link")) {
      const parts = incomingText.split(" ");
      if (parts.length < 3) {
        await sendTelegramMessage(currentChatId, "❌ Формат буруу байна. Жишээ: /link email@example.com password123");
        return NextResponse.json({ status: 'ok' });
      }

      const emailInput = parts[1].trim();
      const passwordInput = parts[2].trim();
      await sendTelegramMessage(currentChatId, "⏳ Бүртгэлийг баталгаажуулж байна...");

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput
      });

      if (authError || !authData.user) {
        await sendTelegramMessage(currentChatId, "❌ Алдаа: Имэйл эсвэл нууц үг буруу байна.");
        return NextResponse.json({ status: 'ok' });
      }

      await supabase.from('profiles').update({ telegram_chat_id: null }).eq('telegram_chat_id', currentChatId);
      await supabase.from('profiles').update({ telegram_chat_id: currentChatId }).eq('id', authData.user.id);
      
      const { data: dbProfile } = await supabase.from('profiles').select('client_id').eq('id', authData.user.id).single();
      const actualBranch = dbProfile?.client_id || 'SF Coffee';
      
      await sendTelegramMessage(currentChatId, `✅ Амжилттай холбогдлоо!\n\nБүртгэл: ${emailInput}\nСалбар: ${actualBranch}`);
      return NextResponse.json({ status: 'ok' });
    }

    // =========================================================================
    // E. /start ТУШААЛ
    // =========================================================================
    if (incomingText === "/start") {
      const welcomeText = "Сайн байна уу? 'Smart BoH' ухаалаг туслах ботод тавтай морилно уу! ☕✨\n\nЦэсний товчнууд ашиглан ээлж эхлүүлэх, хаах, тайлан харах боломжтой.";
      await sendTelegramMessageWithMenu(currentChatId, welcomeText);
      return NextResponse.json({ status: 'ok' });
    }

    // =========================================================================
    // F. /report ТАЙЛАН ХАРАХ (N8N ШИГ 0.05 СЕКУНДЭД ШУУД ИЛГЭЭХ)
    // =========================================================================
    const lowercaseMsg = incomingText.toLowerCase();

    if (incomingText === "/report" || lowercaseMsg === "тайлан харах" || lowercaseMsg === "📊 тайлан харах" || lowercaseMsg === "report") {
      if (userProfile?.role !== 'owner') {
        await sendTelegramMessage(currentChatId, "🔒 Уучлаарай, санхүүгийн тайланг зөвхөн Эзний эрхээр харах боломжтой.");
        return NextResponse.json({ status: 'ok' });
      }

      const data = await getAnalyticsData(tenantClientId);
      const fin = data.financial_ladder || {};

      const reportMarkdown = `📊 **САНХҮҮГИЙН ТАЙЛАН (${tenantClientId}):**\n\n` +
        `• **Нийт орлого:** ${Math.round(fin.revenue || 0).toLocaleString()} ₮\n` +
        `• **Бодит COGS:** ${Math.round(fin.actual_cogs || 0).toLocaleString()} ₮ *(Онол: ${Math.round(fin.theo_cogs || 0).toLocaleString()} ₮)*\n` +
        `• **Бохир ашиг:** ${fin.gross_margin || "0%"}\n` +
        `• **OPEX зардал:** ${Math.round(fin.opex || 0).toLocaleString()} ₮\n` +
        `• **EBIT (Татварын өмнөх):** ${Math.round(fin.ebit || 0).toLocaleString()} ₮\n` +
        `• **ЦЭВЭР АШИГ:** ${Math.round(fin.net_profit || 0).toLocaleString()} ₮ *(${fin.net_margin || "0%"})*\n\n` +
        `🗑 **Бодит алдагдал (Waste):** ${Math.round(data.total_waste_loss || 0).toLocaleString()} ₮\n` +
        `⚡ **Ажлын бүтээмж:** ${data.efficiency || "0%"}\n\n` +
        `💎 **ТОП ХАЯГДАЛТАЙ БАРАА:**\n` +
        (data.top_wasters?.length > 0 
          ? data.top_wasters.map((w: any) => `• ${w.name}: -${w.impact?.toLocaleString()}₮ (${w.gap} ${w.unit})`).join('\n')
          : "• Бүртгэгдсэн хаягдал байхгүй байна.") +
        `\n\n💡 *Та санхүү, хаягдлын талаар ямар ч асуултаа шууд бичиж асууж болно.*`;

      await sendTelegramMessage(currentChatId, reportMarkdown);
      return NextResponse.json({ status: 'ok' });
    }

    // =========================================================================
    // G. ЭЭЛЖ ЭХЛЭХ (/shift_start)
    // =========================================================================
    if (incomingText === "/shift_start" || lowercaseMsg === "ээлж эхлэх" || lowercaseMsg === "☀️ ээлж эхлэх") {
      const { data: activeShift } = await supabase.from('shifts').select('id').eq('telegram_chat_id', currentChatId).eq('is_active', true).maybeSingle();
      if (activeShift) {
        await sendTelegramMessageWithMenu(currentChatId, "Сануулга: Таны ээлж хэдийнэ эхэлсэн байна. Орой '🌙 Ээлж хаах' товчоор хаана уу.");
        return NextResponse.json({ status: 'ok' });
      }

      const profileRole = userProfile?.role;
      const firstName = message.from?.first_name || "Ажилтан";
      const fullNameRole = `${profileRole} (${firstName})`;

      if (profileRole === "Бариста ☕" || profileRole === "Тогооч 🍳") {
        const { data: roleTasks } = await supabase.from('tasks').select('*').eq('client_id', tenantClientId).eq('role', profileRole).eq('is_active', true);
        const taskChecklist = roleTasks?.map(t => ({ id: t.id, name: t.task_name, weight: t.weight, done: false })) || [];

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

        const oppositeRoleName = profileRole === "Бариста ☕" ? "Тогооч 🍳" : "Бариста ☕";
        const oppositeCallbackData = profileRole === "Бариста ☕" ? "role_chef" : "role_barista";

        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: currentChatId,
            text: `✅ **Ээлж амжилттай эхэллээ!**\n\nҮүрэг: **${fullNameRole}**${taskText}\n\n*Хэрэв өнөөдөр өөр үүрэгтэй ажиллах бол доорх товчийг дарж солино уу:*`,
            reply_markup: {
              inline_keyboard: [[{ text: `🔄 ${oppositeRoleName} болж солих`, callback_data: oppositeCallbackData }]]
            }
          })
        });
        return NextResponse.json({ status: 'ok' });
      }

      await supabase.from('shifts').insert([{ client_id: tenantClientId, telegram_chat_id: currentChatId, is_active: true }]);
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: currentChatId,
          text: "🎮 **Шинэ ээлж эхэллээ!**\n\nТа өнөөдөр ямар үүрэгтэй ажиллах вэ?",
          reply_markup: {
            inline_keyboard: [[{ text: "☕ Бариста", callback_data: `role_barista` }, { text: "🍳 Тогооч", callback_data: `role_chef` }]]
          }
        })
      });
      return NextResponse.json({ status: 'ok' });
    }

    // =========================================================================
    // H. ЭЭЛЖ ХААХ (/shift_end)
    // =========================================================================
    if (incomingText === "/shift_end" || lowercaseMsg === "ээлж хаах" || lowercaseMsg === "ээлж буулаа" || lowercaseMsg === "🌙 ээлж хаах") {
      const { data: activeShift } = await supabase.from('shifts').select('*').eq('telegram_chat_id', currentChatId).eq('is_active', true).maybeSingle();
      if (!activeShift) {
        await sendTelegramMessageWithMenu(currentChatId, "Алдаа: Идэвхтэй ээлж олдсонгүй. '☀️ Ээлж эхлэх' товчоор эхлүүлнэ үү.");
        return NextResponse.json({ status: 'ok' });
      }

      let tasks = activeShift.daily_tasks_checklist || [];
      if (typeof tasks === 'string') tasks = JSON.parse(tasks);

      if (tasks.length > 0) {
        let buttons = tasks.map((t: any, i: number) => [{ text: `${t.done ? '✅' : '◻️'} ${t.name}`, callback_data: `tsk_${i}` }]);
        buttons.push([{ text: "➔ Дараагийн алхам: Тооллого хийх", callback_data: "go_to_inventory" }]);
        await sendTelegramMessageWithInlineKeyboard(currentChatId, "📋 **Ажлын Даалгавар:** Хийсэн ажлуудаа тэмдэглэнэ үү:", buttons);
      } else {
        await generateInventoryChecklist(currentChatId, null, hostUrl);
      }
      return NextResponse.json({ status: 'ok' });
    }

    // =========================================================================
    // I. БАРИСТАГИЙН ХАЯГДАЛ, ЗАРЛАГА БҮРТГЭХ (УХААЛАГ ШАЛГАЛТ)
    // =========================================================================
    const hasNumbers = /\d/.test(incomingText);
    const isLikelyOperation = hasNumbers && (
      lowercaseMsg.includes("асга") || lowercaseMsg.includes("мууд") || lowercaseMsg.includes("орлоо") || 
      lowercaseMsg.includes("авав") || lowercaseMsg.includes("авсан") || lowercaseMsg.includes("тоолов") || 
      lowercaseMsg.includes("үлдэгдэл") || lowercaseMsg.includes("турш") || lowercaseMsg.includes("хоол")
    );

    if (isLikelyOperation) {
      const { data: ingredients } = await supabase.from('ingredients').select('id, name, unit').eq('client_id', tenantClientId);
      const allowedNames = ingredients ? ingredients.map((i: any) => i.name) : [];

      const aiAnalysis = await parseOperationalText(incomingText, allowedNames);

      if (aiAnalysis && aiAnalysis.is_transaction === true && aiAnalysis.success) {
        const ingredient = ingredients?.find(i => i.name === aiAnalysis.item_name);

        if (ingredient) {
          const workerName = message.from?.first_name || "Ажилтан";
          const { data: log, error: logError } = await supabase.from('inventory_logs').insert([{
            client_id: tenantClientId,
            ingredient_id: ingredient.id,
            quantity: aiAnalysis.quantity,
            type: aiAnalysis.type,
            notes: aiAnalysis.notes || 'Telegram Log',
            date: new Date().toISOString(),
            worker_name: workerName
          }]).select().single();

          if (logError) {
            await sendTelegramMessage(currentChatId, `❌ Хадгалах алдаа: ${logError.message}`);
            return NextResponse.json({ status: 'ok' });
          }

          const confirmText = `📝 Бүртгэгдлээ:\n• Төрөл: ${aiAnalysis.type}\n• Бараа: ${aiAnalysis.item_name}\n• Хэмжээ: ${Math.abs(aiAnalysis.quantity)} ${ingredient.unit}\n• Тайлбар: ${aiAnalysis.notes || 'Тэмдэглэл байхгүй'}`;
          await sendTelegramMessageWithUndo(currentChatId, confirmText, log.id);
          return NextResponse.json({ status: 'ok' });
        }
      }
    }

    // =========================================================================
    // J. ЧАТЛАХ БА ЗӨВЛӨГӨӨ АВАХ (БҮХ ДАТАГ ХАРАХ + 429 FALLBACK)
    // =========================================================================
    
    await sendChatAction(currentChatId, 'typing');

    const initialMsgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: currentChatId,
        text: "🧠 *Бодож байна...*",
        parse_mode: "Markdown"
      })
    });
    const initialMsgData = await initialMsgRes.json();
    const tempMessageId = initialMsgData.result?.message_id;

    const analyticsData = await getAnalyticsData(tenantClientId);
    const fin = analyticsData.financial_ladder || {};

    const isOwner = userProfile?.role === 'owner';
    const ACTIVE_PROMPT = isOwner ? OWNER_CFO_PROMPT : WORKER_BOT_PROMPT;

    const richContext = {
      client: tenantClientId,
      financials: fin,
      total_waste_loss: analyticsData.total_waste_loss,
      total_unexplained_waste: analyticsData.total_unexplained_waste,
      total_surplus_savings: analyticsData.total_surplus_savings,
      efficiency: analyticsData.efficiency,
      all_wasted_items: analyticsData.wasted_only,
      all_underpoured_items: analyticsData.underpoured_only,
      all_inventory_items: analyticsData.all_inventory_data,
      all_menu_performance: analyticsData.menu_performance,
      all_recipes: analyticsData.all_recipes,
      recent_shifts: analyticsData.recent_shifts,
      opex_breakdown: analyticsData.opex_details
    };

    const promptPayload = `CONTEXT_DATA: ${JSON.stringify(richContext)}\n\nUser Question: ${incomingText}`;

    // 💡 Түлхүүрүүд дундуур гүйх
    const API_KEYS = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
    let currentKeyIndex = 0;
    let replyText = "";

    for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
      const keyIdx = (currentKeyIndex + attempt) % API_KEYS.length;
      const currentKey = API_KEYS[keyIdx];
      try {
        const activeGenAI = new GoogleGenerativeAI(currentKey);
        const model = activeGenAI.getGenerativeModel({ 
          model: 'gemini-3.7-flash', 
          generationConfig: { temperature: 0.3 } 
        });

        const aiResponse = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `System: ${ACTIVE_PROMPT}\n\nInput Data: ${promptPayload}` }] }]
        });

        replyText = aiResponse.response.text().replace(/\*|\*\*/g, "").trim();
        if (replyText) {currentKeyIndex = keyIdx;
            break;
        }
      
      } catch (err: any) {
        console.warn(`Telegram API Key #${keyIdx +1} failed, switching to next key...`);
      }
    }

    if (!replyText) {
      replyText = "⚠️ Бүх API түлхүүрийн өдрийн лимит хүрсэн байна. Түр хүлээгээд дахин оролдоно уу.";
    }

    if (tempMessageId) {
      await editTelegramMessage(currentChatId, tempMessageId, replyText);
    } else {
      await sendTelegramMessage(currentChatId, replyText);
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error: any) {
    console.error("Webhook processing failed:", error);
    if (currentChatId) {
      await sendTelegramMessage(currentChatId, `⚠️ Системд алдаа гарлаа: ${error.message}`);
    }
    return NextResponse.json({ status: 'ok' });
  }
}

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS (Send, Edit, Callback, Checklists, Scorecards)
// -----------------------------------------------------------------------------

// 💡 Telegram-ийн 4096 тэмдэгтийн хязгаар ба Markdown алдаанаас сэргийлсэн найдвартай илгээгч
async function sendTelegramMessage(chatId: number | null, text: string) {
  if (!chatId) return;
  const safeText = text.length > 4000 ? text.substring(0, 3950) + "\n\n...(үргэлжлэл бий)" : text;

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: safeText, parse_mode: "Markdown" })
    });

    // Хэрэв Markdown-ийн тусгай тэмдэгтээс болж алдаа гарвал энгийн текстээр дахин илгээнэ
    if (!res.ok) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: safeText })
      });
    }
  } catch (err) {
    console.error("sendTelegramMessage Error:", err);
  }
}

// 💡 Telegram-д "Бичиж байна..." төлөв илгээгч функц
async function sendChatAction(chatId: number | null, action: string = 'typing') {
  if (!chatId) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: action })
  });
}

async function sendTelegramMessageWithMenu(chatId: number | null, text: string) {
  if (!chatId) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: {
        keyboard: [
          [{ text: "☀️ Ээлж эхлэх" }, { text: "🌙 Ээлж хаах" }],
          [{ text: "📊 Тайлан харах" }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    })
  });
}

async function sendTelegramMessageWithUndo(chatId: number | null, text: string, logId: string) {
  if (!chatId) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: {
        inline_keyboard: [[{ text: "Буцаах ↩️ (Undo)", callback_data: `undo_${logId}` }]]
      }
    })
  });
}

// 💡 Засах үед мөн 4000 тэмдэгтэд багтаах
async function editTelegramMessage(chatId: number | null, messageId: number, text: string, inline_keyboard: any[] = []) {
  if (!chatId) return;
  const safeText = text.length > 4000 ? text.substring(0, 3950) + "\n\n...(үргэлжлэл бий)" : text;

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId, 
        message_id: messageId, 
        text: safeText,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard }
      })
    });

    if (!res.ok) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId, 
          message_id: messageId, 
          text: safeText,
          reply_markup: { inline_keyboard }
        })
      });
    }
  } catch (err) {
    console.error("editTelegramMessage Error:", err);
  }
}

async function sendTelegramMessageWithForceReply(chatId: number | null, text: string) {
  if (!chatId) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, reply_markup: { force_reply: true, selective: true } })
  });
}

async function answerTelegramCallback(callbackQueryId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text })
  });
}

async function sendTelegramMessageWithInlineKeyboard(chatId: number | null, text: string, inline_keyboard: any[]) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
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
    const analyticsData = await getAnalyticsData(tenantClientId);
    const twelveHoursAgo = new Date(Date.now() - (12 * 60 * 60 * 1000)).toISOString();

    const criticalItems = analyticsData.all_inventory_data?.filter((i: any) => i.is_critical === true && (!i.last_counted_at || i.last_counted_at < twelveHoursAgo)) || [];
    const nonCriticalItems = analyticsData.all_inventory_data?.filter((i: any) => i.is_critical !== true) || [];
    const sortedCycleItems = nonCriticalItems.sort((a: any, b: any) => new Date(a.last_counted_at || '2000-01-01').getTime() - new Date(b.last_counted_at || '2000-01-01').getTime());
    
    checklist = [...criticalItems, ...sortedCycleItems].slice(0, 5).map((i: any) => ({ name: i.name, unit: i.unit, live_stock: i.live_stock, done: false }));
    await supabase.from('shifts').update({ closing_checklist: checklist }).eq('id', activeShift.id);
  }

  if (checklist.length > 0) {
    const allDone = checklist.every((i: any) => i.done === true);
    
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
  if (!chatId) return;

  const tenantClientId = activeShift.client_id;
  const startTime = activeShift.start_time;
  const endTime = new Date().toISOString();
  const role = activeShift.character_role || "Бариста ☕";

  const { data: logs } = await supabase
    .from('inventory_logs')
    .select('quantity, type, ingredient_id, total_cost, notes')
    .eq('client_id', tenantClientId)
    .gte('date', startTime)
    .lte('date', endTime);

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, unit_price, unit')
    .eq('client_id', tenantClientId);

  let totalWasteCost = 0;
  let itemsCounted = 0;
  let totalPurchases = 0;
  let manualPurchases = 0;
  let loggedWasteEvents = 0;

  if (logs && ingredients) {
    logs.forEach((log: any) => {
      if (log.type === 'count') {
        itemsCounted++;
      } else if (log.type === 'purchase') {
        totalPurchases++;
        const noteText = (log.notes || "").toLowerCase();
        if (!noteText.includes("scan") && !noteText.includes("e-barimt")) {
          manualPurchases++;
        }
      } else if (['spoilage', 'testing', 'staff_meal', 'other'].includes(log.type)) {
        loggedWasteEvents++;
        const ing = ingredients.find((i: any) => i.id === log.ingredient_id);
        if (ing) {
          totalWasteCost += Math.abs(log.quantity) * (parseFloat(ing.unit_price) || 0);
        }
      }
    });
  }

  await supabase.from('shifts').update({ is_active: false, end_time: endTime }).eq('id', activeShift.id);

  await sendTelegramMessageWithMenu(chatId, `✅ **Ээлж амжилттай хаагдлаа!**\n\nӨнөөдрийн тооллого болон өдрийн хаалтын процессууд системд хадгалагдлаа. Сайн ажиллалаа!`);

  const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  const auditAlerts: string[] = [];
  if (manualPurchases > 0) {
    auditAlerts.push(`⚠️ **${manualPurchases} татан авалт зураггүй гараар шивэгдсэн байна.**`);
  } else if (totalPurchases > 0 && manualPurchases === 0) {
    auditAlerts.push(`✅ Бүх татан авалтууд зураг болон E-Barimt-аар баталгаажсан.`);
  }

  if (loggedWasteEvents === 0) {
    auditAlerts.push(`⚠️ Ээлжийн турш ямар ч хаягдал бүртгэгдсэнгүй.`);
  } else {
    auditAlerts.push(`✅ ${loggedWasteEvents} удаагийн хаягдлыг үнэн зөв бүртгэсэн.`);
  }

  const ownerScorecardText = `👑 **ЭЗЭНД ЗОРИУЛСАН ЭЭЛЖИЙН ХЯНАЛТЫН ТАЙЛАН**\n\n` +
    `🏢 **Салбар:** ${tenantClientId}\n` +
    `👤 **Ажилтан:** ${role}\n` +
    `⏱ **Ажилласан:** ${hours} цаг ${minutes} минут\n` +
    `📋 **Тоолсон бараа:** ${itemsCounted} ш\n` +
    `🗑 **Бүртгэсэн хаягдал:** ${Math.round(totalWasteCost).toLocaleString()} ₮\n\n` +
    `🛡 **АЮУЛГҮЙ БАЙДЛЫН ҮНЭЛГЭЭ:**\n` +
    auditAlerts.map(alert => `• ${alert}`).join('\n');

  const { data: owners } = await supabase.from('profiles').select('telegram_chat_id').eq('client_id', tenantClientId).eq('role', 'owner');
  if (owners) {
    for (const owner of owners) {
      if (owner.telegram_chat_id && owner.telegram_chat_id !== chatId) {
        await sendTelegramMessage(owner.telegram_chat_id, ownerScorecardText);
      }
    }
  }
} 