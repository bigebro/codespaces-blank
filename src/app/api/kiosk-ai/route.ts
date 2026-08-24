import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { parseOperationalText, parseReceiptImage } from '../../../lib/gemini';
import { getAnalyticsData } from '../../../lib/analytics';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const OWNER_CFO_PROMPT = `
  Та кофе шопын санхүүгийн ахлах зөвлөх (CFO) болон стратегийн хамтрагч юм. 
  
  [АЖИЛЛАХ ДҮРЭМ]:
  1. Хэрэглэгчийн асуултад шууд товч, цэгцтэй, санхүүгийн бодит тоо баримтад тулгуурлан хариулна.
  2. Ирсэн өгөгдөл дэх CONTEXT_DATA-г бүрэн ашиглаж шууд хариулна.
  3. Ундааны эрүүл бохир ашиг (Gross margin) нь 75%-85%, хоолных 60%-70% байна. Өртөг өндөр бүтээгдэхүүний үнийг бага багаар (500₮-1000₮) нэмэхийг зөвлөнө.
  4. Асуултад маш тодорхой, эелдэг, Монгол хэлээр хариулна.
`;

const WORKER_KIOSK_PROMPT = `
  Та гал тогооны ажилтнуудад зориулагдсан "Kiosk AI Бүртгэлийн туслах" юм.
  [ХАТУУ МӨРДӨХ ДҮРЭМ]:
  1. Таны цорын ганц үүрэг: Ажилтны бичсэн зарлага, хаягдал, татан авалтыг ойлгох.
  2. Ажилтан санхүүгийн ашиг, орлого, тайлан асуувал ШУУД ингэж татгалзан хариулна: 
     "🔒 Уучлаарай, би зөвхөн орлого, зарлага, хаягдал бүртгэх үүрэгтэй туслах байна. Санхүүгийн тайланг зөвхөн Эзний эрхээр харах боломжтой."
`;

export async function POST(request: Request) {
  try {
    const { tenantClientId, workerName, text, imageBase64, action, logId, userRole } = await request.json();
    const isOwner = userRole === 'owner';
    const ACTIVE_PROMPT = isOwner ? OWNER_CFO_PROMPT : WORKER_KIOSK_PROMPT;
    const clientId = tenantClientId || 'SF Coffee';

    // =========================================================================
    // 1. БҮРТГЭЛ БУЦААХ (UNDO ҮЙЛДЭЛ)
    // =========================================================================
    if (action === 'undo' && logId) {
      const { error } = await supabase.from('inventory_logs').delete().eq('id', logId);
      if (error) return NextResponse.json({ success: false, message: `❌ Алдаа: ${error.message}` });
      return NextResponse.json({ success: true, message: "❌ Бүртгэл цуцлагдлаа (Үлдэгдэл буцаж сэргэсэн)." });
    }

    const { data: ingredients } = await supabase.from('ingredients').select('id, name, unit').eq('client_id', clientId);
    const allowedNames = ingredients ? ingredients.map(i => i.name) : [];

    // =========================================================================
    // 2. ЗУРАГ ИЛГЭЭСЭН ҮЕД (E-BARIMT СКАЙНЕР)
    // =========================================================================
    if (imageBase64) {
      const aiAnalysis = await parseReceiptImage(imageBase64, allowedNames);
      if (!aiAnalysis || !aiAnalysis.success) {
        return NextResponse.json({ success: false, message: "❌ Зургийг уншиж чадсангүй." });
      }

      const logsToInsert: any[] = [];
      let successMsg = "✅ **Татан авалт амжилттай бүртгэгдлээ:**\n\n";

      for (const item of aiAnalysis.purchases) {
        const ing = ingredients?.find((i: any) => i.name === item.item_name);
        if (ing) {
          logsToInsert.push({ 
            client_id: clientId, 
            ingredient_id: ing.id, 
            quantity: Math.abs(item.quantity), 
            type: 'purchase', 
            total_cost: item.total_cost || 0, 
            notes: item.image_type === 'Product Photo' ? '📸 Барааны зураг (Kiosk)' : '🧾 E-Barimt (Kiosk)', 
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

    // =========================================================================
    // 3. ТЕКСТ БИЧИХ ҮЕД
    // =========================================================================
    if (text) {
      const lowercaseMsg = text.toLowerCase().trim();

      // А. ҮЙЛ АЖИЛЛАГААНЫ ГҮЙЛГЭЭ МӨН ЭСЭХИЙГ ШАЛГАХ (Хаягдал, Ажилтны хоол, Татан авалт)
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

      // 💡 Б. ШУУД ФУНКЦЭЭ ДУУДАН САНХҮҮГИЙН ДАТАГ АВНА (GitHub proxy / fetch failed гарахгүй!)
      const analyticsData = await getAnalyticsData(clientId);
      const fin = analyticsData.financial_ladder || {};

      // 💡 В. /report ЭСВЭЛ "тайлан харах" ГЭВЭЛ 0.05 СЕКУНДЭД ШУУД ХАРИУЛНА (AI хүлээхгүй)
      if (lowercaseMsg === "/report" || lowercaseMsg === "тайлан харах" || lowercaseMsg.includes("тайлан")) {
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
          `\n\n💡 *Та санхүүгийн талаар нэмэлт асуултаа шууд асууж болно.*`;

        return NextResponse.json({ success: true, is_log: false, message: instantReport });
      }

      // 💡 Г. ЧАТ БОЛОН ЗӨВЛӨГӨӨНИЙ АСУУЛТ (Хэт хурдан 400-token compact дата өгч 0.5 секундэд хариулна)
      const compactContext = {
        client: clientId,
        financials: fin,
        total_waste: analyticsData.total_waste_loss,
        top_wasters: analyticsData.top_wasters,
        top_expensive: analyticsData.top_expensive,
        menu_items_sample: analyticsData.menu_performance?.slice(0, 10),
        recent_timeline: (analyticsData as { all_timeline_logs?: any[] }).all_timeline_logs?.slice(0, 10)
      };

      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
      const promptPayload = `CONTEXT_DATA: ${JSON.stringify(compactContext)}\n\nUser Question: ${text}`;

      const aiResponse = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `System: ${ACTIVE_PROMPT}\n\nInput Data: ${promptPayload}` }] }]
      });

      return NextResponse.json({ 
        success: true, 
        is_log: false, 
        message: aiResponse.response.text().replace(/\*|\*\*/g, "").trim() 
      });
    }

    return NextResponse.json({ success: false, message: "Хоосон утга илгээсэн байна." });

  } catch (error: any) {
    console.error("Kiosk AI Error:", error);
    return NextResponse.json({ success: false, message: `Системийн алдаа: ${error.message}` });
  }
}