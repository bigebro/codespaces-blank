import { supabaseAdmin } from "./supabaseAdmin";

export const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

type EmbeddingTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export type BusinessExperienceText = {
  situation: string;
  prediction?: string | null;
  actionTaken?: string | null;
  outcome?: string | null;
  lesson?: string | null;
};

export type AiMemoryResult = {
  id: string;
  memory_type: "fact" | "experience";
  topic: string;
  content: string;
  confidence: number | null;
  status: string | null;
  evidence_status: string | null;
  created_at: string;
  similarity: number;
};

function getApiKey(): string {
  return (process.env.GEMINI_API_KEY || "")
    .replace(/["']/g, "")
    .trim();
}

export function formatBusinessExperienceText(
  experience: BusinessExperienceText
): string {
  return [
    `Situation: ${experience.situation}`,
    experience.prediction
      ? `Prediction: ${experience.prediction}`
      : "",
    experience.actionTaken
      ? `Action: ${experience.actionTaken}`
      : "",
    experience.outcome
      ? `Outcome: ${experience.outcome}`
      : "",
    experience.lesson
      ? `Lesson: ${experience.lesson}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function createEmbedding(
  text: string,
  taskType: EmbeddingTask
): Promise<number[]> {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  if (!text.trim()) {
    throw new Error("Cannot embed empty text.");
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: {
          parts: [{ text: text.slice(0, 7000) }],
        },
        taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Gemini embedding failed (${response.status}): ${details}`
    );
  }

  const result = (await response.json()) as {
    embedding?: { values?: number[] };
  };

  const values = result.embedding?.values;

  if (
    !values ||
    values.length !== EMBEDDING_DIMENSIONS ||
    !values.every(Number.isFinite)
  ) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS} finite embedding values.`
    );
  }

  return values;
}

export async function saveBusinessMemoryEmbedding(
  clientId: string,
  memoryId: string,
  topic: string,
  fact: string
): Promise<void> {
  try {
    const embedding = await createEmbedding(
      `${topic}: ${fact}`,
      "RETRIEVAL_DOCUMENT"
    );

    const { error } = await supabaseAdmin
      .from("business_memory")
      .update({
        embedding,
        embedding_model: EMBEDDING_MODEL,
      })
      .eq("client_id", clientId)
      .eq("id", memoryId);

    if (error) {
      console.error("Business-memory embedding save failed:", error.message);
    }
  } catch (error) {
    // Embedding failure must not break the normal CFO response.
    console.error("Business-memory embedding failed:", error);
  }
}

export async function saveBusinessExperienceEmbedding(
  clientId: string,
  experienceId: string,
  experience: BusinessExperienceText
): Promise<void> {
  try {
    const embedding = await createEmbedding(
      formatBusinessExperienceText(experience),
      "RETRIEVAL_DOCUMENT"
    );

    const { error } = await supabaseAdmin
      .from("business_experiences")
      .update({
        embedding,
        embedding_model: EMBEDDING_MODEL,
      })
      .eq("client_id", clientId)
      .eq("id", experienceId);

    if (error) {
      console.error(
        "Business-experience embedding save failed:",
        error.message
      );
    }
  } catch (error) {
    console.error("Business-experience embedding failed:", error);
  }
}

export async function searchRelevantAiMemory(
  clientId: string,
  query: string,
  limit = 10
): Promise<AiMemoryResult[]> {
  if (!clientId.trim() || !query.trim()) {
    return [];
  }

  try {
    const queryEmbedding = await createEmbedding(
      query,
      "RETRIEVAL_QUERY"
    );

    const { data, error } = await supabaseAdmin.rpc("match_ai_memory", {
      p_client_id: clientId,
      p_query_embedding: queryEmbedding,
      p_match_count: Math.min(Math.max(limit, 1), 20),
      p_match_threshold: 0.30,
    });

    if (error) {
      console.error("Semantic memory search failed:", error.message);
      return [];
    }

    return (data ?? []) as AiMemoryResult[];
  } catch (error) {
    console.error("Semantic memory retrieval failed:", error);
    return [];
  }
}