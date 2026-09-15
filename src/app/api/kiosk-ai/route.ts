import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { parseOperationalText, parseReceiptImage } from "../../../lib/gemini";
import { getAnalyticsData } from "../../../lib/analytics";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ⚡ 1. Серверийн санах ой дээр 60 секунд хадгалах кэш (Файлын дээд талд)
const analyticsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getCachedAnalytics(
  clientId: string,
  start?: string,
  end?: string,
) {
  const cacheKey = `${clientId}_${start || "default"}_${end || "default"}`;
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
export const dynamic = "force-dynamic";

function getFriendlyErrorMessage(errorMsg: string): string {
  const errStr = (errorMsg || "").toLowerCase();
  if (
    errStr.includes("503") ||
    errStr.includes("high demand") ||
    errStr.includes("unavailable") ||
    errStr.includes("overloaded")
  ) {
    return "⚠️ AI зөвлөхийн ачаалал түр ихэссэн байна. Та хэдхэн секундын дараа дахин асууна уу. ☕";
  }
  if (
    errStr.includes("429") ||
    errStr.includes("quota") ||
    errStr.includes("rate limit") ||
    errStr.includes("too many requests")
  ) {
    return "⚠️ Асуултын өдрийн хязгаар түр хүрсэн байна. Түр хүлээгээд дахин оролдоно уу.";
  }
  if (errStr.includes("504") || errStr.includes("timeout")) {
    return "⚠️ Хариулт боловсруулах хугацаа хэтэрлээ. Та асуултаа арай товчлон дахин илгээнэ үү.";
  }
  return "⚠️ Хариулт боловсруулахад түр саатал гарлаа. Та асуултаа дахин илгээнэ үү.";
}

const OWNER_CFO_PROMPT = `
  Та бол кофе шоп, рестораны Ахлах Санхүүгийн Зөвлөх (CFO) бөгөөд Алдагдал Хяналтын Мөрдөгч Аудитор (Forensic Auditor) юм.
  
  [ҮНДСЭН ДҮРЭМ]:
  - Ирсэн CONTEXT_DATA дахь тоон дээр үндэслэн шууд товч, цэгцтэй, үнэн зөв хариулна.
  - Ундааны эрүүл маржин 75%-85%, хоолных 60%-70% байх ёстой.
  
  [🕵️‍♂️ АЛДАГДАЛ ШИНЖЛЭХ МӨРДЛӨГИЙН ЛОГИК - ХАТУУ МӨРДӨХ]:
  Хэрэглэгч "Шалтгаангүй алдагдал" (Unexplained Waste), "Зөрүү", эсвэл "Энэ хулгай юу?" гэж асуувал зүгээр л тоог нь давтаж хэлэх БИШ, өгөгдлийг хооронд нь уялдуулж дараах 4 магадлалаар бодитоор шинжилж дүгнэлт өгнө:
  
  1. БЭЛЭН МӨНГӨНИЙ ХУЛГАЙ (Cash Theft / Un-rung Sales): 
     Хэрэв Кофе үр, Сүү, Аяга зэрэг хоорондоо жороор холбогддог хэд хэдэн бараа зэрэгцэн (пропорционалиар) дутсан атлаа ПОС дээр борлуулалт ороогүй байвал: 
     "⚠️ Бэлэн мөнгөний хулгай байх 90%-ийн магадлалтай. Бариста ПОС-д шивэлгүй бэлэн мөнгө авч кофе гаргасан байж болзошгүй тул Хяналтын Камераа (CCTV) шалгана уу" гэж оношилно.
  
  2. ОРЦ ХЭТРҮҮЛЭЛТ (Overpouring): 
     Хэрэв зарагдсан тоотой харьцуулахад нэг аяганд ногдох хэмжээгээр (жишээ нь тус бүр 10-20мл) тогтмол дутсан, эсвэл зөвхөн ганц бараа (зөвхөн сүү) дутсан байвал: 
     "⚠️ Орц хэтрүүлэлт эсвэл бутлагчийн тохиргоо алдагдсан байх магадлалтай. Бариста нарын хэмжээст савны хэрэглээг шалгана уу" гэж оношилно.
  
  3. БҮРТГЭЭГҮЙ ХАЯГДАЛ (Forgot to log): 
     Хэрэв 1-2 ширхэг өндөг, талх гэх мэт жижиг зөрүү байвал:
     "⚠️ Ажилтан хоолондоо хэрэглэсэн эсвэл асгаснаа Kiosk-д бүртгэхээ мартсан байх магадлалтай. Ажилтнаар нөхөж бүртгүүлбэл энэ алдагдал 0 болж цэвэрлэгдэнэ" гэж зөвлөнө.
  
  4. ФИЗИК ХУЛГАЙ (Physical Theft / Big Spills): 
     Бүтэн хайрцаг (1000мл, 1кг) зэргээр их хэмжээгээр бүхлээрээ гэнэт дутсан бол:
     "🚨 Том хэмжээний асгаралт эсвэл бодит физик хулгай байх эрсдэлтэй. Тухайн ээлжийн ажилтнаас шууд тайлбар шаардана уу." гэж зөвлөнө.

  Хэрэглэгчийн асуултад хариулахдаа үргэлж хамгийн өндөр магадлалтай шалтгааныг нь баримттайгаар (тоотой нь) тайлбарлаж, яг ямар арга хэмжээ авахыг нь зааж өг!
`;

const WORKER_KIOSK_PROMPT = `
  Та гал тогооны ажилтнуудад зориулагдсан "Kiosk AI туслах" юм.
  [ДҮРЭМ]:
  - Зөвхөн зарлага, хаягдал бүртгэх үүрэгтэй.
  - Санхүүгийн ашиг, орлого асуувал: "🔒 Санхүүгийн тайланг зөвхөн Эзний эрхээр харах боломжтой." гэж хариул.
`;





async function callGroqFallback(systemPrompt: string, userText: string) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("GROQ_API_KEY тохируулагдаагүй байна.");

  // Groq дээр идэвхтэй байгаа загваруудыг дарааллаар нь шалгах failover
  const groqModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
  let lastGroqError = "";

  for (const modelName of groqModels) {
    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userText },
            ],
            temperature: 0.2,
            max_tokens: 1500,
          }),
        },
      );

      const data = await res.json();

      if (res.ok && data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      } else {
        lastGroqError = data.error?.message || `HTTP ${res.status}`;
        console.warn(`⚠️ Groq загвар ${modelName} алдаа өглөө:`, lastGroqError);
      }
    } catch (e: any) {
      lastGroqError = e.message;
    }
  }

  throw new Error(`Groq сервер хариу өгсөнгүй: ${lastGroqError}`);
}
let globalKeyIndex = 0;

async function callGeminiStreamWithFailover(
  systemPrompt: string,
  promptPayload: string,
) {
  const key = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY олдсонгүй (.env.local шалгана уу");
  }

  const activeGenAI = new GoogleGenerativeAI(key);
  const model = activeGenAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.3,
    },
  });

  const response = await model.generateContentStream({
    contents: [{ role: "user", parts: [{ text: promptPayload }] }],
  });

  // Эхний үгийг шалгах (алдаа гарвал шууд гаднах catch/Groq руу үсэрнэ)
  const iterator = response.stream[Symbol.asyncIterator]();
  const firstChunk = await iterator.next();

  async function* combinedStream() {
    if (!firstChunk.done && firstChunk.value) {
      yield firstChunk.value;
    }
    while (true) {
      const next = await iterator.next();
      if (next.done) break;
      yield next.value;
    }
  }

  return { stream: combinedStream() };
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = (body.text || body.payloadText || body.input || "").trim();
    const tenantClientId = body.tenantClientId || body.clientId || "SF Coffee";
    const workerName = body.workerName || "Ажилтан";
    const userRole = body.userRole || "owner";
    const imageBase64 = body.imageBase64 || null;
    const action = body.action || null;
    const logId = body.logId || null;
    const isOwner = userRole === "owner";
    const ACTIVE_PROMPT = isOwner ? OWNER_CFO_PROMPT : WORKER_KIOSK_PROMPT;
    const clientId = tenantClientId;

    // 1. UNDO
    if (action === "undo" && logId) {
      const { error } = await supabaseAdmin
        .from("inventory_logs")
        .delete()
        .eq("id", logId);
      if (error)
        return NextResponse.json({
          success: false,
          message: `❌ Алдаа: ${error.message}`,
        });
      return NextResponse.json({
        success: true,
        message: "❌ Бүртгэл цуцлагдлаа (Үлдэгдэл буцаж сэргэсэн).",
      });
    }

    let allowedNames: string[] = [];
    let ingredients: any[] | null = null;

    if (!isOwner || imageBase64 || body.audioBase64) {
      // 👈 THE QUERY IS RIGHT HERE!
      const res = await supabaseAdmin
        .from("ingredients")
        .select("id, name, unit")
        .eq("client_id", clientId);
      ingredients = res.data;
      allowedNames = ingredients ? ingredients.map((i) => i.name) : [];
    }

    // =========================================================================
    // 🎙️ 1.5. IPAD / IPHONE ДУУ ХООЛОЙГ GEMINI 3.5 Lite ШУУД СОНСОЖ БҮРТГЭХ
    // =========================================================================
    const audioBase64 = body.audioBase64 || null;
    const audioMimeType = body.audioMimeType || "audio/webm";

    if (audioBase64) {
      // ⚡ Clean MIME type: Strips ";codecs=opus" so Gemini doesn't reject it
      const cleanMime = (audioMimeType || "audio/webm").split(";")[0].trim();

      const audioPrompt = `
        You are an ultra-intelligent, sentient Kitchen Manager at a Mongolian coffee shop.
        You deeply understand how real baristas speak: they mix Mongolian grammar, English loanwords, fast slang, and typos.
        
        Your ONLY job is to map what the barista said into an exact ingredient from our database.
        Allowed EXACT database ingredients: [${allowedNames.join(", ")}]
        
        THINKING PROCESS (Chain of Thought):
        When you read the transcript, follow these logical steps in your mind:
        1. PHONETIC TRANSLATION: Did they use shorthand? 
           - "haze", "хэйз", "хэзл" -> Maps to "Hazelnut"
           - "cara", "карамэл" -> Maps to "Caramel"
           - "маслоо" -> Maps to "Butter"
           - "банан", "гадил" -> Maps to "Banana"
        2. INTENT & ACTION: 
           - Words like "асгасан", "муудсан", "гашилсан", "хаясан", "эвдэрсэн", "хагарсан" mean SPOILAGE (Negative Quantity).
           - Words like "авсан", "ирсэн", "аву", "татан авалт" mean PURCHASE (Positive Quantity).
           - Words like "хоол", "идсэн", "уусан" mean STAFF MEAL (Negative Quantity).
        3. UNIT CONVERSION: If they say "1 литр", convert to 1000. If "1 кг", convert to 1000. If "хагас", it means 0.5.
        4. SELECTION: Pick the absolute closest matching ingredient from the Allowed list.

        Return ONLY a raw JSON object exactly like this example (do not wrap in markdown or backticks):
        {
          "is_transaction": true,
          "item_name": "<MUST_EXACTLY_MATCH_AN_ALLOWED_NAME>",
          "quantity": -2000,
          "type": "spoilage",
          "extracted_phrase": "<the exact short slang they used, e.g., 'хэйз'>",
          "notes": "<A short, clean Mongolian summary of what happened>"
        }
      `;

      let transcribedText = "";
   
      const key = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();

      if (key) {
        try {
          const ai = new GoogleGenerativeAI(key);
          const model = ai.getGenerativeModel({
            model: "gemini-3.5-flash-lite",
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          });

          const response = await model.generateContent({
            contents: [
              {
                role: "user",
                parts: [
                  { text: audioPrompt },
                  { inlineData: { mimeType: cleanMime, data: audioBase64 } },
                ],
              },
            ],
          });

          transcribedText = response.response.text().trim();
        } catch (e: any) {
          console.error("Gemini Audio Error:", e.message || e);
        }
      }

      if (!transcribedText) {
        return NextResponse.json({
          success: false,
          message:
            "🎙️ Дууг сонсож чадсангүй. Та микрофондоо ойртоод дахин тод ярина уу.",
        });
      }

      return NextResponse.json({
        success: true,
        text: transcribedText,
      });
    }
    // 2. ЗУРАГ БҮРТГЭХ (E-Barimt эсвэл Барааны зураг)
    if (imageBase64) {
      const aiAnalysis = await parseReceiptImage(imageBase64, allowedNames);
      if (!aiAnalysis || !aiAnalysis.success || !aiAnalysis.purchases) {
        return NextResponse.json({
          success: false,
          message: aiAnalysis?.error_message || "❌ Зургийг уншиж чадсангүй.",
        });
      }

      const logsToInsert: any[] = [];
      let successMsg = "✅ **Татан авалт амжилттай бүртгэгдлээ:**\n\n";
      const currentDate = new Date().toISOString();

      for (const item of aiAnalysis.purchases) {
        const isFood = item.is_food !== false;
        const isEBarimt =
          item.is_ebarimt !== false && item.image_type !== "Product Photo";
        const payMethod = item.payment_method || "bank";
        const notePrefix = isEBarimt
          ? "🧾 E-Barimt"
          : "📸 Барааны зураг (Баримтгүй)";

        if (isFood) {
          let targetIngredient = ingredients?.find(
            (i: any) =>
              i.name.toLowerCase().trim() ===
              item.item_name.toLowerCase().trim(),
          );

          // Хэрэв шинэ хүнс бол ingredients-д 0.05с-д шууд бүртгэнэ
          if (!targetIngredient) {
            const unitPrice =
              item.quantity > 0
                ? Math.round((item.total_cost || 0) / item.quantity)
                : 0;
            const { data: newIng } = await supabaseAdmin
              .from("ingredients")
              .insert([
                {
                  client_id: clientId,
                  name: item.item_name.trim(),
                  unit: "ш",
                  unit_price: unitPrice,
                  current_stock: 0,
                },
              ])
              .select()
              .single();
            if (newIng) targetIngredient = newIng;
          }

          if (targetIngredient) {
            logsToInsert.push({
              client_id: clientId,
              ingredient_id: targetIngredient.id,
              quantity: Math.abs(item.quantity),
              type: "purchase",
              total_cost: item.total_cost || 0,
              notes: `${notePrefix} (Kiosk)`,
              payment_method: payMethod,
              is_ebarimt: isEBarimt,
              worker_name: workerName,
              date: currentDate,
            });
            successMsg += `• 🥐 [Агуулах] ${targetIngredient.name}: ${item.quantity} ${targetIngredient.unit || "ш"} (${(item.total_cost || 0).toLocaleString()}₮)\n`;
          }
        } else {
          // Хүнсний бус OPEX
          logsToInsert.push({
            client_id: clientId,
            ingredient_id: null,
            non_food_item: item.item_name,
            quantity: Math.abs(item.quantity),
            type: "purchase",
            total_cost: item.total_cost || 0,
            notes: `${notePrefix} (Хүнсний бус OPEX)`,
            payment_method: payMethod,
            is_ebarimt: isEBarimt,
            worker_name: workerName,
            date: currentDate,
          });
          successMsg += `• 🧼 [OPEX] ${item.item_name}: ${item.quantity} ш (${(item.total_cost || 0).toLocaleString()}₮)\n`;
        }
      }

      // ⚡ БҮХ БАРААГ ЗЭРЭГ ХАДГАЛАХ (1-хэн хүсэлтээр)
      if (logsToInsert.length > 0) {
        await supabaseAdmin.from("inventory_logs").insert(logsToInsert);
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
          .from("learned_aliases")
          .select("phrase, ingredient_id")
          .eq("client_id", clientId);

        // 2. Local Parser-аар 0.001ms-д шалгах
        const aiAnalysis = await parseOperationalText(
          text,
          allowedNames,
          learnedAliases || [],
        );

        if (aiAnalysis && aiAnalysis.is_transaction && aiAnalysis.success) {
          const ingredient = ingredients?.find(
            (i) =>
              i.name.toLowerCase().trim() ===
              aiAnalysis.item_name.toLowerCase().trim(),
          );
          if (ingredient) {
            const { data: log } = await supabaseAdmin
              .from("inventory_logs")
              .insert([
                {
                  client_id: clientId,
                  ingredient_id: ingredient.id,
                  quantity: aiAnalysis.quantity,
                  type: aiAnalysis.type,
                  notes: aiAnalysis.notes || "Instant Log",
                  worker_name: workerName,
                  date: new Date().toISOString(),
                },
              ])
              .select()
              .single();

            const rawPhrase = aiAnalysis.extracted_phrase || text;
            // Тоо болон үйл үгсийг цэвэрлэх
            const cleanPhrase = rawPhrase
              .replace(/[\d\.]+/g, "")
              .replace(
                /литр|мл|кг|гр|грамм|ш|ширхэг|хайрцаг|уут|асгасан|авсан|муудсан|аву|авчлаа|гашлаа/gi,
                "",
              )
              .trim()
              .toLowerCase();

            if (cleanPhrase && cleanPhrase.length >= 3) {
              await supabaseAdmin.from("learned_aliases").upsert(
                [
                  {
                    client_id: clientId,
                    phrase: cleanPhrase,
                    ingredient_id: ingredient.id,
                  },
                ],
                { onConflict: "client_id,phrase" },
              );
            }

            return NextResponse.json({
              success: true,
              is_log: true,
              log_id: log?.id,
              message: `📝 **Бүртгэгдлээ (0.01s):**\n• Төрөл: \`${aiAnalysis.type}\`\n• Бараа: **${aiAnalysis.item_name}**\n• Хэмжээ: **${Math.abs(aiAnalysis.quantity)} ${ingredient.unit}**`,
            });
          }
        }

        return NextResponse.json({
          success: true,
          is_log: false,
          message:
            "🔒 Зөвхөн гал тогооны зарлага, хаягдал бүртгэх үүрэгтэй туслах байна (Жишээ: '500мл сүү асгасан').",
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
          .from("sales_logs")
          .select("date")
          .eq("client_id", clientId)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestSale && latestSale.date) {
          const ym = latestSale.date.substring(0, 7);
          const [year, month] = ym.split("-").map(Number);
          activeStart = `${ym}-01T00:00:00.000Z`;
          activeEnd = `${ym}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}T23:59:59.999Z`;
        }
      }

      // 🚀 1 Л УДАА ТАТАХ:
      const analyticsData = await getCachedAnalytics(
        clientId,
        activeStart,
        activeEnd,
      );
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
            message:
              "🔒 Уучлаарай, санхүүгийн тайланг зөвхөн Эзний эрхээр харах боломжтой.",
          });
        }

        const instantReport =
          `📊 **САНХҮҮГИЙН ТАЙЛАН (${clientId}):**\n\n` +
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
            ? analyticsData.top_wasters
                .map(
                  (w: any) =>
                    `• ${w.name}: -${w.impact?.toLocaleString()}₮ (${w.gap} ${w.unit})`,
                )
                .join("\n")
            : "• Бүртгэгдсэн хаягдал байхгүй.") +
          `\n\n💡 *Та санхүү, хаягдал, үнийн бодлогын талаар ямар ч асуултаа шууд асууж болно.*`;

        return NextResponse.json({
          success: true,
          is_log: false,
          message: instantReport,
        });
      }

     // =========================================================================
      // ⚡ FORMAT ALL ANALYTICS DETAILS FOR 100% AI VISIBILITY
      // =========================================================================

      // 1. Inventory Table
      const invTable = (analyticsData.all_inventory_data || [])
        .map(
          (i: any) =>
            `${i.name} | stock:${i.live_stock}${i.unit} | par:${i.par_level} | price:${i.price}₮ | gap:${i.gap} | loss:${i.impact}₮ | class:${i.abc_class} | order:${i.suggested_order}`,
        )
        .join("\n");

      // 2. Recipes
      const recipesText = Object.entries(analyticsData.all_recipes || {})
        .map(
          ([pName, ingMap]: any) =>
            `${pName} = ` +
            Object.entries(ingMap)
              .map(([ing, amt]) => `${amt} ${ing}`)
              .join(" + "),
        )
        .join("\n");

      // 3. Menu Performance
      const menuText = (analyticsData.menu_performance || [])
        .map(
          (m: any) =>
            `${m.name} | sold:${m.sold} | price:${m.selling_price}₮ | cost:${m.cost_per_item}₮ | margin:${m.gross_margin_pct}%`,
        )
        .join("\n");

      // 4. Payroll & OPEX
      const payrollText = (analyticsData.payroll_summary || [])
        .map(
          (p: any) =>
            `${p.worker_name} (${p.role || "Ажилтан"}): ${p.total_hours}hrs | Gross:${p.gross_salary}₮ | NetTakeHome:${p.net_take_home}₮ | NDSH(11.5%):${p.ndsh_deduction}₮`,
        )
        .join(", ");

      const opexText = (analyticsData.opex_details || [])
        .map((o: any) => `${o.item}: ${o.cost}₮`)
        .join(", ");

      // 5. Margin Guard (Price Hike Suggestions)
      const marginGuardText = (analyticsData.margin_guard_alerts || []).length > 0
        ? (analyticsData.margin_guard_alerts || [])
            .map(
              (a: any) =>
                `• ${a.product_name}: CurrentPrice ${a.selling_price}₮ -> SUGGESTED: ${a.suggested_price}₮ (+${a.price_gap}₮) | Cost: ${a.cost_price}₮, Margin: ${a.current_margin_pct} (Target: ${a.target_margin_pct})`,
            )
            .join("\n")
        : "None (All products have healthy margins >= 75%)";

      // 6. Cross-Shift Fraud & Worker Incidents Matrix
      const fraudMatrixText = Object.keys(analyticsData.worker_fraud_matrix || {}).length > 0
        ? Object.entries(analyticsData.worker_fraud_matrix || {})
            .map(([worker, data]: any) => {
              const incidents = (data.incidents || [])
                .map((inc: any) => `[${inc.date}] reported by ${inc.reporter}: "${inc.notes}" (-${inc.loss_amount}₮)`)
                .join("; ");
              return `• Worker: ${worker} | Incidents: ${data.totalIncidents} | TotalLoss: ${data.totalLossAmount}₮ | Details: ${incidents}`;
            })
            .join("\n")
        : "No cross-shift damage or incident reports recorded.";

      // 7. Cashflow In & Out Breakdown
      const cf = analyticsData.cashflow_summary || {};
      const cashflowDetail = `
InitialBalances: Cash:${cf.initial_cash || 0}₮, Bank:${cf.initial_bank || 0}₮
Cash Inflow: CashSales:${cf.cash_in_cash || 0}₮, BankSales:${cf.cash_in_bank || 0}₮ (TotalIn: ${cf.cash_in_total || 0}₮)
Cash Outflow Purchases: CashPaid:${cf.cash_out_purchases_cash || 0}₮, BankPaid:${cf.cash_out_purchases_bank || 0}₮
Cash Outflow OPEX: CashPaid:${cf.cash_out_opex_cash || 0}₮, BankPaid:${cf.cash_out_opex_bank || 0}₮
Fixed Assets Paid (Equipment): ${cf.fixed_assets_paid || 0}₮
Owner Withdrawals (Draws): ${cf.owner_draws || 0}₮
Final Balances: CashInHand:${cf.end_cash_balance || 0}₮, BankAccount:${cf.end_bank_balance || 0}₮, NetTotal:${cf.net_total_balance || 0}₮`;

      // 8. Purchases & E-Barimt Ratio
      const pur = analyticsData.purchases_summary || {};
      const purchasesText = `TotalPurchases: ${pur.total_purchases || 0}₮ | WithEBarimt: ${pur.with_ebarimt || 0}₮ | WithoutEBarimt: ${pur.without_ebarimt || 0}₮ | NewEquipmentBought: ${pur.fixed_assets_invested || 0}₮`;

      // 9. Fixed Assets & Depreciation (Equipment)
      const faText = (analyticsData.fixed_assets || []).length > 0
        ? (analyticsData.fixed_assets || [])
            .map((f: any) => `• ${f.name} (${f.code}): InitialCost ${f.initialCost}₮ | UsefulMonths: ${f.usefulMonths} | MonthlyDep: ${f.monthlyDep}₮ | CurrentBookValue: ${f.bookValue}₮`)
            .join("\n")
        : "No fixed assets recorded.";

      // 10. Official Waste Act (Tax Law 14 Write-offs)
      const wasteActText = (analyticsData.waste_act_items || []).length > 0
        ? (analyticsData.waste_act_items || []).slice(0, 10)
            .map((w: any) => `• ${w.name}: TheoUsage ${w.theo_usage}${w.unit}, ActualUsage ${w.actual_usage}${w.unit}, Gap ${w.gap_qty}${w.unit} | Loss: ${w.loss_amount}₮ | Legal Cause: ${w.cause}`)
            .join("\n")
        : "None";

      // 11. ABC Pareto Cycle Count Status
      const abc = analyticsData.abc_summary || {};
      const abcText = `TotalItems: ${abc.total_items || 0} | A-Class:${abc.a_count || 0}, B-Class:${abc.b_count || 0}, C-Class:${abc.c_count || 0} | CountedIn30Days:${abc.counted_in_cycle || 0}, Uncounted:${abc.uncounted_in_cycle || 0}, RecommendedCountPerShift:${abc.suggested_cycle_per_shift || 0}`;

      // 12. Recent Shifts & SOP Compliance
      const shiftsText = (analyticsData.recent_shifts || []).slice(0, 5)
        .map((s: any) => {
          const tasks = s.tasks_done || [];
          const doneCount = tasks.filter((t: any) => t.done).length;
          return `• ${s.worker} | Started: ${s.start_time} | Ended: ${s.end_time} | SOP Tasks: ${doneCount}/${tasks.length} done | Z-Report: ${s.pos_z_image_url ? "Uploaded" : "Missing"}`;
        })
        .join("\n");

      // 13. Recent Activity Logs (Last 10 actions)
      const recentLogsText = (analyticsData.recent_worker_logs || []).slice(0, 10)
        .map((l: any) => `[${l.date} ${l.time}] ${l.worker} logged ${l.type} on ${l.item}: ${l.qty}${l.unit} (Notes: ${l.notes || "None"})`)
        .join("\n");

      // =========================================================================
      // 🚀 100% ASSEMBLED PROMPT PAYLOAD (ALL ANALYTICS COVERED)
      // =========================================================================
      const promptPayload = `
=== BUSINESS: ${clientId} ===
FINANCIALS (P&L & TAX):
Revenue: ${fin.revenue}₮ | NetRevenue(No VAT): ${fin.net_revenue}₮ | ActualCOGS: ${fin.actual_cogs}₮ | TheoCOGS: ${fin.theo_cogs}₮ | GrossMargin: ${fin.gross_margin}
OPEX: ${fin.opex}₮ | Depreciation: ${fin.depreciation}₮ | EBIT: ${fin.ebit}₮ | NetProfit: ${fin.net_profit}₮ (${fin.net_margin})
TAX SUMMARY: Mode:${analyticsData.tax_summary?.tax_mode} | ActiveTaxAmount:${analyticsData.tax_summary?.active_tax_amount}₮ | VAT(10%):${analyticsData.tax_summary?.estimated_vat_10pct}₮ | Above300M:${analyticsData.tax_summary?.is_above_300m}

CASHFLOW BREAKDOWN:
${cashflowDetail}

PURCHASES & E-BARIMT STATUS:
${purchasesText}

DETAILED LOSSES & WASTE CATEGORIES:
TotalWasteLoss: ${analyticsData.total_waste_loss}₮ | UnexplainedWaste: ${analyticsData.total_unexplained_waste}₮ | Efficiency: ${analyticsData.efficiency}
• Logged Spoilage (Муудсан/Асгарсан): ${analyticsData.total_logged_spoilage}₮
• Staff Meals (Ажилчдын хоол): ${analyticsData.total_logged_staff_meal}₮
• Testing/R&D (Амталгаа/Туршилт): ${analyticsData.total_logged_testing}₮
• Other Logged: ${analyticsData.total_logged_other}₮
• Surplus Savings (Хэмнэсэн илүүдэл): ${analyticsData.total_surplus_savings}₮

TAX DEDUCTIBLE WASTE ACT ITEMS (Law Art 14):
${wasteActText}

MARGIN GUARD (Price Hike Alerts):
${marginGuardText}

CROSS-SHIFT FRAUD & INCIDENTS:
${fraudMatrixText}

ABC PARETO & AUDIT STATUS:
${abcText}

FIXED ASSETS (Equipment & Wear):
${faText}

PAYROLL BREAKDOWN:
${payrollText || "None"}

OPEX BREAKDOWN:
${opexText || "None"}

RECENT SHIFTS & SOP TASKS:
${shiftsText || "None"}

RECENT ACTIVITY LOGS:
${recentLogsText || "None"}

=== ALL INVENTORY (${(analyticsData.all_inventory_data || []).length} items) ===
${invTable}

=== ALL RECIPES ===
${recipesText}

=== MENU PERFORMANCE ===
${menuText}


User Question: ${text}`;

      let responseStream: any = null;
      let fallbackText = "";

      try {
        // 1. Google Gemini 3.5 Flash-Lite дуудах
        responseStream = await callGeminiStreamWithFailover(
          ACTIVE_PROMPT,
          promptPayload,
        );
      } catch (geminiErr: any) {
        console.warn(
          "⚠️ Gemini гацлаа. Groq нөөц сервер ажиллаж байна...",
            geminiErr.message,
        );

        try {
          // 2. Groq руу шилжих (Маш хурдан 0.3 секунд)
          fallbackText = await callGroqFallback(ACTIVE_PROMPT, promptPayload);
        } catch (groqErr: any) {
          console.error("❌ Groq бас ажилласангүй:", groqErr.message);
          return NextResponse.json({
            success: false,
            message: `⚠️ Серверийн саатал: ${groqErr.message}`,
          });
        }
      }

      // Хэрэв Groq хариулсан бол текстийг буцаана:
      if (fallbackText) {
        return new Response(fallbackText, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      // Gemini хариулсан бол урсгалаар (Stream) буцаана:
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseStream.stream) {
              const chunkText = chunk.text();
              if (chunkText) controller.enqueue(encoder.encode(chunkText));
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    return NextResponse.json({
      success: false,
      message: "Хоосон утга илгээсэн байна.",
    });
  } catch (error: any) {
    console.error("Kiosk AI Error:", error);
    return NextResponse.json({
      success: false,
      message: getFriendlyErrorMessage(error.message || String(error)),
    });
  }
}
