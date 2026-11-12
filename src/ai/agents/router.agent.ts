import { AgentContext } from "@/types/agent.types";
import { runCfoAgent } from "./cfo.agent";
import { runCooAgent } from "./coo.agent";
import { runHrAgent } from "./hr.agent";
import { geminiApiKey, getGenAI } from "@/lib/ai/genai";
import { MODELS } from "@/lib/ai/models";
import { subscriptionBlockMessage } from "@/lib/subscription";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { recordChatMessage } from "@/ai/memory/thread.manager";

interface RouterDecision {
  route: "CFO" | "COO" | "HR" | "GENERAL";
}

const ROUTER_PROMPT = `
You are the Operlink AI Intent Router for a restaurant system.
Classify the user's message into EXACTLY one of four specialist categories:

1. 'CFO': Questions about revenue, P&L, profit, margins, cash/bank balance, pricing, or taxes.
2. 'COO': Questions about waste, missing items, inventory stock, procurement, recipes, prep, or menu engineering.
3. 'HR': Questions about staff hours, payroll, NDSH, shift plans, or worker incidents.
4. 'GENERAL': Greetings, small talk, or ambiguous requests that are not clearly CFO, COO, or HR.

Return STRICTLY a JSON object:
{ "route": "CFO" | "COO" | "HR" | "GENERAL" }
`.trim();

const CFO_WORDS = ["орлого", "ашиг", "үнийн", "үнэ", "касс", "банк", "татвар", "маржин", "мөнгө", "санхүү", "revenue", "profit", "cash", "price", "pricing", "борлуулалт"];
const COO_WORDS = ["хаягдал", "нөөц", "жор", "цэс", "захиалга", "бэлтгэл", "хулгай", "stock", "inventory", "waste", "recipe", "menu", "орц", "тооллого", "тоолсон", "count", "үлдэгдэл"];
const HR_WORDS = ["цалин", "ээлж", "ндш", "ажилтан", "payroll", "shift", "staff", "цагийн"];

const COUNT_WORDS = ["тооллого", "тоолсон", "count", "үлдэгдэл"];
const DEPARTMENT_ONLY: Record<string, RouterDecision["route"]> = {
  "нөөц": "COO",
  coo: "COO",
  inventory: "COO",
  stock: "COO",
  "санхүү": "CFO",
  cfo: "CFO",
  finance: "CFO",
  "цалин": "HR",
  hr: "HR",
  payroll: "HR",
};

function wordHits(text: string, words: string[]) {
  return words.reduce((n, word) => n + (text.includes(word) ? 1 : 0), 0);
}

function routeScores(text: string) {
  return {
    CFO: wordHits(text, CFO_WORDS),
    COO: wordHits(text, COO_WORDS),
    HR: wordHits(text, HR_WORDS),
  };
}

/** Count questions and shift closes stay with the COO even if a payroll word is also present. */
function forcesCoo(text: string) {
  return COUNT_WORDS.some((word) => text.includes(word)) || (text.includes("ээлж") && text.includes("хаалт"));
}

function departmentOnly(text: string): RouterDecision["route"] | null {
  return DEPARTMENT_ONLY[text.trim().toLowerCase()] || null;
}

/** Skip a model call when one department is clearly named. */
function fastRoute(userText: string): RouterDecision["route"] | null {
  const text = userText.trim().toLowerCase();
  if (!text) return "GENERAL";
  if (text.length <= 24 && /^(hi|hello|hey|thanks|сайн уу|сайн байн|баярлалаа)\b/.test(text)) {
    return "GENERAL";
  }
  if (forcesCoo(text)) return "COO";
  const scores = routeScores(text);
  const ranked = (Object.entries(scores) as [RouterDecision["route"], number][]).sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] > 0 && ranked[0][1] > ranked[1][1]) return ranked[0][0];
  return null;
}

/** Classifier failed: most keyword hits, otherwise COO. Never a dead-end error. */
function keywordFallback(userText: string): RouterDecision["route"] {
  const text = userText.trim().toLowerCase();
  if (forcesCoo(text)) return "COO";
  const only = departmentOnly(text);
  if (only) return only;
  const scores = routeScores(text);
  const best = Math.max(scores.CFO, scores.COO, scores.HR);
  if (best === 0) return "COO";
  if (scores.COO === best) return "COO";
  if (scores.HR === best) return "HR";
  return "CFO";
}

async function withPreviousQuestion(clientId: string, text: string) {
  if (!departmentOnly(text)) return text;
  const { data } = await supabaseAdmin
    .from("ai_chat_messages")
    .select("content")
    .eq("client_id", clientId)
    .eq("role", "owner")
    .order("created_at", { ascending: false })
    .limit(8);
  const previous = (data || [])
    .map((row) => String(row.content || "").trim())
    .find((content) => content && !departmentOnly(content));
  if (!previous) return text.trim();
  return `${previous}\n${text.trim()}`;
}

function textStream(text: string): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

async function classifyIntent(userText: string): Promise<RouterDecision["route"] | null> {
  if (!geminiApiKey()) return null;
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: MODELS.flash,
    contents: userText,
    config: {
      systemInstruction: ROUTER_PROMPT,
      temperature: 0,
      responseMimeType: "application/json",
      maxOutputTokens: 32,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  const parsed = JSON.parse((response.text || "").trim()) as RouterDecision;
  if (["CFO", "COO", "HR", "GENERAL"].includes(parsed.route)) return parsed.route;
  return null;
}

async function runGeneralBranch(userText: string): Promise<ReadableStream> {
  if (!geminiApiKey()) {
    return textStream("AI тохиргоо дутуу байна. GEMINI_API_KEY шалгана уу.");
  }
  const ai = getGenAI();
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await ai.models.generateContentStream({
          model: MODELS.flash,
          contents: userText,
          config: {
            systemInstruction: `
You are Operlink, a restaurant operating assistant. Answer in Mongolian.
If the user is greeting you, greet them back in one sentence and ask what they want to look at: санхүү, нөөц, эсвэл цалин.
If the request is unclear, do not guess a department. Ask one clarifying question.
No emojis.
`.trim(),
            temperature: 0.2,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
        let wrote = false;
        for await (const chunk of stream) {
          if (!chunk.text) continue;
          wrote = true;
          controller.enqueue(encoder.encode(chunk.text));
        }
        if (!wrote) {
          controller.enqueue(encoder.encode("Юу гэж туслах вэ: санхүү, нөөц, эсвэл цалин?"));
        }
      } catch (err) {
        console.error("[general]", err);
        controller.enqueue(encoder.encode("Хариулт боловсруулахад түр саатал гарлаа. Та асуултаа дахин илгээнэ үү."));
      } finally {
        controller.close();
      }
    },
  });
}

export async function routeAiRequest(
  context: AgentContext,
  payload: { text: string }
): Promise<ReadableStream> {
  if (context.userRole !== "owner" && context.userRole !== "manager") {
    throw new Error("Worker Kiosk routing handled by fast transaction parser");
  }

  const blocked = await subscriptionBlockMessage(context.clientId);
  if (blocked) return textStream(blocked);

  if (!departmentOnly(payload.text)) {
    await recordChatMessage(context.clientId, "owner", payload.text);
  }

  let route: RouterDecision["route"] | null = fastRoute(payload.text);
  if (!route) {
    try {
      route = await classifyIntent(payload.text);
    } catch (err) {
      console.error("Intent router failed:", err);
      route = null;
    }
    if (!route) route = keywordFallback(payload.text);
  }

  const agentText = await withPreviousQuestion(context.clientId, payload.text);
  console.log(`[ROUTER] Intent classified as: '${route}'`);

  switch (route) {
    case "COO":
      return runCooAgent(context, agentText);
    case "HR":
      return runHrAgent(context, agentText);
    case "CFO":
      return runCfoAgent(context, agentText);
    case "GENERAL":
      return runGeneralBranch(agentText);
    default:
      return runCooAgent(context, agentText);
  }
}
