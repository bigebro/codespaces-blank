import {
  GoogleGenAI,
  Type,
  type FunctionDeclaration,
} from "@google/genai";
import { CHAT_MODEL, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "@/ai/config/models";

export const SchemaType = Type;
export type { FunctionDeclaration };
export const TaskType = {
  RETRIEVAL_DOCUMENT: "RETRIEVAL_DOCUMENT",
  RETRIEVAL_QUERY: "RETRIEVAL_QUERY",
} as const;

export function getGenAI(apiKey?: string) {
  const key = (apiKey || process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenAI({ apiKey: key });
}

/** Drop-in stand-in for the retired @google/generative-ai client. Calls @google/genai. */
export class GoogleGenerativeAI {
  private ai: GoogleGenAI;
  constructor(apiKey: string) {
    this.ai = getGenAI(apiKey);
  }

  getGenerativeModel(opts: {
    model?: string;
    systemInstruction?: string;
    tools?: { functionDeclarations: FunctionDeclaration[] }[];
    generationConfig?: {
      temperature?: number;
      maxOutputTokens?: number;
      responseMimeType?: string;
    };
  }) {
    const ai = this.ai;
    const requested = opts.model || CHAT_MODEL;
    const model = requested === "text-embedding-004" ? EMBEDDING_MODEL : requested;
    return {
      async generateContent(req: unknown) {
        const contents =
          typeof req === "string"
            ? req
            : (req as { contents?: unknown })?.contents ?? req;
        const response = await ai.models.generateContent({
          model,
          contents: contents as never,
          config: {
            systemInstruction: opts.systemInstruction,
            temperature: opts.generationConfig?.temperature,
            maxOutputTokens: opts.generationConfig?.maxOutputTokens,
            responseMimeType: opts.generationConfig?.responseMimeType,
            tools: opts.tools,
          },
        });
        return {
          response: {
            text: () => response.text || "",
            functionCalls: () => response.functionCalls || [],
            candidates: response.candidates,
          },
        };
      },
      async embedContent(req: { content?: { parts?: { text?: string }[] }; taskType?: string }) {
        const content = req?.content;
        const text =
          typeof content === "string"
            ? content
            : content?.parts?.[0]?.text || "";
        const response = await ai.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: text,
          config: {
            taskType: (req?.taskType || "RETRIEVAL_DOCUMENT") as never,
            outputDimensionality: EMBEDDING_DIMENSIONS,
          },
        });
        const values = response.embeddings?.[0]?.values || [];
        if (values.length && values.length !== EMBEDDING_DIMENSIONS) {
          throw new Error(
            `Embedding length ${values.length} does not match vector(${EMBEDDING_DIMENSIONS})`
          );
        }
        return { embedding: { values } };
      },
    };
  }
}
