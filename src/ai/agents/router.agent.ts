// src/ai/agents/router.agent.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentContext } from "@/types/agent.types";
import { runCfoAgent } from "./cfo.agent";
import { runCooAgent } from "./coo.agent";
import { runHrAgent } from "./hr.agent";

interface RouterDecision {
  route: "CFO" | "COO" | "HR" | "GENERAL";
}

const ROUTER_PROMPT = `
You are the Operlink AI Intent Router for a restaurant system.
Classify the user's message into EXACTLY one of four specialist categories:

1. 'CFO': Questions about revenue, P&L, profit (цэвэр ашиг), margins, cash/bank balance, pricing, or taxes.
2. 'COO': Questions about waste (хаягдал), missing items (зөрүү), inventory stock, procurement orders (захиалга), shifts, or general SOP tasks.
3. 'HR': Questions about staff hours (ажилласан цаг), payroll (цалин), NDSH (НДШ), worker incidents/damage reports against employees.
4. 'GENERAL': Greetings, small talk, or ambiguous general business queries.

Return STRICTLY a JSON object:
{ "route": "CFO" | "COO" | "HR" | "GENERAL" }
`.trim();

async function classifyIntent(userText: string): Promise<"CFO" | "COO" | "HR" | "GENERAL"> {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
  if (!apiKey) return "CFO";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      systemInstruction: ROUTER_PROMPT,
      generationConfig: {
        temperature: 0.0,
        responseMimeType: "application/json",
      },
    });

    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userText }] }],
    });

    const parsed = JSON.parse(res.response.text().trim()) as RouterDecision;
    if (["CFO", "COO", "HR", "GENERAL"].includes(parsed.route)) {
      return parsed.route;
    }
    return "CFO";
  } catch (err) {
    console.warn("Intent router fallback to CFO:", err);
    return "CFO";
  }
}

export async function routeAiRequest(
  context: AgentContext,
  payload: { text: string }
): Promise<ReadableStream> {
  // 1. Ажилтан Kiosk дээрээс ярьж/бичиж байвал fast parser ажиллана
  if (context.userRole !== "owner") {
    throw new Error("Worker Kiosk routing handled by fast transaction parser");
  }

  // 2. Эзэн асуусан бол хурдан AI-аар асуултыг ангилна (0.15s)
  const route = await classifyIntent(payload.text);
  console.log(`[ROUTER] Intent classified as: '${route}' for prompt: "${payload.text}"`);

  // 3. Тохирох тусгай Агент руу шилжүүлнэ
  switch (route) {
    case "COO":
      return await runCooAgent(context, payload.text);
    case "HR":
      return await runHrAgent(context, payload.text);
    case "CFO":
    case "GENERAL":
    default:
      return await runCfoAgent(context, payload.text);
  }
}