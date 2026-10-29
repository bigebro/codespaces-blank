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

function normalizeDateBound(value: unknown, isEndOfDay = false): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const dateValue = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return `${dateValue}T${isEndOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
  }
  return dateValue;
}

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

const OWNER_CFO_PROMPT = `
You are OperaLink's CFO and business analyst for cafes and restaurants.
Answer the owner's actual question using only the supplied context and verified calculations.
Respond in the language used by the owner, usually Mongolian.

TRUTH AND DATA
- Code-calculated values are authoritative for the calculation they describe. Do not replace them with numbers from older AI replies, memories, assumptions, or mental arithmetic.
- Never invent amounts, quantities, percentages, dates, IDs, records, causes, or probabilities.
- If required evidence is missing or the calculation is unavailable, say so explicitly.
- Keep original POS names separate from official recipe names. Combine names only when an explicit learned_menus mapping is supplied.
- Do not classify an unknown payment method as cash or bank. Distinguish recorded values from unclassified amounts.

MEMORY AND EVIDENCE
- Use only relevant saved memories. A memory is historical context, not automatically a current or verified fact.
- Use recent owner chat only to resolve conversational references; an earlier AI answer is not independent evidence and never overrides current calculations.
- A recorded experience or owner-reported outcome is not independently verified merely because it is saved or owner-reviewed.
- One experience does not establish a universal rule or prove causation.
- Inventory discrepancies alone do not prove theft, fraud, or employee misconduct.
- Never use synthetic, test, simulated, or development data as evidence about real business operations.
- Use record IDs only when they are explicitly provided, and keep each ID tied to its actual record type.

RESPONSE STYLE
- Give a concise, direct answer by default. Include only information relevant to the question.
- Show the arithmetic for important reconciliation totals when available.
- Separate recorded facts, code-calculated results, unverified hypotheses, and next checks.
- Provide a full audit structure only when the owner explicitly asks for a full or detailed audit.
- Use clean Markdown and avoid repeated conclusions.
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

async function saveOwnerChatTurn(
  clientId: string,
  question: string,
  answer: string
) {
  if (!question.trim() || !answer.trim()) return;

  try {
    const { error } = await supabaseAdmin
      .from("ai_chat_messages")
      .insert([
        {
          client_id: clientId,
          role: "owner",
          content: question.trim(),
        },
        {
          client_id: clientId,
          role: "ai",
          content: answer.trim(),
        },
      ]);

    if (error) {
      console.error("Could not save owner CFO chat:", error.message);
    }
  } catch (error) {
    console.error("Could not save owner CFO chat:", error);
  }
}

async function evaluateExperienceOutcome(
  situation: string | null,
  prediction: string | null,
  actionTaken: string | null,
  outcome: string
): Promise<{
  assessment: string;
  suggestedLesson: string | null;
}> {
  const allowedAssessments = new Set([
    "prediction_matched",
    "partially_matched",
    "prediction_not_matched",
    "inconclusive",
  ]);

  const key = (process.env.GEMINI_API_KEY || "")
    .replace(/["']/g, "")
    .trim();

  if (!key || !outcome.trim()) {
    return {
      assessment: "unassessed",
      suggestedLesson: null,
    };
  }

  try {
    const ai = new GoogleGenerativeAI(key);

    const model = ai.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      } as any,
    });

    const prompt = `
Analyze a business experiment using the information below.

Return only valid JSON in this format:
{
  "assessment": "inconclusive",
  "suggestedLesson": "A concise, actionable lesson"
}

assessment must be exactly one of:
- prediction_matched
- partially_matched
- prediction_not_matched
- inconclusive

Rules:
- A result occurring after an action does not prove that the action caused it.
- Never say an action "prevented", "caused", "reduced", "improved",
  "solved", or "was effective" unless the supplied evidence supports
  that specific causal conclusion.
- Adding "in this instance" or "this does not prove a general rule"
  does not make an unsupported causal claim acceptable.
- When only one observation is available, describe the observed
  outcome and explicitly state that causation has not been established.
- Distinguish prediction_assessment from causal proof:
  a prediction may match the reported outcome without the action
  being proven to have caused that outcome.

Situation:
${JSON.stringify(situation)}

Prediction:
${JSON.stringify(prediction)}

Action taken:
${JSON.stringify(actionTaken)}

Owner-reported outcome:
${JSON.stringify(outcome)}
`;

    const response = await model.generateContent(prompt);

    const raw = response.response.text()
      .replace(/```json|```/g, "")
      .trim();

    const parsed = JSON.parse(raw);

    const assessment = allowedAssessments.has(parsed.assessment)
      ? parsed.assessment
      : "unassessed";

    const suggestedLesson =
      typeof parsed.suggestedLesson === "string"
        ? parsed.suggestedLesson.trim().slice(0, 1000) || null
        : null;

    return { assessment, suggestedLesson };
  } catch (error) {
    console.error("Experience outcome evaluation failed:", error);

    return {
      assessment: "unassessed",
      suggestedLesson: null,
    };
  }
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
    const ACTIVE_PROMPT = isOwner ? OWNER_CFO_PROMPT : WORKER_KIOSK_PROMPT;

    const workerName = body.workerName || profile.full_name || "Ажилтан";
    const text = String(body.text || body.payloadText || body.input || "").trim();
    const imageBase64 = body.imageBase64 || null;
    const action = body.action || null;
    const questionLower = text.toLowerCase().normalize("NFKC");
    const isFullAuditRequest = /(?:\bfull\s+(?:(?:business|inventory|stock|financial)\s+)?audit\b|\bcomplete\s+(?:(?:business|inventory|stock|financial)\s+)?report\b|\bdetailed\s+(?:(?:business|inventory|stock|financial)\s+)?audit\b|\bdetailed\s+(?:(?:business|inventory|stock|financial)\s+)?report\b|\baudit\s+(?:the\s+)?(?:whole|entire|all)\s+(?:business|inventory|stock)\b|\bfull\s+(?:business|inventory|stock|financial)\s+report\b|бүрэн\s+аудит|дэлгэрэнгүй\s+(?:аудит|тайлан)|бүх\s+(?:бизнес|санхүү|агуулах).{0,25}(?:аудит|шалгах|тайлан))/i.test(text);
    const hasInventoryIntent = /(?:\binventory\b|\bstock\b|\bcount(?:ed|ing)?\b|\busage\b|\buse\b|\bused\b|\bconsumption\b|\bwaste\b|\bspoilage\b|\breconcil(?:e|iation)\b|\brecipe\b|\bingredient\b|\bdifference\b|\bmismatch\b|\btheoretical\b|\brecorded\b|\bml\b|\bliter\b|агуулах|үлдэгдэл|тооллого|хэрэглээ|хаягдал|зарлага|жор|орц|зөрүү|онолын|бүртгэлийн)/i.test(text);
    const needsDetailedInventoryContext = isFullAuditRequest || hasInventoryIntent;
    const needsSalesDetail = isFullAuditRequest || needsDetailedInventoryContext || /(?:\bsales?\b|\bsold\b|\brevenue\b|\bmenu\b|\bproduct\b|борлуулалт|орлого|бүтээгдэхүүн|цэс)/i.test(text);
    const isReportCommandLike = /^(?:\/?report|тайлан|тайлан харах)(?:\s|$)/i.test(text);
    const needsFinancialContext = /(?:\bfinance\b|\bfinancial\b|\bprofit\b|\brevenue\b|\bmargin\b|\bprice\b|\bcost\b|\bexpense\b|\bspend\b|\border\b|\brestock\b|\bcashflow\b|\bcash\b|\bbank\b|\bpayment\b|\btax\b|\bbusiness performance\b|\bbusiness health\b|\bhow (?:is|are) (?:the )?business\b|\bhow are we doing\b|\bperformance\b|\bsummary\b|\boverview\b|санхүү|ашиг|орлого|зардал|татвар|мөнгөн урсгал|тайлан|бизнесийн гүйцэтгэл|бизнес хэр байна|үнэ|өртөг|захиалга|нөөц)/i.test(text);
    const needsAnalyticsData = isFullAuditRequest || needsSalesDetail || needsFinancialContext || isReportCommandLike;
    const shouldLoadExperienceHistory = isOwner && (isFullAuditRequest || /(?:\bexperience\b|\blesson\b|\bprediction\b|\boutcome\b|\bwhat did we learn\b|\bwhat happened last time\b|туршлага|сургамж|таамаглал|үр дүн|өмнө нь юу болсон)/i.test(text));
    const shouldLoadRecentChatContext = isOwner && /(?:\b(?:it|that|those|same|also|then|why|how about|what about|previous|earlier|above|again)\b|what did we decide|тэгвэл|тэр|энэ|бас|өмнөх|яагаад|тэгээд|дахин)/i.test(text);
    const logId = body.logId || null;
    // OWNER-ONLY: Load persistent CFO chat history
if (action === "owner_chat_history") {
  // Never allow workers or image requests to enter owner chat history.
  if (!isOwner || imageBase64) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 }
    );
  }

  const { data: messages, error } = await supabaseAdmin
    .from("ai_chat_messages")
    .select("id, role, content, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Owner chat history error:", error.message);

    return NextResponse.json(
      { success: false, message: "Could not load chat history." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    messages: (messages ?? []).reverse(),
  });
}


// OWNER-ONLY: Explicitly save a business memory.
const memoryCommand = text.match(
  /^\s*(?:remember|санамж|санах ойд хадгал)\s*(?:\[([^\]]{1,60})\])?\s*:\s*(.{5,1000})\s*$/i
);

if (isOwner && !action && !imageBase64 && memoryCommand) {
  const topic = (memoryCommand[1] || "general")
    .trim()
    .toLowerCase();

  const fact = memoryCommand[2].trim();

  // Check for an exact duplicate in this shop.
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("business_memory")
    .select("id")
    .eq("client_id", clientId)
    .eq("topic", topic)
    .eq("fact", fact)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("Memory lookup failed:", lookupError.message);

    return NextResponse.json(
      { success: false, message: "Could not check existing memories." },
      { status: 500 }
    );
  }

  let message: string;

  if (existing) {
    message = "This exact business memory is already saved.";
  } else {
    const { error: insertError } = await supabaseAdmin
      .from("business_memory")
      .insert({
        client_id: clientId,
        topic,
        fact,
      });

    if (insertError) {
      console.error("Memory insert failed:", insertError.message);

      return NextResponse.json(
        { success: false, message: "Could not save business memory." },
        { status: 500 }
      );
    }

    message = `Business memory saved under "${topic}".`;
  }

  await saveOwnerChatTurn(clientId, text, message);

  return NextResponse.json({
    success: true,
    message,
  });
}

// Owner command: record a new business experience.
const experienceStartMatch = text.match(
  /^\s*(?:Тест туршлага эхлүүлэх|Test experience start|Туршлага эхлүүлэх|Experience start)\s*:\s*([^|]{5,1000})\s*\|\s*([^|]{5,1000})\s*\|\s*([^|]{5,1000})\s*$/i
);

const isTestExperience =
  /^\s*(?:Тест туршлага эхлүүлэх|Test experience start)\s*:/i.test(text);

if (
  isOwner &&
  !action &&
  !imageBase64 &&
  experienceStartMatch
) {
  const situation = experienceStartMatch[1].trim();
  const prediction = experienceStartMatch[2].trim();
  const actionTaken = experienceStartMatch[3].trim();

  const { data: experience, error: experienceError } =
    await supabaseAdmin
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
    console.error(
      "Experience insert error:",
      experienceError.message
    );

    return NextResponse.json(
      {
        success: false,
        message: "Туршлагыг хадгалахад алдаа гарлаа.",
      },
      { status: 500 }
    );
  }

  const message =
    `Туршлагыг хадгаллаа. ID: ${experience.id}. ` +
    "Бодит үр дүн тодорхой болмогц энэ ID-г ашиглан үр дүнг бүртгэнэ.";

  await saveOwnerChatTurn(clientId, text, message);

  return NextResponse.json({
    success: true,
    message,
    experienceId: experience.id,
  });
}

// Owner command: record the actual outcome of an experience.
// Owner command: record the actual outcome of an experience.
const experienceResultMatch = text.match(
  /^\s*(?:Туршлага үр дүн|Experience result)\s*:\s*([0-9a-f-]{36})\s*\|\s*([^|]{3,1000})(?:\s*\|\s*(.{5,1000}))?\s*$/i
);

if (
  isOwner &&
  !action &&
  !imageBase64 &&
  experienceResultMatch
) {
  const experienceId = experienceResultMatch[1].trim();
  const outcome = experienceResultMatch[2].trim();
  const ownerLesson = experienceResultMatch[3]?.trim() || null;

  const {
    data: priorExperience,
    error: priorExperienceError,
  } = await supabaseAdmin
    .from("business_experiences")
    .select("situation, prediction, action_taken")
    .eq("client_id", clientId)
    .eq("id", experienceId)
    .eq("status", "open")
    .maybeSingle();

  if (priorExperienceError) {
    console.error(
      "Experience lookup error:",
      priorExperienceError.message
    );

    return NextResponse.json(
      {
        success: false,
        message: "Туршлагыг шалгахад алдаа гарлаа.",
      },
      { status: 500 }
    );
  }

  if (!priorExperience) {
    return NextResponse.json(
      {
        success: false,
        message: "Нээлттэй туршлага олдсонгүй. ID-г шалгана уу.",
      },
      { status: 404 }
    );
  }

  const review = await evaluateExperienceOutcome(
    priorExperience.situation,
    priorExperience.prediction,
    priorExperience.action_taken,
    outcome
  );

  // An owner-written lesson always takes priority.
  const lesson = ownerLesson || review.suggestedLesson;

  // Do not close the experience without a usable lesson.
  if (!lesson) {
    return NextResponse.json(
      {
        success: false,
        message:
          "AI сургамж гаргаж чадсангүй. Гурав дахь талбарт сургамжаа өөрөө оруулаад дахин илгээнэ үү.",
      },
      { status: 400 }
    );
  }

  const {
    data: experience,
    error: experienceError,
  } = await supabaseAdmin
    .from("business_experiences")
    .update({
      outcome,
      lesson,
      prediction_assessment: review.assessment,
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", experienceId)
    .eq("client_id", clientId)
    .eq("status", "open")
    .select("id")
    .maybeSingle();

  if (experienceError) {
    console.error(
      "Experience outcome update error:",
      experienceError.message
    );

    return NextResponse.json(
      {
        success: false,
        message: "Туршлагын үр дүнг хадгалахад алдаа гарлаа.",
      },
      { status: 500 }
    );
  }

  if (!experience) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Нээлттэй туршлага олдсонгүй. ID болон төлөвийг шалгана уу.",
      },
      { status: 404 }
    );
  }

const message = ownerLesson
  ? `Туршлагын үр дүн болон таны бичсэн сургамжийг хадгаллаа.\nСургамж: ${lesson}`
  : `Туршлагын үр дүн болон AI-ийн санал болгосон сургамжийг хадгаллаа. Сургамжийг шалгана уу.\nAI-ийн санал болгосон сургамж: ${lesson}`;

  await saveOwnerChatTurn(clientId, text, message);

  return NextResponse.json({
    success: true,
    message,
    experienceId: experience.id,
    status: "resolved",
    predictionAssessment: review.assessment,
    lesson,
    lessonSource: ownerLesson ? "owner" : "ai_suggestion",
  });
}
// Owner command: link an inventory record to an experience.
const experienceEvidenceMatch = text.match(
  /^\s*(?:Туршлагын нотлох баримт|Experience evidence)\s*:\s*([0-9a-f-]{36})\s*\|\s*([0-9a-f-]{36})\s*\|\s*(inventory_count|purchase|spoilage|other)(?:\s*\|\s*(.{1,500}))?\s*$/i
);

if (
  isOwner &&
  !action &&
  !imageBase64 &&
  experienceEvidenceMatch
) {
  const experienceId = experienceEvidenceMatch[1].trim();
  const inventoryLogId = experienceEvidenceMatch[2].trim();
  const evidenceType = experienceEvidenceMatch[3].toLowerCase();
  const note = experienceEvidenceMatch[4]?.trim() || null;

  // Confirm the experience belongs to this business.
  const { data: experience, error: experienceError } =
    await supabaseAdmin
      .from("business_experiences")
      .select("id, is_test")
      .eq("id", experienceId)
      .eq("client_id", clientId)
      .maybeSingle();

  if (experienceError) {
    console.error("Experience lookup error:", experienceError.message);

    return NextResponse.json(
      { success: false, message: "Туршлагыг шалгахад алдаа гарлаа." },
      { status: 500 }
    );
  }

  if (!experience) {
    return NextResponse.json(
      { success: false, message: "Тухайн бизнесийн туршлага олдсонгүй." },
      { status: 404 }
    );
  }

  // Confirm the inventory record belongs to the same business.
  const { data: inventoryLog, error: logError } =
    await supabaseAdmin
      .from("inventory_logs")
      .select("id, type, ingredient_id, date, quantity, notes, is_test")
      .eq("id", inventoryLogId)
      .eq("client_id", clientId)
      .maybeSingle();

  if (logError) {
    console.error("Inventory evidence lookup error:", logError.message);

    return NextResponse.json(
      { success: false, message: "Бараа материалын бүртгэлийг шалгахад алдаа гарлаа." },
      { status: 500 }
    );
  }

  if (!inventoryLog) {
    return NextResponse.json(
      { success: false, message: "Тухайн бизнесийн бараа материалын бүртгэл олдсонгүй." },
      { status: 404 }
    );
  }

  if (inventoryLog.is_test && !experience.is_test) {
  return NextResponse.json(
    {
      success: false,
      message:
        "Тест өгөгдлийг бодит туршлагын нотлох баримт болгон холбох боломжгүй.",
    },
    { status: 400 }
  );
}

  // Make sure the declared evidence type matches the actual log.
  const expectedLogTypes: Record<string, string> = {
    inventory_count: "count",
    purchase: "purchase",
    spoilage: "spoilage",
  };

  if (
    expectedLogTypes[evidenceType] &&
    (
      inventoryLog.type !== expectedLogTypes[evidenceType] ||
      (evidenceType === "inventory_count" && !inventoryLog.ingredient_id)
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Нотлох баримтын төрөл тухайн бүртгэлтэй тохирохгүй байна.",
      },
      { status: 400 }
    );
  }

  const { data: evidence, error: evidenceError } =
    await supabaseAdmin
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
    if (evidenceError.code === "23505") {
      return NextResponse.json({
        success: true,
        message: "Энэ бүртгэлийг өмнө нь нотлох баримтаар холбосон байна.",
      });
    }

    console.error("Evidence link insert error:", evidenceError.message);

    return NextResponse.json(
      { success: false, message: "Нотлох баримт холбох үед алдаа гарлаа." },
      { status: 500 }
    );
  }

  const message =
    "Бараа материалын бүртгэлийг туршлагатай холболоо. " +
    "Энэ холбоос дангаараа туршлагыг баталгаажуулахгүй.";

  await saveOwnerChatTurn(clientId, text, message);

  return NextResponse.json({
    success: true,
    message,
    evidenceId: evidence.id,
    experienceId,
    inventoryLogId,
    evidenceStatusUnchanged: true,
  });
}




// Owner command: record a review of linked experience evidence.
const experienceVerifyMatch = text.match(
  /^\s*(?:Туршлагын нотлох баримтыг хянаж бүртгэх|Review experience evidence)\s*:\s*([0-9a-f-]{36})\s*\|\s*(.{15,1000})\s*$/i
);

if (
  isOwner &&
  !action &&
  !imageBase64 &&
  experienceVerifyMatch
) {
  const experienceId = experienceVerifyMatch[1].trim();
  const verificationNote = experienceVerifyMatch[2].trim();

  const { data: experience, error: experienceError } =
    await supabaseAdmin
      .from("business_experiences")
      .select("id, status, evidence_status, is_test")
      .eq("client_id", clientId)
      .eq("id", experienceId)
      .maybeSingle();

  if (experienceError) {
    console.error("Experience verification lookup error:", experienceError.message);

    return NextResponse.json(
      { success: false, message: "Туршлагыг шалгахад алдаа гарлаа." },
      { status: 500 }
    );
  }

  if (!experience) {
    return NextResponse.json(
      { success: false, message: "Тухайн бизнесийн туршлага олдсонгүй." },
      { status: 404 }
    );
  }

  if (experience.is_test) {
  return NextResponse.json(
    {
      success: false,
      message:
        "Тест туршлагыг бодит нотлох баримт гэж баталгаажуулах боломжгүй.",
    },
    { status: 400 }
  );
}

  if (experience.status !== "resolved") {
    return NextResponse.json(
      {
        success: false,
        message:
          "Эхлээд туршлагын бодит үр дүнг бүртгэж, resolved төлөвт оруулна уу.",
      },
      { status: 400 }
    );
  }

  const { data: evidenceLinks, error: evidenceError } =
    await supabaseAdmin
      .from("business_experience_evidence")
      .select("id, inventory_log_id")
      .eq("client_id", clientId)
      .eq("experience_id", experienceId);

  if (evidenceError) {
    console.error("Evidence verification lookup error:", evidenceError.message);

    return NextResponse.json(
      { success: false, message: "Нотлох баримтыг шалгахад алдаа гарлаа." },
      { status: 500 }
    );
  }

  if (!evidenceLinks || evidenceLinks.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Баталгаажуулахаас өмнө нотлох баримт холбоно уу.",
      },
      { status: 400 }
    );
  }

  // Confirm the linked inventory records still exist for this business.
  const logIds = [
    ...new Set(evidenceLinks.map((link) => link.inventory_log_id)),
  ];

  const { data: inventoryLogs, error: logsError } =
    await supabaseAdmin
      .from("inventory_logs")
      .select("id, is_test")
      .eq("client_id", clientId)
      .in("id", logIds);

  if (logsError) {
    console.error("Inventory evidence verification error:", logsError.message);

    return NextResponse.json(
      { success: false, message: "Бараа материалын нотлох баримтыг шалгахад алдаа гарлаа." },
      { status: 500 }
    );
  }

  if (inventoryLogs.some((log) => log.is_test)) {
  return NextResponse.json(
    {
      success: false,
      message:
        "Тест өгөгдөл агуулсан туршлагыг бодит нотлох баримтаар баталгаажуулах боломжгүй.",
    },
    { status: 400 }
  );
}

  if (!inventoryLogs || inventoryLogs.length !== logIds.length) {
    return NextResponse.json(
      {
        success: false,
        message: "Холбогдсон зарим бүртгэл олдсонгүй.",
      },
      { status: 400 }
    );
  }

  const { data: updatedExperience, error: updateError } =
    await supabaseAdmin
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
      .select(
        "id, evidence_status, evidence_reviewed_at, evidence_reviewed_by, evidence_review_note"
      )
      .maybeSingle();

  if (updateError) {
    console.error("Experience verification update error:", updateError.message);

    return NextResponse.json(
      { success: false, message: "Баталгаажуулалтын бүртгэл хадгалахад алдаа гарлаа." },
      { status: 500 }
    );
  }

  if (!updatedExperience) {
    return NextResponse.json(
      {
        success: false,
        message: "Туршлагын төлөв өөрчлөгдсөн байна. Дахин шалгана уу.",
      },
      { status: 409 }
    );
  }

  const message =
    "Нотлох баримтын хяналтыг бүртгэлээ. " +
    "Энэ нь хянагчийн үнэлгээ бөгөөд бодит үйл явдал бие даан баталгаажсаныг дангаараа нотлохгүй.";

  await saveOwnerChatTurn(clientId, text, message);

  return NextResponse.json({
    success: true,
    message,
    experience: updatedExperience,
  });
}

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
          const { data: deletedLog, error } = await supabaseAdmin
          .from("inventory_logs")
          .delete()
          .eq("id", logId)
          .eq("client_id", clientId)
          .select("id")
          .maybeSingle();

        if (error) {
          return NextResponse.json(
            {
              success: false,
              message: `Алдаа: ${error.message}`,
            },
            { status: 500 }
          );
        }

        if (!deletedLog) {
          return NextResponse.json(
            {
              success: false,
              message: "Бүртгэл олдсонгүй эсвэл энэ бизнест хамаарахгүй.",
            },
            { status: 404 }
          );
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
          message: aiAnalysis?.error_message || "Зургийг уншиж чадсангүй.",
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
              message: `📝 **Бүртгэгдлээ:**\n• Төрөл: \`${aiAnalysis.type}\`\n• Бараа: **${aiAnalysis.item_name}**\n• Хэмжээ: **${Math.abs(aiAnalysis.quantity)} ${ingredient.unit}**`,
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

      // =========================================================================
      // ЗӨВХӨН ЭЗЭН БАЙВАЛ Л ДООШОО ГҮЙЖ САНХҮҮГИЙН МОТОР АЖИЛЛАНА:
      // =========================================================================
      let activeStart = normalizeDateBound(body.startDate, false);
      let activeEnd = normalizeDateBound(body.endDate, true);

      // If neither boundary is supplied, default to the latest sales month.
      // If exactly one boundary is supplied, preserve it and fill only the missing side.
      if (needsAnalyticsData && !activeStart && !activeEnd) {
        const { data: latestSale } = await supabaseAdmin
          .from("sales_logs")
          .select("date")
          .eq("client_id", clientId)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestSale?.date) {
          const ym = String(latestSale.date).substring(0, 7);
          const [year, month] = ym.split("-").map(Number);
          activeStart = `${ym}-01T00:00:00.000Z`;
          activeEnd = `${ym}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}T23:59:59.999Z`;
        } else {
          const now = new Date();
          activeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
          activeEnd = now.toISOString();
        }
      } else if (needsAnalyticsData && activeStart && !activeEnd) {
        activeEnd = new Date().toISOString();
      } else if (needsAnalyticsData && !activeStart && activeEnd) {
        const endDate = new Date(activeEnd);
        if (Number.isFinite(endDate.getTime())) {
          activeStart = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1)).toISOString();
        }
      }

      // Load the full business analytics only when the question needs it.
      // Memory-only questions do not trigger the large analytics query set.
      const emptyAnalyticsData: any = {
        financial_ladder: {},
        tax_summary: {},
        abc_summary: {},
        margin_guard_alerts: [],
        worker_fraud_matrix: {},
        purchases_summary: {},
        cashflow_summary: {},
        payroll_summary: [],
        fixed_assets: [],
        waste_act_items: [],
        top_wasters: [],
        top_expensive: [],
        all_inventory_data: [],
        wasted_only: [],
        underpoured_only: [],
        menu_performance: [],
        all_recipes: {},
        opex_details: [],
        all_timeline_logs: [],
        recent_shifts: [],
        recent_worker_logs: [],
        total_waste_loss: null,
        total_unexplained_waste: null,
        total_logged_spoilage: null,
        total_logged_testing: null,
        total_logged_staff_meal: null,
        total_logged_other: null,
        total_surplus_savings: null,
        efficiency: null,
      };
      const analyticsData: any = needsAnalyticsData
        ? await getCachedAnalytics(clientId, activeStart, activeEnd)
        : emptyAnalyticsData;
      const fin = analyticsData.financial_ladder || {};

            // Fetch the underlying sales rows for the current report date range.
      // Preserve exact product names; do not merge aliases automatically.
      let salesPeriodRows: any[] = [];

      if (needsSalesDetail && activeStart && activeEnd) {
        const {
          data: rows,
          error: salesRowsError,
        } = await supabaseAdmin
          .from("sales_logs")
          .select(
            "id, date, product_name, quantity_sold, total_revenue, payment_method"
          )
          .eq("client_id", clientId)
          .gte("date", activeStart)
          .lte("date", activeEnd)
          .order("date", { ascending: true })
          .limit(1000);

        if (salesRowsError) {
          console.error(
            "Sales period query error:",
            salesRowsError.message
          );
        } else {
          salesPeriodRows = rows ?? [];
        }
      }

  // Calculate totals in code instead of asking the AI to guess or sum them.
  const salesTotalsByExactName = new Map<
    string,
    { units: number; revenue: number; rows: number }
  >();

  for (const row of salesPeriodRows) {
    const productName = row.product_name;
    const current = salesTotalsByExactName.get(productName) ?? {
      units: 0,
      revenue: 0,
      rows: 0,
    };

    current.units += Number(row.quantity_sold) || 0;
    current.revenue += Number(row.total_revenue) || 0;
    current.rows += 1;

    salesTotalsByExactName.set(productName, current);
  }

// Resolve sales names using this client's explicit POS mappings.
// Keep the original sales rows unchanged.
let learnedMenuMappings: any[] = [];
if (needsSalesDetail) {
  const { data, error } = await supabaseAdmin
    .from("learned_menus")
    .select("pos_name, official_product_name")
    .eq("client_id", clientId);

  if (error) {
    console.error("Failed to load learned menu mappings:", error.message);
  } else {
    learnedMenuMappings = data ?? [];
  }
}

const learnedMenuAliasMap = new Map<string, string>();

for (const mapping of learnedMenuMappings || []) {
  const posName = String(mapping.pos_name || "").trim().toLowerCase();
  const officialName = String(
    mapping.official_product_name || ""
  ).trim();

  if (posName && officialName) {
    learnedMenuAliasMap.set(posName, officialName);
  }
}

// Build separate totals for recipe comparisons.
// Original sales data and original product names remain unchanged.
const salesTotalsByRecipeName = new Map<
  string,
  { units: number; revenue: number; rows: number }
>();

for (const row of salesPeriodRows) {
  const originalName = String(row.product_name || "").trim();

  if (!originalName) continue;

  const resolvedName =
    learnedMenuAliasMap.get(originalName.toLowerCase()) ||
    originalName;

  const totals = salesTotalsByRecipeName.get(resolvedName) || {
    units: 0,
    revenue: 0,
    rows: 0,
  };

  totals.units += Number(row.quantity_sold || 0);
  totals.revenue += Number(row.total_revenue || 0);
  totals.rows += 1;

  salesTotalsByRecipeName.set(resolvedName, totals);
}

const salesTotalsByRecipeNameText = Array.from(
  salesTotalsByRecipeName.entries()
)
  .map(
    ([name, totals]) =>
      `${name} | sold:${totals.units} | revenue:${totals.revenue}₮ | rows:${totals.rows}`
  )
  .join("\n");


  const salesTotalsText =
    [...salesTotalsByExactName.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([productName, totals]) =>
          `${productName} | units: ${totals.units} | ` +
          `revenue: ${totals.revenue.toFixed(2)} | ` +
          `rows: ${totals.rows}`
      )
      .join("\n") || "No sales rows found for this report range.";

  const salesRowsText =
    salesPeriodRows
      .map(
        (row) =>
          `ID: ${row.id} | ` +
          `Date UTC: ${row.date} | ` +
          `Product: ${row.product_name} | ` +
          `Quantity: ${row.quantity_sold} | ` +
          `Revenue: ${row.total_revenue} | ` +
          `Payment: ${row.payment_method}`
      )
      .join("\n") || "No individual sales rows available.";

// Calculate theoretical milk usage from exact sales mappings and recipes.
const recipeMapForMilkAudit = (
  analyticsData.all_recipes || {}
) as Record<string, Record<string, number>>;

let deterministicTheoreticalMilkMl = 0;
const deterministicMilkRecipeLines: string[] = [];

for (const [productName, totals] of salesTotalsByRecipeName.entries()) {
  const recipeName = Object.keys(recipeMapForMilkAudit).find(
    (name) =>
      name.trim().toLowerCase() === productName.trim().toLowerCase()
  );

  if (!recipeName) {
    deterministicMilkRecipeLines.push(
      `${productName}: no exact recipe found; excluded from calculation.`
    );
    continue;
  }

  const recipe = recipeMapForMilkAudit[recipeName];

  const milkIngredient = Object.entries(recipe).find(
    ([ingredientName]) =>
      ingredientName.trim().toLowerCase() === "milk"
  );

  if (!milkIngredient) {
    deterministicMilkRecipeLines.push(
      `${recipeName}: no exact Milk ingredient in recipe; excluded from milk total.`
    );
    continue;
  }

  const milkPerServingMl = Number(milkIngredient[1]);

  if (!Number.isFinite(milkPerServingMl) || milkPerServingMl < 0) {
    deterministicMilkRecipeLines.push(
      `${recipeName}: invalid milk quantity; excluded from calculation.`
    );
    continue;
  }

  const productMilkMl = totals.units * milkPerServingMl;

  deterministicTheoreticalMilkMl += productMilkMl;

  deterministicMilkRecipeLines.push(
    `${recipeName}: ${totals.units} × ${milkPerServingMl} ml = ${productMilkMl} ml`
  );
}

const deterministicMilkRecipeContext = [
  ...deterministicMilkRecipeLines,
  `CODE-CALCULATED THEORETICAL MILK TOTAL: ${deterministicTheoreticalMilkMl} ml`,
  "Use this code-calculated total as authoritative. Do not substitute another number."
].join("\n");

// Calculate inventory-recorded milk usage from database records.
let exactMilkIngredients: any[] = [];
if (needsDetailedInventoryContext) {
  const { data, error } = await supabaseAdmin
    .from("ingredients")
    .select("id, name, unit")
    .eq("client_id", clientId)
    .ilike("name", "Milk");

  if (error) {
    console.error("Failed to load Milk ingredient:", error.message);
  } else {
    exactMilkIngredients = data ?? [];
  }
}

let milkInventoryRows: any[] = [];

const milkIngredientIds = (exactMilkIngredients || []).map(
  (ingredient) => ingredient.id
);

if (milkIngredientIds.length === 1) {
  const { data: rows, error: milkLogsError } = await supabaseAdmin
    .from("inventory_logs")
    .select("id, ingredient_id, type, date, quantity, notes, is_test")
    .eq("client_id", clientId)
    .eq("is_test", false)
    .in("ingredient_id", milkIngredientIds)
    .gte("date", activeStart)
    .lte("date", activeEnd)
    .order("date", { ascending: true });

  if (milkLogsError) {
    console.error(
      "Failed to load Milk inventory logs:",
      milkLogsError.message
    );
  } else {
    milkInventoryRows = rows || [];
  }
}

const milkUnit = String(
  exactMilkIngredients?.[0]?.unit || ""
).trim().toLowerCase();

const isMlUnit = ["ml", "мл", "milliliter", "milliliters"].includes(
  milkUnit
);

let deterministicRecordedMilkUsageMl: number | null = null;
const deterministicMilkInventoryLines: string[] = [];

if (milkIngredientIds.length !== 1) {
  deterministicMilkInventoryLines.push(
    "Cannot calculate: expected exactly one ingredient named Milk."
  );
} else if (!isMlUnit) {
  deterministicMilkInventoryLines.push(
    `Cannot calculate in ml: Milk ingredient unit is "${milkUnit}".`
  );
} else {
  const countRows = milkInventoryRows
    .filter((row) => ["count", "inventory_count"].includes(String(row.type || "").trim().toLowerCase()))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const selectedStartDay = String(activeStart || "").slice(0, 10);
  const selectedEndDay = String(activeEnd || "").slice(0, 10);
  const openingCount = countRows.find(
    (row) => String(row.date || "").slice(0, 10) === selectedStartDay
  );
  const closingCount = countRows
    .filter((row) => String(row.date || "").slice(0, 10) === selectedEndDay)
    .at(-1);
  const countInterval = openingCount && closingCount &&
    Date.parse(closingCount.date) > Date.parse(openingCount.date)
    ? countRows.filter((row) =>
        Date.parse(row.date) >= Date.parse(openingCount.date) &&
        Date.parse(row.date) <= Date.parse(closingCount.date)
      )
    : [];

  if (countInterval.length < 2) {
    deterministicMilkInventoryLines.push(
      "Cannot calculate a full-period milk usage: a valid opening count on the selected start date and a later closing count on the selected end date are required."
    );
  } else {
    let totalRecordedUsageMl = 0;
    let calculationValid = true;

    for (let i = 0; i < countInterval.length - 1; i++) {
      const startCount = countInterval[i];
      const endCount = countInterval[i + 1];

      const startTime = Date.parse(startCount.date);
      const endTime = Date.parse(endCount.date);

      const intervalRows = milkInventoryRows.filter((row) => {
        const rowTime = Date.parse(row.date);
        const type = String(row.type || "").trim().toLowerCase();

        return (
          !["count", "inventory_count", "sale"].includes(type) &&
          rowTime > startTime &&
          rowTime < endTime
        );
      });

      const startQty = Number(startCount.quantity);
      const endQty = Number(endCount.quantity);
      const purchaseTotal = intervalRows
        .filter((row) => String(row.type || "").trim().toLowerCase() === "purchase")
        .reduce((sum, row) => sum + Math.abs(Number(row.quantity)), 0);
      const recordedOutflowTotal = intervalRows
        .filter((row) => String(row.type || "").trim().toLowerCase() !== "purchase")
        .reduce((sum, row) => sum + Math.abs(Number(row.quantity)), 0);

      // Counts establish the stock balance. Purchases increase it; recorded
      // non-sales outflows decrease it. Sales are not counted as a separate
      // movement here because the count difference already captures usage.
      const segmentUsageMl = startQty + purchaseTotal - recordedOutflowTotal - endQty;

      if (
        !Number.isFinite(startQty) ||
        !Number.isFinite(endQty) ||
        !Number.isFinite(purchaseTotal) ||
        !Number.isFinite(recordedOutflowTotal) ||
        !Number.isFinite(segmentUsageMl)
      ) {
        calculationValid = false;
        break;
      }

      totalRecordedUsageMl += segmentUsageMl;

      deterministicMilkInventoryLines.push(
        `${startQty} ml + purchases ${purchaseTotal} ml - recorded non-sales outflows ${recordedOutflowTotal} ml - ${endQty} ml = ${segmentUsageMl} ml`
      );
    }

    if (calculationValid) {
      deterministicRecordedMilkUsageMl = totalRecordedUsageMl;

      deterministicMilkInventoryLines.push(
        `CODE-CALCULATED INVENTORY-RECORDED MILK USAGE: ${totalRecordedUsageMl} ml`
      );
    } else {
      deterministicMilkInventoryLines.push(
        "Cannot calculate: one or more inventory quantities are invalid."
      );
    }
  }
}

const deterministicMilkInventoryContext =
  deterministicMilkInventoryLines.join("\n");

const deterministicMilkDifferenceMl =
  deterministicRecordedMilkUsageMl === null
    ? null
    : deterministicTheoreticalMilkMl -
      deterministicRecordedMilkUsageMl;

const deterministicMilkDifferenceContext =
  deterministicMilkDifferenceMl === null
    ? "FINAL DIFFERENCE: unavailable because inventory usage could not be calculated."
    : `CODE-CALCULATED DIFFERENCE (theoretical - inventory-recorded): ${deterministicTheoreticalMilkMl} - ${deterministicRecordedMilkUsageMl} = ${deterministicMilkDifferenceMl} ml`;


// Generalize theoretical usage calculations to all exact recipe ingredients.
const allRecipesForAudit = (
  analyticsData.all_recipes || {}
) as Record<string, Record<string, number>>;

let auditIngredients: any[] = [];
if (needsDetailedInventoryContext) {
  const { data, error } = await supabaseAdmin
    .from("ingredients")
    .select("id, name, unit")
    .eq("client_id", clientId);

  if (error) {
    console.error("Failed to load ingredient units for audit:", error.message);
  } else {
    auditIngredients = data ?? [];
  }
}

const auditIngredientUnitMap = new Map<string, string>();

for (const ingredient of auditIngredients || []) {
  const key = String(ingredient.name || "").trim().toLowerCase();
  const unit = String(ingredient.unit || "").trim();

  if (key && unit) {
    auditIngredientUnitMap.set(key, unit);
  }
}

const theoreticalUsageByIngredient = new Map<
  string,
  {
    name: string;
    unit: string;
    total: number;
    details: string[];
  }
>();

for (const [soldProductName, totals] of salesTotalsByRecipeName.entries()) {
  // Only match an exact recipe name after applying the saved explicit mapping.
  const recipeName = Object.keys(allRecipesForAudit).find(
    (name) =>
      name.trim().toLowerCase() === soldProductName.trim().toLowerCase()
  );

  if (!recipeName) continue;

  const recipe = allRecipesForAudit[recipeName];

  for (const [ingredientName, amountRaw] of Object.entries(recipe)) {
    const ingredientKey = ingredientName.trim().toLowerCase();
    const amountPerServing = Number(amountRaw);
    const soldQuantity = Number(totals.units);

    if (
      !ingredientKey ||
      !Number.isFinite(amountPerServing) ||
      amountPerServing < 0 ||
      !Number.isFinite(soldQuantity) ||
      soldQuantity < 0
    ) {
      continue;
    }

    const totalQuantity = soldQuantity * amountPerServing;
    const unit = auditIngredientUnitMap.get(ingredientKey) || "unit unknown";

    const current = theoreticalUsageByIngredient.get(ingredientKey) || {
      name: ingredientName.trim(),
      unit,
      total: 0,
      details: [],
    };

    current.total += totalQuantity;
    current.details.push(
      `${recipeName}: ${soldQuantity} × ${amountPerServing} ${unit} = ${totalQuantity} ${unit}`
    );

    theoreticalUsageByIngredient.set(ingredientKey, current);
  }
}

const theoreticalUsageByIngredientContext =
  theoreticalUsageByIngredient.size === 0
    ? "No theoretical ingredient usage could be calculated from exact recipe matches."
    : Array.from(theoreticalUsageByIngredient.values())
        .map(
          (item) =>
            `${item.name} | ${item.details.join("; ")} | ` +
            `CODE-CALCULATED THEORETICAL TOTAL: ${item.total} ${item.unit}`
        )
        .join("\n");


// Calculate inventory-recorded usage for every ingredient.
// Keep the existing milk-specific calculation unchanged.

const auditIngredientIds = (auditIngredients || [])
  .map((ingredient: any) => ingredient.id)
  .filter((id: any) => typeof id === "string" && id.length > 0);

let allIngredientInventoryRows: any[] = [];
let allIngredientInventoryError = "";

if (needsDetailedInventoryContext && auditIngredientIds.length > 0 && activeStart && activeEnd) {
  const { data, error } = await supabaseAdmin
    .from("inventory_logs")
    .select("id, ingredient_id, type, date, quantity, notes, is_test")
    .eq("client_id", clientId)
    .eq("is_test", false)
    .in("ingredient_id", auditIngredientIds)
    .gte("date", activeStart)
    .lte("date", activeEnd)
    .order("date", { ascending: true })
    .limit(5000);

  if (error) {
    console.error("All-ingredient inventory audit error:", error.message);
    allIngredientInventoryError = error.message;
  } else {
    allIngredientInventoryRows = data || [];
  }
}

const isAuditCountType = (type: unknown) =>
  ["count", "inventory_count"].includes(
    String(type || "").trim().toLowerCase()
  );

const allIngredientInventoryLines: string[] = [];

if (allIngredientInventoryError) {
  allIngredientInventoryLines.push(
    "Inventory usage unavailable because the inventory records could not be loaded."
  );
} else if (!activeStart || !activeEnd) {
  allIngredientInventoryLines.push(
    "Inventory usage unavailable because the report date range is missing."
  );
} else {
  for (const ingredient of auditIngredients || []) {
    const ingredientName = String(ingredient.name || "").trim();
    const ingredientKey = ingredientName.toLowerCase();
    const unit = String(ingredient.unit || "").trim();

    if (!ingredientName || !ingredient.id) continue;

    const rows = allIngredientInventoryRows.filter(
      (row) => row.ingredient_id === ingredient.id
    );

    const countRows = rows
      .filter((row) => isAuditCountType(row.type))
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

    const theoretical = theoreticalUsageByIngredient.get(ingredientKey);
    const openingCount = countRows.find(
      (row) => String(row.date || "").slice(0, 10) === String(activeStart).slice(0, 10)
    );
    const closingCount = countRows
      .filter((row) => String(row.date || "").slice(0, 10) === String(activeEnd).slice(0, 10))
      .at(-1);
    const countInterval = openingCount && closingCount &&
      Date.parse(closingCount.date) > Date.parse(openingCount.date)
      ? countRows.filter((row) =>
          Date.parse(row.date) >= Date.parse(openingCount.date) &&
          Date.parse(row.date) <= Date.parse(closingCount.date)
        )
      : [];

    if (countInterval.length < 2) {
      allIngredientInventoryLines.push(
        `${ingredientName} (${unit || "unit unknown"}): ` +
        "inventory-recorded usage unavailable; the selected period needs an opening count on its start date and a later closing count on its end date." +
        (theoretical
          ? ` Code-calculated theoretical usage: ${theoretical.total} ${theoretical.unit}.`
          : " No code-calculated theoretical usage is available.")
      );
      continue;
    }

    let recordedUsage = 0;
    let calculationValid = true;
    const segments: string[] = [];

    for (let i = 0; i < countInterval.length - 1; i++) {
      const startCount = countInterval[i];
      const endCount = countInterval[i + 1];

      const startTime = Date.parse(startCount.date);
      const endTime = Date.parse(endCount.date);
      const startQty = Number(startCount.quantity);
      const endQty = Number(endCount.quantity);

      if (
        !Number.isFinite(startTime) ||
        !Number.isFinite(endTime) ||
        !Number.isFinite(startQty) ||
        !Number.isFinite(endQty) ||
        endTime <= startTime
      ) {
        calculationValid = false;
        break;
      }

      const intervalRows = rows.filter((row) => {
        const type = String(row.type || "").trim().toLowerCase();
        if (["count", "inventory_count", "sale"].includes(type)) return false;

        const time = Date.parse(row.date);
        return time > startTime && time < endTime;
      });

      const purchaseTotal = intervalRows
        .filter((row) => String(row.type || "").trim().toLowerCase() === "purchase")
        .reduce((sum, row) => sum + Math.abs(Number(row.quantity)), 0);
      const recordedOutflowTotal = intervalRows
        .filter((row) => String(row.type || "").trim().toLowerCase() !== "purchase")
        .reduce((sum, row) => sum + Math.abs(Number(row.quantity)), 0);

      if (!Number.isFinite(purchaseTotal) || !Number.isFinite(recordedOutflowTotal)) {
        calculationValid = false;
        break;
      }

      const segmentUsage = startQty + purchaseTotal - recordedOutflowTotal - endQty;
      recordedUsage += segmentUsage;

      segments.push(
        `${startQty} + purchases(${purchaseTotal}) - recorded non-sales outflows(${recordedOutflowTotal}) - ${endQty} = ${segmentUsage} ${unit}`
      );
    }

    if (!calculationValid) {
      allIngredientInventoryLines.push(
        `${ingredientName}: inventory calculation unavailable because a date or quantity is invalid.`
      );
      continue;
    }

    const theoreticalUnitMatches =
      theoretical &&
      unit &&
      theoretical.unit !== "unit unknown" &&
      theoretical.unit.toLowerCase() === unit.toLowerCase();

    const differenceText = theoreticalUnitMatches
      ? ` | CODE-CALCULATED DIFFERENCE: ${theoretical.total} - ${recordedUsage} = ${theoretical.total - recordedUsage} ${unit}`
      : theoretical
        ? " | Difference unavailable because the units could not be verified."
        : " | Theoretical usage unavailable; no difference calculated.";

    allIngredientInventoryLines.push(
      `${ingredientName} (${unit || "unit unknown"}) | ` +
      `Count intervals: ${segments.join("; ")} | ` +
      `CODE-CALCULATED INVENTORY-RECORDED USAGE: ${recordedUsage} ${unit}` +
      differenceText
    );
  }
}

const allIngredientInventoryAuditContext =
  allIngredientInventoryLines.length > 0
    ? allIngredientInventoryLines.join("\n")
    : "No ingredient inventory calculations are available.";

  const salesPeriodContext = [
    `Report range: ${activeStart} through ${activeEnd}`,
    "Totals calculated from sales_logs using exact product names:",
    salesTotalsText,
    "Individual sales_logs source rows:",
    salesRowsText,
    `Mapped totals for recipe comparison (explicit learned_menus mappings only):\n${salesTotalsByRecipeNameText || "None"}`,
    "Code-calculated theoretical milk usage:",
    deterministicMilkRecipeContext,
    "Code-calculated inventory-recorded milk usage:",
    deterministicMilkInventoryContext,
    deterministicMilkDifferenceContext,
    "SOURCE-ID RULE: Inventory log IDs identify inventory records only. " +
      "Never attach inventory log IDs to product sales or recipe calculations. " +
      "Never invent, combine, or substitute record IDs. " +
      "If the exact sales or recipe record ID is not supplied, omit it.",
      "Code-calculated theoretical usage for all exact recipe ingredients:",
        theoreticalUsageByIngredientContext,
        "Code-calculated inventory usage and differences for all ingredients:",
      allIngredientInventoryAuditContext,
  ].join("\n\n");
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
              "Уучлаарай, санхүүгийн тайланг зөвхөн Эзний эрхээр харах боломжтой.",
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
            `${i.name} | stock:${i.live_stock}${i.unit} | par:${i.par_level} | price:${i.price}₮ | actual usage:${i.actual_usage ?? "unavailable"} | count interval available:${i.inventory_reconciliation_available === true ? "yes" : "no"} | gap:${i.gap} | loss:${i.impact}₮ | class:${i.abc_class} | order:${i.suggested_order}`,
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
      const marginGuardText =
        (analyticsData.margin_guard_alerts || []).length > 0
          ? (analyticsData.margin_guard_alerts || [])
              .map(
                (a: any) =>
                  `• ${a.product_name}: CurrentPrice ${a.selling_price}₮ -> SUGGESTED: ${a.suggested_price}₮ (+${a.price_gap}₮) | Cost: ${a.cost_price}₮, Margin: ${a.current_margin_pct} (Target: ${a.target_margin_pct})`,
              )
              .join("\n")
          : "None (All products have healthy margins >= 75%)";

      // 6. Cross-Shift Fraud & Worker Incidents Matrix
      const fraudMatrixText =
        Object.keys(analyticsData.worker_fraud_matrix || {}).length > 0
          ? Object.entries(analyticsData.worker_fraud_matrix || {})
              .map(([worker, data]: any) => {
                const incidents = (data.incidents || [])
                  .map(
                    (inc: any) =>
                      `[${inc.date}] reported by ${inc.reporter}: "${inc.notes}" (-${inc.loss_amount}₮)`,
                  )
                  .join("; ");
                return `• Worker: ${worker} | Incidents: ${data.totalIncidents} | TotalLoss: ${data.totalLossAmount}₮ | Details: ${incidents}`;
              })
              .join("\n")
          : "No cross-shift damage or incident reports recorded.";

      // 7. Cashflow In & Out Breakdown
      const cf = analyticsData.cashflow_summary || {};
      const cashflowDetail = `
InitialBalances: Cash:${cf.initial_cash ?? "Unavailable"}, Bank:${cf.initial_bank ?? "Unavailable"}
Cash Inflow: CashSales:${cf.cash_in_cash ?? "Unavailable"}₮, BankSales:${cf.cash_in_bank ?? "Unavailable"}₮, Unclassified:${cf.cash_in_unclassified ?? "Unavailable"}₮ (TotalIn: ${cf.cash_in_total ?? "Unavailable"}₮)
Cash Outflow Purchases: CashPaid:${cf.cash_out_purchases_cash ?? "Unavailable"}₮, BankPaid:${cf.cash_out_purchases_bank ?? "Unavailable"}₮, Unclassified:${cf.cash_out_purchases_unclassified ?? "Unavailable"}₮
Cash Outflow OPEX: CashPaid:${cf.cash_out_opex_cash ?? "Unavailable"}, BankPaid:${cf.cash_out_opex_bank ?? "Unavailable"} (${cf.cash_out_opex_allocation_status || "payment channel unavailable"})
Fixed Assets Payment Channel: ${cf.fixed_assets_paid ?? "Unavailable"}
Owner Withdrawals (Draws): ${cf.owner_draws || 0}₮
Recorded but unclassified sales: ${cf.cash_in_unclassified ?? "Unavailable"}₮
Purchase payments with unknown method: ${cf.cash_out_purchases_unclassified ?? "Unavailable"}₮
OPEX cash/bank split: ${cf.cash_out_opex_allocation_status || "Unavailable"}
Final balances: CashInHand:${cf.end_cash_balance ?? "Unavailable"}, BankAccount:${cf.end_bank_balance ?? "Unavailable"}, NetTotal:${cf.net_total_balance ?? "Unavailable"}
Balance status: ${cf.account_balance_status || "Unavailable"}`;

      // 8. Purchases & E-Barimt Ratio
      const pur = analyticsData.purchases_summary || {};
      const purchasesText = `TotalPurchases: ${pur.total_purchases || 0}₮ | WithEBarimt: ${pur.with_ebarimt || 0}₮ | WithoutEBarimt: ${pur.without_ebarimt || 0}₮ | NewEquipmentBought: ${pur.fixed_assets_invested || 0}₮`;

      // 9. Fixed Assets & Depreciation (Equipment)
      const faText =
        (analyticsData.fixed_assets || []).length > 0
          ? (analyticsData.fixed_assets || [])
              .map(
                (f: any) =>
                  `• ${f.name} (${f.code}): InitialCost ${f.initialCost}₮ | UsefulMonths: ${f.usefulMonths} | MonthlyDep: ${f.monthlyDep}₮ | CurrentBookValue: ${f.bookValue}₮`,
              )
              .join("\n")
          : "No fixed assets recorded.";

      // 10. Official Waste Act (Tax Law 14 Write-offs)
      const wasteActText =
        (analyticsData.waste_act_items || []).length > 0
          ? (analyticsData.waste_act_items || [])
              .slice(0, 10)
              .map(
                (w: any) =>
                  `• ${w.name}: TheoUsage ${w.theo_usage}${w.unit}, ActualUsage ${w.actual_usage}${w.unit}, Gap ${w.gap_qty}${w.unit} | Loss: ${w.loss_amount}₮ | Legal Cause: ${w.cause}`,
              )
              .join("\n")
          : "None";

      // 11. ABC Pareto Cycle Count Status
      const abc = analyticsData.abc_summary || {};
      const abcText = `TotalItems: ${abc.total_items || 0} | A-Class:${abc.a_count || 0}, B-Class:${abc.b_count || 0}, C-Class:${abc.c_count || 0} | CountedIn30Days:${abc.counted_in_cycle || 0}, Uncounted:${abc.uncounted_in_cycle || 0}, RecommendedCountPerShift:${abc.suggested_cycle_per_shift || 0}`;

      // 12. Recent Shifts & SOP Compliance
      const shiftsText = (analyticsData.recent_shifts || [])
        .slice(0, 5)
        .map((s: any) => {
          const tasks = s.tasks_done || [];
          const doneCount = tasks.filter((t: any) => t.done).length;
          return `• ${s.worker} | Started: ${s.start_time} | Ended: ${s.end_time} | SOP Tasks: ${doneCount}/${tasks.length} done | Z-Report: ${s.pos_z_image_url ? "Uploaded" : "Missing"}`;
        })
        .join("\n");

      // 13. Recent Activity Logs (Last 10 actions)
      const recentLogsText = (analyticsData.recent_worker_logs || [])
        .slice(0, 10)
        .map(
          (l: any) =>
            `[${l.date} ${l.time}] ${l.worker} logged ${l.type} on ${l.item}: ${l.qty}${l.unit} (Notes: ${l.notes || "None"})`,
        )
        .join("\n");

      // Phase 1: keep explicit memory commands, but do not call Gemini
      // a second time to extract memories from ordinary owner questions.
      // Fetch a bounded candidate set, then send only topic-relevant facts.
      const { data: savedMemories, error: memoryError } = await supabaseAdmin
        .from("business_memory")
        .select("topic, fact, updated_at")
        .eq("client_id", clientId)
        .order("updated_at", { ascending: false })
        .limit(100);

      if (memoryError) {
        console.error("Could not load business memories:", memoryError.message);
      }

      const tokenizeMemoryText = (value: string): string[] =>
        value.toLocaleLowerCase().normalize("NFKC")
          .match(/[\p{L}\p{N}]{3,}/gu) ?? [];

      const questionTokens = new Set(tokenizeMemoryText(text));
      const topicHints: Record<string, string[]> = {
        supplier: ["supplier", "vendor", "delivery", "deliver", "milk", "нийлүүлэгч", "хүргэлт", "сүү"],
        inventory: ["inventory", "stock", "count", "usage", "waste", "beans", "агуулах", "үлдэгдэл", "тооллого", "хэрэглээ", "хаягдал"],
        sales: ["sale", "sales", "sold", "revenue", "борлуулалт", "орлого"],
        customer: ["customer", "client", "үйлчлүүлэгч", "хэрэглэгч"],
        staff: ["staff", "worker", "employee", "ажилтан", "цалин"],
        finance: ["finance", "cash", "profit", "margin", "cost", "tax", "санхүү", "ашиг", "зардал", "татвар"],
        recipe: ["recipe", "ingredient", "орц", "жор"],
        policy: ["policy", "rule", "бодлого", "дүрэм"],
        preference: ["prefer", "preference", "дуртай", "илүүд үз"],
        lesson: ["lesson", "experience", "prediction", "outcome", "сургамж", "туршлага", "үр дүн"],
        operations: ["operations", "procedure", "workflow", "үйл ажиллагаа", "ажиллагаа"],
      };
      const requestedTopics = new Set(
        Object.entries(topicHints)
          .filter(([, hints]) => hints.some((hint) => questionLower.includes(hint)))
          .map(([topic]) => topic)
      );

      const relevantMemories = (savedMemories ?? [])
        .map((memory) => {
          const factTokens = tokenizeMemoryText(`${memory.topic} ${memory.fact}`);
          const overlap = factTokens.reduce(
            (score, token) => score + (questionTokens.has(token) ? 1 : 0),
            0
          );
          const topicBoost = requestedTopics.has(String(memory.topic).toLowerCase()) ? 5 : 0;
          return { memory, score: overlap + topicBoost };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) =>
          b.score - a.score ||
          new Date(b.memory.updated_at ?? 0).getTime() -
            new Date(a.memory.updated_at ?? 0).getTime()
        )
        .slice(0, 10)
        .map((entry) => entry.memory);

      const businessMemoryContext = relevantMemories
        .map((m) => `[topic=${m.topic}; recorded_at_utc=${m.updated_at ?? "unknown"}] ${m.fact}`)
        .join("\n");

      // Only load recent conversation context for likely follow-up questions.
      // This reuses the existing chat table and makes no model/API call.
      let recentChatContext = "Not loaded; this does not appear to be a follow-up question.";
      if (shouldLoadRecentChatContext) {
        const { data: recentChat, error: recentChatError } = await supabaseAdmin
          .from("ai_chat_messages")
          .select("role, content, created_at")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(6);

        if (recentChatError) {
          console.error("Recent owner chat context error:", recentChatError.message);
          recentChatContext = "Recent conversation context is unavailable.";
        } else {
          recentChatContext = (recentChat ?? [])
            .reverse()
            .map((item) => `[${item.role}; ${item.created_at}] ${String(item.content || "").slice(0, 1200)}`)
            .join("\n") || "No previous owner chat messages are available.";
        }
      }

// Load recent business experiences for the owner AI.
let businessExperienceContext =
  "No recorded business experiences yet.";

let businessExperienceSummary =
  "No resolved non-test business experiences are available yet.";  

if (shouldLoadExperienceHistory) {
  const { data: savedExperiences, error: experienceError } =
    await supabaseAdmin
      .from("business_experiences")
  .select(
  "id, situation, prediction, prediction_assessment, action_taken, outcome, lesson, confidence, status, evidence_status, evidence_reviewed_at, evidence_review_note, created_at"
)
          .eq("client_id", clientId)
        .eq("is_test", false)
        .eq("status", "resolved")
        .eq("evidence_status", "owner_reviewed")
        .order("created_at", { ascending: false })
        .limit(50);

  if (experienceError) {
    console.error(
      "Business experience read error:",
      experienceError.message
    );
  } else {
const tokenizeExperienceText = (value: string): string[] =>
  value.toLocaleLowerCase()
    .normalize("NFKC")
    .match(/[\p{L}\p{N}]{3,}/gu) ?? [];

const queryTokens = new Set(tokenizeExperienceText(text));

const relevantExperiences = [...(savedExperiences ?? [])]
  .map((experience) => {
    const searchableText = [
      experience.situation,
      experience.prediction,
      experience.action_taken,
      experience.outcome,
      experience.lesson,
    ]
      .filter(Boolean)
      .join(" ");

    const experienceTokens = tokenizeExperienceText(searchableText);

    const score = experienceTokens.reduce(
      (total, token) => total + (queryTokens.has(token) ? 1 : 0),
      0
    );

    // An explicitly requested experience ID takes priority
    // even when the user's question uses a different language.
    const explicitlyRequested = text
      .toLowerCase()
      .includes(experience.id.toLowerCase());

    return { experience, score, explicitlyRequested };
  })
  .filter(
    (entry) => entry.score > 0 || entry.explicitlyRequested
  )
  .sort(
    (a, b) =>
      Number(b.explicitlyRequested) - Number(a.explicitlyRequested) ||
      b.score - a.score ||
      new Date(b.experience.created_at).getTime() -
        new Date(a.experience.created_at).getTime()
  )
  .slice(0, 10)
  .map((entry) => entry.experience);

  const experienceIds = relevantExperiences.map((experience) => experience.id)

  const evidenceByExperience: Record<string, string[]> = {};

  if (experienceIds.length > 0) {
    const {
      data: evidenceLinks,
      error: evidenceLinkError,
    } = await supabaseAdmin
      .from("business_experience_evidence")
      .select("experience_id, evidence_type, note, inventory_log_id")
      .eq("client_id", clientId)
      .in("experience_id", experienceIds)
      .limit(50);

    if (evidenceLinkError) {
      console.error(
        "Experience evidence link read error:",
        evidenceLinkError.message
      );
    } else {
      const logIds = [
        ...new Set(
          (evidenceLinks ?? []).map((link) => link.inventory_log_id)
        ),
      ];

      if (logIds.length > 0) {
        const {
          data: inventoryEvidence,
          error: inventoryEvidenceError,
        } = await supabaseAdmin
          .from("inventory_logs")
          .select(
            "id, type, ingredient_id, date, quantity, notes, worker_name, is_test"
          )
          .eq("client_id", clientId)
          .eq("is_test", false)
          .in("id", logIds)
          .limit(50);

        if (inventoryEvidenceError) {
          console.error(
            "Inventory evidence read error:",
            inventoryEvidenceError.message
          );
        } else {
          const ingredientIds = [
            ...new Set(
              (inventoryEvidence ?? [])
                .map((log) => log.ingredient_id)
                .filter((id): id is string => Boolean(id))
            ),
          ];

          const ingredientNames: Record<string, string> = {};

          if (ingredientIds.length > 0) {
            const {
              data: ingredientRows,
              error: ingredientError,
            } = await supabaseAdmin
              .from("ingredients")
              .select("id, name, unit")
              .eq("client_id", clientId)
              .in("id", ingredientIds);

            if (ingredientError) {
              console.error(
                "Evidence ingredient lookup error:",
                ingredientError.message
              );
            } else {
              for (const ingredient of ingredientRows ?? []) {
                ingredientNames[ingredient.id] =
                  `${ingredient.name} (${ingredient.unit})`;
              }
            }
          }

          const logsById = new Map<string, any>();

          for (const log of inventoryEvidence ?? []) {
            logsById.set(log.id, log);
          }

          for (const link of evidenceLinks ?? []) {
            const log = logsById.get(link.inventory_log_id);
            if (!log) continue;

            const ingredient = log.ingredient_id
              ? ingredientNames[log.ingredient_id] ??
                log.ingredient_id
              : "Non-ingredient record";

                   const detail =
                `Inventory log ID: ${log.id}\n` +
                `Evidence type: ${link.evidence_type}\n` +
                `Ingredient: ${ingredient}\n` +
                `Inventory log type: ${log.type}\n` +
                `Recorded quantity: ${log.quantity}\n` +
                `Record date UTC: ${log.date}\n` +
                `Worker: ${log.worker_name ?? "unknown"}\n` +
                `Log notes: ${log.notes ?? "none"}\n` +
                `Link note: ${link.note ?? "none"}`;

            if (!evidenceByExperience[link.experience_id]) {
              evidenceByExperience[link.experience_id] = [];
            }

            evidenceByExperience[link.experience_id].push(detail);
          }
        }
      }
    }
  }

  businessExperienceContext = relevantExperiences
    .map((experience) => {
      const linkedEvidence =
        evidenceByExperience[experience.id]?.join("\n\n") ??
        "No linked inventory evidence records.";

      return `
[experience_id=${experience.id};      
[status=${experience.status};
 evidence_status=${experience.evidence_status}; 
 recorded_at_utc=${experience.created_at}; 
 confidence=${experience.confidence ?? "unknown"}]

Situation: ${experience.situation}
Prediction: ${experience.prediction ?? "Not recorded"}
Prediction assessment: ${experience.prediction_assessment ?? "unassessed"}
Action taken: ${experience.action_taken ?? "Not recorded"}
Outcome: ${experience.outcome ?? "Not recorded"}
Lesson: ${experience.lesson ?? "Not recorded"}
Evidence status: ${experience.evidence_status}
Owner review recorded at UTC: ${experience.evidence_reviewed_at ?? "No review recorded"}
Owner review note: ${experience.evidence_review_note ?? "No review note"}

Linked evidence records:
${linkedEvidence}
`;
    })
    .join("\n\n") || "No relevant recorded business experiences matched this question.";
    // Summarize only resolved, non-test business experiences.
const {
  data: resolvedExperienceRows,
  error: resolvedSummaryError,
} = await supabaseAdmin
  .from("business_experiences")
  .select(
    "id, situation, prediction, prediction_assessment, outcome, lesson, evidence_status, created_at"
  )
  .eq("client_id", clientId)
  .eq("is_test", false)
  .eq("status", "resolved")
  .eq("evidence_status", "owner_reviewed")
  .order("created_at", { ascending: false })
  .limit(50);

if (resolvedSummaryError) {
  console.error(
    "Resolved experience summary read error:",
    resolvedSummaryError.message
  );
} else {
  const experiences = resolvedExperienceRows ?? [];

  const countAssessment = (assessment: string) =>
    experiences.filter(
      (experience) =>
        (experience.prediction_assessment ?? "unassessed") === assessment
    ).length;

  const assessmentCounts = [
    `prediction_matched=${countAssessment("prediction_matched")}`,
    `partially_matched=${countAssessment("partially_matched")}`,
    `prediction_not_matched=${countAssessment("prediction_not_matched")}`,
    `inconclusive=${countAssessment("inconclusive")}`,
    `unassessed=${countAssessment("unassessed")}`,
  ].join(", ");



  const recentExamples = experiences
    .slice(0, 5)
    .map(
      (experience, index) =>
        `${index + 1}. Experience ID: ${experience.id}\n` +
        `Situation: ${experience.situation}\n` +
        `Prediction: ${experience.prediction ?? "Not recorded"}\n` +
        `Assessment: ${experience.prediction_assessment ?? "unassessed"}\n` +
        `Reported outcome: ${experience.outcome ?? "Not recorded"}\n` +
        `Recorded lesson: ${experience.lesson ?? "Not recorded"}\n` +
        `Evidence status: ${experience.evidence_status}\n` +
        `Created at UTC: ${experience.created_at}`
    )
    .join("\n\n");

  businessExperienceSummary = [
    `Resolved non-test experiences found: ${experiences.length} (maximum 50 most recent).`,
    `Prediction assessment counts: ${assessmentCounts}.`,
    recentExamples
      ? `Recent examples, newest first:\n${recentExamples}`
      : "No resolved non-test experiences are available yet.",
  ].join("\n\n");
}

}
}
      // =========================================================================
      // 🚀 100% ASSEMBLED PROMPT PAYLOAD (ALL ANALYTICS COVERED)
      // =========================================================================
      const fullAuditPromptPayload = `
=== BUSINESS: ${clientId} ===

PERSISTENT BUSINESS MEMORY:
${businessMemoryContext || "No saved business memories yet."}

RECENT OWNER CHAT CONTEXT (loaded only for likely follow-up questions):
${recentChatContext}

MEMORY RULES:
- Use relevant memories when answering the owner's question.
- Treat memories as historical information, not guaranteed current facts.
- Prefer verified current database data when it conflicts with an old memory.
- Do not invent memories or assume unrelated memories apply.
- When two memories conflict about the same fact, compare their recorded_at_utc timestamps. Treat the newer entry as the latest reported information, not automatically as verified truth.
- Preserve older memories as historical context. Do not claim an older fact is still current when newer information contradicts it.
- If conflicting memories cannot be resolved using reliable current business data, explain the conflict and ask the owner to confirm when necessary.

${isOwner ? `
PERSISTENT BUSINESS EXPERIENCES:
${businessExperienceContext}

PERSISTENT BUSINESS EXPERIENCE SUMMARY:
${businessExperienceSummary}

EXPERIENCE RULES:
- Use relevant recorded experiences when evaluating similar situations.
- Distinguish predictions from actual outcomes.
- Treat unresolved experiences as unconfirmed, not proven lessons.
- Never invent missing outcomes or claim a prediction succeeded without evidence.
- Treat lessons as evidence from past situations, not universal guarantees.
` : ""}
- One resolved experience proves only what was recorded in that specific instance, not that a strategy always works.
- Treat lessons from a single experience as tentative; increase confidence only when supported by repeated, comparable outcomes.
- Do not call a strategy proven or reliable based on one experience alone.
- When a predicted risk does not occur in one recorded instance, say it did not occur in that instance; do not claim the risk has been disproven generally.
- A resolved experience means an outcome was recorded, not necessarily independently verified. Describe it as a recorded outcome unless supporting business data or explicit owner confirmation verifies it.
- If evidence_status is "reported", describe the outcome as recorded or reported, not independently verified.
- Never treat status="resolved" alone as proof that an outcome was verified.
- Even if evidence_status is "verified", do not claim independent verification unless the relevant supporting business evidence is available in the current context. If it is unavailable, state that the evidence cannot be checked from the information provided.
- status="resolved" means an outcome was entered and the experience record was closed; it does not by itself prove the action was performed or independently verified.
- Use action_taken to describe the recorded action, but do not claim it was actually performed unless the recorded outcome or supporting evidence explicitly establishes that.
- A linked inventory log proves that a record exists in OperLink; it does not independently prove that the physical count was accurate or that the recorded action actually occurred.
- An inventory count supports a claim only when the ingredient and recorded date are relevant to the specific experience being evaluated.
- A purchase log supports the fact that a purchase was recorded; a spoilage log supports a recorded spoilage event. Neither alone proves the physical stock balance at another time.
- Never mark an experience as verified or describe it as independently verified merely because an inventory log is linked. Explain what the record supports and what remains unverified.
- evidence_status="owner_reviewed" means an owner reviewed and documented the evidence; it does not mean independent verification has occurred.
- Never interpret owner_reviewed as verified.
- Only describe an experience as independently verified when a reliable verification process has checked that the supporting evidence actually establishes the specific claim.
- prediction_assessment compares a prediction with an owner-reported outcome; it does not independently verify that outcome.
- Use repeated, relevant experiences to inform future recommendations, but do not count test experiences as real evidence.
- Do not generalize from one outcome or treat repeated reports as independently verified facts.
- prediction_assessment is an AI-generated comparison of a prediction with a reported outcome, not independently verified truth.
- When describing a prediction assessment, distinguish the AI's comparison from the actual business outcome.
- Never use test experiences or test inventory records as evidence for real business recommendations.
- The experience summary includes only resolved records where is_test=false, up to the 50 most recent.
- Prediction assessments compare predictions with reported outcomes; they do not independently verify the outcomes.
- Do not infer that a strategy caused an outcome merely because they appear together in an experience.
- Only describe a recurring pattern when at least two genuinely comparable experiences support it. Otherwise, describe the individual case.
- Never use test experiences or test inventory records as evidence for real business recommendations.
- When using a specific saved experience to support an answer, identify its exact experience ID.
- Never invent or guess experience IDs.
- Distinguish recorded outcomes from verified facts.
- If no eligible experience supports the answer, say so explicitly.  
- When citing linked evidence, include the exact inventory log IDs provided in the context. Never invent IDs.
- If the owner review note identifies data as synthetic, sample, development, or simulated, explicitly state that the figures are synthetic development data, not evidence of actual business operations. Owner-reviewed status does not override this limitation.

FINANCIALS (P&L & TAX):
Revenue: ${fin.revenue}₮ | NetRevenue(No VAT): ${fin.net_revenue}₮ | ActualCOGS: ${fin.actual_cogs}₮ | TheoCOGS: ${fin.theo_cogs}₮ | GrossMargin: ${fin.gross_margin}
TheoreticalMode: ${fin.is_theoretical_mode ? "YES (Waiting for physical inventory count)" : "NO (Reconciled with actual count)"}
LockedDueToMissingRecipes: ${fin.has_unmapped_recipes ? `YES (${fin.unmapped_recipes_count} sold items have NO recipes!)` : "NO (All recipes complete)"}
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

=== DATE-FILTERED SALES LOGS: SOURCE DATA ===
${salesPeriodContext}

SALES DATA RULES:
- Use these sales_logs rows and calculated totals as the primary
  source for sales quantities in the report date range.
- If a saved experience summary conflicts with these records,
  explicitly describe the discrepancy.
- Never replace a database total with a number copied from an
  experience lesson or outcome.
- Preserve exact product names. Do not merge product aliases
  unless a verified product mapping supports doing so.
- Distinguish recorded sales from theoretical recipe consumption.
- Use only figures found in the supplied source data or calculated directly from those figures. Never invent alternative totals or mention unsupported numbers. Show the calculation for every important reconciliation total. If a figure cannot be verified from the provided data, say so explicitly.


User Question: ${text}`;

      const formatMoney = (value: unknown) => {
        if (value === null || value === undefined || value === "") return "Unavailable";
        const amount = Number(value);
        return Number.isFinite(amount) ? `${Math.round(amount).toLocaleString()}₮` : "Unavailable";
      };

      const shortWasteContext = !needsAnalyticsData
        ? "Not loaded because the question does not require financial or inventory analysis."
        : ((analyticsData.wasted_only || analyticsData.top_wasters || [])
        .slice(0, 5)
        .map((item: any) =>
          `${item.name}: gap=${item.gap ?? "unavailable"} ${item.unit || ""}, impact=${formatMoney(item.impact)}`
        )
        .join("\n") || "No recorded waste rows available.");

      const shortMarginContext = !needsAnalyticsData
        ? "Not loaded because the question does not require financial or inventory analysis."
        : ((analyticsData.margin_guard_alerts || [])
        .slice(0, 5)
        .map((item: any) =>
          `${item.product_name}: current price=${formatMoney(item.selling_price)}, cost=${formatMoney(item.cost_price)}, current margin=${item.current_margin_pct}, target=${item.target_margin_pct}, suggested price=${formatMoney(item.suggested_price)}`
        )
        .join("\n") || "No margin alerts returned by the calculation.");

      const isMilkQuestion = /(?:\bmilk\b|\bdairy\b|сүү|сүүний|сүүг)/i.test(text) && hasInventoryIntent;
      const isInventoryQuestion = needsDetailedInventoryContext;
      const isMarginQuestion = /(?:\bmargin\b|\bprofit\b|\bprice\b|\bcost\b|ашиг|маржин|үнэ|өртөг)/i.test(text);
      const isSalesQuestion = /(?:\bsales?\b|\bsold\b|\brevenue\b|\bmenu\b|\bproduct\b|борлуулалт|орлого|бүтээгдэхүүн|цэс)/i.test(text);
      const isCashflowQuestion = /(?:\bcash\b|\bbank\b|\bpayment\b|\bcashflow\b|мөнгөн урсгал|бэлэн мөнгө|банкны гүйлгээ)/i.test(text);
      const menuIntentWords = new Set([
        "the", "and", "for", "our", "what", "how", "does", "is", "are", "was", "were",
        "show", "tell", "compare", "calculate", "margin", "profit", "price", "cost",
        "sales", "sale", "sold", "revenue", "menu", "product", "business", "report", "audit",
      ]);
      const questionWords = new Set(questionLower.match(/[\p{L}\p{N}]{3,}/gu) ?? []);
      const explicitlyMentionedMenuRows = (analyticsData.menu_performance || [])
        .map((item: any) => {
          const name = String(item.name || "").trim().toLowerCase();
          const nameWords = name.match(/[\p{L}\p{N}]{3,}/gu) ?? [];
          const overlap = nameWords.filter((word: string) =>
            questionWords.has(word) && !menuIntentWords.has(word)
          ).length;
          const exactPhrase = name.length >= 2 && questionLower.includes(name);
          return { item, score: (exactPhrase ? 100 : 0) + overlap };
        })
        .filter((entry: any) => entry.score > 0)
        .sort((a: any, b: any) =>
          b.score - a.score || Number(b.item.sold || 0) - Number(a.item.sold || 0)
        )
        .map((entry: any) => entry.item);
      const selectedMenuRows = (explicitlyMentionedMenuRows.length
        ? explicitlyMentionedMenuRows
        : (analyticsData.menu_performance || []).slice(0, 10)
      ).slice(0, 10);

      const selectedInventoryRows = (analyticsData.all_inventory_data || []).filter((item: any) => {
        const itemName = String(item.name || "").toLowerCase();
        if (!itemName) return false;
        if (questionLower.includes(itemName)) return true;
        if (/milk|dairy|сүү|сүүний|сүүг/i.test(text) && /^(milk|сүү)$/i.test(itemName)) return true;
        if (/beans|coffee beans|кофены үр|кофе үр/i.test(text) && /beans|coffee bean|кофены үр|кофе үр/i.test(itemName)) return true;
        return false;
      });

      const compactInventoryRows = (isInventoryQuestion
        ? (selectedInventoryRows.length ? selectedInventoryRows : (analyticsData.wasted_only || analyticsData.all_inventory_data || []).slice(0, 5))
        : []
      ).slice(0, 10).map((item: any) =>
        `${item.name} (${item.unit || "unit unknown"}) | theoretical=${item.theoretical ?? "unavailable"} | actual usage=${item.actual_usage ?? "unavailable"} | gap=${item.gap ?? "unavailable"} | impact=${formatMoney(item.impact)} | count interval available=${item.inventory_reconciliation_available === true ? "yes" : "no"}`
      ).join("\n");

      const recipesForQuestion = Object.entries(analyticsData.all_recipes || {}).filter(([productName, ingredients]: [string, any]) => {
        const ingredientNames = Object.keys(ingredients || {});
        if (isMilkQuestion) return ingredientNames.some((name) => /^milk$/i.test(String(name).trim()));
        if (selectedInventoryRows.length) {
          const soughtNames = selectedInventoryRows.map((item: any) => String(item.name).toLowerCase());
          return ingredientNames.some((name) => soughtNames.includes(String(name).toLowerCase()));
        }
        return questionLower.includes(String(productName).toLowerCase());
      }).slice(0, 12).map(([productName, ingredients]: [string, any]) =>
        `${productName} = ${Object.entries(ingredients || {}).map(([name, amount]) => `${amount} ${name}`).join(" + ")}`
      ).join("\n");

      let questionSpecificData = "";
      if (isMilkQuestion && needsDetailedInventoryContext) {
        const milkRecipeNames = new Set(
          Object.entries(analyticsData.all_recipes || {})
            .filter(([, ingredients]: [string, any]) => Object.keys(ingredients || {}).some((name) => /^milk$/i.test(String(name).trim())))
            .map(([name]) => name.toLowerCase())
        );
        const milkMappedSales = Array.from(salesTotalsByRecipeName.entries())
          .filter(([name]) => milkRecipeNames.has(name.toLowerCase()))
          .map(([name, totals]) => `${name}: units=${totals.units}, revenue=${totals.revenue}, rows=${totals.rows}`)
          .join("\n") || "No mapped sales rows matched a recipe that contains Milk.";
        const milkOriginalSalesRows = salesPeriodRows
          .filter((row) => {
            const rawName = String(row.product_name || "").trim();
            const resolvedName = learnedMenuAliasMap.get(rawName.toLowerCase()) || rawName;
            return milkRecipeNames.has(resolvedName.toLowerCase());
          })
          .slice(0, 40)
          .map((row) => `ID=${row.id} | date=${row.date} | original POS=${row.product_name} | qty=${row.quantity_sold} | revenue=${row.total_revenue}`)
          .join("\n") || "No individual source sales rows matched a Milk recipe.";
        const milkAuditLine = allIngredientInventoryAuditContext
          .split("\n")
          .filter((line) => /^\s*milk\s*\(/i.test(line))
          .join("\n");
        questionSpecificData = [
          `Report range: ${activeStart} through ${activeEnd}`,
          "Mapped sales totals for products whose exact recipe includes Milk:",
          milkMappedSales,
          "Original POS sales rows for those products:",
          milkOriginalSalesRows,
          "CODE-CALCULATED THEORETICAL MILK USAGE:",
          deterministicMilkRecipeContext,
          "CODE-CALCULATED INVENTORY-RECORDED MILK USAGE:",
          deterministicMilkInventoryContext,
          deterministicMilkDifferenceContext,
          "Additional calculated inventory line:",
          milkAuditLine || "No additional Milk inventory line is available."
        ].join("\n\n");
      } else if (isInventoryQuestion) {
        const relevantTheoreticalLines = theoreticalUsageByIngredientContext
          .split("\n")
          .filter((line) => selectedInventoryRows.some((item: any) => line.toLowerCase().startsWith(String(item.name).toLowerCase() + " |")));
        const relevantActualLines = allIngredientInventoryAuditContext
          .split("\n")
          .filter((line) => selectedInventoryRows.some((item: any) => line.toLowerCase().startsWith(String(item.name).toLowerCase() + " (")));
        questionSpecificData = [
          `Report range: ${activeStart} through ${activeEnd}`,
          "Relevant inventory calculations:",
          compactInventoryRows || "No reliable matching inventory calculation is available.",
          "Relevant theoretical recipe calculations:",
          relevantTheoreticalLines.join("\n") || recipesForQuestion || "No matching recipe calculation is available.",
          "Relevant inventory-count calculations:",
          relevantActualLines.join("\n") || "No matching inventory-count calculation is available."
        ].join("\n\n");
      } else if (isCashflowQuestion) {
        questionSpecificData = cashflowDetail + "\n\n" + purchasesText;
      } else if (isMarginQuestion) {
        questionSpecificData = selectedMenuRows
          .map((item: any) => `${item.name} | price=${formatMoney(item.selling_price)} | cost=${formatMoney(item.cost_per_item)} | margin=${item.gross_margin_pct}%`)
          .join("\n") || "No product-level margin calculation is available in the selected context.";
      } else if (isSalesQuestion) {
        questionSpecificData = selectedMenuRows
          .map((item: any) => `${item.name} | sold=${item.sold} | price=${formatMoney(item.selling_price)} | cost=${formatMoney(item.cost_per_item)} | margin=${item.gross_margin_pct}%`)
          .join("\n") || "No product-level sales summary is available in the selected context.";
      }

      if (!questionSpecificData && shouldLoadExperienceHistory) {
        questionSpecificData = [businessExperienceContext, businessExperienceSummary].join("\n\n");
      }

      const compactPromptPayload = `
BUSINESS: ${clientId}
REPORT RANGE: ${activeStart || "not supplied"} through ${activeEnd || "not supplied"}

OWNER QUESTION:
${text}

CODE-CALCULATED FINANCIAL SUMMARY:
Revenue: ${formatMoney(fin.revenue)} | Net revenue: ${formatMoney(fin.net_revenue)} | COGS used in P&L: ${formatMoney(fin.actual_cogs)} | Theoretical COGS: ${formatMoney(fin.theo_cogs)} | Gross margin: ${fin.gross_margin ?? "unavailable"} | OPEX: ${formatMoney(fin.opex)} | EBIT: ${formatMoney(fin.ebit)} | Net profit: ${formatMoney(fin.net_profit)} | Net margin: ${fin.net_margin ?? "unavailable"}
Reconciliation mode: ${fin.is_theoretical_mode ? "theoretical / physical-count reconciliation incomplete" : "all included ingredients have boundary counts"}

TOP RECORDED WASTE LINES (maximum five):
${shortWasteContext}

TOP MARGIN ALERTS (maximum five):
${shortMarginContext}

RELEVANT SAVED MEMORIES (maximum ten; historical context, not automatically verified):
${businessMemoryContext || "No relevant saved memory was found among the 100 most recently updated candidate facts."}

RECENT OWNER CHAT CONTEXT (only loaded for likely follow-up questions):
${recentChatContext}

QUESTION-SPECIFIC DATA:
${questionSpecificData || "No additional question-specific source data selected. Do not invent missing details; say when the required evidence is unavailable."}

ANSWER RULES:
- Use only supplied data and code-calculated figures. Never invent a number or ID.
- Use recent chat only to resolve conversational references, not as independent business evidence.
- A null/unavailable calculation is not zero.
- Separate database records, calculated results, and unverified hypotheses.
- Use only explicit learned_menus mappings for POS names; keep original names visible when relevant.
- An inventory discrepancy alone does not prove theft or misconduct.
- Do not infer a supplier schedule from a guess. Use a relevant saved memory if present; otherwise say the schedule is not recorded in the context.
- Keep the answer concise unless a detailed audit was explicitly requested.
`;

      const promptPayload = isFullAuditRequest
        ? fullAuditPromptPayload
        : compactPromptPayload;

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
          "Gemini гацлаа. Groq нөөц сервер ажиллаж байна...",
          geminiErr.message,
        );

        try {
          // 2. Groq руу шилжих (Маш хурдан 0.3 секунд)
          fallbackText = await callGroqFallback(ACTIVE_PROMPT, promptPayload);
        } catch (groqErr: any) {
          console.error("Groq бас ажилласангүй:", groqErr.message);
          return NextResponse.json({
            success: false,
            message: `Серверийн саатал: ${groqErr.message}`,
          });
        }
      }

      // Хэрэв Groq хариулсан бол текстийг буцаана:
      if (fallbackText) {
        if (isOwner && !action && !imageBase64 && text) {
        await saveOwnerChatTurn(clientId, text, fallbackText);
      }
        return new Response(fallbackText, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      // Gemini хариулсан бол урсгалаар (Stream) буцаана:
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
            if (isOwner && !action && !imageBase64 && text) {
            await saveOwnerChatTurn(clientId, text, completeAnswer);
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
