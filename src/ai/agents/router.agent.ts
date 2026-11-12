import { getGenAI } from "@/ai/geminiClient";
import { CHAT_MODEL } from "@/ai/config/models";
import { AgentContext } from "@/types/agent.types";
import { getTenantBilling } from "@/core/auth/tenant";
import { runCfoAgent } from "./cfo.agent";
import { runCooAgent } from "./coo.agent";
import { runHrAgent } from "./hr.agent";
import { errorStream } from "./runToolLoop";

interface RouterDecision {
  route: "CFO" | "COO" | "HR" | "GENERAL";
}

const ROUTER_PROMPT = `
You are the Operlink AI Intent Router for a restaurant system.
Classify the user's message into EXACTLY one of four specialist categories:

1. 'CFO': Questions about revenue, P&L, profit, margins, cash/bank balance, pricing, or taxes.
2. 'COO': Questions about waste, missing items, inventory stock, recipes, procurement, or shifts.
3. 'HR': Questions about staff hours, payroll, NDSH, or worker incidents.
4. 'GENERAL': Greetings, small talk, or ambiguous requests.

Return STRICTLY a JSON object:
{ "route": "CFO" | "COO" | "HR" | "GENERAL" }
`.trim();

function textStream(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

async function classifyIntent(userText: string): Promise<"CFO" | "COO" | "HR" | "GENERAL" | "ERROR"> {
  try {
    const ai = getGenAI();
    const res = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: userText,
      config: {
        systemInstruction: ROUTER_PROMPT,
        temperature: 0,
        responseMimeType: "application/json",
      },
    });
    const parsed = JSON.parse((res.text || "").trim()) as RouterDecision;
    if (["CFO", "COO", "HR", "GENERAL"].includes(parsed.route)) return parsed.route;
    return "ERROR";
  } catch (err) {
    console.warn("Intent router failed:", err);
    return "ERROR";
  }
}

async function answerGeneral(userText: string): Promise<string> {
  const greeting = /^(hi|hello|hey|сайн|sain|юу байна|юу|hi there)[!.?\s]*$/i.test(userText.trim());
  if (greeting) {
    return "Сайн байна уу. Би Operlink. Санхүү, агуулах, жор, эсвэл цалингийн асуултаа шууд бичээрэй.";
  }
  try {
    const ai = getGenAI();
    const res = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: userText,
      config: {
        systemInstruction:
          "You are Operlink. The request is unclear. Answer in Mongolian, with no emoji. If it is a greeting, greet briefly. Otherwise ask one clarifying question: do they want finance, inventory, or staff? Do not invent business numbers.",
        temperature: 0.2,
      },
    });
    return res.text || "Санхүү, агуулах, эсвэл цалингийн аль нь болохыг нэг өгүүлбэрээр хэлнэ үү.";
  } catch {
    return "Асуулт тодорхойгүй байна. Санхүү, агуулах, эсвэл цалингийн алийг нь асууж байгаагаа хэлнэ үү.";
  }
}

export async function routeAiRequest(
  context: AgentContext,
  payload: { text: string }
): Promise<ReadableStream> {
  if (context.userRole !== "owner") {
    throw new Error("Worker Kiosk routing handled by fast transaction parser");
  }

  const billing = await getTenantBilling(context.clientId);
  if (billing.past) {
    return errorStream("Үйлчилгээний эрх дууссан байна. Эрхээ сунгасны дараа AI дахин ажиллана.");
  }

  const route = await classifyIntent(payload.text);
  console.log(`[ROUTER] Intent classified as: '${route}'`);

  switch (route) {
    case "COO":
      return runCooAgent(context, payload.text);
    case "HR":
      return runHrAgent(context, payload.text);
    case "CFO":
      return runCfoAgent(context, payload.text);
    case "GENERAL":
      return textStream(await answerGeneral(payload.text));
    default:
      return errorStream("Асуултыг ангилж чадсангүй. Санхүү, агуулах, эсвэл цалин гэж тодорхойлж дахин асууна уу.");
  }
}
