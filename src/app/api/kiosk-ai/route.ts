import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { parseOperationalText, parseReceiptImage } from '../../../lib/gemini';
import { getAnalyticsData } from '../../../lib/analytics';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ⚡ 1. Серверийн санах ой дээр 60 секунд хадгалах кэш (Файлын дээд талд)
const analyticsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 секунд

async function getCachedAnalytics(clientId: string, start?: string, end?: string) {
  const cacheKey = `${clientId}_${start || 'default'}_${end || 'default'}`;
  const cached = analyticsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data; // ⚡ 0.001ms: Бааз руу огт хандахгүй шууд өгнө!
  }

  const freshData = await getAnalyticsData(clientId, start, end);
  analyticsCache.set(cacheKey, { data: freshData, timestamp: Date.now() });
  return freshData;
}



// 💡 1. 504 GATEWAY TIMEOUT-ООС СЭРГИЙЛЖ СЕРВЕРИЙН ХУГАЦААГ 30 СЕКУНД БОЛГОХ
export const maxDuration = 30;
export const dynamic = 'force-dynamic';


function getFriendlyErrorMessage(errorMsg: string): string {
  const errStr = (errorMsg || "").toLowerCase();
  if (errStr.includes("503") || errStr.includes("high demand") || errStr.includes("unavailable") || errStr.includes("overloaded")) {
    return "⚠️ AI зөвлөхийн ачаалал түр ихэссэн байна. Та хэдхэн секундын дараа дахин асууна уу. ☕";
  }
  if (errStr.includes("429") || errStr.includes("quota") || errStr.includes("rate limit") || errStr.includes("too many requests")) {
    return "⚠️ Асуултын өдрийн хязгаар түр хүрсэн байна. Түр хүлээгээд дахин оролдоно уу.";
  }
  if (errStr.includes("504") || errStr.includes("timeout")) {
    return "⚠️ Хариулт боловсруулах хугацаа хэтэрлээ. Та асуултаа арай товчлон дахин илгээнэ үү.";
  }
  return "⚠️ Хариулт боловсруулахад түр саатал гарлаа. Та асуултаа дахин илгээнэ үү.";
}

const OWNER_CFO_PROMPT = `
  Та ШУТИС-ийн дэргэдэх "SF Coffee" болон кофе шопуудын Ахлах Санхүүгийн Зөвлөх (CFO) юм.
  [ДҮРЭМ]:
  - Ирсэн CONTEXT_DATA дахь тоон дээр үндэслэн шууд товч, цэгцтэй, үнэн зөв хариулна.
  - Ундааны эрүүл маржин 75%-85%, хоолных 60%-70%.
  - Markdown форматаар гоёмсог хариулна.
`;

const WORKER_KIOSK_PROMPT = `
  Та гал тогооны ажилтнуудад зориулагдсан "Kiosk AI туслах" юм.
  [ДҮРЭМ]:
  - Зөвхөн зарлага, хаягдал бүртгэх үүрэгтэй.
  - Санхүүгийн ашиг, орлого асуувал: "🔒 Санхүүгийн тайланг зөвхөн Эзний эрхээр харах боломжтой." гэж хариул.
`;

// 🔑 1. Түлхүүрүүдийг цэвэрлэж унших функц (.env-ээс үргэлж шинээр авна)
function getApiKeys(): string[] {
  const raw = process.env.GEMINI_API_KEY || "";
  return raw.replace(/["']/g, "").split(",").map(k => k.trim()).filter(Boolean);
}

let globalKeyIndex = 0;

// ⚡ 2. ГАЦДАГГҮЙ ТҮЛХҮҮР ШИЛЖҮҮЛЭГЧ МОТОР
async function callGeminiStreamWithFailover(systemPrompt: string, promptPayload: string) {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error("GEMINI_API_KEY олдсонгүй (.env.local шалгана уу)");
  }

  let lastError = "";

  // 💡 Бүх түлхүүрийг дарааллын дагуу шалгана (Хэзээ ч 429 дээр break хийхгүй!)
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const keyIdx = (globalKeyIndex + attempt) % keys.length;
    const currentKey = keys[keyIdx];

    try {
      const activeGenAI = new GoogleGenerativeAI(currentKey);
      const model = activeGenAI.getGenerativeModel({ 
        model: 'gemini-3.6-flash', // 👈 gemini-3.6-flash хэвээрээ
        generationConfig: { temperature: 0.2 }
      });

      const response = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: `System: ${systemPrompt}\n\nInput Data: ${promptPayload}` }] }]
      });

      // Хэрэв амжилттай болсон бол дараагийн хүсэлтэд энэ түлхүүрээс эхэлнэ
      globalKeyIndex = keyIdx;
      return response;

    } catch (err: any) {
      lastError = err.message || String(err);
      console.warn(`[GEMINI ТҮЛХҮҮР #${keyIdx + 1} АЛДАА: 429/Гацалт гарлаа. Дараагийн түлхүүр рүү шилжиж байна...]`, lastError);
      
      // Алдаа заасан тул дараагийн хүсэлтийг шууд дараагийн түлхүүр рүү үсэргэнэ
      globalKeyIndex = (keyIdx + 1) % keys.length;
      
      // 💡 ЗАСВАР: Хэзээ ч break хийхгүй, үлдсэн бүх түлхүүрийг шалгана!
      continue;
    }
  }

  throw new Error(lastError);
}  

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = (body.text || body.payloadText || body.input || "").trim();
    const tenantClientId = body.tenantClientId || body.clientId || 'SF Coffee';
    const workerName = body.workerName || 'Ажилтан';
    const userRole = body.userRole || 'owner';
    const imageBase64 = body.imageBase64 || null;
    const action = body.action || null;
    const logId = body.logId || null;
    const isOwner = userRole === 'owner';
    const ACTIVE_PROMPT = isOwner ? OWNER_CFO_PROMPT : WORKER_KIOSK_PROMPT;
    const clientId = tenantClientId;
    
    // 1. UNDO
    if (action === 'undo' && logId) {
      const { error } = await supabaseAdmin.from('inventory_logs').delete().eq('id', logId);
      if (error) return NextResponse.json({ success: false, message: `❌ Алдаа: ${error.message}` });
      return NextResponse.json({ success: true, message: "❌ Бүртгэл цуцлагдлаа (Үлдэгдэл буцаж сэргэсэн)." });
    }

    const { data: ingredients } = await supabaseAdmin.from('ingredients').select('id, name, unit').eq('client_id', clientId);
    const allowedNames = ingredients ? ingredients.map(i => i.name) : [];

  // =========================================================================
    // 🎙️ 1.5. IPAD / IPHONE ДУУ ХООЛОЙГ GEMINI 3.6 FLASH-ЭЭР ШУУД СОНСОЖ БҮРТГЭХ
    // =========================================================================
    const audioBase64 = body.audioBase64 || null;
    const audioMimeType = body.audioMimeType || 'audio/webm';

    if (audioBase64) {
      const audioPrompt = `
        You are an expert Mongolian F&B voice listener. 
        Listen to this barista's spoken Mongolian voice audio carefully.
        Extract the ingredient, quantity, and operation type.
        
        Allowed ingredients: [${allowedNames.join(', ')}]
        
        Rules:
        - Spoilage (асгасан, муудсан, гашилсан, хаясан): quantity must be NEGATIVE, type: "spoilage"
        - Purchase (авсан, ирсэн, татан авалт): quantity must be POSITIVE, type: "purchase"
        - Staff meal (хоолонд орсон, идсэн): quantity must be NEGATIVE, type: "staff_meal"
        - Standardize: 1 литр -> 1000 ml, 1 кг -> 1000 gram.
        
        Return STRICTLY JSON format:
        {
          "is_transaction": true,
          "item_name": "Milk",
          "quantity": -2000,
          "type": "spoilage",
          "extracted_phrase": "сүү",
          "notes": "2 литр сүү асгарсан (Аудиогоор сонсов)"
        }
      `;

     let aiResult: any = null;
      const keys = getApiKeys();
      let lastAudioError = "";

      // 💡 ТҮЛХҮҮРҮҮД ДЭЭР ДАРААЛАЛ АЛДАГДАХГҮЙ ҮСЭРДЭГ ШИНЭ ЛООП:
      for (let attempt = 0; attempt < keys.length; attempt++) {
        const keyIdx = (globalKeyIndex + attempt) % keys.length;
        const currentKey = keys[keyIdx];

        try {
          const ai = new GoogleGenerativeAI(currentKey);
          const model = ai.getGenerativeModel({
            model: 'gemini-3.6-flash',
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
          });

          const response = await model.generateContent({
            contents: [{
              role: 'user',
              parts: [
                { text: audioPrompt },
                { inlineData: { mimeType: audioMimeType, data: audioBase64 } }
              ]
            }]
          });

          const textRes = response.response.text();
          aiResult = JSON.parse(textRes.replace(/```json|```/g, "").trim());
          if (aiResult) {
            globalKeyIndex = keyIdx; // 👈 Амжилттай түлхүүрийг санаж хадгална!
            break;
          }
        } catch (e: any) {
          lastAudioError = e.message || String(e);
          console.warn(`[AUDIO KEY #${keyIdx + 1} 429/Error]: Дараагийн түлхүүр рүү шилжиж байна...`, lastAudioError);
          globalKeyIndex = (keyIdx + 1) % keys.length; // 👈 1-р түлхүүр гацвал шууд 2-р түлхүүр рүү үсэрнэ
          continue;
        }
      }

      if (aiResult && aiResult.is_transaction && aiResult.item_name) {
        const targetIng = ingredients?.find(i => i.name.toLowerCase().trim() === aiResult.item_name.toLowerCase().trim());
        
        if (targetIng) {
          const { data: newLog } = await supabaseAdmin.from('inventory_logs').insert([{
            client_id: clientId,
            ingredient_id: targetIng.id,
            quantity: aiResult.quantity,
            type: aiResult.type || 'spoilage',
            notes: aiResult.notes || 'Аудио дуут бүртгэл',
            worker_name: workerName,
            date: new Date().toISOString()
          }]).select().single();

           // 🧠 IPAD/IPHONE-ООР ХЭЛСЭН ДУУНААС Ч БАС ҮГЭЭ ЦЭЭЖИЛНЭ!
          const cleanAudioPhrase = (aiResult.extracted_phrase || '')
            .replace(/[\d\.]+/g, '')
            .replace(/литр|мл|кг|гр|грамм|ш|ширхэг|хайрцаг|уут|асгасан|авсан|муудсан|аву/gi, '')
            .trim()
            .toLowerCase();

          if (cleanAudioPhrase && cleanAudioPhrase.length >= 3) {
            await supabaseAdmin.from('learned_aliases').upsert([{
              client_id: clientId,
              phrase: cleanAudioPhrase,
              ingredient_id: targetIng.id
            }], { onConflict: 'client_id,phrase' });
          }

          return NextResponse.json({
            success: true,
            is_log: true,
            log_id: newLog?.id,
            message: `🎙️ **AI сонсож бүртгэлээ:**\n• Бараа: **${targetIng.name}**\n• Төрөл: \`${aiResult.type}\`\n• Хэмжээ: **${Math.abs(aiResult.quantity)} ${targetIng.unit}**`
          });
        }
      }

      // Хэрэв бүх түлхүүр 429 болсон бол жинхэнэ шалтгааныг нь хэлнэ
      return NextResponse.json({
        success: false,
        message: lastAudioError.includes("429") 
          ? "⚠️ Бүх AI түлхүүрийн түр хязгаар хүрсэн байна. 1 минут хүлээгээд дахин ярина уу." 
          : "🎙️ Дууг сайн сонсож чадсангүй. Та микрофондоо арай ойртоод дахин тод хэлнэ үү."
      });
    }
// 2. ЗУРАГ БҮРТГЭХ (E-Barimt эсвэл Барааны зураг)
if (imageBase64) {
      const aiAnalysis = await parseReceiptImage(imageBase64, allowedNames);
      if (!aiAnalysis || !aiAnalysis.success || !aiAnalysis.purchases) {
        return NextResponse.json({ success: false, message: aiAnalysis?.error_message || "❌ Зургийг уншиж чадсангүй." });
      }

      const logsToInsert: any[] = [];
      let successMsg = "✅ **Татан авалт амжилттай бүртгэгдлээ:**\n\n";
      const currentDate = new Date().toISOString();

      for (const item of aiAnalysis.purchases) {
        const isFood = item.is_food !== false;
        const isEBarimt = item.is_ebarimt !== false && item.image_type !== 'Product Photo';
        const payMethod = item.payment_method || 'bank';
        const notePrefix = isEBarimt ? '🧾 E-Barimt' : '📸 Барааны зураг (Баримтгүй)';

        if (isFood) {
          let targetIngredient = ingredients?.find(
            (i: any) => i.name.toLowerCase().trim() === item.item_name.toLowerCase().trim()
          );

          // Хэрэв шинэ хүнс бол ingredients-д 0.05с-д шууд бүртгэнэ
          if (!targetIngredient) {
            const unitPrice = item.quantity > 0 ? Math.round((item.total_cost || 0) / item.quantity) : 0;
            const { data: newIng } = await supabaseAdmin
              .from('ingredients')
              .insert([{ client_id: clientId, name: item.item_name.trim(), unit: 'ш', unit_price: unitPrice, current_stock: 0 }])
              .select()
              .single();
            if (newIng) targetIngredient = newIng;
          }

          if (targetIngredient) {
            logsToInsert.push({ 
              client_id: clientId, 
              ingredient_id: targetIngredient.id, 
              quantity: Math.abs(item.quantity), 
              type: 'purchase', 
              total_cost: item.total_cost || 0, 
              notes: `${notePrefix} (Kiosk)`, 
              payment_method: payMethod,
              is_ebarimt: isEBarimt,
              worker_name: workerName, 
              date: currentDate 
            });
            successMsg += `• 🥐 [Агуулах] ${targetIngredient.name}: ${item.quantity} ${targetIngredient.unit || 'ш'} (${(item.total_cost || 0).toLocaleString()}₮)\n`;
          }
        } else {
          // Хүнсний бус OPEX
          logsToInsert.push({ 
            client_id: clientId, 
            ingredient_id: null,
            non_food_item: item.item_name, 
            quantity: Math.abs(item.quantity), 
            type: 'purchase', 
            total_cost: item.total_cost || 0, 
            notes: `${notePrefix} (Хүнсний бус OPEX)`, 
            payment_method: payMethod,
            is_ebarimt: isEBarimt,
            worker_name: workerName, 
            date: currentDate 
          });
          successMsg += `• 🧼 [OPEX] ${item.item_name}: ${item.quantity} ш (${(item.total_cost || 0).toLocaleString()}₮)\n`;
        }
      }

      // ⚡ БҮХ БАРААГ ЗЭРЭГ ХАДГАЛАХ (1-хэн хүсэлтээр)
      if (logsToInsert.length > 0) {
        await supabaseAdmin.from('inventory_logs').insert(logsToInsert);
      }
      return NextResponse.json({ success: true, message: successMsg });
    }
    // 3. ТЕКСТ БИЧИХ ҮЕД
    if (text) {
      const lower = text.toLowerCase().trim();

      // ⚡ АЖИЛТАН БҮРТГЭХ ХЭСЭГ (СУРАЛЦАГЧ FEEDBACK LOOP-ТЭЙ)
      if (!isOwner) {
        // 1. Баазаас өмнө нь суралцсан алиасуудыг татах
        const { data: learnedAliases } = await supabaseAdmin
          .from('learned_aliases')
          .select('phrase, ingredient_id')
          .eq('client_id', clientId);

        // 2. Local Parser-аар 0.001ms-д шалгах
        const aiAnalysis = await parseOperationalText(text, allowedNames, learnedAliases || []);
        
        if (aiAnalysis && aiAnalysis.is_transaction && aiAnalysis.success) {
          const ingredient = ingredients?.find(i => i.name.toLowerCase().trim() === aiAnalysis.item_name.toLowerCase().trim());
          if (ingredient) {
            const { data: log } = await supabaseAdmin.from('inventory_logs').insert([{
              client_id: clientId,
              ingredient_id: ingredient.id,
              quantity: aiAnalysis.quantity,
              type: aiAnalysis.type,
              notes: aiAnalysis.notes || 'Instant Log',
              worker_name: workerName,
              date: new Date().toISOString()
            }]).select().single();

            const rawPhrase = aiAnalysis.extracted_phrase || text;
            // Тоо болон үйл үгсийг цэвэрлэх
            const cleanPhrase = rawPhrase
              .replace(/[\d\.]+/g, '')
              .replace(/литр|мл|кг|гр|грамм|ш|ширхэг|хайрцаг|уут|асгасан|авсан|муудсан|аву|авчлаа|гашлаа/gi, '')
              .trim()
              .toLowerCase();

            if (cleanPhrase && cleanPhrase.length >= 3) {
              await supabaseAdmin.from('learned_aliases').upsert([{
                client_id: clientId,
                phrase: cleanPhrase,
                ingredient_id: ingredient.id
              }], { onConflict: 'client_id,phrase' });
            }

            return NextResponse.json({
              success: true,
              is_log: true,
              log_id: log?.id,
              message: `📝 **Бүртгэгдлээ (0.01s):**\n• Төрөл: \`${aiAnalysis.type}\`\n• Бараа: **${aiAnalysis.item_name}**\n• Хэмжээ: **${Math.abs(aiAnalysis.quantity)} ${ingredient.unit}**`
            });
          }
        }

        return NextResponse.json({
          success: true,
          is_log: false,
          message: "🔒 Зөвхөн гал тогооны зарлага, хаягдал бүртгэх үүрэгтэй туслах байна (Жишээ: '500мл сүү асгасан')."
        });
      }



      // =========================================================================
      // ЗӨВХӨН ЭЗЭН БАЙВАЛ Л ДООШОО ГҮЙЖ САНХҮҮГИЙН МОТОР АЖИЛЛАНА:
      // =========================================================================
      let activeStart = body.startDate;
      let activeEnd = body.endDate;

      // Хэрэв огноо ирээгүй бол автоматаар хамгийн сүүлийн борлуулалттай сарыг олох
      if (!activeStart || !activeEnd) {
        const { data: latestSale } = await supabaseAdmin
          .from('sales_logs')
          .select('date')
          .eq('client_id', clientId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestSale && latestSale.date) {
          const ym = latestSale.date.substring(0, 7);
          const [year, month] = ym.split('-').map(Number);
          activeStart = `${ym}-01T00:00:00.000Z`;
          activeEnd = `${ym}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}T23:59:59.999Z`;
        }
      }

      // 🚀 1 Л УДАА ТАТАХ:
      const analyticsData = await getCachedAnalytics(clientId, activeStart, activeEnd);
      const fin = analyticsData.financial_ladder || {};

      // =========================================================================
      // ⚡ АЛХАМ 2: ХЭРЭВ "REPORT" ГЭЖ БИЧВЭЛ ДЭЭРХ ДАТАГААРАА 0.03 СЕКУНДЭД ШУУД ХАРИУЛАХ
      // =========================================================================
      const isReportCommand = 
        lower === "report" || 
        lower === "/report" || 
        lower === "тайлан" || 
        lower === "тайлан харах" || 
        lower.startsWith("report ") ||
        lower.startsWith("/report ");

      if (isReportCommand) {
        if (!isOwner) {
          return NextResponse.json({
            success: true,
            is_log: false,
            message: "🔒 Уучлаарай, санхүүгийн тайланг зөвхөн Эзний эрхээр харах боломжтой."
          });
        }

        const instantReport = `📊 **САНХҮҮГИЙН ТАЙЛАН (${clientId}):**\n\n` +
          `• **Нийт орлого:** ${Math.round(fin.revenue || 0).toLocaleString()} ₮\n` +
          `• **Бодит COGS:** ${Math.round(fin.actual_cogs || 0).toLocaleString()} ₮ *(Онол: ${Math.round(fin.theo_cogs || 0).toLocaleString()} ₮)*\n` +
          `• **Бохир ашиг:** ${fin.gross_margin || "0%"}\n` +
          `• **OPEX зардал:** ${Math.round(fin.opex || 0).toLocaleString()} ₮\n` +
          `• **EBIT (Татварын өмнөх):** ${Math.round(fin.ebit || 0).toLocaleString()} ₮\n` +
          `• **ЦЭВЭР АШИГ:** ${Math.round(fin.net_profit || 0).toLocaleString()} ₮ *(${fin.net_margin || "0%"})*\n\n` +
          `🗑 **Бодит алдагдал (Waste):** ${Math.round(analyticsData.total_waste_loss || 0).toLocaleString()} ₮\n` +
          `⚡ **Бүтээмж:** ${analyticsData.efficiency || "0%"}\n\n` +
          `💎 **ТОП ХАЯГДАЛ:**\n` +
          (analyticsData.top_wasters?.length > 0 
            ? analyticsData.top_wasters.map((w: any) => `• ${w.name}: -${w.impact?.toLocaleString()}₮ (${w.gap} ${w.unit})`).join('\n')
            : "• Бүртгэгдсэн хаягдал байхгүй.") +
          `\n\n💡 *Та санхүү, хаягдал, үнийн бодлогын талаар ямар ч асуултаа шууд асууж болно.*`;

        return NextResponse.json({ success: true, is_log: false, message: instantReport });
      }


     const richContext = {
      client: clientId,
      financials: analyticsData.financial_ladder,
      tax_summary: analyticsData.tax_summary,
      cashflow: analyticsData.cashflow_summary,
      payroll: analyticsData.payroll_summary,
      total_waste_loss: analyticsData.total_waste_loss,
      total_unexplained_waste: analyticsData.total_unexplained_waste,
      total_surplus_savings: analyticsData.total_surplus_savings,
      efficiency: analyticsData.efficiency,
      logged_waste_breakdown: {
        spoilage_loss: analyticsData.total_logged_spoilage || 0,
        testing_cost: analyticsData.total_logged_testing || 0,
        staff_meal_cost: analyticsData.total_logged_staff_meal || 0,
        other_cost: analyticsData.total_logged_other || 0
      },
      top_wasted_items: analyticsData.top_wasters?.map((w: any) => `${w.name} (-${w.impact}₮, зөрүү: ${w.gap} ${w.unit})`),
      top_expensive_items: analyticsData.top_expensive?.map((e: any) => `${e.name} (${e.price}₮/${e.unit})`),
      all_wasted_items: analyticsData.wasted_only?.map((i: any) => ({
        name: i.name,
        gap: `${i.gap} ${i.unit}`,
        loss: `${i.impact}₮`,
        unit_price: `${i.price}₮`,
        notes: i.notes || ""
      })),
      all_underpoured_items: analyticsData.underpoured_only?.map((i: any) => ({
        name: i.name,
        gap: `${i.gap} ${i.unit}`,
        savings: `${i.impact}₮`
      })),
      all_inventory_items: analyticsData.all_inventory_data?.map((i: any) => ({
        name: i.name,
        live_stock: `${i.live_stock} ${i.unit}`,
        par_level: `${i.par_level} ${i.unit}`,
        unit_price: `${i.price}₮`,
        abc_class: i.abc_class,
        suggested_order: i.suggested_order
      })),
      all_menu_performance: analyticsData.menu_performance?.map((m: any) => ({
        name: m.name,
        sold_count: m.sold,
        selling_price: `${m.selling_price}₮`,
        cost: `${m.cost_per_item}₮`,
        margin: `${m.gross_margin_pct}%`
      })),
      all_recipes: analyticsData.all_recipes,
      recent_shifts: analyticsData.recent_shifts?.slice(0, 10),
      margin_guard_alerts: analyticsData.margin_guard_alerts,
      worker_fraud_matrix: analyticsData.worker_fraud_matrix,
      recent_worker_logs: analyticsData.recent_worker_logs,
      opex_breakdown: analyticsData.opex_details
    };


     
      // =========================================================================
      // ⚡ АЛХАМ 3: ӨӨР ЧӨЛӨӨТ АСУУЛТ БОЛ ДЭЭРХ ДАТАГААРАА GEMINI-Г STREAM ХИЙЖ АЖИЛЛУУЛАХ

   
    const promptPayload = `CONTEXT_DATA: ${JSON.stringify(richContext)}\n\nUser Question: ${text}`;
      let responseStream = null;
      try {
        responseStream = await callGeminiStreamWithFailover(ACTIVE_PROMPT, promptPayload);
      } catch (err: any) {
        return NextResponse.json({ 
          success: false, 
          message:getFriendlyErrorMessage(err.message || String(err)) 
        });
      }

   

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseStream.stream) {
              const chunkText = chunk.text();
              if (chunkText) {
                controller.enqueue(encoder.encode(chunkText));
              }
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    return NextResponse.json({ success: false, message: "Хоосон утга илгээсэн байна." });

  } catch (error: any) {
    console.error("Kiosk AI Error:", error);
    return NextResponse.json({ success: false, message: getFriendlyErrorMessage(error.message || String(error)) });
  }
}