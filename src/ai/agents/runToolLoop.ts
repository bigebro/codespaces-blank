import { getGenAI } from "@/ai/geminiClient";
import type { FunctionDeclaration } from "@google/genai";
import { CHAT_MODEL } from "@/ai/config/models";
import { executeAiTool } from "@/ai/tools/execution.tools";
import { getConversationThread, recordChatMessage } from "@/ai/memory/thread.manager";
import { extractAndSaveMemoryInBackground } from "@/ai/memory/chat_observer";
import { AgentContext } from "@/types/agent.types";

const MAX_STEPS = 5;

function textStream(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

export function errorStream(message: string) {
  return textStream(message);
}

export async function runToolLoop(opts: {
  context: AgentContext;
  userMessage: string;
  systemInstruction: string;
  tools: FunctionDeclaration[];
  targetYear: string;
}): Promise<ReadableStream> {
  const { context, userMessage, systemInstruction, tools, targetYear } = opts;
  const encoder = new TextEncoder();
  const history = await getConversationThread(context.clientId, 6);
  const contents: Array<Record<string, unknown>> = [
    ...history,
    { role: "user", parts: [{ text: userMessage }] },
  ];

  return new ReadableStream({
    async start(controller) {
      let finalText = "";
      let streamed = false;
      const proposalCards: unknown[] = [];
      try {
        const ai = getGenAI();
        for (let step = 0; step < MAX_STEPS; step++) {
          const isLast = step === MAX_STEPS - 1;
          if (!isLast) {
            const response = await ai.models.generateContent({
              model: CHAT_MODEL,
              contents: contents as never,
              config: {
                systemInstruction,
                temperature: 0.1,
                tools: [{ functionDeclarations: tools }],
              },
            });
            const calls = response.functionCalls || [];
            if (!calls.length) {
              finalText = response.text || "";
              break;
            }
            const modelContent = response.candidates?.[0]?.content;
            if (modelContent) contents.push(modelContent as never);
            const responseParts = [];
            for (const call of calls) {
              const raw = (call.args || {}) as Record<string, string>;
              const args = {
                ...raw,
                startDate: fixYear(raw.startDate, context.activeStartDate, targetYear),
                endDate: fixYear(raw.endDate, context.activeEndDate, targetYear),
              };
              const execResult = await executeAiTool(context, call.name || "", args);
              if ((execResult.data as { type?: string })?.type === "PROPOSAL") {
                proposalCards.push(execResult.data);
              }
              responseParts.push({
                functionResponse: {
                  name: call.name,
                  response: { result: execResult.data || { error: execResult.error } },
                },
              });
            }
            contents.push({ role: "user", parts: responseParts });
            continue;
          }

          const stream = await ai.models.generateContentStream({
            model: CHAT_MODEL,
            contents: contents as never,
            config: { systemInstruction, temperature: 0.1 },
          });
          streamed = true;
          for await (const chunk of stream) {
            const piece = chunk.text || "";
            if (!piece) continue;
            finalText += piece;
            controller.enqueue(encoder.encode(piece));
          }
        }

        if (finalText && !streamed) {
          controller.enqueue(encoder.encode(finalText));
        }
        for (const prop of proposalCards) {
          const card = `\n\n:::PROPOSAL_CARD\n${JSON.stringify(prop)}\n:::`;
          finalText += card;
          controller.enqueue(encoder.encode(card));
        }
        await recordChatMessage(context.clientId, "owner", userMessage);
        await recordChatMessage(context.clientId, "ai", finalText);
        controller.close();
        if (/дүрэм|үүрэг|ирдэг|биш|буруу|үнэндээ|засах|зөв/i.test(userMessage)) {
          extractAndSaveMemoryInBackground(context.clientId, userMessage, finalText).catch(() => {});
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Алдаа гарлаа";
        controller.enqueue(encoder.encode(`Хариулт боловсруулахад саатал гарлаа: ${message}`));
        controller.close();
      }
    },
  });
}

function fixYear(dateStr: string | undefined, fallback: string | undefined, targetYear: string) {
  const value = dateStr || fallback || "";
  const match = value.match(/^(\d{4})(-\d{2}-\d{2}.*)$/);
  if (match && match[1] !== targetYear) return `${targetYear}${match[2]}`;
  return value;
}
