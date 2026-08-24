import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { parseOperationalText, parseReceiptImage } from '../../../lib/gemini';
import { getAnalyticsData } from '../../../lib/analytics';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const OWNER_CFO_PROMPT = `
  Та ШУТИС-ийн дэргэдэх "SF Coffee" болон хамтран ажиллагч кофе шопуудын Стратеги, Санхүүгийн Ахлах Зөвлөх (Chief Financial Officer - CFO) юм.

  [ТАНЫ ҮҮРЭГ БА ХҮЧИН ЧАДАЛ]:
  1. Санхүүгийн Бодит Дүн Шинжилгээ:
     - Ирсэн CONTEXT_DATA дахь орлого, COGS өртөг, OPEX зардал, бохир ба цэвэр ашгийн бодит тоон дээр үндэслэн гүнзгий дүн шинжилгээ хийнэ.
  2. Үнийн Бодлого ба Маржин Хамгаалалт:
     - Ундаа, кофены эрүүл Бохир Ашиг (Gross Margin) нь 75% - 85% (Өртөг нь 15% - 25%).
     - Хоол, сэндвич, десертийн эрүүл Бохир Ашиг нь 60% - 70% (Өртөг нь 30% - 40%).
     - Хэрэв аль нэг бүтээгдэхүүний өртөг өндөр байвал үнийг хэрэглэгчдийг үргээхгүйгээр хэрхэн нэмэх, эсвэл татан авалтыг хэрхэн хямдруулах стратегийг нарийвчлан зөвлөнө.
  3. Шинэ Жор Зохиох (AI Recipe Creator):
     - Хэрэв эзэн шинэ ундаа, хоолны жор асуувал найрлага, орцыг грамм, мл-ээр нь мэргэжлийн түвшинд зохиож, өртөг болон ашгийн хувийг тооцоолж өгнө.
  4. Алдагдал ба Ажилтны Аудит:
     - Топ хаягдал (Top Waste), шалтгаангүй зөрүү, баримтгүй шивэгдсэн татан авалтыг илрүүлж, аюулгүй байдлын зөвлөмж өгнө.

  [ХАРИУЛАХ ЗАГВАР]:
  - Мэргэжлийн, урам зориг өгсөн, тодорхой бүтэцтэй (Markdown bullet points, тод гарчиг ашиглан) бүрэн дэлгэрэнгүй, Монгол хэлээр хариулна.
`;

const WORKER_KIOSK_PROMPT = `
  Та гал тогооны ажилтнуудад зориулагдсан "Kiosk AI Бүртгэлийн туслах" юм.
  [ДҮРЭМ]:
  1. Таны цорын ганц үүрэг: Ажилтны бичсэн зарлага, хаягдал, татан авалтыг ойлгох.
  2. Ажилтан санхүүгийн ашиг, орлого, тайлан асуувал ШУУД ингэж хариулна: 
     "🔒 Санхүүгийн тайланг зөвхөн Эзний эрхээр харах боломжтой."
`;

export async function POST(request: Request) {
  try {
    const { tenantClientId, workerName, text, imageBase64, action, logId, userRole } = await request.json();
    const isOwner = userRole === 'owner';
    const ACTIVE_PROMPT = isOwner ? OWNER_CFO_PROMPT : WORKER_KIOSK_PROMPT;
    const clientId = tenantClientId || 'SF Coffee';

    // 1. БҮРТГЭЛ БУЦААХ (UNDO ҮЙЛДЭЛ)
    if (action === 'undo' && logId) {
      const { error } = await supabase.from('inventory_logs').delete().eq('id', logId);
      if (error) return NextResponse.json({ success: false, message: `❌ Алдаа: ${error.message}` });
      return NextResponse.json({ success: true, message: "❌ Бүртгэл цуцлагдлаа (Үлдэгдэл буцаж сэргэсэн)." });
    }

    const { data: ingredients } = await supabase.from('ingredients').select('id, name, unit').eq('client_id', clientId);
    const allowedNames = ingredients ? ingredients.map(i => i.name) : [];

    // 2. ЗУРАГ БҮРТГЭХ (E-BARIMT СКАЙНЕР)
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
            worker_name: workerName || "Ажилтан", 
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
            worker_name: workerName || "Ажилтан", 
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
      const rawText = text.trim();
      const lower = rawText.toLowerCase();

      // ⚡ АЛХАМ 1: ТАЙЛАНГИЙН ТУШААЛД 0.03 СЕКУНДЭД ШУУД ХАРИУЛАХ
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

      // ⚡ АЛХАМ 2: ЗАРЛАГА, ХАЯГДАЛ БҮРТГЭХ
      const hasNumbers = /\d/.test(rawText);
      const isLikelyOperation = hasNumbers && (
        lower.includes("асга") || lower.includes("мууд") || lower.includes("орлоо") || 
        lower.includes("авав") || lower.includes("авсан") || lower.includes("тоолов") || 
        lower.includes("үлдэгдэл") || lower.includes("турш") || lower.includes("хоол")
      );

      if (isLikelyOperation) {
        const aiAnalysis = await parseOperationalText(rawText, allowedNames);
        if (aiAnalysis && aiAnalysis.is_transaction && aiAnalysis.success) {
          const ingredient = ingredients?.find(i => i.name === aiAnalysis.item_name);
          if (ingredient) {
            const { data: log, error: logError } = await supabase.from('inventory_logs').insert([{
              client_id: clientId,
              ingredient_id: ingredient.id,
              quantity: aiAnalysis.quantity,
              type: aiAnalysis.type,
              notes: aiAnalysis.notes || 'Kiosk AI Log',
              worker_name: workerName || "Ажилтан",
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

      // ⚡ АЛХАМ 3: ЧӨЛӨӨТ АСУУЛТ & ЗӨВЛӨГӨӨ (БҮРЭН ЧАДАЛ + STREAMING)
      const analyticsData = await getAnalyticsData(clientId);
      const fin = analyticsData.financial_ladder || {};

      const richContext = {
        client: clientId,
        financials: fin,
        total_waste: analyticsData.total_waste_loss,
        top_wasters: analyticsData.top_wasters,
        top_expensive: analyticsData.top_expensive,
        menu_performance: analyticsData.menu_performance?.slice(0, 15),
        all_recipes_sample: Object.keys(analyticsData.all_recipes || {}).slice(0, 15)
      };

      // 💡 Хязгаарлалтгүй, бүтэн хүчин чадлаараа сэтгэх загвар
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-3.6-flash',
        generationConfig: {
          temperature: 0.3
          // maxOutputTokens хязгаарлалтгүй -> Бүрэн дэлгэрэнгүй хариулна
        }
      });

      const promptPayload = `CONTEXT_DATA: ${JSON.stringify(richContext)}\n\nUser Question: ${rawText}`;

      // 🚀 0.2 СЕКУНДЭД ШУУД УРСАЖ ЭХЛЭХ STREAMING
      const responseStream = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: `System: ${ACTIVE_PROMPT}\n\nInput Data: ${promptPayload}` }] }]
      });

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
    return NextResponse.json({ success: false, message: `Системийн алдаа: ${error.message}` });
  }
}