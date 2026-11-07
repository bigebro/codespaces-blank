import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { parseOperationalText, parseReceiptImage } from "../../../lib/gemini";
import { getAnalyticsData } from "../../../lib/analytics";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { saveBusinessRule } from "@/ai/memory/memory.service";
import { routeAiRequest } from "@/ai/agents/router.agent";
import { AgentContext } from "@/types/agent.types";
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
    return " AI зөвлөхийн ачаалал түр ихэссэн байна. Та хэдхэн секундын дараа дахин асууна уу.";
  }
  if (
    errStr.includes("429") ||
    errStr.includes("quota") ||
    errStr.includes("rate limit") ||
    errStr.includes("too many requests")
  ) {
    return "Асуултын өдрийн хязгаар түр хүрсэн байна. Түр хүлээгээд дахин оролдоно уу.";
  }
  if (errStr.includes("504") || errStr.includes("timeout")) {
    return "Хариулт боловсруулах хугацаа хэтэрлээ. Та асуултаа арай товчлон дахин илгээнэ үү.";
  }
  return " Хариулт боловсруулахад түр саатал гарлаа. Та асуултаа дахин илгээнэ үү.";
}



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
        console.warn(` Groq загвар ${modelName} алдаа өглөө:`, lastGroqError);
      }
    } catch (e: any) {
      lastGroqError = e.message;
    }
  }

  throw new Error(`Groq сервер хариу өгсөнгүй: ${lastGroqError}`);
}

export async function POST(request: Request) {
  try {
    // 🔒 1. Токенийг авах
    const token = (request.headers.get("authorization") || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    // 🔒 2. createClient үүсгэхгүйгээр шууд supabaseAdmin-аар шалгах (Хамгийн хурдан, цэвэрхэн)
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    // 🔒 3. Хэрэглэгчийн жинхэнэ салбар, үүргийг татах
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("client_id, role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile?.client_id) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    // 🔒 4. Body-г зөвхөн ганц удаа унших
    const body = await request.json();
    const clientId = profile.client_id;
    const isOwner = profile.role === "owner";
   

    const workerName = body.workerName || profile.full_name || "Ажилтан";
    const text = (body.text || body.payloadText || body.input || "").trim();
    const imageBase64 = body.imageBase64 || null;
    const action = body.action || null;
    const logId = body.logId || null;

    // src/app/api/kiosk-ai/route.ts доторх categorize хэсэг:
    if (action === "categorize" && body.names && Array.isArray(body.names)) {
      const key = (process.env.GEMINI_API_KEY || "")
        .replace(/["']/g, "")
        .trim();
      const prompt = `
    You are a data classifier for a Mongolian Coffee Shop & Restaurant.
    Classify the following menu items into ONE of these 6 STRICT categories:
    
    1. "HOT_BEVERAGE": Coffee, hot tea, espresso, and any explicitly "халуун" (hot) drinks.
    2. "COLD_BEVERAGE": Juices, smoothies, water, and any explicitly "мөстэй/хүйтэн" (iced/cold) coffees or teas.
    3. "FOOD_PREP": Cooked meals, sandwiches, burgers, salads, bakery, bakery items.
    4. "BAKERY_DESSERT": Cakes, pastries, bread, sweets, desserts.
    5. "RETAIL_FMCG": Canned/bottled drinks, pre-packaged snacks (e.g., Tymbark, Cola).
    6. "GENERAL": Unidentifiable words, random numbers, merchandise, or non-food items.

    CRITICAL RULES:
    - If a coffee/tea has the word "мөстэй", "iced", or "хүйтэн", you MUST classify it as "COLD_BEVERAGE".
    - If an item is totally unrecognizable or gibberish (e.g., "b123", "Тооцоо"), use "GENERAL".
    
    Respond ONLY with a valid JSON object mapping the exact product name to the category string.
    Example: { "Мөстэй Латте": "COLD_BEVERAGE", "Tymbark": "RETAIL_FMCG", "Chicken Sandwich": "FOOD_PREP" }

    Products to classify:
    ${JSON.stringify(body.names)}
  `;

      let resultJson: Record<string, string> | null = null;

      // 1. Google Gemini 3.5 Flash-Lite-аар унших
      if (key) {
        try {
          const ai = new GoogleGenerativeAI(key);
          const model = ai.getGenerativeModel({
            model: "gemini-3.5-flash-lite",
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            } as any,
          });
          const response = await model.generateContent(prompt);
          const resultText = response.response
            .text()
            .replace(/```json|```/g, "")
            .trim();
          resultJson = JSON.parse(resultText);
        } catch (err) {
          console.warn("Categorize Gemini failed, falling back to Groq:", err);
        }
      }

      // 2. Хэрэв Gemini алдаа өгвөл Groq (Llama/OpenAI OSS) нөөц рүү үсрэх
      if (!resultJson) {
        try {
          const groqResult = await callGroqFallback(
            "You are an expert F&B classifier. Return ONLY a valid JSON object mapping product name to category.",
            prompt,
          );
          resultJson = JSON.parse(
            groqResult.replace(/```json|```/g, "").trim(),
          );
        } catch (groqErr) {
          console.error("Categorize Groq fallback failed:", groqErr);
        }
      }

      if (resultJson) {
        return NextResponse.json({ success: true, categories: resultJson });
      }

      return NextResponse.json({
        success: false,
        message: "AI ангилал хийж чадсангүй.",
      });
    }

    // 🌐 ШИНЭ ҮГИЙГ AI-ААР 1 УДАА ОРЧУУЛЖ БААЗАД ЦЭЭЖЛЭХ (0 ТОКЕН ЛООП)
    if (action === "translate" && body.text) {
      const original = String(body.text).trim();
      const lowerOriginal = original.toLowerCase();

      // 1. Баазад өмнө нь цээжилсэн эсэхийг түрүүлж шалгах (AI дуудахгүй)
      const { data: cached } = await supabaseAdmin
        .from("learned_translations")
        .select("translated_text")
        .eq("client_id", clientId)
        .ilike("original_text", lowerOriginal)
        .maybeSingle();

      if (cached) {
        return NextResponse.json({
          success: true,
          translation: cached.translated_text,
        });
      }

      // 2. Баазад байхгүй бол AI-аас ганц удаа асуух
      let translated = "";

      // 🧠 FEW-SHOT LEARNING: Хамгийн сүүлд амжилттай сурсан 20 үгийг баазаас татах
      const { data: recentLearnings } = await supabaseAdmin
        .from("learned_translations")
        .select("original_text, translated_text")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20);

      // AI-д зориулсан жишээнүүдийн жагсаалтыг угсрах
      let examplesContext = "";
      if (recentLearnings && recentLearnings.length > 0) {
        examplesContext =
          "Examples of past translations in our cafe (Match this exact style!):\n" +
          recentLearnings
            .map((ex) => `- "${ex.original_text}" -> "${ex.translated_text}"`)
            .join("\n") +
          "\n";
      }

      // 🚨 AI-д өгөх ТӨГС тушаал (Дүрэм + Өмнөх жишээнүүд хамт явна)
      const prompt = `You are a professional Mongolian translator for a restaurant POS system.
Translate the following food/beverage ingredient or menu item name into clean Mongolian.
CRITICAL RULES:
1. Output ONLY the translated name. Nothing else.
2. Use ONLY the official Mongolian Cyrillic alphabet (а-я, ө, ү, А-Я, Ө, Ү). NEVER use Latin letters like v, w, x, etc.
3. Keep it in the Nominative case (Нэрлэхийн тийн ялгал). E.g. "Lobster salad" -> "Хавчтай салат" (DO NOT write "салатын").

${examplesContext}
Text to translate: "${original}"`;

      const key = (process.env.GEMINI_API_KEY || "")
        .replace(/["']/g, "")
        .trim();
      if (key) {
        try {
          const ai = new GoogleGenerativeAI(key);
          const model = ai.getGenerativeModel({
            model: "gemini-3.5-flash-lite",
            generationConfig: { temperature: 0.1 },
          });
          const res = await model.generateContent(prompt);
          translated = res.response.text().trim();
        } catch (e) {}
      }

      // Gemini ажиллаагүй бол Groq нөөц рүү үсрэх
      if (!translated) {
        try {
          translated = (
            await callGroqFallback(
              "Translate to Mongolian Cyrillic F&B term only.",
              prompt,
            )
          ).trim();
        } catch (e) {}
      }

      // 3. AI-ийн орчуулгыг баазад ХАДГАЛАХ (Дараагийн удаа дахиж AI ажиллахгүй)
      if (translated) {
        await supabaseAdmin.from("learned_translations").upsert(
          [
            {
              client_id: clientId,
              original_text: lowerOriginal,
              translated_text: translated,
            },
          ],
          { onConflict: "client_id,original_text" },
        );

        return NextResponse.json({ success: true, translation: translated });
      }

      return NextResponse.json({ success: false, translation: original });
    }

    // 🧠 ПОС-ЫН НЭРИЙГ СУУРЬ ЦЭСТЭЙ ТААРУУЛАХ AI (20 жишээн дээр суралцана)
    if (
      action === "resolve_pos_menu" &&
      body.unmatchedPosNames &&
      Array.isArray(body.unmatchedPosNames)
    ) {
      const unmatched = body.unmatchedPosNames;
      const officialMenu = body.officialMenuNames || [];

      // 1. learned_menus-ээс өмнө нь сурсан сүүлийн 20 жишээг татах
      const { data: pastLearnings } = await supabaseAdmin
        .from("learned_menus")
        .select("pos_name, official_product_name")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20);

      let fewShotContext = "";
      if (pastLearnings && pastLearnings.length > 0) {
        fewShotContext =
          "Examples of how this cafe previously mapped POS abbreviations to official menu items:\n" +
          pastLearnings
            .map((l) => `- "${l.pos_name}" -> "${l.official_product_name}"`)
            .join("\n") +
          "\n";
      }

      const prompt = `You are an expert F&B menu resolver for a POS system.
Match each unfamiliar POS line item name to the EXACT corresponding item from the Official Menu list.

RULES:
1. If confident (>=85% certainty) that the POS item is a typo, variant, or abbreviation of an official item (e.g. "americo" -> "Americano"), return the exact official name.
2. If it is a completely new drink or food item not present in the official menu list, map it to null.
3. Return STRICTLY a valid JSON object mapping POS name to official name or null.

${fewShotContext}
Official Menu List:
${JSON.stringify(officialMenu)}

POS items to resolve:
${JSON.stringify(unmatched)}`;

      let matchesJson: Record<string, string | null> = {};
      const key = (process.env.GEMINI_API_KEY || "")
        .replace(/["']/g, "")
        .trim();

      if (key) {
        try {
          const ai = new GoogleGenerativeAI(key);
          const model = ai.getGenerativeModel({
            model: "gemini-3.5-flash-lite",
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            } as any,
          });
          const res = await model.generateContent(prompt);
          matchesJson = JSON.parse(res.response.text().trim());
        } catch (e) {}
      }

      // Fallback Groq
      if (Object.keys(matchesJson).length === 0) {
        try {
          const groqRes = await callGroqFallback(
            "You are an F&B menu resolver. Output ONLY valid JSON mapping.",
            prompt,
          );
          matchesJson = JSON.parse(groqRes.trim());
        } catch (e) {}
      }

      return NextResponse.json({ success: true, matches: matchesJson });
    }

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

    // POST функц дотор бусад action (categorize, translate гэх мэт)-ийн хажууд нэмнэ:
if (action === "save_correction") {
  const { topic, fact } = body;
  if (!fact || !fact.trim()) {
    return NextResponse.json({ success: false, message: "Дүрэм хоосон байна." }, { status: 400 });
  }

  try {
    const saved = await saveBusinessRule(clientId, topic || "Эзний залруулга", fact.trim());
    return NextResponse.json({ success: true, rule: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
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

      const key = (process.env.GEMINI_API_KEY || "")
        .replace(/["']/g, "")
        .trim();

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
      let successMsg = "**Татан авалт амжилттай бүртгэгдлээ:**\n\n";
      const currentDate = new Date().toISOString();

      for (const item of aiAnalysis.purchases) {
        const isFood = item.is_food !== false;
        const isEBarimt =
          item.is_ebarimt !== false && item.image_type !== "Product Photo";
        const payMethod = item.payment_method || "bank";
        const notePrefix = isEBarimt
          ? "E-Barimt"
          : "Барааны зураг (Баримтгүй)";

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

      return NextResponse.json({
        success: true,
        purchases: aiAnalysis.purchases,
      });
    }
    // 3. ТЕКСТ БИЧИХ ҮЕД
    if (text) {
      const lower = text.toLowerCase().trim();

      // ⚡ АЖИЛТАН БҮРТГЭХ ХЭСЭГ (СУРАЛЦАГЧ FEEDBACK LOOP-ТЭЙ)
      if (!isOwner) {
        const { data: learnedAliases } = await supabaseAdmin
          .from("learned_aliases")
          .select("phrase, ingredient_id")
          .eq("client_id", clientId);

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
            // 1. Зарлагын лог хадгалах
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

            // 2. ⚡ ЗӨВХӨН ЦЭВЭР ҮГ СУРАХ (Алдаатай урт өгүүлбэр цээжлэхгүй!)
            let newlyLearnedId: string | null = null;
            if (aiAnalysis.extracted_phrase) {
              const cleanPhrase = aiAnalysis.extracted_phrase
                .toLowerCase()
                .trim();
              const alreadyKnown =
                ingredient.name.toLowerCase() === cleanPhrase ||
                (learnedAliases || []).some((a) => a.phrase === cleanPhrase);

              if (!alreadyKnown && cleanPhrase.length >= 2) {
                const { data: aliasData } = await supabaseAdmin
                  .from("learned_aliases")
                  .insert([
                    {
                      client_id: clientId,
                      phrase: cleanPhrase,
                      ingredient_id: ingredient.id,
                    },
                  ])
                  .select()
                  .single();
                if (aliasData) newlyLearnedId = aliasData.id;
              }
            }

            return NextResponse.json({
              success: true,
              is_log: true,
              log_id: log?.id,
              learned_alias_id: newlyLearnedId, // 👈 Undo хийх үед устгах ID
              message: `**Бүртгэгдлээ:**\n• Төрөл: \`${aiAnalysis.type}\`\n• Бараа: **${aiAnalysis.item_name}**\n• Хэмжээ: **${Math.abs(aiAnalysis.quantity)} ${ingredient.unit}**`,
            });
          }
        }

        return NextResponse.json({
          success: true,
          is_log: false,
          message:
            "Зөвхөн гал тогооны зарлага, хаягдал бүртгэх үүрэгтэй туслах байна.",
        });
      }


      // ЗӨВХӨН ЭЗЭН БАЙВАЛ Л ДООШОО ГҮЙЖ САНХҮҮГИЙН МОТОР АЖИЛЛАНА:
      // =========================================================================
    




   if (isOwner) {
        // ⚡ ХУРДАН ТАЙЛАНГИЙН ТУШААЛ (0.03 секундэд шууд хариулах, 0 токен зарцуулна)
        const isReportCommand =
          lower === "report" ||
          lower === "/report" ||
          lower === "тайлан" ||
          lower === "тайлан харах" ||
          lower.startsWith("report ") ||
          lower.startsWith("/report ");

        if (isReportCommand) {
          const analyticsData = await getCachedAnalytics(clientId, body.startDate, body.endDate);
          const fin = analyticsData.financial_ladder || {};

          const instantReport =
            `**САНХҮҮГИЙН ТАЙЛАН (${clientId}):**\n\n` +
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
                  .map((w: any) => `• ${w.name}: -${w.impact?.toLocaleString()}₮ (${w.gap} ${w.unit})`)
                  .join("\n")
              : "• Бүртгэгдсэн хаягдал байхгүй.") +
            `\n\n💡 *Та санхүү, хаягдал, үнийн бодлогын талаар ямар ч асуултаа шууд асууж болно.*`;

          return NextResponse.json({
            success: true,
            is_log: false,
            message: instantReport,
          });
        }

        // 🧠 ХЭРЭВ АСУУЛТ АСУУСАН БОЛ -> CFO AGENT АЖИЛЛАНА
        const agentContext: AgentContext = {
          clientId,
          userId: user.id,
          userRole: "owner",
          workerName,
          activeStartDate: body.startDate, 
          activeEndDate: body.endDate, 
        };

        try {
          const stream = await routeAiRequest(agentContext, { text });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache",
            },
          });
        } catch (agentErr: any) {
          console.error("CFO Agent Execution Error:", agentErr);
          return NextResponse.json({
            success: false,
            message: getFriendlyErrorMessage(agentErr.message || String(agentErr)),
          });
        }
      }
    }

    // ⚡ 1. Хэрэв дээрх нөхцөлүүдийн алинд ч ороогүй бол заавал Response буцаах ёстой:
    return NextResponse.json({
      success: false,
      message: "Хоосон утга эсвэл тодорхойгүй үйлдэл ирсэн байна.",
    });

  } catch (error: any) { // 👈 2. Бүхэл серверийг уналтаас хамгаалах гаднах CATCH
    console.error("Kiosk AI Global Error:", error);
    return NextResponse.json({
      success: false,
      message: getFriendlyErrorMessage(error.message || String(error)),
    });
  }
}






    
 

