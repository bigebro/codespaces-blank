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

function messageText(message: { parts?: ModelPart[] }) {
  return (message.parts || [])
    .map((part) => (typeof part.text === "string" ? part.text.trim() : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function sanitizeHistory(history: { role?: string; parts?: ModelPart[] }[]) {
  const cleaned: { role: string; parts: ModelPart[] }[] = [];
  for (const message of history || []) {
    const text = messageText(message);
    if (!text) continue;
    const role = message.role === "model" ? "model" : "user";
    const prev = cleaned[cleaned.length - 1];
    if (prev && prev.role === role && typeof prev.parts[0]?.text === "string") {
      prev.parts[0].text = `${prev.parts[0].text}\n${text}`;
      continue;
    }
    cleaned.push({ role, parts: [{ text }] });
  }
  while (cleaned.length > 0 && cleaned[0].role !== "user") cleaned.shift();
  return cleaned;
}

function isInvalidArgument(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const status = typeof err === "object" && err && "status" in err ? Number((err as { status?: number }).status) : 0;
  return status === 400 || message.includes("INVALID_ARGUMENT");
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
        const history = sanitizeHistory((await historyPromise) as { role?: string; parts?: ModelPart[] }[]);
        const contents: { role: string; parts: ModelPart[] }[] = [...history];
        const latest = opts.userMessage.trim();
        if (latest) {
          const prev = contents[contents.length - 1];
          if (prev?.role === "user" && typeof prev.parts[0]?.text === "string") {
            prev.parts[0].text = `${prev.parts[0].text}\n${latest}`;
          } else {
            contents.push({ role: "user", parts: [{ text: latest }] });
          }
        }
        const proposalCards: unknown[] = [];
        let finalText = "";
        let streamed = false;
        let useThinking = true;
        let attemptSent = false;

        const readModel = async (thinking: boolean) => {
          console.log(JSON.stringify(contents).slice(0, 2000));
          attemptSent = false;
          const stream = await ai.models.generateContentStream({
            model: MODELS.flash,
            contents,
            config: {
              systemInstruction: opts.systemInstruction,
              temperature: 0.1,
              ...(thinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
              tools: [{ functionDeclarations: opts.tools }],
            },
          });

          let text = "";
          let sawCall = false;
          const modelParts: ModelPart[] = [];
          for await (const chunk of stream) {
            const parts = chunk.candidates?.[0]?.content?.parts || [];
            let delta = "";
            let partHadText = false;
            for (const part of parts) {
              absorbModelPart(modelParts, part as ModelPart);
              if (typeof part.text === "string" && part.text && !part.thought) {
                delta += part.text;
                partHadText = true;
              }
              if (part.functionCall) sawCall = true;
            }
            if (!partHadText && chunk.text) {
              absorbModelPart(modelParts, { text: chunk.text });
              delta += chunk.text;
            }
            for (const call of chunk.functionCalls || []) {
              if (!call.name) continue;
              sawCall = true;
              absorbModelPart(modelParts, {
                functionCall: { name: call.name, args: call.args || {} },
              });
            }
            if (delta) text += delta;
            if (delta && !sawCall) {
              if (!streamed) streamed = true;
              else if (text === delta) enqueue("\n");
              attemptSent = true;
              enqueue(delta);
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
          return { text, modelParts, calls };
        };

        for (let step = 0; step < MAX_STEPS; step++) {
          let outcome: Awaited<ReturnType<typeof readModel>> | undefined;
          try {
            outcome = await readModel(useThinking);
          } catch (err) {
            if (!useThinking || !isInvalidArgument(err) || attemptSent) throw err;
            console.error("[agent] INVALID_ARGUMENT, removing thinkingConfig");
            useThinking = false;
            outcome = await readModel(false);
          }
          const { text, modelParts, calls } = outcome;

          if (calls.length === 0) {
            finalText = text;
            break;
          }

          contents.push({
            role: "model",
            parts: modelParts,
          });

          const executed = await Promise.all(
            calls.map(async (call) => {
              const rawArgs = opts.sanitizeArgs ? opts.sanitizeArgs(call.args) : call.args;
              const execResult = await executeAiTool(opts.context, call.name, rawArgs);
              return { call, execResult };
            }),
          );
          const responseParts: ModelPart[] = [];
          for (const { call, execResult } of executed) {
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

        after(() => {
          const writes = [recordChatMessage(opts.context.clientId, "owner", opts.userMessage)];
          if (finalText.trim()) {
            writes.push(recordChatMessage(opts.context.clientId, "ai", finalText));
          }
          return Promise.all(writes).catch(console.error);
        });
        controller.close();
      } catch (err: unknown) {
        console.error("[agent]", err);
        enqueue("Хариулт боловсруулахад түр саатал гарлаа. Та асуултаа дахин илгээнэ үү.");
        controller.close();
      }
    },
  });
}
