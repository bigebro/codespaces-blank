// src/ai/agents/cfo.agent.ts
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { CFO_SYSTEM_PROMPT } from "@/ai/prompts/cfo.prompt";
import { financialToolDeclarations } from "@/ai/tools/financial.tools";
import { memoryToolDeclarations } from "@/ai/tools/memory.tools";
import { executeAiTool } from "@/ai/tools/execution.tools";
import { getConversationThread, recordChatMessage } from "@/ai/memory/thread.manager";
import { AgentContext } from "@/types/agent.types";

export async function runCfoAgent(context: AgentContext, userMessage: string): Promise<ReadableStream> {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
  const genAI = new GoogleGenerativeAI(apiKey);

// ✅ CLEAN FIX: Just tell him today's date and the selected dashboard period!
const today = new Date().toISOString().split("T")[0]; // e.g. "2026-10-31"
const activePeriod = context.activeStartDate 
  ? `Сонгогдсон тайлант хугацаа: ${context.activeStartDate} -ээс ${context.activeEndDate}`
  : `Одоогийн он: ${today.split("-")[0]}`;

const systemInstruction = `${CFO_SYSTEM_PROMPT}\n\n[ЦАГ ХУГАЦААНЫ БОДИТ МЭДЭЭЛЭЛ]:\n- Өнөөдрийн огноо: ${today}\n- ${activePeriod}`;

const model = genAI.getGenerativeModel({
  model: "gemini-3.5-flash-lite",
  systemInstruction: systemInstruction, // 👈 Now Gemini knows today is 2026!
  tools: [{ functionDeclarations: [...financialToolDeclarations, ...memoryToolDeclarations] }],
  generationConfig: { temperature: 0.2 },
});

  // ⚡ 1. Хувьсагчийг try блокийн ГАДНА зарласнаар Scope алдаа гарахгүй:
  let finalAnswerText = "";

  try {
    // 2. Өмнөх ярианы түүхийг цэвэрлэж авах
    const history = await getConversationThread(context.clientId, 6);

    // 3. contents массивыг зөв эхлүүлэх
    const contents: any[] = [
      ...history,
      { role: "user", parts: [{ text: userMessage }] },
    ];

    // 4. 1-р алхам: Gemini-ээс Tool дуудах эсэхийг шийдэх
    const initialResponse = await model.generateContent({ contents });
    const candidate = initialResponse.response.candidates?.[0];
    const calls = initialResponse.response.functionCalls();

    if (calls && calls.length > 0) {
      console.log("🛠️ Gemini called tools:", calls.map((c) => c.name));

      // AI-ийн дуудсан tool-ийг түүхэнд нэмэх
      if (candidate?.content) {
        contents.push(candidate.content);
      }

      // Tool-үүдийг ажиллуулах
      const functionResponseParts: Part[] = [];
      for (const call of calls) {
        const callArgs = (call.args || {}) as Record<string, any>;
        const safeArgs = {
          startDate:
            callArgs.startDate ||
            context.activeStartDate ||
            new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
          endDate:
            callArgs.endDate ||
            context.activeEndDate ||
            new Date().toISOString().split("T")[0],
          ...callArgs,
        };

        const execResult = await executeAiTool(context, call.name, safeArgs);
        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { result: execResult.data || { error: execResult.error } },
          },
        });
      }



      // Төгсгөлд нь текстийн тушаал өгөх:
      contents.push({
        role: "user",
        parts: [{ text: "Дээрх хэрэгслийн хариунд үндэслэн асуултад тодорхой Монгол хэлээр хариулна уу." }],
      });

      const finalResponse = await model.generateContent({ contents });
      finalAnswerText = finalResponse.response.text();

      // 2. Хэрэв хоосон гарвал Tools-гүй цэвэр текст моделиор хариултыг заавал гаргуулах:
      if (!finalAnswerText || !finalAnswerText.trim()) {
        const textOnlyModel = genAI.getGenerativeModel({
          model: "gemini-3.5-flash-lite",
          systemInstruction: CFO_SYSTEM_PROMPT,
        });

        const toolResultsSummary = JSON.stringify(
          functionResponseParts.map((p: any) => p.functionResponse?.response?.result)
        );

        const synthResponse = await textOnlyModel.generateContent([
          { text: `Хэрэглэгчийн асуулт: "${userMessage}"\n\nБодит өгөгдөл:\n${toolResultsSummary}\n\nДээрх өгөгдлөөс хэн ямар цагт ямар бараа хаягдал болгосныг жагсааж Монголоор хариулна уу.` }
        ]);
        finalAnswerText = synthResponse.response.text();
      }

   
    } else {
      // Tool дуудаагүй бол энгийн хариултыг авах
      finalAnswerText = initialResponse.response.text();
    }
  } catch (geminiError: any) {
    console.error("❌ GEMINI БОДИТ АЛДАА:", geminiError);
    finalAnswerText = `Системд түр саатал гарлаа: ${geminiError?.message || "Алдаа гарлаа"}`;
  }

  // 6. Хэрэглэгчийн дэлгэц рүү үг үгээр нь урсгаж (Stream) үзүүлэх
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        if (finalAnswerText) {
          const words = finalAnswerText.split(" ");
          for (let i = 0; i < words.length; i += 3) {
            const chunk = words.slice(i, i + 3).join(" ") + " ";
            controller.enqueue(encoder.encode(chunk));
            await new Promise((r) => setTimeout(r, 20));
          }
        }
        controller.close();
        await recordChatMessage(context.clientId, "owner", userMessage);
        await recordChatMessage(context.clientId, "ai", finalAnswerText);
      } catch (err) {
        controller.error(err);
      }
    },
  });
}