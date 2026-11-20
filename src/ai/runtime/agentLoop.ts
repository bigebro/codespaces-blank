import type { FunctionDeclaration } from "@google/genai";
import { after } from "next/server";
import { getGenAI } from "@/lib/ai/genai";
import { MODELS } from "@/lib/ai/models";
import { executeAiTool } from "@/ai/tools/execution.tools";
import { getConversationThread, recordChatMessage } from "@/ai/memory/thread.manager";
import { AgentContext } from "@/types/agent.types";
import { createNameScrubber, scrubInternalNames } from "@/ai/runtime/scrubToolNames";
import { MN_BUSINESS_SPELLING_NOTE, createSpellingFixer, fixMnBusinessSpelling } from "@/ai/runtime/mnSpelling";
import { createPeriodPrefixGate, ensureSinglePeriodPrefix } from "@/lib/overviewPeriod";

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

const TRUNCATED_NOTE = "\n(Хариулт тасарсан тул дээрх нь дутуу байж болно. Үргэлжлэхийг асуугаарай.)";

function isTruncatedFinish(reason: unknown) {
  const r = String(reason || "").toUpperCase();
  return r === "MAX_TOKENS" || r === "LENGTH";
}

const MODEL_TIMEOUT_NOTE = "\nЗөвлөмжийг одоогоор нэмж чадсангүй. Дээрх тоо самбар дээрхтэй ижил.";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (!ms || ms <= 0) return promise;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("MODEL_TIMEOUT")), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export async function runToolAgent(opts: {
  context: AgentContext;
  userMessage: string;
  systemInstruction: string;
  tools: FunctionDeclaration[];
  sanitizeArgs?: (args: Record<string, unknown>) => Record<string, unknown>;
  preamble?: string;
  disableTools?: boolean;
  historyLimit?: number;
  maxOutputTokens?: number;
  /** Server-rendered facts, flushed before the model runs. */
  prepareLeadingText?: () => Promise<string>;
  /** Drop model lines whose numbers contradict or restate the leading block. */
  numberGuard?: (modelText: string) => string;
  modelTimeoutMs?: number;
  /** Skip thinkingConfig so short advice calls start faster. */
  disableThinking?: boolean;
}): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const spelling = createSpellingFixer();
      const enqueueRaw = (text: string) => {
        if (text) controller.enqueue(encoder.encode(text));
      };
      const enqueue = (text: string) => {
        if (text) enqueueRaw(spelling.push(text));
      };
      const flushSpelling = () => enqueueRaw(spelling.flush());
      let sentLead = false;
      try {
        if (opts.prepareLeadingText) {
          const lead = String(await opts.prepareLeadingText() || "").trim();
          if (lead) {
            enqueueRaw(lead.endsWith("\n") ? lead : `${lead}\n\n`);
            sentLead = true;
          }
        }
        const periodLabel = sentLead ? "" : String(opts.preamble || "").trim();
        const prefixGate = createPeriodPrefixGate(periodLabel);
        const enqueueModel = (piece: string) => {
          const released = prefixGate.push(piece);
          if (released) enqueue(released);
        };
        const flushPrefix = () => {
          const released = prefixGate.flush();
          if (released) enqueue(released);
        };
        const historyPromise = getConversationThread(opts.context.clientId, opts.historyLimit ?? 6);
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
        const toolNames = (opts.tools || []).map((t) => t.name).filter((n): n is string => Boolean(n));
        const scrubber = createNameScrubber(toolNames);
        const proposalCards: unknown[] = [];
        let finalText = "";
        let streamed = false;
        let useThinking = !opts.disableThinking;
        let attemptSent = false;

        const readModel = async (thinking: boolean) => {

          attemptSent = false;
          const useTools = !opts.disableTools && (opts.tools || []).length > 0;
          const stream = await ai.models.generateContentStream({
            model: MODELS.flash,
            contents,
            config: {
              systemInstruction: opts.systemInstruction + "\n\nДҮРЭМ: Хэрэглэгчид хэзээ ч хэрэгслийн нэр, функцийн нэр, кодын нэр (жишээ нь skill_..., action_...) бүү дурд. Юу хийж чадахаа энгийн монгол хэлээр тайлбарла.\n" + MN_BUSINESS_SPELLING_NOTE,
              temperature: 0.1,
              maxOutputTokens: opts.maxOutputTokens || 2048,
              ...(thinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
              ...(useTools ? { tools: [{ functionDeclarations: opts.tools }] } : {}),
            },
          });

          let text = "";
          let sawCall = false;
          let truncated = false;
          const modelParts: ModelPart[] = [];
          for await (const chunk of stream) {
            if (isTruncatedFinish(chunk.candidates?.[0]?.finishReason)) truncated = true;
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
            // Leading facts already sent: buffer the model so we can drop contradicting numbers before the user sees them.
            if (delta && !sawCall && !opts.numberGuard) {
              if (!streamed) streamed = true;
              else if (text === delta) enqueueModel("\n");
              attemptSent = true;
              enqueueModel(scrubber.push(delta));
            }
          }
          if (attemptSent) {
            enqueueModel(scrubber.flush());
            flushPrefix();
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
          return { text, modelParts, calls, truncated };
        };

        const modelTimeoutMs = opts.modelTimeoutMs || 0;
        const retryTimeoutMs = modelTimeoutMs ? Math.min(15000, Math.max(8000, Math.round(modelTimeoutMs / 2))) : 0;
        const modelFailReason = (err: unknown) => {
          if (err instanceof Error && err.message === "MODEL_TIMEOUT") return "MODEL_TIMEOUT";
          if (err instanceof Error) return err.message || err.name || "Error";
          return String(err || "unknown");
        };
        const callModel = async (thinking: boolean, timeoutMs: number, attempt: number) => {
          try {
            return await withTimeout(readModel(thinking), timeoutMs);
          } catch (err) {
            console.error("[agent] model call failed", {
              reason: modelFailReason(err),
              attempt,
              timeoutMs,
              thinking,
            });
            throw err;
          }
        };

        for (let step = 0; step < MAX_STEPS; step++) {
          let outcome: Awaited<ReturnType<typeof readModel>> | undefined;
          try {
            outcome = await callModel(useThinking, modelTimeoutMs, 1);
          } catch (err) {
            if (!useThinking || !isInvalidArgument(err) || attemptSent) {
              // Нэг удаагийн богино дахин оролдлого. Нийт хугацаа хязгаартай (анхны timeout + хамгийн ихдээ 8с).
              try {
                outcome = await callModel(useThinking, retryTimeoutMs || modelTimeoutMs, 2);
              } catch (retryErr) {
                console.error("[agent] model retry failed", { reason: modelFailReason(retryErr), timeoutMs: retryTimeoutMs || modelTimeoutMs });
                throw retryErr;
              }
            } else {
              console.error("[agent] INVALID_ARGUMENT, removing thinkingConfig");
              useThinking = false;
              outcome = await callModel(false, modelTimeoutMs, 1);
            }
          }
          const { text, modelParts, calls } = outcome;

          if (calls.length === 0) {
            let cleaned = periodLabel ? ensureSinglePeriodPrefix(text, periodLabel) : text;
            if (opts.numberGuard) cleaned = opts.numberGuard(cleaned);
            finalText = cleaned;
            if (!streamed && finalText) enqueue(finalText);
            else flushPrefix();
            if (outcome.truncated) enqueue(TRUNCATED_NOTE);
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

        flushSpelling();
        finalText = fixMnBusinessSpelling(finalText);

        after(() => {
          const writes: Promise<unknown>[] = [];
          if (finalText.trim()) {
            writes.push(recordChatMessage(opts.context.clientId, "ai", scrubInternalNames(finalText, toolNames)));
          }
          return Promise.all(writes).catch(console.error);
        });
        controller.close();
      } catch (err: unknown) {
        const timedOut = err instanceof Error && err.message === "MODEL_TIMEOUT";
        const reason = timedOut ? "MODEL_TIMEOUT" : (err instanceof Error ? (err.message || err.name) : String(err));
        console.error("[agent] advice failed", { reason, timedOut });
        if (sentLead) enqueueRaw(MODEL_TIMEOUT_NOTE);
        else if (timedOut) enqueueRaw(MODEL_TIMEOUT_NOTE);
        else enqueue("Хариулт боловсруулахад түр саатал гарлаа. Та асуултаа дахин илгээнэ үү.");
        flushSpelling();
        controller.close();
      }
    },
  });
}
