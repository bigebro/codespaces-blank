import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { cooSkills } from "@/ai/tools/skills.network";
import { executeAiTool } from "@/ai/tools/execution.tools";
import { getConversationThread, recordChatMessage } from "@/ai/memory/thread.manager";
import { getVitals } from "@/core/packages/pkg_vitals";
import { extractAndSaveMemoryInBackground } from "@/ai/memory/chat_observer";
import { AgentContext } from "@/types/agent.types";

function sanitizeDateWithYear(dateStr: string | undefined, fallbackDate: string, targetYear: string): string {
  if (!dateStr || typeof dateStr !== "string") return fallbackDate;
  const match = dateStr.match(/^(\d{4})(-\d{2}-\d{2}.*)$/);
  if (match && match[1] !== targetYear) {
    return `${targetYear}${match[2]}`;
  }
  return dateStr;
}

export async function runCooAgent(context: AgentContext, userMessage: string): Promise<ReadableStream> {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
  const genAI = new GoogleGenerativeAI(apiKey);

  const now = new Date();
  const currentIsoDate = now.toISOString().split("T")[0];
  const targetYear = context.activeStartDate
    ? context.activeStartDate.split("-")[0]
    : String(now.getFullYear());

  const vitals = await getVitals(context.clientId);

  const cooSystemPrompt = `
You are the Operlink AI Chief Operating Officer for "${context.clientId}". 
[ABSOLUTE CONSTRAINT: NO EMOJIS]. You manage inventory waste, staff accountability, and operational efficiency. If you detect unlogged waste, suggest checking CCTV or confronting the shift worker. If a new SOP is needed, call action_create_staff_task. Answer in professional Mongolian.

[OPERATIONAL CONTEXT]:
- TODAY: ${currentIsoDate}
- CURRENT YEAR: ${targetYear}
- MTD LOGGED WASTE: ${vitals.totalLoggedWasteMNT.toLocaleString()} ₮
- ACTIVE SHIFT: ${vitals.activeShiftStatus.isOpen ? `Open (${vitals.activeShiftStatus.workerRole || "Staff"})` : "Closed"}

[FORENSIC LEAKAGE LOGIC]:
1. Proportional multi-item depletion with 0 POS sales -> Flag as potential cash theft / un-rung sales (recommend CCTV audit).
2. Recurring small deficits per unit -> Overpouring / grinder calibration error.
3. 1-2 random units missing -> Unlogged staff meal / dropped item on Kiosk.
4. Sudden bulk loss (carton/kg) -> Large spill or physical theft.
`.trim();

  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    systemInstruction: cooSystemPrompt,
    tools: [{ functionDeclarations: cooSkills }],
    generationConfig: { temperature: 0.1 },
  });

  let finalAnswerText = "";
  const proposalCards: any[] = [];

  try {
    const history = await getConversationThread(context.clientId, 6);
    const contents: any[] = [
      ...history,
      { role: "user", parts: [{ text: userMessage }] },
    ];

    const initialResponse = await model.generateContent({ contents });
    const candidate = initialResponse.response.candidates?.[0];
    const calls = initialResponse.response.functionCalls();

    if (calls && calls.length > 0) {
      if (candidate?.content) contents.push(candidate.content);

      const functionResponseParts: Part[] = [];
      for (const call of calls) {
        const rawArgs = (call.args || {}) as Record<string, any>;
        const safeArgs = {
          ...rawArgs,
          startDate: sanitizeDateWithYear(rawArgs.startDate, context.activeStartDate || `${targetYear}-01-01`, targetYear),
          endDate: sanitizeDateWithYear(rawArgs.endDate, context.activeEndDate || currentIsoDate, targetYear),
        };

        const execResult = await executeAiTool(context, call.name, safeArgs);
        if (execResult.data?.type === "PROPOSAL") proposalCards.push(execResult.data);

        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { result: execResult.data || { error: execResult.error } },
          },
        });
      }

      contents.push({ role: "user", parts: functionResponseParts });
      const finalResponse = await model.generateContent({ contents });
      finalAnswerText = finalResponse.response.text();
    } else {
      finalAnswerText = initialResponse.response.text();
    }
  } catch (err: any) {
    console.error("COO Agent execution error:", err);
    finalAnswerText = `Үйл ажиллагааны шинжилгээнд саатал гарлаа: ${err.message || "Алдаа гарлаа"}`;
  }

  if (proposalCards.length > 0) {
    proposalCards.forEach((prop) => {
      finalAnswerText += `\n\n:::PROPOSAL_CARD\n${JSON.stringify(prop)}\n:::`;
    });
  }

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        if (finalAnswerText) {
          const words = finalAnswerText.split(" ");
          for (let i = 0; i < words.length; i += 3) {
            controller.enqueue(encoder.encode(words.slice(i, i + 3).join(" ") + " "));
            await new Promise((r) => setTimeout(r, 15));
          }
        }
        await recordChatMessage(context.clientId, "owner", userMessage);
        await recordChatMessage(context.clientId, "ai", finalAnswerText);
        controller.close();

        extractAndSaveMemoryInBackground(context.clientId, userMessage, finalAnswerText).catch(() => {});
      } catch (err) {
        controller.error(err);
      }
    },
  });
}