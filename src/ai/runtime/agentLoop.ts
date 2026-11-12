import type { FunctionDeclaration } from "@google/genai";
import { after } from "next/server";
import { getGenAI } from "@/lib/ai/genai";
import { MODELS } from "@/lib/ai/models";
import { executeAiTool } from "@/ai/tools/execution.tools";
import { getConversationThread, recordChatMessage } from "@/ai/memory/thread.manager";
import { AgentContext } from "@/types/agent.types";

type ModelPart = Record<string, unknown>;

function callKey(name: string, args: unknown) {
  return `${name}:${JSON.stringify(args || {})}`;
}

function absorbModelPart(parts: ModelPart[], part: ModelPart) {
  const copy: ModelPart = { ...part };
  const text = typeof copy.text === "string" ? copy.text : "";
  const marked = Boolean(copy.thoughtSignature || copy.thought || copy.functionCall);
  if (text && !marked) {
    const prev = parts[parts.length - 1];
    if (
      prev &&
      typeof prev.text === "string" &&
      !prev.functionCall &&
      !prev.thoughtSignature &&
      !prev.thought
    ) {
      prev.text += text;
      return;
    }
  }
  if (!text && !marked) return;

  const call = copy.functionCall as { name?: string; args?: unknown } | undefined;
  if (call?.name) {
    const key = callKey(call.name, call.args);
    const existing = parts.find((item) => {
      const fn = item.functionCall as { name?: string; args?: unknown } | undefined;
      return fn?.name && callKey(fn.name, fn.args) === key;
    });
    if (existing) {
      if (copy.thoughtSignature && !existing.thoughtSignature) {
        existing.thoughtSignature = copy.thoughtSignature;
      }
      return;
    }
  }
  parts.push(copy);
}

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
        const historyPromise = getConversationThread(opts.context.clientId, 6);
        const ai = getGenAI();
        const history = await historyPromise;
        const contents: { role: string; parts: ModelPart[] }[] = [
          ...(history as { role: string; parts: ModelPart[] }[]),
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
          const modelParts: ModelPart[] = [];
          for await (const chunk of stream) {
            const parts = chunk.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              absorbModelPart(modelParts, part as ModelPart);
              if (typeof part.text === "string") text += part.text;
            }
            if (!parts.some((part) => typeof part.text === "string" && part.text) && chunk.text) {
              absorbModelPart(modelParts, { text: chunk.text });
              text += chunk.text;
            }
            for (const call of chunk.functionCalls || []) {
              if (!call.name) continue;
              absorbModelPart(modelParts, {
                functionCall: { name: call.name, args: call.args || {} },
              });
            }
          }

          const seen = new Set<string>();
          const calls: { name: string; args: Record<string, unknown> }[] = [];
          for (const part of modelParts) {
            const call = part.functionCall as { name?: string; args?: Record<string, unknown> } | undefined;
            if (!call?.name) continue;
            const key = callKey(call.name, call.args);
            if (seen.has(key)) continue;
            seen.add(key);
            calls.push({ name: call.name, args: call.args || {} });
          }

          if (calls.length === 0) {
            finalText = text;
            enqueue(text);
            break;
          }

          contents.push({
            role: "model",
            parts: modelParts,
          });

          const responseParts: ModelPart[] = [];
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

        after(() =>
          Promise.all([
            recordChatMessage(opts.context.clientId, "owner", opts.userMessage),
            recordChatMessage(opts.context.clientId, "ai", finalText),
          ]).catch(console.error),
        );
        controller.close();
      } catch (err: unknown) {
        console.error("[agent]", err);
        enqueue("Хариулт боловсруулахад түр саатал гарлаа. Та асуултаа дахин илгээнэ үү.");
        controller.close();
      }
    },
  });
}
