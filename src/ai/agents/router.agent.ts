import { AgentContext } from "@/types/agent.types";
import { runCfoAgent } from "./cfo.agent";
import { runCooAgent } from "./coo.agent";
import { runHrAgent } from "./hr.agent";
import { GoogleGenerativeAI, geminiApiKey } from "@/lib/ai/genai";
import { MODELS } from "@/lib/ai/models";
import { subscriptionBlockMessage } from "@/lib/subscription";

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
  const apiKey = geminiApiKey();
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODELS.flash,
    systemInstruction: ROUTER_PROMPT,
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  });
  const res = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userText }] }],
  });
  const parsed = JSON.parse(res.response.text().trim()) as RouterDecision;
  if (["CFO", "COO", "HR", "GENERAL"].includes(parsed.route)) return parsed.route;
  return null;
}

async function runGeneralBranch(userText: string): Promise<ReadableStream> {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    return textStream("AI тохиргоо дутуу байна. GEMINI_API_KEY шалгана уу.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODELS.flash,
    systemInstruction: `
You are Operlink, a restaurant operating assistant. Answer in Mongolian.
If the user is greeting you, greet them back in one sentence and ask what they want to look at: санхүү, нөөц, эсвэл цалин.
If the request is unclear, do not guess a department. Ask one clarifying question.
No emojis.
`.trim(),
    generationConfig: { temperature: 0.2 },
  });
  const res = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userText }] }],
  });
  return textStream(res.response.text() || "Юу гэж туслах вэ: санхүү, нөөц, эсвэл цалин?");
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

  let route: RouterDecision["route"] | null = null;
  try {
    route = await classifyIntent(payload.text);
  } catch (err) {
    console.error("Intent router failed:", err);
    return textStream("Хүсэлтийг ангилж чадсангүй. Санхүү, нөөц, эсвэл цалингийн аль нь болохыг тодотгоод дахин асууна уу.");
  }

  if (!route) {
    return textStream("AI чиглүүлэгч хариу өгсөнгүй. Санхүү, нөөц, эсвэл цалин гэдгээ тодотгоод дахин асууна уу.");
  }

  console.log(`[ROUTER] Intent classified as: '${route}'`);

  switch (route) {
    case "COO":
      return runCooAgent(context, payload.text);
    case "HR":
      return runHrAgent(context, payload.text);
    case "CFO":
      return runCfoAgent(context, payload.text);
    case "GENERAL":
      return runGeneralBranch(payload.text);
    default:
      return textStream("Энэ хүсэлтийг аль агент руу өгөх нь тодорхойгүй байна. Асуултаа тодотгоно уу.");
  }
}
