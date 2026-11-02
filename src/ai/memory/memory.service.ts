// src/ai/memory/memory.service.ts
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY environment variable");
  return new GoogleGenerativeAI(apiKey);
}

export async function createEmbedding(
  text: string,
  taskType = TaskType.RETRIEVAL_DOCUMENT
): Promise<number[]> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    taskType,
  });
  return result.embedding.values;
}

export async function searchBusinessMemory(
  clientId: string,
  query: string,
  matchCount = 5,
  threshold = 0.3
) {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const { embedding } = await model.embedContent({
    content: { role: "user", parts: [{ text: query }] },
    taskType: TaskType.RETRIEVAL_QUERY,
  });

  const { data, error } = await supabaseAdmin.rpc("match_ai_memory", {
    p_client_id: clientId,
    p_query_embedding: embedding.values,
    p_match_count: matchCount,
    p_match_threshold: threshold,
  });

  if (error || !data) {
    console.error("Vector search RPC error:", error);
    return [];
  }

  return data;
}

export async function saveBusinessRule(clientId: string, topic: string, fact: string) {
  const fullContent = `${topic}: ${fact}`;
  const embedding = await createEmbedding(fullContent, TaskType.RETRIEVAL_DOCUMENT);

  const { data, error } = await supabaseAdmin
    .from("business_memory")
    .insert([
      {
        client_id: clientId,
        topic: topic.trim(),
        fact: fact.trim(),
        embedding,
        embedding_model: "text-embedding-004",
        updated_at: new Date().toISOString(),
      },
    ])
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id, topic, fact };
}

export interface BusinessLessonInput {
  situation: string;
  actionTaken?: string;
  outcome?: string;
  lesson?: string;
  prediction?: string;
  confidence?: number;
  evidenceLogIds?: string[];
}

export async function recordBusinessLesson(
  clientId: string,
  exp: BusinessLessonInput
) {
  const fullText = `Situation: ${exp.situation}\nAction: ${exp.actionTaken || ""}\nOutcome: ${exp.outcome || ""}\nLesson: ${exp.lesson || ""}`;
  let embedding: number[] | null = null;
  try {
    embedding = await createEmbedding(fullText, TaskType.RETRIEVAL_DOCUMENT);
  } catch (err) {
    console.warn("Embedding generation failed in recordBusinessLesson:", err);
  }

  const hasEvidence = Array.isArray(exp.evidenceLogIds) && exp.evidenceLogIds.length > 0;

  // 1. Insert into business_experiences
  const { data: insertedExp, error: expError } = await supabaseAdmin
    .from("business_experiences")
    .insert([
      {
        client_id: clientId,
        situation: exp.situation,
        action_taken: exp.actionTaken || null,
        outcome: exp.outcome || null,
        lesson: exp.lesson || null,
        prediction: exp.prediction || null,
        confidence: exp.confidence || null,
        status: "resolved",
        evidence_status: hasEvidence ? "verified" : "reported",
        is_test: false,
        resolved_at: new Date().toISOString(),
        embedding,
        embedding_model: embedding ? "text-embedding-004" : null,
      },
    ])
    .select("id")
    .single();

  if (expError || !insertedExp) {
    console.error("Failed to insert business_experience:", expError);
    throw expError;
  }

  // 2. Insert into business_experience_evidence if evidence IDs are provided
  let linkedCount = 0;
  if (hasEvidence) {
    const evidenceRows = exp.evidenceLogIds!.map((logId) => ({
      client_id: clientId,
      experience_id: insertedExp.id,
      inventory_log_id: logId,
      evidence_type: "agent_linked_evidence",
      note: "Evidence linked by AI Agent during audit conversation",
    }));

    const { error: evidenceError } = await supabaseAdmin
      .from("business_experience_evidence")
      .insert(evidenceRows);

    if (evidenceError) {
      console.error("Failed to insert business_experience_evidence:", evidenceError);
    } else {
      linkedCount = evidenceRows.length;
    }
  }

  return {
    id: insertedExp.id,
    situation: exp.situation,
    lesson: exp.lesson,
    evidenceLinked: linkedCount,
  };
}