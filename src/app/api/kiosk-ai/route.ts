// src/app/api/kiosk-ai/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { parseOperationalText, parseReceiptImage } from "../../../lib/gemini";
import { getAnalyticsData } from "../../../lib/analytics";
import { GoogleGenerativeAI } from "@google/generative-ai";

const analyticsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getCachedAnalytics(
  clientId: string,
  start?: string,
  end?: string,
) {
  const cacheKey = `${clientId}_${start || "default"}_${end || "default"}`;
  const cached = analyticsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const freshData = await getAnalyticsData(clientId, start, end);
  analyticsCache.set(cacheKey, { data: freshData, timestamp: Date.now() });
  return freshData;
}
// 3. ТУСЛАХ ФУНКЦҮҮД (Огноо ба текстийн цэвэрлэгээ):
function cleanString(str: string) {
  return String(str || "")
    .replace(/[\u00a0\s]+/g, " ")
    .trim();
}
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
    return "AI зөвлөхийн ачаалал түр ихэссэн байна. Та хэдхэн секундын дараа дахин асууна уу.";
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
  return "Хариулт боловсруулахад түр саатал гарлаа. Та асуултаа дахин илгээнэ үү.";
}

const OWNER_CFO_PROMPT = `
  Та бол кофе шоп, рестораны Ахлах Санхүүгийн Зөвлөх (CFO) бөгөөд Алдагдал Хяналтын Мөрдөгч Аудитор (Forensic Auditor) юм.
  
  [ҮНДСЭН ДҮРЭМ]:
  - Ирсэн өгөгдөл дэх бодит тоон дээр үндэслэн шууд товч, цэгцтэй, үнэн зөв хариулна.
  - Тооцоолол, нотлох баримт дутуу байвал "Мэдээлэл дутуу" гэж үнэнээр нь хэлнэ. Хэзээ ч тоо, таамаглал зохиохгүй.
  - Ундааны эрүүл маржин 75%-85%, хоолных 60%-70% байх ёстой.
  
  [АЛДАГДАЛ БА ЗӨРҮҮНИЙ ТАЙЛБАР]:
  - Онолын болон бодит хэрэглээний зөрүү нь шууд хулгай гэсэн үг БИШ юм.
  - Энэ нь орц хэтрүүлэлт, бутлагчийн тохиргооны зөрүү, бүртгээгүй хаягдал, эсвэл хадгалалтын байгалийн хорогдол байж болно.
  - Баримттай нотлох баримтгүйгээр хулгай гэж шууд дүгнэхийг хатуу хориглоно.
  - Бодит нотолгоогүй баримт, сургамжийг "батлагдсан" гэж зарлаж болохгүй.
`;

const WORKER_KIOSK_PROMPT = `
  Та гал тогооны ажилтнуудад зориулагдсан "Kiosk AI туслах" юм.
  [ДҮРЭМ]:
  - Зөвхөн зарлага, хаягдал бүртгэх үүрэгтэй.
  - Санхүүгийн ашиг, орлого асуувал: "Санхүүгийн тайланг зөвхөн Эзний эрхээр харах боломжтой." гэж хариул.
`;

async function callGroqFallback(systemPrompt: string, userText: string) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("GROQ_API_KEY тохируулагдаагүй байна.");

  const groqModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
  let lastGroqError = "";

  for (const modelName of groqModels) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
      });

      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      } else {
        lastGroqError = data.error?.message || `HTTP ${res.status}`;
      }
    } catch (e: any) {
      lastGroqError = e.message;
    }
  }

  throw new Error(`Groq сервер хариу өгсөнгүй: ${lastGroqError}`);
}

async function callGeminiStreamWithFailover(systemPrompt: string, promptPayload: string) {
  const key = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY олдсонгүй (.env.local шалгана уу)");
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

async function saveOwnerChatTurn(clientId: string, question: string, answer: string) {
  if (!question.trim() || !answer.trim()) return;
  try {
    await supabaseAdmin
      .from("ai_chat_messages")
      .insert([
        { client_id: clientId, role: "owner", content: question.trim() },
        { client_id: clientId, role: "ai", content: answer.trim() },
      ]);
  } catch (error) {
    console.error("Could not save owner CFO chat:", error);
  }
}

// -----------------------------------------------------------------------------
// FIX 3 & 7: NATURAL-LANGUAGE DATE PARSER & INTENT CLASSIFIER
// -----------------------------------------------------------------------------

function extractDateRangeFromText(inputText: string): { startDate: string; endDate: string } | null {
  const text = inputText.trim();

  const monthNames: Record<string, string> = {
    january: '01', feb: '02', february: '02', mar: '03', march: '03', apr: '04', april: '04',
    may: '05', jun: '06', june: '06', jul: '07', july: '07', aug: '08', august: '08',
    sep: '09', september: '09', oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12'
  };

  // Pattern A: "October 22–28, 2026" or "October 22-28, 2026" or "Oct 22-28, 2026"
  const englishMonthRange = text.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})\s*(?:–|-|to)\s*(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i);
  if (englishMonthRange) {
    const m = monthNames[englishMonthRange[1].toLowerCase()];
    const d1 = String(parseInt(englishMonthRange[2])).padStart(2, '0');
    const d2 = String(parseInt(englishMonthRange[3])).padStart(2, '0');
    const y = englishMonthRange[4];
    return {
      startDate: `${y}-${m}-${d1}T00:00:00.000Z`,
      endDate: `${y}-${m}-${d2}T23:59:59.999Z`
    };
  }

  // Pattern B: ISO / Standard "2026-10-22 to 2026-10-28" or "2026-10-22 - 2026-10-28"
  const isoRange = text.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})\s*(?:–|-|to|хүртэл|-аас|-ээс)\s*(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (isoRange) {
    const y1 = isoRange[1], m1 = String(parseInt(isoRange[2])).padStart(2, '0'), d1 = String(parseInt(isoRange[3])).padStart(2, '0');
    const y2 = isoRange[4], m2 = String(parseInt(isoRange[5])).padStart(2, '0'), d2 = String(parseInt(isoRange[6])).padStart(2, '0');
    return {
      startDate: `${y1}-${m1}-${d1}T00:00:00.000Z`,
      endDate: `${y2}-${m2}-${d2}T23:59:59.999Z`
    };
  }

  // Pattern C: Mongolian "2026 оны 10 сарын 22-28" or "10 сарын 22-28"
  const mnRange = text.match(/(?:(\d{4})\s*оны\s*)?(\d{1,2})\s*сарын\s*(\d{1,2})\s*(?:–|-|ноос|ээс|нээс|аас)?\s*(\d{1,2})/);
  if (mnRange) {
    const y = mnRange[1] || String(new Date().getFullYear());
    const m = String(parseInt(mnRange[2])).padStart(2, '0');
    const d1 = String(parseInt(mnRange[3])).padStart(2, '0');
    const d2 = String(parseInt(mnRange[4])).padStart(2, '0');
    return {
      startDate: `${y}-${m}-${d1}T00:00:00.000Z`,
      endDate: `${y}-${m}-${d2}T23:59:59.999Z`
    };
  }

  return null;
}

export type OwnerIntent = 
  | 'PRODUCT_MARGIN' 
  | 'INVENTORY_RECONCILIATION' 
  | 'CONFIRMED_EXPERIMENT' 
  | 'BUSINESS_MEMORY_LOOKUP' 
  | 'CASHFLOW' 
  | 'PAYROLL_STAFF' 
  | 'FULL_AUDIT' 
  | 'GENERAL_FINANCIAL';

export function classifyOwnerQuestionIntent(
  inputText: string, 
  knownProductNames: string[] = []
): { intent: OwnerIntent; targetProduct?: string; targetIngredient?: string } {
  const text = inputText.trim();

  // Split into clauses by punctuation / conjunctions to isolate negated instructions
  const rawClauses = text.split(/;|\.|\n|!|\?|(?:\b(?:but|however|except|excluding|without|харин|гэхдээ)\b)/i);
  
  const positiveClauses: string[] = [];
  rawClauses.forEach(cl => {
    const clTrim = cl.trim().toLowerCase();
    const isNegated = /\b(?:do\s*not|don'?t|never|exclude|without|ignore|no)\b/i.test(clTrim) ||
                      /(?:хэрэггүй|ярихгүй|асуугаагүй|оруулахгүй|бус|биш)\b/i.test(clTrim);
    if (!isNegated) {
      positiveClauses.push(clTrim);
    }
  });

  const positiveText = positiveClauses.join(" ");

  // 1. CONFIRMED EXPERIMENTS / LESSONS
  if (
    /(?:confirmed\s+experiment|lesson|learned|what\s+did\s+we\s+learn|туршлага|сургамж|батлагдсан\s*туршилт)/i.test(positiveText) &&
    !/(?:memory|санамж)/i.test(positiveText)
  ) {
    return { intent: 'CONFIRMED_EXPERIMENT' };
  }

  // 2. BUSINESS MEMORY LOOKUP
  if (
    /(?:remembered|saved\s*memory|what\s+do\s+we\s+remember|юу\s+санадаг\s*вэ|бизнесийн\s*санамж|санаж\s*байгаа)/i.test(positiveText)
  ) {
    return { intent: 'BUSINESS_MEMORY_LOOKUP' };
  }

  // 3. FULL AUDIT / DEEP REPORT
  if (
    /(?:full\s*audit|comprehensive\s*audit|complete\s*audit|detailed\s*audit|бүх\s*аудит|бүх\s*тайлан|дэлгэрэнгүй\s*аудит)/i.test(positiveText)
  ) {
    return { intent: 'FULL_AUDIT' };
  }

  // 4. PRODUCT-SPECIFIC MARGIN / COST (Strong entity matching)
  const marginKeywords = /(?:margin|food\s*cost|markup|profit|recipe|cost\s*per\s*cup|маржин|ашиг|өртөг|жор|үнэ)/i;
  if (marginKeywords.test(positiveText)) {
    for (const pName of knownProductNames) {
      if (pName && pName.length >= 3 && positiveText.includes(pName.toLowerCase())) {
        return { intent: 'PRODUCT_MARGIN', targetProduct: pName };
      }
    }
    const defaultProducts = ['caffe latte', 'latte', 'americano', 'espresso', 'tiramisu', 'cappuccino'];
    for (const dName of defaultProducts) {
      if (positiveText.includes(dName)) {
        return { intent: 'PRODUCT_MARGIN', targetProduct: dName };
      }
    }
  }

  // 5. INVENTORY RECONCILIATION
  if (
    /(?:reconcil|stock\s*count|inventory|variance|waste|spoilage|depletion|тооллого|тулгалт|тулгах|үлдэгдэл|хорогдол|хаягдал|сүүний\s*тооцоо)/i.test(positiveText)
  ) {
    let targetIngredient: string | undefined = undefined;
    if (/(?:milk|сүү)/i.test(positiveText)) targetIngredient = 'Milk';
    else if (/(?:bean|кофе|үр)/i.test(positiveText)) targetIngredient = 'Beans';
    return { intent: 'INVENTORY_RECONCILIATION', targetIngredient };
  }

  // 6. CASHFLOW
  if (
    /(?:cash\s*flow|bank|cash|qpay|draw|balance|мөнгөн\s*урсгал|данс|касс|бэлэн|таталт)/i.test(positiveText)
  ) {
    return { intent: 'CASHFLOW' };
  }

  // 7. PAYROLL & STAFF
  if (
    /(?:payroll|salary|wage|worker|shift|hours|цалин|ажилтан|ээлж|цаг|ндш)/i.test(positiveText)
  ) {
    return { intent: 'PAYROLL_STAFF' };
  }

  return { intent: 'GENERAL_FINANCIAL' };
}

// -----------------------------------------------------------------------------
// POST ROUTE HANDLER
// -----------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("client_id, role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile?.client_id) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const clientId = profile.client_id;
    const isOwner = profile.role === "owner";
    const ACTIVE_PROMPT = isOwner ? OWNER_CFO_PROMPT : WORKER_KIOSK_PROMPT;

    const workerName = body.workerName || profile.full_name || "Ажилтан";
    const text = (body.text || body.payloadText || body.input || "").trim();
    const imageBase64 = body.imageBase64 || null;
    const action = body.action || null;
    const logId = body.logId || null;

    // -------------------------------------------------------------------------
    // FIX 5: TENANT-SAFE UNDO OPERATION
    // -------------------------------------------------------------------------
    if (action === "undo" && logId) {
      const { data: logToUndo, error: fetchErr } = await supabaseAdmin
        .from("inventory_logs")
        .select("id, client_id")
        .eq("id", logId)
        .eq("client_id", clientId)
        .maybeSingle();

      if (fetchErr) {
        return NextResponse.json({ success: false, message: `Алдаа: ${fetchErr.message}` }, { status: 500 });
      }

      if (!logToUndo) {
        return NextResponse.json({ success: false, message: "Бүртгэл олдсонгүй эсвэл хандах эрхгүй." }, { status: 404 });
      }

      const { error: delErr } = await supabaseAdmin
        .from("inventory_logs")
        .delete()
        .eq("id", logId)
        .eq("client_id", clientId);

      if (delErr) {
        return NextResponse.json({ success: false, message: `Устгахад алдаа: ${delErr.message}` }, { status: 500 });
      }

      const learnedAliasId = body.learnedAliasId || body.learned_alias_id;
      if (learnedAliasId) {
        await supabaseAdmin
          .from("learned_aliases")
          .delete()
          .eq("id", learnedAliasId)
          .eq("client_id", clientId);
      }

      return NextResponse.json({
        success: true,
        message: "Бүртгэл амжилттай цуцлагдлаа."
      });
    }

    // Owner-only chat history retrieval
    if (action === "owner_chat_history") {
      if (!isOwner || imageBase64) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }

      const { data: messages, error } = await supabaseAdmin
        .from("ai_chat_messages")
        .select("id, role, content, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        return NextResponse.json({ success: false, message: "Could not load chat history." }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        messages: (messages ?? []).reverse(),
      });
    }

    // -------------------------------------------------------------------------
    // FIX 6: EXPLICIT MEMORY COMMANDS ONLY (No auto-extraction LLM calls)
    // -------------------------------------------------------------------------
    const memoryCommand = text.match(
      /^\s*(?:remember|санамж|санах ойд хадгал|санаарай)\s*(?:\[([^\]]{1,60})\])?\s*:\s*(.{3,1000})\s*$/i
    );

    if (isOwner && !action && !imageBase64 && memoryCommand) {
      const topic = (memoryCommand[1] || "general").trim().toLowerCase();
      const fact = memoryCommand[2].trim();

      const { data: existing } = await supabaseAdmin
        .from("business_memory")
        .select("id")
        .eq("client_id", clientId)
        .eq("topic", topic)
        .eq("fact", fact)
        .limit(1)
        .maybeSingle();

      let message: string;
      if (existing) {
        message = "Энэ мэдээлэл санах ойд аль хэдийн хадгалагдсан байна.";
      } else {
        const { error: insertError } = await supabaseAdmin
          .from("business_memory")
          .insert({ client_id: clientId, topic, fact });

        if (insertError) {
          return NextResponse.json({ success: false, message: "Санах ойд хадгалахад алдаа гарлаа." }, { status: 500 });
        }
        message = `Бизнесийн санамж хадгалагдлаа: [${topic}] ${fact}`;
      }

      await saveOwnerChatTurn(clientId, text, message);
      return NextResponse.json({ success: true, message });
    }

    // Explicit business experience commands
    const experienceStartMatch = text.match(
      /^\s*(?:Тест туршлага эхлүүлэх|Test experience start|Туршлага эхлүүлэх|Experience start)\s*:\s*([^|]{5,1000})\s*\|\s*([^|]{5,1000})\s*\|\s*([^|]{5,1000})\s*$/i
    );
    const isTestExperience = /^\s*(?:Тест туршлага эхлүүлэх|Test experience start)\s*:/i.test(text);

    if (isOwner && !action && !imageBase64 && experienceStartMatch) {
      const situation = experienceStartMatch[1].trim();
      const prediction = experienceStartMatch[2].trim();
      const actionTaken = experienceStartMatch[3].trim();

      const { data: experience, error: experienceError } = await supabaseAdmin
        .from("business_experiences")
        .insert({
          client_id: clientId,
          is_test: isTestExperience,
          situation,
          prediction,
          action_taken: actionTaken,
          status: "open",
        })
        .select("id")
        .single();

      if (experienceError) {
        return NextResponse.json({ success: false, message: "Туршлагыг хадгалахад алдаа гарлаа." }, { status: 500 });
      }

      const message = `Туршлагыг хадгаллаа. ID: ${experience.id}. Бодит үр дүн тодорхой болмогц энэ ID-г ашиглан үр дүнг бүртгэнэ.`;
      await saveOwnerChatTurn(clientId, text, message);
      return NextResponse.json({ success: true, message, experienceId: experience.id });
    }

    const experienceResultMatch = text.match(
      /^\s*(?:Туршлага үр дүн|Experience result)\s*:\s*([0-9a-f-]{36})\s*\|\s*([^|]{3,1000})\s*\|\s*(.{5,1000})\s*$/i
    );

    if (isOwner && !action && !imageBase64 && experienceResultMatch) {
      const experienceId = experienceResultMatch[1].trim();
      const outcome = experienceResultMatch[2].trim();
      const lesson = experienceResultMatch[3].trim();

      const { data: experience, error: experienceError } = await supabaseAdmin
        .from("business_experiences")
        .update({
          outcome,
          lesson,
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", experienceId)
        .eq("client_id", clientId)
        .eq("status", "open")
        .select("id")
        .maybeSingle();

      if (experienceError || !experience) {
        return NextResponse.json({ success: false, message: "Туршлагын үр дүнг хадгалахад алдаа гарлаа." }, { status: 500 });
      }

      const message = "Туршлагын бодит үр дүн болон сургамжийг хадгаллаа.";
      await saveOwnerChatTurn(clientId, text, message);
      return NextResponse.json({ success: true, message, experienceId: experience.id, status: "resolved" });
    }

    const experienceEvidenceMatch = text.match(
      /^\s*(?:Туршлагын нотлох баримт|Experience evidence)\s*:\s*([0-9a-f-]{36})\s*\|\s*([0-9a-f-]{36})\s*\|\s*(inventory_count|purchase|spoilage|other)(?:\s*\|\s*(.{1,500}))?\s*$/i
    );

    if (isOwner && !action && !imageBase64 && experienceEvidenceMatch) {
      const experienceId = experienceEvidenceMatch[1].trim();
      const inventoryLogId = experienceEvidenceMatch[2].trim();
      const evidenceType = experienceEvidenceMatch[3].toLowerCase();
      const note = experienceEvidenceMatch[4]?.trim() || null;

      const { data: experience } = await supabaseAdmin
        .from("business_experiences")
        .select("id, is_test")
        .eq("id", experienceId)
        .eq("client_id", clientId)
        .maybeSingle();

      const { data: inventoryLog } = await supabaseAdmin
        .from("inventory_logs")
        .select("id, is_test")
        .eq("id", inventoryLogId)
        .eq("client_id", clientId)
        .maybeSingle();

      if (!experience || !inventoryLog) {
        return NextResponse.json({ success: false, message: "Туршлага эсвэл бүртгэл олдсонгүй." }, { status: 404 });
      }

      if (inventoryLog.is_test && !experience.is_test) {
        return NextResponse.json({ success: false, message: "Тест өгөгдлийг бодит туршлагатай холбох боломжгүй." }, { status: 400 });
      }

      const { data: evidence, error: evidenceError } = await supabaseAdmin
        .from("business_experience_evidence")
        .insert({
          client_id: clientId,
          experience_id: experienceId,
          inventory_log_id: inventoryLogId,
          evidence_type: evidenceType,
          note,
          linked_by: user.id,
        })
        .select("id")
        .single();

      if (evidenceError) {
        return NextResponse.json({ success: false, message: "Нотлох баримт холбох үед алдаа гарлаа." }, { status: 500 });
      }

      const message = "Бараа материалын бүртгэлийг туршлагатай холболоо.";
      await saveOwnerChatTurn(clientId, text, message);
      return NextResponse.json({ success: true, message, evidenceId: evidence.id });
    }

    const experienceVerifyMatch = text.match(
      /^\s*(?:Туршлагын нотлох баримтыг хянаж бүртгэх|Review experience evidence)\s*:\s*([0-9a-f-]{36})\s*\|\s*(.{15,1000})\s*$/i
    );

    if (isOwner && !action && !imageBase64 && experienceVerifyMatch) {
      const experienceId = experienceVerifyMatch[1].trim();
      const verificationNote = experienceVerifyMatch[2].trim();

      const { data: updatedExperience, error: updateError } = await supabaseAdmin
        .from("business_experiences")
        .update({
          evidence_status: "owner_reviewed",
          evidence_reviewed_at: new Date().toISOString(),
          evidence_reviewed_by: user.id,
          evidence_review_note: verificationNote,
        })
        .eq("client_id", clientId)
        .eq("id", experienceId)
        .eq("status", "resolved")
        .select("id, evidence_status")
        .maybeSingle();

      if (updateError || !updatedExperience) {
        return NextResponse.json({ success: false, message: "Баталгаажуулахад алдаа гарлаа. Эхлээд resolved төлөвтэй байх ёстой." }, { status: 400 });
      }

      const message = "Нотлох баримтын хяналтыг бүртгэлээ. Батлагдсан туршлага болгон тэмдэглэв.";
      await saveOwnerChatTurn(clientId, text, message);
      return NextResponse.json({ success: true, message, experience: updatedExperience });
    }

    // Preservation: Categorize action
    if (action === "categorize" && body.names && Array.isArray(body.names)) {
      const key = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
      const prompt = `
        Classify the following menu items into ONE of these 6 STRICT categories:
        1. "HOT_BEVERAGE", 2. "COLD_BEVERAGE", 3. "FOOD_PREP", 4. "BAKERY_DESSERT", 5. "RETAIL_FMCG", 6. "GENERAL".
        Respond ONLY with a JSON object mapping name to category:
        ${JSON.stringify(body.names)}
      `;

      let resultJson: Record<string, string> | null = null;
      if (key) {
        try {
          const ai = new GoogleGenerativeAI(key);
          const model = ai.getGenerativeModel({
            model: "gemini-3.5-flash-lite",
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" } as any,
          });
          const response = await model.generateContent(prompt);
          resultJson = JSON.parse(response.response.text().replace(/```json|```/g, "").trim());
        } catch (err) {}
      }
      if (!resultJson) {
        try {
          const groqRes = await callGroqFallback("F&B classifier. Return ONLY valid JSON.", prompt);
          resultJson = JSON.parse(groqRes.replace(/```json|```/g, "").trim());
        } catch (e) {}
      }
      return NextResponse.json({ success: Boolean(resultJson), categories: resultJson || {} });
    }

    // Preservation: Receipt image parsing preview
    if (imageBase64) {
      const { data: ings } = await supabaseAdmin.from("ingredients").select("id, name, unit").eq("client_id", clientId);
      const allowedNames = (ings || []).map(i => i.name);
      const aiAnalysis = await parseReceiptImage(imageBase64, allowedNames);
      return NextResponse.json(aiAnalysis || { success: false, purchases: [] });
    }

    // Preservation: Worker Kiosk interactions
    if (!isOwner && text) {
      const { data: ings } = await supabaseAdmin.from("ingredients").select("id, name, unit").eq("client_id", clientId);
      const allowedNames = (ings || []).map(i => i.name);
      const { data: learnedAliases } = await supabaseAdmin.from("learned_aliases").select("phrase, ingredient_id").eq("client_id", clientId);

      const aiAnalysis = await parseOperationalText(text, allowedNames, learnedAliases || []);
      if (aiAnalysis && aiAnalysis.is_transaction && aiAnalysis.success) {
        const ingredient = (ings || []).find(i => i.name.toLowerCase().trim() === aiAnalysis.item_name.toLowerCase().trim());
        if (ingredient) {
          const { data: log } = await supabaseAdmin
            .from("inventory_logs")
            .insert([{
              client_id: clientId,
              ingredient_id: ingredient.id,
              quantity: aiAnalysis.quantity,
              type: aiAnalysis.type,
              notes: aiAnalysis.notes || "Instant Log",
              worker_name: workerName,
              date: new Date().toISOString(),
            }])
            .select()
            .single();

          return NextResponse.json({
            success: true,
            is_log: true,
            log_id: log?.id,
            message: `📝 Бүртгэгдлээ: ${aiAnalysis.item_name} (${Math.abs(aiAnalysis.quantity)} ${ingredient.unit})`
          });
        }
      }

      return NextResponse.json({
        success: true,
        is_log: false,
        message: "Зөвхөн гал тогооны зарлага, хаягдал бүртгэх үүрэгтэй туслах байна."
      });
    }

    // -------------------------------------------------------------------------
    // OWNER CFO CHAT LOGIC (FIX 3, 6, 7)
    // -------------------------------------------------------------------------
    if (isOwner && text) {
      let activeStart = body.startDate;
      let activeEnd = body.endDate;

      const parsedDates = extractDateRangeFromText(text);
      if (parsedDates) {
        activeStart = parsedDates.startDate;
        activeEnd = parsedDates.endDate;
      }

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

      const analyticsData = await getCachedAnalytics(clientId, activeStart, activeEnd);
      const fin = analyticsData.financial_ladder || {};

      // Instant Report shortcut
      const lower = text.toLowerCase().trim();
      if (lower === "report" || lower === "/report" || lower === "тайлан" || lower === "тайлан харах") {
        const instantReport =
          `📊 **САНХҮҮГИЙН ТАЙЛАН (${clientId}):**\n` +
          `• Хугацаа: ${activeStart.split('T')[0]} ~ ${activeEnd.split('T')[0]}\n` +
          `• **Нийт орлого:** ${Math.round(fin.revenue || 0).toLocaleString()} ₮\n` +
          `• **Бодит COGS:** ${Math.round(fin.actual_cogs || 0).toLocaleString()} ₮ *(Онол: ${Math.round(fin.theo_cogs || 0).toLocaleString()} ₮)*\n` +
          `• **Бохир ашиг:** ${fin.gross_margin || "0%"}\n` +
          `• **OPEX зардал:** ${Math.round(fin.opex || 0).toLocaleString()} ₮\n` +
          `• **ЦЭВЭР АШИГ:** ${Math.round(fin.net_profit || 0).toLocaleString()} ₮ *(${fin.net_margin || "0%"})*\n` +
          `• **Төлбөрийн хэлбэрүүд:** Бэлэн: ${(analyticsData.payment_methods_summary?.cash_revenue || 0).toLocaleString()}₮ | Данс: ${(analyticsData.payment_methods_summary?.bank_revenue || 0).toLocaleString()}₮ | QPay: ${(analyticsData.payment_methods_summary?.qpay_revenue || 0).toLocaleString()}₮ | Тодорхойгүй: ${(analyticsData.payment_methods_summary?.unknown_payment_revenue || 0).toLocaleString()}₮\n` +
          `• **Бодит хорогдол/алдагдал:** ${Math.round(analyticsData.total_waste_loss || 0).toLocaleString()} ₮\n`;
        return NextResponse.json({ success: true, message: instantReport });
      }

      // Classify intent with robust negation handling
      const knownProductNames = (analyticsData.menu_performance || []).map((m: any) => m.name);
      const { intent, targetProduct, targetIngredient } = classifyOwnerQuestionIntent(text, knownProductNames);

      // Assemble Question-Specific Context Payload (FIX 7)
      let customContext = "";

      const baselineContext = `
=== BUSINESS: ${clientId} ===
REPORTING PERIOD: ${activeStart.split('T')[0]} to ${activeEnd.split('T')[0]}
FINANCIAL SUMMARY:
Revenue: ${fin.revenue}₮ (Cash: ${analyticsData.payment_methods_summary?.cash_revenue || 0}₮, Bank: ${analyticsData.payment_methods_summary?.bank_revenue || 0}₮, QPay: ${analyticsData.payment_methods_summary?.qpay_revenue || 0}₮, Unknown: ${analyticsData.payment_methods_summary?.unknown_payment_revenue || 0}₮)
Net Revenue: ${fin.net_revenue}₮ | COGS: ${fin.actual_cogs}₮ (Theo: ${fin.theo_cogs}₮) | Gross Margin: ${fin.gross_margin}
OPEX: ${fin.opex}₮ | EBIT: ${fin.ebit}₮ | Net Profit: ${fin.net_profit}₮ (${fin.net_margin})
TOP 3 RECORDED LOSSES:
${(analyticsData.top_wasters || []).map((w: any) => `• ${w.name}: -${w.impact}₮ (gap: ${w.gap}${w.unit})`).join("\n") || "None"}
ACTIVE MARGIN ALERTS:
${(analyticsData.margin_guard_alerts || []).map((a: any) => `• ${a.product_name}: Current ${a.selling_price}₮ -> Suggested ${a.suggested_price}₮ (Margin: ${a.current_margin_pct})`).join("\n") || "None"}`;

      if (intent === 'PRODUCT_MARGIN') {
        const pRow = (analyticsData.menu_performance || []).find((m: any) => 
          targetProduct && cleanString(m.name).toLowerCase() === cleanString(targetProduct).toLowerCase()
        );
        const pRecipe = targetProduct ? analyticsData.all_recipes?.[targetProduct] : null;

        customContext = `
INTENT: PRODUCT MARGIN INQUIRY
TARGET PRODUCT: ${targetProduct || "Unknown"}
PRODUCT METRICS:
${pRow ? `
Name: ${pRow.name} | Category: ${pRow.category} | Sold in period: ${pRow.sold}
Selling Price: ${pRow.price_available ? `${pRow.selling_price}₮` : "UNAVAILABLE (Missing from products table)"}
Recipe Cost per Item: ${pRow.cost_available ? `${pRow.cost_per_item}₮` : "UNAVAILABLE (Missing ingredient prices or recipe)"}
Gross Profit per Cup: ${pRow.margin_available ? `${pRow.unit_margin}₮` : "UNAVAILABLE"}
Gross Margin Percentage: ${pRow.margin_available ? `${pRow.gross_margin_pct}%` : "UNAVAILABLE"}
` : "No matching product record found in database."}
RECIPE BREAKDOWN:
${pRecipe ? Object.entries(pRecipe).map(([ing, amt]) => `• ${ing}: ${amt}`).join("\n") : "No recipe linked."}
NOTE: Do not discuss unrelated inventory logs or staff shift tasks unless directly relevant.`;

      } else if (intent === 'INVENTORY_RECONCILIATION') {
        const invItems = targetIngredient 
          ? (analyticsData.all_inventory_data || []).filter((i: any) => i.name.toLowerCase().includes(targetIngredient.toLowerCase()))
          : (analyticsData.all_inventory_data || []).slice(0, 15);

        customContext = `
INTENT: INVENTORY RECONCILIATION
TARGET INGREDIENT: ${targetIngredient || "All requested items"}
RECONCILIATION EVIDENCE TABLE:
${invItems.map((i: any) => `
• Item: ${i.name} (${i.unit})
  Status: ${i.reconciliation_status} (${i.reconciliation_available ? "VERIFIED COUNTS PRESENT" : "COUNTS MISSING"})
  Opening Count: ${i.opening_count !== null ? `${i.opening_count} ${i.unit} (counted on ${i.opening_count_date?.split('T')[0]})` : "MISSING"}
  Purchases in Period: ${i.period_purchases} ${i.unit}
  Closing Count: ${i.closing_count !== null ? `${i.closing_count} ${i.unit} (counted on ${i.closing_count_date?.split('T')[0]})` : "MISSING"}
  Gross Stock Depletion: ${i.gross_stock_depletion !== null ? `${i.gross_stock_depletion} ${i.unit}` : "UNAVAILABLE"}
  Recorded Outflows (Spoilage/Meals): ${i.recorded_outflows} ${i.unit}
  Reconciled Product Usage: ${i.product_usage !== null ? `${i.product_usage} ${i.unit}` : "UNAVAILABLE"}
  Theoretical Usage from Sales: ${i.theoretical} ${i.unit}
  Usage Variance: ${i.usage_variance !== null ? `${i.usage_variance > 0 ? `+${i.usage_variance}` : i.usage_variance} ${i.unit}` : "UNAVAILABLE"}
  Unexplained Gap: ${i.gap !== null ? `${i.gap} ${i.unit} (${i.impact}₮)` : "UNAVAILABLE"}
`).join("\n") || "No matching inventory records found."}
CRITICAL RECONCILIATION RULES:
1. If reconciliation status is MISSING_OPENING_COUNT or MISSING_CLOSING_COUNT, report reconciliation as unavailable. Never invent a loss or usage figure.
2. A difference between theoretical usage and actual usage does NOT independently prove theft. It may reflect overpouring, unrecorded waste, natural variance, or measurement tolerances. State facts neutrally.`;

      } else if (intent === 'CONFIRMED_EXPERIMENT') {
        const { data: eligibleExperiences } = await supabaseAdmin
          .from("business_experiences")
          .select("id, situation, prediction, action_taken, outcome, lesson, confidence, status, evidence_status, created_at, resolved_at")
          .eq("client_id", clientId)
          .eq("is_test", false)
          .eq("status", "resolved")
          .in("evidence_status", ["owner_reviewed", "verified"])
          .order("created_at", { ascending: false });

        const validConfirmed: any[] = [];
        if (eligibleExperiences && eligibleExperiences.length > 0) {
          const expIds = eligibleExperiences.map(e => e.id);
          const { data: links } = await supabaseAdmin
            .from("business_experience_evidence")
            .select("experience_id, evidence_type, note")
            .eq("client_id", clientId)
            .in("experience_id", expIds);

          const linkedExpIds = new Set((links || []).map(l => l.experience_id));
          eligibleExperiences.forEach(exp => {
            if (linkedExpIds.has(exp.id)) {
              validConfirmed.push(exp);
            }
          });
        }

        customContext = `
INTENT: CONFIRMED EXPERIMENTS & LESSONS LOOKUP
CONFIRMED BUSINESS EXPERIENCES:
${validConfirmed.length > 0 ? validConfirmed.map((e, idx) => `
${idx + 1}. [CONFIRMED LESSON]
Situation: ${e.situation}
Action Taken: ${e.action_taken || "None"}
Outcome: ${e.outcome || "None"}
Verified Lesson: ${e.lesson || "None"}
Status: ${e.status} | Evidence Status: ${e.evidence_status}
`).join("\n") : "Одоогоор эзний хянаж баталгаажуулсан, бодит нотлох баримттай туршилт/сургамж бүртгэгдээгүй байна."}
RULES:
- A saved memory fact from business_memory is NOT an experiment.
- Only cite lessons from the confirmed business experiences listed above.
- If none are available, state clearly that no confirmed lessons or experiments exist.`;

      } else if (intent === 'BUSINESS_MEMORY_LOOKUP') {
        const { data: memories } = await supabaseAdmin
          .from("business_memory")
          .select("topic, fact, updated_at")
          .eq("client_id", clientId)
          .order("updated_at", { ascending: false })
          .limit(15);

        customContext = `
INTENT: BUSINESS MEMORY LOOKUP
RECORDED BUSINESS FACTS:
${(memories && memories.length > 0) ? memories.map(m => `• [${m.topic}] ${m.fact} (recorded: ${m.updated_at?.split('T')[0]})`).join("\n") : "No business memory facts recorded yet."}
RULES:
- These are recorded historical memory facts. Use them accurately.
- Do not describe these memory facts as confirmed business experiments.`;

      } else if (intent === 'CASHFLOW') {
        const cf = analyticsData.cashflow_summary || {};
        customContext = `
INTENT: CASHFLOW & BALANCES
CASHFLOW AUDIT:
Initial Cash: ${cf.initial_cash !== null ? `${cf.initial_cash}₮` : "UNAVAILABLE (Not configured)"}
Initial Bank: ${cf.initial_bank !== null ? `${cf.initial_bank}₮` : "UNAVAILABLE (Not configured)"}
Inflow Cash Sales: ${cf.cash_in_cash}₮ | Inflow Bank Sales: ${cf.cash_in_bank}₮ | QPay: ${cf.cash_in_qpay || 0}₮ | Unknown: ${cf.cash_in_unknown || 0}₮
Outflow Verified Cash Purchases: -${cf.cash_out_purchases_cash}₮
Outflow Verified Bank Purchases: -${cf.cash_out_purchases_bank}₮
Outflow Verified Cash OPEX: -${cf.cash_out_opex_cash}₮
Outflow Verified Bank OPEX: -${cf.cash_out_opex_bank}₮
Owner Draws: ${cf.owner_draws}₮ (Cash: ${cf.owner_draws_cash}₮, Bank: ${cf.owner_draws_bank}₮, Unallocated: ${cf.owner_draws_unallocated}₮)
Fixed Assets Invested: ${cf.fixed_assets_invested}₮
Total Unallocated Outflows: ${cf.unallocated_outflow}₮
Ending Balances:
Ending Cash in Hand: ${cf.end_cash_balance !== null ? `${cf.end_cash_balance}₮` : "UNAVAILABLE"}
Ending Bank Balance: ${cf.end_bank_balance !== null ? `${cf.end_bank_balance}₮` : "UNAVAILABLE"}
Status: ${cf.is_balance_exact ? "EXACT RECONCILED" : "PARTIAL (Transactions with unallocated payment channels exist)"}
${cf.unallocated_warning ? `Warning: ${cf.unallocated_warning}` : ""}`;

      } else if (intent === 'PAYROLL_STAFF') {
        customContext = `
INTENT: PAYROLL & STAFF
PAYROLL SUMMARY:
${(analyticsData.payroll_summary || []).map((p: any) => `• ${p.worker_name} (${p.role || "Staff"}): ${p.total_hours} hrs | Gross: ${p.gross_salary}₮ | Net: ${p.net_take_home}₮`).join("\n") || "No shifts recorded in period."}`;

      } else if (intent === 'FULL_AUDIT') {
        customContext = `
INTENT: FULL AUDIT MODE
DETAILED RECONCILIATIONS:
${(analyticsData.all_inventory_data || []).map((i: any) => `• ${i.name}: Status=${i.reconciliation_status}, Opening=${i.opening_count}, Purch=${i.period_purchases}, Closing=${i.closing_count}, Depletion=${i.gross_stock_depletion}, Outflows=${i.recorded_outflows}, Usage=${i.product_usage}, Theo=${i.theoretical}, Gap=${i.gap}`).join("\n")}
PAYROLL:
${(analyticsData.payroll_summary || []).map((p: any) => `• ${p.worker_name}: ${p.total_hours} hrs, Gross=${p.gross_salary}₮`).join("\n")}
MENU PERFORMANCE:
${(analyticsData.menu_performance || []).map((m: any) => `• ${m.name}: Sold=${m.sold}, Price=${m.selling_price}₮, Cost=${m.cost_per_item}₮, Margin=${m.gross_margin_pct}%`).join("\n")}`;
      }

      const promptPayload = `
${baselineContext}
${customContext}

USER QUESTION: ${text}
`;

      let responseStream: any = null;
      let fallbackText = "";

      try {
        responseStream = await callGeminiStreamWithFailover(ACTIVE_PROMPT, promptPayload);
      } catch (geminiErr: any) {
        console.warn("Gemini unavailable, switching to Groq fallback:", geminiErr.message);
        try {
          fallbackText = await callGroqFallback(ACTIVE_PROMPT, promptPayload);
        } catch (groqErr: any) {
          return NextResponse.json({ success: false, message: `Серверийн саатал: ${groqErr.message}` });
        }
      }

      if (fallbackText) {
        await saveOwnerChatTurn(clientId, text, fallbackText);
        return new Response(fallbackText, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let completeAnswer = "";
          try {
            for await (const chunk of responseStream.stream) {
              const chunkText = chunk.text();
              if (chunkText) {
                completeAnswer += chunkText;
                controller.enqueue(encoder.encode(chunkText));
              }
            }
            await saveOwnerChatTurn(clientId, text, completeAnswer);
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

    return NextResponse.json({ success: false, message: "Хоосон утга илгээсэн байна." });
  } catch (error: any) {
    console.error("Kiosk AI Error:", error);
    return NextResponse.json({ success: false, message: getFriendlyErrorMessage(error.message || String(error)) });
  }
}