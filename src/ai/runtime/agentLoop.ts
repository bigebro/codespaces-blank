import type { FunctionDeclaration } from "@google/genai";
import { getGenAI } from "@/lib/ai/genai";
import { MODELS } from "@/lib/ai/models";
import { executeAiTool } from "@/ai/tools/execution.tools";
import { getConversationThread, recordChatMessage } from "@/ai/memory/thread.manager";
import { subscriptionBlockMessage } from "@/lib/subscription";
import { AgentContext } from "@/types/agent.types";

type Content = { role: string; parts: Record<string, unknown>[] };

const MAX_STEPS = 5;

export async function runToolAgent(opts: {
  context: AgentContext;
  userMessage: string;
  systemInstruction: string;
  tools: FunctionDeclaration[];
  sanitizeArgs?: (args: Record<string, unknown>) => Record<string, unknown>;
}): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const enqueue = (text: string) => {
        if (text) controller.enqueue(encoder.encode(text));
      };
      try {
        const blocked = await subscriptionBlockMessage(opts.context.clientId);
        if (blocked) {
          enqueue(blocked);
          controller.close();
          return;
        }

        const ai = getGenAI();
        const history = await getConversationThread(opts.context.clientId, 6);
        const contents: Content[] = [
          ...(history as Content[]),
          { role: "user", parts: [{ text: opts.userMessage }] },
        ];
        const proposalCards: unknown[] = [];
        let finalText = "";

        for (let step = 0; step < MAX_STEPS; step++) {
          const stream = await ai.models.generateContentStream({
            model: MODELS.flash,
            contents,
            config: {
              systemInstruction: opts.systemInstruction,
              temperature: 0.1,
              tools: [{ functionDeclarations: opts.tools }],
            },
          });

          let text = "";
          const calls: { name: string; args: Record<string, unknown> }[] = [];
          for await (const chunk of stream) {
            if (chunk.text) text += chunk.text;
            for (const call of chunk.functionCalls || []) {
              if (call.name) {
                calls.push({
                  name: call.name,
                  args: (call.args || {}) as Record<string, unknown>,
                });
              }
            }
          }

          if (calls.length === 0) {
            finalText = text;
            enqueue(text);
            break;
          }

          contents.push({
            role: "model",
            parts: [
              ...(text ? [{ text }] : []),
              ...calls.map((call) => ({
                functionCall: { name: call.name, args: call.args },
              })),
            ],
          });

          const responseParts: Record<string, unknown>[] = [];
          for (const call of calls) {
            const rawArgs = opts.sanitizeArgs ? opts.sanitizeArgs(call.args) : call.args;
            const execResult = await executeAiTool(opts.context, call.name, rawArgs);
            if (execResult.data?.type === "PROPOSAL") proposalCards.push(execResult.data);
            responseParts.push({
              functionResponse: {
                name: call.name,
                response: { result: execResult.data || { error: execResult.error } },
              },
            });
          }
          contents.push({ role: "user", parts: responseParts });

          if (step === MAX_STEPS - 1) {
            finalText = "5 алхам дууссан. Асуултаа жаахан нарийсгаад дахин асууна уу.";
            enqueue(finalText);
          }
        }

        if (proposalCards.length > 0) {
          let extra = "";
          for (const prop of proposalCards) {
            extra += `\n\n:::PROPOSAL_CARD\n${JSON.stringify(prop)}\n:::`;
          }
          finalText += extra;
          enqueue(extra);
        }

        await recordChatMessage(opts.context.clientId, "owner", opts.userMessage);
        await recordChatMessage(opts.context.clientId, "ai", finalText);
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "AI алдаа";
        enqueue(message);
        controller.close();
      }
    },
  });
}
