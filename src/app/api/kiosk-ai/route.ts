import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { parseOperationalText, parseReceiptImage } from '../../../lib/gemini';
import { getAnalyticsData } from '../../../lib/analytics';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 💡 1. 504 GATEWAY TIMEOUT-ООС СЭРГИЙЛЖ СЕРВЕРИЙН ХУГАЦААГ 30 СЕКУНД БОЛГОХ
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const API_KEYS = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

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
      const { error } = await supabase.from('inventory_logs').delete().eq('id', logId);
      if (error) return NextResponse.json({ success: false, message: `❌ Алдаа: ${error.message}` });
      return NextResponse.json({ success: true, message: "❌ Бүртгэл цуцлагдлаа (Үлдэгдэл буцаж сэргэсэн)." });
    }

    const { data: ingredients } = await supabase.from('ingredients').select('id, name, unit').eq('client_id', clientId);
    const allowedNames = ingredients ? ingredients.map(i => i.name) : [];

    // 2. ЗУРАГ БҮРТГЭХ
    if (imageBase64) {
      const aiAnalysis = await parseReceiptImage(imageBase64, allowedNames);
      if (!aiAnalysis || !aiAnalysis.success) {
        return NextResponse.json({ success: false, message: "❌ Зургийг уншиж чадсангүй." });
      }

      const logsToInsert: any[] = [];
      let successMsg = "✅ **Татан авалт амжилттай бүртгэгдлээ:**\n\n";

      for (const item of aiAnalysis.purchases) {
        const ing = ingredients?.find((i: any) => i.name === item.item_name);
        const isProductPhoto = item.image_type === 'Product Photo';
        const noteText = isProductPhoto ? '📸 Барааны зураг (Kiosk)' : '🧾 E-Barimt (Kiosk)';

        if (ing) {
          logsToInsert.push({ 
            client_id: clientId, 
            ingredient_id: ing.id, 
            quantity: Math.abs(item.quantity), 
            type: 'purchase', 
            total_cost: item.total_cost || 0, 
            notes: noteText, 
            worker_name: workerName, 
            date: new Date().toISOString() 
          });
          successMsg += `• ${ing.name}: ${item.quantity} ${ing.unit} (${(item.total_cost || 0).toLocaleString()}₮)\n`;
        } else {
          logsToInsert.push({ 
            client_id: clientId, 
            ingredient_id: null,
            non_food_item: item.item_name, 
            quantity: Math.abs(item.quantity), 
            type: 'purchase', 
            total_cost: item.total_cost || 0, 
            notes: 'E-Barimt (OPEX - Kiosk)', 
            worker_name: workerName, 
            date: new Date().toISOString() 
          });
          successMsg += `• ${item.item_name} (Бусад): ${item.quantity} ш (${(item.total_cost || 0).toLocaleString()}₮)\n`;
        }
      }

      if (logsToInsert.length > 0) {
        await supabase.from('inventory_logs').insert(logsToInsert);
      }
      return NextResponse.json({ success: true, message: successMsg });
    }

    // 3. ТЕКСТ БИЧИХ ҮЕД
    if (text) {
      const lower = text.toLowerCase();

      // ⚡ 1. REPORT ТАЙЛАНГИЙН ТУШААЛД 0.03 СЕКУНДЭД ШУУД ХАРИУЛАХ
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

        const analyticsData = await getAnalyticsData(clientId);
        const fin = analyticsData.financial_ladder || {};

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

      // ⚡ 2. ЗАРЛАГА БҮРТГЭХ
      const hasNumbers = /\d/.test(text);
      const isLikelyOperation = hasNumbers && (
        lower.includes("асга") || lower.includes("мууд") || lower.includes("орлоо") || 
        lower.includes("авав") || lower.includes("авсан") || lower.includes("тоолов") || 
        lower.includes("үлдэгдэл") || lower.includes("турш") || lower.includes("хоол")
      );

      if (isLikelyOperation) {
        const aiAnalysis = await parseOperationalText(text, allowedNames);
        if (aiAnalysis && aiAnalysis.is_transaction && aiAnalysis.success) {
          const ingredient = ingredients?.find(i => i.name === aiAnalysis.item_name);
          if (ingredient) {
            const { data: log, error: logError } = await supabase.from('inventory_logs').insert([{
              client_id: clientId,
              ingredient_id: ingredient.id,
              quantity: aiAnalysis.quantity,
              type: aiAnalysis.type,
              notes: aiAnalysis.notes || 'Kiosk AI Log',
              worker_name: workerName,
              date: new Date().toISOString()
            }]).select().single();

            if (logError) throw logError;

            return NextResponse.json({
              success: true,
              is_log: true,
              log_id: log.id,
              message: `📝 Бүртгэгдлээ:\n• Төрөл: ${aiAnalysis.type}\n• Бараа: ${aiAnalysis.item_name}\n• Хэмжээ: ${Math.abs(aiAnalysis.quantity)} ${ingredient.unit}`
            });
          }
        }
      }

      // ⚡ 3. ЧӨЛӨӨТ АСУУЛТ (ХУРДАН, ХӨНГӨН ӨГӨГДӨЛТЭЙ СҮЛЖЭЭНИЙ ХАМГААЛАЛТ)
      const analyticsData = await getAnalyticsData(clientId);
      const fin = analyticsData.financial_ladder || {};

      // 💡 504 Timeout үүсгэхгүйн тулд хамгийн чухал сүүлийн 40 логийг л өгнө (Хэт нүсэр дата илгээхгүй)
      const richContext = {
        client: clientId,
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
        recent_shifts: analyticsData.recent_shifts?.slice(0, 10),
        recent_worker_logs: analyticsData.recent_worker_logs,
        opex_breakdown: analyticsData.opex_details,
        top_wasted_items: analyticsData.top_wasters,
        top_expensive_items: analyticsData.top_expensive
      };

      const promptPayload = `CONTEXT_DATA: ${JSON.stringify(richContext)}\n\nUser Question: ${text}`;

      let responseStream = null;
      let lastErrorMsg = "";

      // 💡 Хэт удаан хүлээж 504 болохоос сэргийлж хамгийн ихдээ эхний 2 түлхүүрийг л шалгана
      const maxAttempts = Math.min(API_KEYS.length, 2);

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const keyIdx = (currentKeyIndex + attempt) % API_KEYS.length;
        const currentKey = API_KEYS[keyIdx];

        try {
          const activeGenAI = new GoogleGenerativeAI(currentKey);
          const model = activeGenAI.getGenerativeModel({ 
            model: 'gemini-3.7-flash',
            generationConfig: { temperature: 0.3 }
          });

          responseStream = await model.generateContentStream({
            contents: [{ role: 'user', parts: [{ text: `System: ${ACTIVE_PROMPT}\n\nInput Data: ${promptPayload}` }] }]
          });

          if (responseStream) {
            currentKeyIndex = keyIdx;
            break;
          }
        } catch (err: any) {
          lastErrorMsg = err.message || String(err);
          console.warn(`Key #${keyIdx + 1} error:`, lastErrorMsg);
        }
      }

      if (!responseStream) {
        return NextResponse.json({ 
          success: false, 
          message: getFriendlyErrorMessage(lastErrorMsg) 
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