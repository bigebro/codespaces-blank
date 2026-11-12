import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { MODELS } from "./models";

/**
 * Compatibility surface so existing call sites can leave
 * `@google/generative-ai`. Every request goes through `@google/genai`.
 */
export const SchemaType = {
  STRING: "STRING",
  NUMBER: "NUMBER",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
  ARRAY: "ARRAY",
  OBJECT: "OBJECT",
} as const;

export type FunctionDeclaration = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
};

export const TaskType = {
  RETRIEVAL_DOCUMENT: "RETRIEVAL_DOCUMENT",
  RETRIEVAL_QUERY: "RETRIEVAL_QUERY",
} as const;

export function geminiApiKey(): string {
  return (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
}

export function getGenAI(): GoogleGenAI {
  const apiKey = geminiApiKey();
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenAI({ apiKey });
}

function asContents(req: unknown): Content[] | string {
  if (typeof req === "string") return req;
  if (req && typeof req === "object" && "contents" in (req as object)) {
    return (req as { contents: Content[] }).contents;
  }
  return String(req ?? "");
}

export class GenerativeModel {
  constructor(
    private ai: GoogleGenAI,
    private modelName: string,
    private options: {
      systemInstruction?: string;
      tools?: { functionDeclarations?: FunctionDeclaration[] }[];
      generationConfig?: {
        temperature?: number;
        responseMimeType?: string;
        maxOutputTokens?: number;
      };
    },
  ) {}

  async generateContent(req: unknown) {
    const response = await this.ai.models.generateContent({
      model: this.modelName || MODELS.flash,
      contents: asContents(req),
      config: {
        systemInstruction: this.options.systemInstruction,
        temperature: this.options.generationConfig?.temperature,
        responseMimeType: this.options.generationConfig?.responseMimeType,
        maxOutputTokens: this.options.generationConfig?.maxOutputTokens,
        tools: this.options.tools as never,
      },
    });
    return {
      response: {
        text: () => response.text || "",
        functionCalls: () => response.functionCalls || [],
        candidates: response.candidates,
      },
    };
  }
}

/** Drop-in replacement for `GoogleGenerativeAI` from the retired SDK. */
export class GoogleGenerativeAI {
  private ai: GoogleGenAI;
  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }
  getGenerativeModel(opts: {
    model?: string;
    systemInstruction?: string;
    tools?: { functionDeclarations?: FunctionDeclaration[] }[];
    generationConfig?: {
      temperature?: number;
      responseMimeType?: string;
      maxOutputTokens?: number;
    };
  }) {
    const requested = opts.model || MODELS.flash;
    const model =
      requested.includes("3.5") || requested.includes("flash-lite") || requested.includes("embedding")
        ? MODELS.flash
        : requested;
    return new GenerativeModel(this.ai, model, opts);
  }
}

export async function embedText(
  text: string,
  taskType: string,
  outputDimensionality: number,
): Promise<number[]> {
  const ai = getGenAI();
  const response = await ai.models.embedContent({
    model: MODELS.embedding,
    contents: text,
    config: {
      taskType: taskType as never,
      outputDimensionality,
    },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values?.length) throw new Error("Embedding response was empty");
  return values;
}

export type { Content, Part };
