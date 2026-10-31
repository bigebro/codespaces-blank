// src/ai/memory/memory.service.ts
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getGeminiClient() {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/["']/g, "").trim();
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY environment variable");
  return new GoogleGenerativeAI(apiKey);
}

export async function createEmbedding(text: string, taskType = TaskType.RETRIEVAL_DOCUMENT): Promise<number[]> {
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

export async function recordBusinessLesson(
  clientId: string,
  exp: {
    situation: string;
    actionTaken?: string;
    outcome?: string;
    lesson?: string;
    prediction?: string;
    confidence?: number;
  }
) {
  const fullText = `Situation: ${exp.situation}\nAction: ${exp.actionTaken || ""}\nOutcome: ${exp.outcome || ""}\nLesson: ${exp.lesson || ""}`;
  const embedding = await createEmbedding(fullText, TaskType.RETRIEVAL_DOCUMENT);

  const { data, error } = await supabaseAdmin
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
        evidence_status: "verified",
        is_test: false,
        resolved_at: new Date().toISOString(),
        embedding,
        embedding_model: "text-embedding-004",
      },
    ])
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id, situation: exp.situation, lesson: exp.lesson };
}