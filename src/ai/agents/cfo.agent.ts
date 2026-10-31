// src/ai/agents/cfo.agent.ts
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { buildCfoSystemPrompt } from "@/ai/prompts/cfo.prompt";
import { allCfoSkills } from "@/ai/tools/skills.declarations";
import { executeAiTool } from "@/ai/tools/execution.tools";
import { getConversationThread, recordChatMessage } from "@/ai/memory/thread.manager";
import { getVitals } from "@/core/packages/pkg_vitals";
import { AgentContext } from "@/types/agent.types";

function sanitizeDateWithYear(
  dateStr: string | undefined,
  fallbackDate: string,
  targetYear: string
): string {
  if (!dateStr || typeof dateStr !== "string") return fallbackDate;
  const match = dateStr.match(/^(\d{4})(-\d{2}-\d{2}.*)$/);
  if (match) {
    const year = match[1];
    if (year !== targetYear) {
      return `${targetYear}${match[2]}`;
    }
  }
  return dateStr;
}

export async function runCfoAgent(
  context: AgentContext,
  userMessage: string
): Promise<ReadableStream> {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
  const genAI = new GoogleGenerativeAI(apiKey);

  const now = new Date();
  const currentIsoDate = now.toISOString().split("T")[0];
  const targetYear = context.activeStartDate
    ? context.activeStartDate.split("-")[0]
    : String(now.getFullYear());

  // 1. Зүрхний 5 үзүүлэлтийг (Vitals) татаж промптод суулгах
  const vitals = await getVitals(context.clientId);
  const systemInstruction = buildCfoSystemPrompt(vitals, context.clientId);

  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    systemInstruction,
    tools: [{ functionDeclarations: allCfoSkills }],
    generationConfig: { temperature: 0.2 },
  });

  let finalAnswerText = "";
  const proposalCards: any[] = [];

  try {
    const history = await getConversationThread(context.clientId, 6);
    const contents: any[] = [
      ...history,
      { role: "user", parts: [{ text: userMessage }] },
    ];

    // 1-р алхам: Хэрэглэгчийн асуултыг илгээж, хэрэгсэл (Tool) дуудах эсэхийг шийдэх
    const initialResponse = await model.generateContent({ contents });
    const candidate = initialResponse.response.candidates?.[0];
    const calls = initialResponse.response.functionCalls();

    if (calls && calls.length > 0) {
      // Загварын гаргасан functionCall-ийг "model" ээлжинд нэмнэ
      if (candidate?.content) {
        contents.push(candidate.content);
      }

      const functionResponseParts: Part[] = [];

      for (const call of calls) {
        const rawArgs = (call.args || {}) as Record<string, any>;

        // Огнооны оныг засах (2023, 2024 гэх мэт төөрөгдлийг хамгаалах)
        const safeArgs = {
          ...rawArgs,
          startDate: sanitizeDateWithYear(
            rawArgs.startDate,
            context.activeStartDate || `${targetYear}-01-01`,
            targetYear
          ),
          endDate: sanitizeDateWithYear(
            rawArgs.endDate,
            context.activeEndDate || currentIsoDate,
            targetYear
          ),
        };

        const execResult = await executeAiTool(context, call.name, safeArgs);

        if (execResult.data?.type === "PROPOSAL") {
          proposalCards.push(execResult.data);
        }

        // Хэрэгслийн хариуг Gemini стандартын дагуу бэлтгэх
        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { result: execResult.data || { error: execResult.error } },
          },
        });
      }

      // 🚨 ЗАСВАР: role: "function" БИШ, role: "user" гэж илгээнэ!
      contents.push({
        role: "user",
        parts: functionResponseParts,
      });

      // Хэрэгслийн хариу орсон ээлжийг загвар руу илгээж эцсийн тайлбарыг авах
      const finalResponse = await model.generateContent({ contents });
      finalAnswerText = finalResponse.response.text();

      // Хэрэв ямар нэг шалтгаанаар хоосон ирвэл текст моделиор нөхөж боловсруулах
      if (!finalAnswerText || !finalAnswerText.trim()) {
        const textOnlyModel = genAI.getGenerativeModel({
          model: "gemini-3.5-flash-lite",
          systemInstruction,
        });

        const toolResultsSummary = JSON.stringify(
          functionResponseParts.map(
            (p: any) => p.functionResponse?.response?.result
          )
        );

        const synthResponse = await textOnlyModel.generateContent([
          {
            text: `Хэрэглэгчийн асуулт: "${userMessage}"\n\nБодит өгөгдөл:\n${toolResultsSummary}\n\nДээрх өгөгдлөөс хэн ямар бараа хаягдал болгосныг нэр, дүн, тайлбартай нь цэвэр Монгол хэлээр жагсаан хариулна уу.`,
          },
        ]);
        finalAnswerText = synthResponse.response.text();
      }
    } else {
      finalAnswerText = initialResponse.response.text();
    }
  } catch (err: any) {
    console.error("CFO Agent Execution Exception:", err);
    finalAnswerText = `Саатал гарлаа: ${err.message || "Мэдээлэл боловсруулахад алдаа гарлаа"}`;
  }

  // Хэрэв шийдвэрийн картууд үүссэн бол хариултын төгсгөлд залгах
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
            const chunk = words.slice(i, i + 3).join(" ") + " ";
            controller.enqueue(encoder.encode(chunk));
            await new Promise((r) => setTimeout(r, 15));
          }
        }
      await recordChatMessage(context.clientId, "owner", userMessage);
      await recordChatMessage(context.clientId, "ai", finalAnswerText);
      controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}